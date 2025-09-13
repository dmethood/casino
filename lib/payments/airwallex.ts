import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';

interface AirwallexConfig {
  clientId: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  baseUrl: string;
}

interface CreatePaymentIntentData {
  userId: string;
  amount: number; // Amount in cents
  currency: string;
  returnUrl?: string;
  metadata?: Record<string, string>;
}

interface CreatePayoutData {
  userId: string;
  amount: number;
  currency: string;
  beneficiary: {
    type: 'bank_account' | 'card';
    bankAccount?: {
      accountNumber: string;
      routingNumber: string;
      accountHolderName: string;
      bankName: string;
      bankCountry: string;
    };
    card?: {
      token: string;
    };
  };
  purpose?: string;
  metadata?: Record<string, string>;
}

interface PaymentMethodCreation {
  userId: string;
  type: 'card';
  cardDetails?: {
    number: string;
    expiry: string;
    cvc: string;
    holderName: string;
  };
  billingDetails?: {
    address: {
      line1: string;
      line2?: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
    };
  };
}

interface AirwallexAuthToken {
  accessToken: string;
  expiresAt: number;
}

export class AirwallexPaymentProcessor {
  private config: AirwallexConfig;
  private apiClient: AxiosInstance;
  private authToken: AirwallexAuthToken | null = null;

  constructor() {
    this.config = this.initializeConfig();
    this.apiClient = this.createApiClient();
  }

  private initializeConfig(): AirwallexConfig {
    const clientId = process.env.AIRWALLEX_CLIENT_ID;
    const apiKey = process.env.AIRWALLEX_API_KEY;
    const apiSecret = process.env.AIRWALLEX_API_SECRET;
    const webhookSecret = process.env.AIRWALLEX_WEBHOOK_SECRET;

    if (!clientId || !apiKey || !apiSecret || !webhookSecret) {
      throw new Error('FATAL: Airwallex configuration missing');
    }

    return {
      clientId,
      apiKey,
      apiSecret,
      webhookSecret,
      baseUrl: process.env.AIRWALLEX_BASE_URL || 'https://api.airwallex.com',
    };
  }

