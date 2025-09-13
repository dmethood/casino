import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = headers().get('stripe-signature')!;
  
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    logger.error('Webhook signature verification failed', err);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        logger.info('Unhandled webhook event type', { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const userId = paymentIntent.metadata.userId;
  
  await prisma.paymentTransaction.update({
    where: { id: paymentIntent.id },
    data: {
      status: 'COMPLETED',
      processedAt: new Date(),
    },
  });

  logger.info('Payment processed successfully', {
    userId,
    amount: paymentIntent.amount,
    paymentIntentId: paymentIntent.id,
  });
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  await prisma.paymentTransaction.update({
    where: { id: paymentIntent.id },
    data: {
      status: 'FAILED',
      failedAt: new Date(),
      failureReason: paymentIntent.last_payment_error?.message,
    },
  });

  logger.warn('Payment failed', {
    paymentIntentId: paymentIntent.id,
    reason: paymentIntent.last_payment_error?.message,
  });
}