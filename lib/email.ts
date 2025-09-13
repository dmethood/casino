import nodemailer from 'nodemailer';
import { logger } from './logger';

export interface EmailConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
  to?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig;
  private enabled: boolean = false;

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_USER,
      to: process.env.CONTACT_TO,
    };

    this.initialize();
  }

  private initialize() {
    if (!this.config.host || !this.config.user || !this.config.pass) {
      logger.warn('SMTP configuration incomplete. Email functionality disabled.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      this.enabled = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.enabled = false;
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      logger.warn('Email service not enabled. Skipping email send.');
      return false;
    }

    try {
      const result = await this.transporter.sendMail({
        from: this.config.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
      });

      logger.info('Email sent successfully:', { messageId: result.messageId });
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  async sendContactFormNotification(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    locale: string;
  }): Promise<boolean> {
    if (!this.config.to) {
      logger.warn('No contact email configured. Skipping notification.');
      return false;
    }

    const subject = `New Contact Form Message: ${data.subject}`;
    const text = `
New contact form submission:

Name: ${data.name}
Email: ${data.email}
Language: ${data.locale}
Subject: ${data.subject}

Message:
${data.message}

--
This message was sent from the contact form on your website.
    `.trim();

    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">New Contact Form Submission</h2>
  
  <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
    <p><strong>Name:</strong> ${data.name}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Language:</strong> ${data.locale}</p>
    <p><strong>Subject:</strong> ${data.subject}</p>
  </div>
  
  <div style="margin: 20px 0;">
    <h3 style="color: #333;">Message:</h3>
    <p style="white-space: pre-line; background: #f9f9f9; padding: 15px; border-left: 4px solid #007cba;">${data.message}</p>
  </div>
  
  <hr style="border: none; height: 1px; background: #ddd; margin: 20px 0;">
  <p style="color: #666; font-size: 12px;">This message was sent from the contact form on your website.</p>
</div>
    `.trim();

    return this.sendEmail({
      to: this.config.to,
      subject,
      text,
      html,
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const emailService = new EmailService();
