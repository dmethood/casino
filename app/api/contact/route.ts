import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { emailService } from '@/lib/email';
import { contactRateLimit } from '@/lib/ratelimit';
import { verifyCSRF } from '@/lib/csrf';
import { createRequestLogger } from '@/lib/logger';

const contactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(1000),
  locale: z.enum(['en', 'ar']),
});

export async function POST(request: NextRequest) {
  const logger = createRequestLogger(request);

  try {
    // Apply rate limiting
    const rateLimitResult = contactRateLimit(request);
    if (!rateLimitResult.success) {
      logger.warn('Contact form rate limit exceeded', { ip: request.ip });
      return NextResponse.json(
        { error: 'Too many requests' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.reset.getTime() - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Verify CSRF token
    if (!verifyCSRF(request)) {
      logger.warn('Contact form CSRF verification failed');
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = contactSchema.parse(body);

    logger.info('Processing contact form submission', {
      email: validatedData.email,
      locale: validatedData.locale,
    });

    // Save to database
    const contactMessage = await prisma.contactMessage.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        subject: validatedData.subject,
        message: validatedData.message,
        locale: validatedData.locale,
      },
    });

    logger.info('Contact message saved to database', { id: contactMessage.id });

    // Send email notification (if configured)
    try {
      const emailSent = await emailService.sendContactFormNotification(validatedData);
      if (emailSent) {
        logger.info('Contact form notification email sent');
      } else {
        logger.warn('Contact form notification email not sent (service disabled or failed)');
      }
    } catch (emailError) {
      logger.error('Failed to send contact form notification email', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Contact form validation failed', { errors: error.errors });
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    logger.error('Contact form processing failed', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