  private createApiClient(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': this.config.clientId,
      },
    });
  }

  /**
   * Authenticate with Airwallex API
   */
  private async authenticate(): Promise<string> {
    try {
      // Check if token is still valid
      if (this.authToken && Date.now() < this.authToken.expiresAt) {
        return this.authToken.accessToken;
      }

      const response = await this.apiClient.post('/api/v1/authentication/login', {
        x_client_id: this.config.clientId,
        x_api_key: this.config.apiKey,
      });

      this.authToken = {
        accessToken: response.data.token,
        expiresAt: Date.now() + (response.data.expires_in * 1000 - 60000), // 1 minute buffer
      };

      logger.info('Airwallex authentication successful');
      return this.authToken.accessToken;

    } catch (error) {
      logger.error('Airwallex authentication failed', error);
      throw new Error('Airwallex authentication failed');
    }
  }

  /**
   * Create payment intent for deposits
   */
  public async createPaymentIntent(data: CreatePaymentIntentData): Promise<{
    paymentIntentId: string;
    clientSecret: string;
    status: string;
    nextAction?: any;
  }> {
    try {
      // Validate user and amount
      await this.validatePaymentAmount(data.userId, data.amount);

      // Get user for compliance checks
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        include: { 
          kycProfile: true,
          wallet: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.kycProfile?.approved) {
        throw new Error('KYC verification required for deposits');
      }

      // Get authentication token
      const accessToken = await this.authenticate();

      // Create customer if not exists
      const customerId = await this.getOrCreateCustomer(user, accessToken);

      // Prepare payment intent data
      const paymentIntentData = {
        request_id: `pi_${Date.now()}_${user.id}`,
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        merchant_order_id: `order_${Date.now()}_${user.id}`,
        order: {
          type: 'payment_intent',
          products: [
            {
              name: 'Casino Deposit',
              code: 'casino_deposit',
              type: 'digital_goods',
              sku: 'deposit',
              quantity: 1,
              unit_price: data.amount,
              url: `${process.env.BASE_URL}/casino`,
            },
          ],
        },
        payment_method_options: {
          card: {
            auto_capture: true,
            three_ds_action: 'challenge_required', // Enforce 3DS for compliance
          },
        },
        return_url: data.returnUrl || `${process.env.BASE_URL}/casino/deposit/success`,
        metadata: {
          userId: data.userId,
          type: 'deposit',
          jurisdiction: user.kycProfile.jurisdiction,
          tier: user.kycProfile.tier,
          ...data.metadata,
        },
      };

      // Create payment intent
      const response = await this.apiClient.post('/api/v1/pa/payment_intents/create', paymentIntentData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const paymentIntent = response.data;

      // Create payment transaction record
      await this.createPaymentRecord(
        data.userId,
        paymentIntent.id,
        'DEPOSIT',
        data.amount,
        data.currency
      );

      logger.info('Airwallex payment intent created', {
        userId: data.userId,
        paymentIntentId: paymentIntent.id,
        amount: data.amount,
        currency: data.currency,
      });

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        nextAction: paymentIntent.next_action,
      };

    } catch (error) {
      logger.error('Airwallex payment intent creation failed', {
        userId: data.userId,
        amount: data.amount,
        error,
      });
      throw error;
    }
  }

  /**
   * Process payout/withdrawal
   */
  public async createPayout(data: CreatePayoutData): Promise<{
    payoutId: string;
    status: string;
    estimatedArrival?: Date;
  }> {
    try {
      // Validate withdrawal eligibility
      await this.validateWithdrawal(data.userId, data.amount);

      // Get user and wallet
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        include: { 
          wallet: true, 
          kycProfile: true,
        },
      });

      if (!user?.wallet) {
        throw new Error('Wallet not found');
      }

      if (user.wallet.balance * 100 < data.amount) {
        throw new Error('Insufficient funds');
      }

      if (!user.kycProfile?.approved) {
        throw new Error('KYC verification required for withdrawals');
      }

      // Get authentication token
      const accessToken = await this.authenticate();

      // Prepare payout data
      const payoutData = {
        request_id: `po_${Date.now()}_${user.id}`,
        source_currency: data.currency.toUpperCase(),
        source_amount: data.amount,
        reason: 'Casino withdrawal',
        beneficiary: data.beneficiary,
        metadata: {
          userId: data.userId,
          type: 'withdrawal',
          ...data.metadata,
        },
      };

      // Create payout
      const response = await this.apiClient.post('/api/v1/payouts/create', payoutData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const payout = response.data;

      // Freeze funds in wallet
      await prisma.wallet.update({
        where: { userId: data.userId },
        data: {
          frozenAmount: { increment: data.amount / 100 },
        },
      });

      // Create withdrawal record
      const withdrawalRecord = await this.createPaymentRecord(
        data.userId,
        payout.id,
        'WITHDRAWAL',
        data.amount,
        data.currency
      );

      logger.info('Airwallex payout created', {
        userId: data.userId,
        payoutId: payout.id,
        amount: data.amount,
        recordId: withdrawalRecord.id,
      });

      return {
        payoutId: payout.id,
        status: payout.status,
        estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      };

    } catch (error) {
      logger.error('Airwallex payout creation failed', { 
        userId: data.userId, 
        amount: data.amount, 
        error 
      });
      throw error;
    }
  }

  /**
   * Confirm payment intent (for 3DS flows)
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
      const accessToken = await this.authenticate();

      const confirmData: any = {
        request_id: `confirm_${Date.now()}`,
      };

      if (paymentMethodId) {
        confirmData.payment_method_id = paymentMethodId;
      }

      const response = await this.apiClient.post(
        `/api/v1/pa/payment_intents/${paymentIntentId}/confirm`,
        confirmData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const paymentIntent = response.data;

      logger.info('Airwallex payment intent confirmed', {
        paymentIntentId,
        status: paymentIntent.status,
      });

      return {
        status: paymentIntent.status,
        requiresAction: paymentIntent.status === 'requires_payment_method' || 
                       paymentIntent.status === 'requires_action',
        nextAction: paymentIntent.next_action,
      };

    } catch (error) {
      logger.error('Airwallex payment confirmation failed', { paymentIntentId, error });
      throw error;
    }
  }

  /**
   * Create payment method (tokenize card)
   */
  public async createPaymentMethod(data: PaymentMethodCreation): Promise<{
    paymentMethodId: string;
    type: string;
    card?: {
      last4: string;
      brand: string;
      expiry: string;
    };
  }> {
    try {
      const accessToken = await this.authenticate();

      // Get or create customer
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const customerId = await this.getOrCreateCustomer(user, accessToken);

      const paymentMethodData = {
        request_id: `pm_${Date.now()}_${data.userId}`,
        customer_id: customerId,
        type: data.type,
        card: data.cardDetails ? {
          number: data.cardDetails.number,
          expiry_month: data.cardDetails.expiry.split('/')[0],
          expiry_year: data.cardDetails.expiry.split('/')[1],
          cvc: data.cardDetails.cvc,
          name: data.cardDetails.holderName,
        } : undefined,
        billing: data.billingDetails,
      };

      const response = await this.apiClient.post('/api/v1/pa/payment_methods/create', paymentMethodData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const paymentMethod = response.data;

      logger.info('Airwallex payment method created', {
        userId: data.userId,
        paymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
      });

      return {
        paymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          last4: paymentMethod.card.last4,
          brand: paymentMethod.card.brand,
          expiry: `${paymentMethod.card.expiry_month}/${paymentMethod.card.expiry_year}`,
        } : undefined,
      };

    } catch (error) {
      logger.error('Airwallex payment method creation failed', { 
        userId: data.userId, 
        error 
      });
      throw error;
    }
  }

  /**
   * Handle Airwallex webhooks
   */
  public async handleWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<void> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const event = JSON.parse(payload.toString());

      logger.info('Airwallex webhook received', {
        type: event.name,
        id: event.id,
      });

      switch (event.name) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;

        case 'payout.created':
          await this.handlePayoutCreated(event.data.object);
          break;

        case 'payout.succeeded':
          await this.handlePayoutSuccess(event.data.object);
          break;

        case 'payout.failed':
          await this.handlePayoutFailure(event.data.object);
          break;

        default:
          logger.info('Unhandled webhook type', { type: event.name });
      }

    } catch (error) {
      logger.error('Airwallex webhook handling failed', { error });
      throw error;
    }
  }

  /**
   * Get stored payment methods for user
   */
  public async getPaymentMethods(userId: string): Promise<Array<{
    id: string;
    type: string;
    card?: {
      brand: string;
      last4: string;
      expiry: string;
    };
    created: Date;
  }>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return [];
      }

      const accessToken = await this.authenticate();
      const customerId = await this.getCustomerId(userId);

      if (!customerId) {
        return [];
      }

      const response = await this.apiClient.get(
        `/api/v1/pa/customers/${customerId}/payment_methods`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const paymentMethods = response.data.items || [];

      return paymentMethods.map((pm: any) => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expiry: `${pm.card.expiry_month}/${pm.card.expiry_year}`,
        } : undefined,
        created: new Date(pm.created_at),
      }));

    } catch (error) {
      logger.error('Failed to retrieve Airwallex payment methods', { userId, error });
      return [];
    }
  }

  // Private helper methods

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
  }

  private async getOrCreateCustomer(user: any, accessToken: string): Promise<string> {
    // Check if customer already exists
    const existingCustomerId = await this.getCustomerId(user.id);
    if (existingCustomerId) {
      return existingCustomerId;
    }

    // Create new customer
    const customerData = {
      request_id: `customer_${Date.now()}_${user.id}`,
      merchant_customer_id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      phone_number: user.phoneNumber,
    };

    const response = await this.apiClient.post('/api/v1/pa/customers/create', customerData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const customer = response.data;

    // Store customer ID (would be added to User model)
    // await prisma.user.update({
    //   where: { id: user.id },
    //   data: { airwallexCustomerId: customer.id }
    // });

    return customer.id;
  }

  private async getCustomerId(userId: string): Promise<string | null> {
    // Implementation would retrieve Airwallex customer ID for user
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
        amount: amount / 100,
        currency,
        provider: 'AIRWALLEX',
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

  private verifyWebhookSignature(payload: string | Buffer, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Webhook handlers

  private async handlePaymentSuccess(paymentIntent: any): Promise<void> {
    const userId = paymentIntent.metadata?.userId;
    
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
          threeDSecure: true, // Airwallex enforces 3DS
        },
      });

      // Credit user's wallet
      const amount = paymentIntent.amount / 100;
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
          reason: 'Card deposit via Airwallex',
          referenceId: paymentIntent.id,
          balanceBefore: 0, // Would calculate actual
          balanceAfter: 0, // Would calculate actual
        },
      });

      logger.info('Airwallex deposit processed successfully', {
        userId,
        paymentIntentId: paymentIntent.id,
        amount,
      });

    } catch (error) {
      logger.error('Failed to process successful Airwallex payment', {
        userId,
        paymentIntentId: paymentIntent.id,
        error,
      });
    }
  }

  private async handlePaymentFailure(paymentIntent: any): Promise<void> {
    const userId = paymentIntent.metadata?.userId;
    
    if (!userId) return;

    try {
      await prisma.paymentTransaction.update({
        where: { id: paymentIntent.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: paymentIntent.latest_payment_error?.message || 'Payment failed',
        },
      });

      logger.info('Airwallex payment failure processed', {
        userId,
        paymentIntentId: paymentIntent.id,
        reason: paymentIntent.latest_payment_error?.message,
      });

    } catch (error) {
      logger.error('Failed to process Airwallex payment failure', {
        userId,
        paymentIntentId: paymentIntent.id,
        error,
      });
    }
  }

  private async handlePayoutCreated(payout: any): Promise<void> {
    logger.info('Airwallex payout created', {
      payoutId: payout.id,
      status: payout.status,
    });
  }

  private async handlePayoutSuccess(payout: any): Promise<void> {
    const userId = payout.metadata?.userId;
    
    if (!userId) return;

    try {
      // Update payment record
      await prisma.paymentTransaction.update({
        where: { id: payout.id },
        data: {
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      });

      // Unfreeze funds and record transaction
      const amount = payout.source_amount / 100;
      await prisma.wallet.update({
        where: { userId },
        data: {
          frozenAmount: { decrement: amount },
          lastTransaction: new Date(),
        },
      });

      logger.info('Airwallex payout processed successfully', {
        userId,
        payoutId: payout.id,
        amount,
      });

    } catch (error) {
      logger.error('Failed to process successful Airwallex payout', {
        userId,
        payoutId: payout.id,
        error,
      });
    }
  }

  private async handlePayoutFailure(payout: any): Promise<void> {
    const userId = payout.metadata?.userId;
    
    if (!userId) return;

    try {
      // Update payment record
      await prisma.paymentTransaction.update({
        where: { id: payout.id },
        data: {
          status: 'FAILED',
          failedAt: new Date(),
          failureReason: payout.failure_reason || 'Payout failed',
        },
      });

      // Return frozen funds to available balance
      const amount = payout.source_amount / 100;
      await prisma.wallet.update({
        where: { userId },
        data: {
          frozenAmount: { decrement: amount },
          balance: { increment: amount },
        },
      });

      logger.info('Airwallex payout failure processed', {
        userId,
        payoutId: payout.id,
        reason: payout.failure_reason,
      });

    } catch (error) {
      logger.error('Failed to process Airwallex payout failure', {
        userId,
        payoutId: payout.id,
        error,
      });
    }
  }
}

// Export singleton instance
export const airwallexProcessor = new AirwallexPaymentProcessor();