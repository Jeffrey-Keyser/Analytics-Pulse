import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';
import config from '../config/env';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email service using AWS SES
 */
export class EmailService {
  private sesClient: SESClient;
  private fromEmail: string;
  private fromName: string;
  private enabled: boolean;

  constructor() {
    // Initialize SES client
    this.sesClient = new SESClient({
      region: process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1'
    });

    this.fromEmail = process.env.EMAIL_FROM_ADDRESS || 'noreply@analytics-pulse.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Analytics Pulse';
    this.enabled = process.env.EMAIL_ENABLED !== 'false'; // Enabled by default

    if (!this.enabled) {
      console.warn('[EmailService] Email service is disabled. Set EMAIL_ENABLED=true to enable.');
    }
  }

  /**
   * Send an email via AWS SES
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    if (!this.enabled) {
      console.log('[EmailService] Email sending is disabled, skipping:', options.to);
      return {
        success: false,
        error: 'Email service is disabled'
      };
    }

    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];

      const params: SendEmailCommandInput = {
        Source: `${this.fromName} <${this.fromEmail}>`,
        Destination: {
          ToAddresses: recipients
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: options.html,
              Charset: 'UTF-8'
            },
            ...(options.text && {
              Text: {
                Data: options.text,
                Charset: 'UTF-8'
              }
            })
          }
        },
        ...(options.replyTo && {
          ReplyToAddresses: [options.replyTo]
        })
      };

      const command = new SendEmailCommand(params);
      const response = await this.sesClient.send(command);

      console.log('[EmailService] Email sent successfully:', {
        messageId: response.MessageId,
        to: recipients
      });

      return {
        success: true,
        messageId: response.MessageId
      };
    } catch (error: any) {
      console.error('[EmailService] Failed to send email:', {
        error: error.message,
        to: options.to
      });

      return {
        success: false,
        error: error.message || 'Unknown error occurred while sending email'
      };
    }
  }

  /**
   * Send analytics report email
   */
  async sendReport(
    recipientEmail: string,
    subject: string,
    htmlContent: string,
    textContent?: string
  ): Promise<EmailResult> {
    return this.send({
      to: recipientEmail,
      subject,
      html: htmlContent,
      text: textContent
    });
  }

  /**
   * Send test email
   */
  async sendTest(recipientEmail: string): Promise<EmailResult> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Test Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">Test Email from Analytics Pulse</h1>
            <p>This is a test email to verify your email configuration is working correctly.</p>
            <p>If you received this email, your email reporting system is set up properly!</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="font-size: 12px; color: #6b7280;">
              This is an automated test email from Analytics Pulse.
            </p>
          </div>
        </body>
      </html>
    `;

    const text = `
      Test Email from Analytics Pulse

      This is a test email to verify your email configuration is working correctly.

      If you received this email, your email reporting system is set up properly!

      ---
      This is an automated test email from Analytics Pulse.
    `;

    return this.send({
      to: recipientEmail,
      subject: 'Test Email from Analytics Pulse',
      html,
      text
    });
  }

  /**
   * Verify SES configuration
   */
  async verifyConfiguration(): Promise<{ configured: boolean; error?: string }> {
    if (!this.enabled) {
      return {
        configured: false,
        error: 'Email service is disabled'
      };
    }

    try {
      // Try to get SES account sending enabled status
      // This is a simple check to see if we can communicate with SES
      await this.sesClient.config.region();

      return {
        configured: true
      };
    } catch (error: any) {
      return {
        configured: false,
        error: error.message || 'Failed to verify SES configuration'
      };
    }
  }
}

// Export singleton instance
export default new EmailService();
