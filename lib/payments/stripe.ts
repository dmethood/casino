import Stripe from 'stripe';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

interface PaymentIntentData {
  userId: string;
  amount: number; // Amount in cents
  currency: string;
  paymentMethodId?: string;
  setupFutureUsage?: boolean;
  metadata?: Record<string, string>;
}

interface PaymentMethodCreation {
  userId: string;
  type: 'card';
  card?: {
    token: string;
  };
  billing_details?: {
    name?: string;
    email?: string;
    address?: Stripe.Address;
  };
}

interface VerificationResult {
  verified: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore?: number;
  checks?: {
    cvc_check?: string;
    address_line1_check?: string;
    address_postal_code_check?: string;
  };
  threeDSecure?: {
    required: boolean;
    status?: string;
    authenticated?: boolean;
  };
}

export class StripePaymentProcessor {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('FATAL: STRIPE_SECRET_KEY not configured');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });

    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    if (!this.webhookSecret) {
      throw new Error('FATAL: STRIPE_WEBHOOK_SECRET not configured');
    }
  }

  /**
   * Create a setup intent for tokenizing payment methods (PCI-compliant)
   */
  public async createSetupIntent(
    userId: string,
    options?: {
      usage?: 'off_session' | 'on_session';
      customer?: string;
    }
  ): Promise<{ 
    setupIntentId: string; 
    clientSecret: string; 
    customerId?: string; 
  }> {
    try {
      let customerId = options?.customer;

      // Create or retrieve Stripe customer
      if (!customerId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new Error('User not found');
        }

        const customer = await this.stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
            platform: 'casino',
          },
        });

        customerId = customer.id;

        // Store customer ID for future use
        await prisma.user.update({
          where: { id: userId },
          data: {
            // You'd add a stripeCustomerId field to the User model
          },
        });
      }

      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        usage: options?.usage || 'off_session',
        payment_method_types: ['card'],
        metadata: {
          userId,
          type: 'payment_method_setup',
        },
      });

      logger.info('Setup intent created', {
        userId,
        setupIntentId: setupIntent.id,
        customerId,
      });

      return {
        setupIntentId: setupIntent.id,
        clientSecret: setupIntent.client_secret!,
        customerId,
      };

    } catch (error) {
      logger.error('Setup intent creation failed', { userId, error });
      throw new Error('Setup intent creation failed');
    }
  }

  /**
   * Create a payment intent for deposits
   */
  public async createPaymentIntent(data: PaymentIntentData): Promise<{
    paymentIntentId: string;
    clientSecret: string;
    requiresAction: boolean;
    nextAction?: any;
  }> {
    try {
      // Validate amount limits based on user's KYC tier
      await this.validatePaymentAmount(data.userId, data.amount);

      // Get user for customer creation/lookup
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        include: { kycProfile: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.kycProfile?.approved) {
        throw new Error('KYC verification required for deposits');
      }

      // Create or get Stripe customer
      let customerId = await this.getOrCreateCustomer(user);

      // Determine if 3D Secure is required
      const require3DS = await this.requires3DSecure(
        data.userId,
        data.amount,
        user.kycProfile.jurisdiction
      );

      const paymentIntentData: Stripe.PaymentIntentCreateParams = {
        amount: data.amount,
        currency: data.currency.toLowerCase(),
        customer: customerId,
        payment_method_types: ['card'],
        confirmation_method: 'manual',
        capture_method: 'automatic',
        metadata: {
          userId: data.userId,
          type: 'deposit',
          jurisdiction: user.kycProfile.jurisdiction,
          tier: user.kycProfile.tier,
          ...data.metadata,
        },
      };

      // Add payment method if provided
      if (data.paymentMethodId) {
        paymentIntentData.payment_method = data.paymentMethodId;
        paymentIntentData.confirm = true;
      }

      // Force 3D Secure if required
      if (require3DS) {
        paymentIntentData.payment_method_options = {
          card: {
            request_three_d_secure: 'automatic',
          },
        };
      }

      // Setup for future payments if requested
      if (data.setupFutureUsage) {
        paymentIntentData.setup_future_usage = 'off_session';
      }

      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentData);

      // Create payment transaction record
      await this.createPaymentRecord(
        user.id,
        paymentIntent.id,
        'DEPOSIT',
        data.amount,
        data.currency
      );

      logger.info('Payment intent created', {
        userId: data.userId,
        paymentIntentId: paymentIntent.id,
        amount: data.amount,
        currency: data.currency,
        requires3DS: require3DS,
      });

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action,
      };

    } catch (error) {
      logger.error('Payment intent creation failed', { 
        userId: data.userId, 
        amount: data.amount,
        error 
      });
      throw error;
    }
  }

  /**
   * Process a withdrawal to a previously saved payment method
   */
  public async processWithdrawal(
    userId: string,
    amount: number,
    currency: string,
    paymentMethodId: string
  ): Promise<{
    transferId: string;
    status: string;
    estimatedArrival?: Date;
  }> {
    try {
      // Validate withdrawal eligibility and limits
      await this.validateWithdrawal(userId, amount);

      // Get user and wallet
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallet: true, kycProfile: true },
      });

      if (!user?.wallet) {
        throw new Error('Wallet not found');
      }

      if (user.wallet.balance * 100 < amount) {
        throw new Error('Insufficient funds');
      }

      if (!user.kycProfile?.approved) {
        throw new Error('KYC verification required for withdrawals');
      }

      // Check if payment method belongs to user
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
      if (paymentMethod.customer !== await this.getStripeCustomerId(userId)) {
        throw new Error('Invalid payment method');
      }

      // For card withdrawals, create a refund-like transfer
      // Note: Direct card payouts may not be available in all regions
      // This would need to be adapted based on your specific requirements
      
      // For now, we'll create a withdrawal record and process it manually
      // In production, you might use Stripe Connect or bank transfers

      const withdrawalRecord = await this.createPaymentRecord(
        userId,
        `withdrawal_${Date.now()}`,
        'WITHDRAWAL',
        amount,
        currency
      );

      // Freeze funds in wallet
      await prisma.wallet.update({
        where: { userId },
        data: {
          frozenAmount: { increment: amount / 100 },
        },
      });

      logger.info('Withdrawal initiated', {
        userId,
        amount,
        paymentMethodId: paymentMethodId.slice(-4), // Log only last 4 chars
        recordId: withdrawalRecord.id,
      });

      return {
        transferId: withdrawalRecord.id,
        status: 'processing',
        estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      };

    } catch (error) {
      logger.error('Withdrawal processing failed', { userId, amount, error });
      throw error;
    }
  }

  /**
   * Confirm a payment intent (for 3D Secure flows)
   */
  public async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<{
    status: string;
    requiresAction: boolean;
    nextAction?: any;
  }> {
    try {
      const confirmParams: Stripe.PaymentIntentConfirmParams = {};
      
      if (paymentMethodId) {
        confirmParams.payment_method = paymentMethodId;
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        confirmParams
      );

      logger.info('Payment intent confirmed', {
        paymentIntentId,
        status: paymentIntent.status,
      });

      return {
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action,
      };

    } catch (error) {
      logger.error('Payment confirmation failed', { paymentIntentId, error });
      throw error;
    }
  }

  /**
   * Handle Stripe webhooks
   */
  public async handleWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<void> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      logger.info('Stripe webhook received', { 
        type: event.type, 
        id: event.id 
      });

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
          break;

        case 'setup_intent.succeeded':
          await this.handleSetupSuccess(event.data.object as Stripe.SetupIntent);
          break;

        case 'invoice.payment_action_required':
          await this.handleActionRequired(event.data.object as Stripe.Invoice);
          break;

        case 'charge.dispute.created':
          await this.handleChargebackCreated(event.data.object as Stripe.Dispute);
          break;

        default:
          logger.info('Unhandled webhook type', { type: event.type });
      }

    } catch (error) {
      logger.error('Webhook handling failed', { error });
      throw error;
    }
  }

  /**
   * Get stored payment methods for a user
   */
  public async getPaymentMethods(userId: string): Promise<Array<{
    id: string;
    type: string;
    card?: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
    created: Date;
  }>> {
    try {
      const customerId = await this.getStripeCustomerId(userId);
      if (!customerId) {
        return [];
      }

      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year,
        } : undefined,
        created: new Date(pm.created * 1000),
      }));

    } catch (error) {
      logger.error('Failed to retrieve payment methods', { userId, error });
      return [];
    }
  }

  // Private helper methods...

  private async validatePaymentAmount(userId: string, amount: number): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        kycProfile: true,
        rgProfile: true,
      },
    });

    if (!user?.kycProfile) {
      throw new Error('KYC verification required');
    }

    // Check KYC tier limits
    const tierLimits = {
      'TIER_1': 100000, // $1000
      'TIER_2': 500000, // $5000
      'TIER_3': 1000000, // $10000
    };

    const maxAmount = tierLimits[user.kycProfile.tier as keyof typeof tierLimits];
    if (amount > maxAmount) {
      throw new Error(`Amount exceeds limit for ${user.kycProfile.tier}`);
    }

    // Check responsible gambling limits
    if (user.rgProfile?.dailyDepositLimit) {
      const dailyTotal = await this.getDailyDepositTotal(userId);
      if (dailyTotal + amount > user.rgProfile.dailyDepositLimit * 100) {
        throw new Error('Daily deposit limit exceeded');
      }
    }
  }

  private async validateWithdrawal(userId: string, amount: number): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        kycProfile: true,
        wallet: true,
      },
    });

    if (!user?.kycProfile?.approved) {
      throw new Error('KYC approval required for withdrawals');
    }

    if (!user.wallet || user.wallet.balance * 100 < amount) {
      throw new Error('Insufficient funds');
    }

    // Additional withdrawal validations...
  }

  private async requires3DSecure(
    userId: string,
    amount: number,
    jurisdiction: string
  ): Promise<boolean> {
    // EU SCA requirements
    if (['GB', 'DE', 'FR', 'IT', 'ES', 'NL'].includes(jurisdiction)) {
      return amount > 3000; // €30 equivalent
    }

    // High-risk jurisdictions or large amounts
    if (amount > 50000) { // $500
      return true;
    }

    // Check user's historical risk
    const userRisk = await this.getUserRiskProfile(userId);
    return userRisk === 'HIGH' || userRisk === 'CRITICAL';
  }

  private async getOrCreateCustomer(user: any): Promise<string> {
    // Implementation would check if user has existing Stripe customer ID
    // and create one if not exists
    return 'cus_placeholder';
  }

  private async getStripeCustomerId(userId: string): Promise<string | null> {
    // Implementation would retrieve Stripe customer ID for user
    return null;
  }

  private async createPaymentRecord(
    userId: string,
    providerId: string,
    type: 'DEPOSIT' | 'WITHDRAWAL',
    amount: number,
    currency: string
  ): Promise<any> {
    return await prisma.paymentTransaction.create({
      data: {
        userId,
        type: type,
        status: 'PENDING',
        amount: amount / 100, // Convert cents to decimal
        currency,
        provider: 'STRIPE',
        providerId,
        ipAddress: '', // Would be passed from request
        netAmount: amount / 100,
      },
    });
  }

  private async getDailyDepositTotal(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await prisma.paymentTransaction.aggregate({
      where: {
        userId,
        type: 'DEPOSIT',
        status: { in: ['COMPLETED', 'PROCESSING'] },
        createdAt: { gte: today },
      },
      _sum: {
        amount: true,
      },
    });

    return (result._sum.amount || 0) * 100;
  }

  private async getUserRiskProfile(userId: string): Promise<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { kycProfile: true },
    });

    return user?.kycProfile?.riskLevel || 'MEDIUM';
  }

  // Webhook handlers...

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const userId = paymentIntent.metadata.userId;
    
    if (!userId) {
      logger.error('Payment success webhook missing userId', { 
        paymentIntentId: paymentIntent.id 
      });
      return;
    }

    try {
      // Update payment record
      await prisma.paymentTransaction.update({
        where: { id: paymentIntent.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
          threeDSecure: (paymentIntent as any).charges?.data?.[0]?.payment_method_details?.card?.three_d_secure?.authenticated || false,
        },
      });

      // Credit user's wallet
      const amount = paymentIntent.amount / 100; // Convert cents to decimal
      await prisma.wallet.update({
        where: { userId },
        data: {
          balance: { increment: amount },
          lastTransaction: new Date(),
        },
      });

      // Record wallet transaction
      await prisma.walletTransaction.create({
        data: {
          walletId: (await prisma.wallet.findUnique({ where: { userId } }))!.id,
          amount,
          type: 'DEPOSIT',
          reason: 'Card deposit',
          referenceId: paymentIntent.id,
          balanceBefore: 0, // Would calculate actual balance before
          balanceAfter: 0, // Would calculate actual balance after
        },
      });

      logger.info('Deposit processed successfully', {
        userId,
        paymentIntentId: paymentIntent.id,
        amount,
      });

    } catch (error) {
      logger.error('Failed to process successful payment', {
        userId,
        paymentIntentId: paymentIntent.id,
        error,
      });
    }
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const userId = paymentIntent.metadata.userId;
    
    if (!userId) return;

    try {
      // Update payment record
      await prisma.paymentTransaction.update({
        where: { id: paymentIntent.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
        },
      });

      logger.info('Payment failure processed', {
        userId,
        paymentIntentId: paymentIntent.id,
        reason: paymentIntent.last_payment_error?.message,
      });

    } catch (error) {
      logger.error('Failed to process payment failure', {
        userId,
        paymentIntentId: paymentIntent.id,
        error,
      });
    }
  }

  private async handleSetupSuccess(setupIntent: Stripe.SetupIntent): Promise<void> {
    logger.info('Setup intent succeeded', {
      setupIntentId: setupIntent.id,
      paymentMethodId: setupIntent.payment_method,
    });
  }

  private async handleActionRequired(invoice: Stripe.Invoice): Promise<void> {
    logger.info('Payment action required', {
      invoiceId: invoice.id,
    });
  }

  private async handleChargebackCreated(dispute: Stripe.Dispute): Promise<void> {
    const chargeId = dispute.charge as string;
    
    try {
      // Find the payment transaction
      const payment = await prisma.paymentTransaction.findFirst({
        where: { id: chargeId },
      });

      if (payment) {
        // Update payment record
        await prisma.paymentTransaction.update({
          where: { id: payment.id },
          data: {
            chargebackAt: new Date(),
            chargebackAmount: dispute.amount / 100,
          },
        });

        // Create compliance alert
        await prisma.complianceAlert.create({
          data: {
            userId: payment.userId,
            alertType: 'LARGE_TRANSACTION' as any,
            severity: 'HIGH',
            title: 'Chargeback Received',
            description: `Chargeback of ${dispute.amount / 100} ${dispute.currency} received`,
            details: JSON.stringify({
              disputeId: dispute.id,
              reason: dispute.reason,
              status: dispute.status,
            }),
            status: 'OPEN',
          },
        });

        logger.error('Chargeback created', {
          userId: payment.userId,
          disputeId: dispute.id,
          amount: dispute.amount / 100,
          reason: dispute.reason,
        });
      }

    } catch (error) {
      logger.error('Failed to process chargeback', {
        disputeId: dispute.id,
        error,
      });
    }
  }
}

// Export singleton instance
export const stripeProcessor = new StripePaymentProcessor();
