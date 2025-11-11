/**
 * Email Service
 *
 * Mock implementation that logs emails to console for development.
 * Can be easily replaced with real SMTP implementation later.
 *
 * @module email/EmailService
 */

import type {
  EmailConfig,
  PasswordResetEmailData,
  EmailVerificationData,
  IEmailService,
  EmailServiceConfig,
} from './types';

/**
 * Mock Email Service
 *
 * Logs emails to console instead of actually sending them.
 * Perfect for development and testing without needing SMTP credentials.
 *
 * @example
 * ```typescript
 * const emailService = new EmailService();
 * await emailService.sendPasswordReset({
 *   email: 'user@example.com',
 *   firstName: 'John',
 *   token: 'abc123...'
 * });
 * // Logs formatted email to console
 * ```
 */
export class EmailService implements IEmailService {
  private config: EmailServiceConfig;

  constructor() {
    this.config = {
      mode: 'mock',
      clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
      fromEmail: process.env.EMAIL_FROM || 'noreply@workscript.com',
    };
  }

  /**
   * Send a generic email (mock implementation)
   *
   * @param config - Email configuration
   */
  async sendEmail(config: EmailConfig): Promise<void> {
    console.log('\n' + '='.repeat(80));
    console.log('📧 MOCK EMAIL SERVICE - Email would be sent:');
    console.log('='.repeat(80));
    console.log(`From:    ${config.from || this.config.fromEmail}`);
    console.log(`To:      ${config.to}`);
    console.log(`Subject: ${config.subject}`);
    console.log('-'.repeat(80));

    if (config.html) {
      console.log('HTML Body:');
      console.log(config.html);
    } else if (config.text) {
      console.log('Text Body:');
      console.log(config.text);
    }

    console.log('='.repeat(80) + '\n');
  }

  /**
   * Send password reset email
   *
   * Generates a formatted email with a password reset link.
   * In mock mode, logs to console. In production, would send via SMTP.
   *
   * @param data - Password reset email data
   *
   * @example
   * ```typescript
   * await emailService.sendPasswordReset({
   *   email: 'user@example.com',
   *   firstName: 'John',
   *   token: 'abc123xyz456',
   *   expiryMinutes: 30
   * });
   * ```
   */
  async sendPasswordReset(data: PasswordResetEmailData): Promise<void> {
    const resetLink = `${this.config.clientUrl}/reset-password?token=${data.token}`;
    const expiryMinutes = data.expiryMinutes || 30;
    const greeting = data.firstName ? `Hi ${data.firstName}` : 'Hello';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button {
              display: inline-block;
              background: #4f46e5;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer { color: #6b7280; font-size: 14px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>${greeting},</p>

              <p>We received a request to reset your password for your Workscript account.</p>

              <p>Click the button below to reset your password:</p>

              <a href="${resetLink}" class="button">Reset Password</a>

              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #4f46e5;">${resetLink}</p>

              <div class="warning">
                ⏰ <strong>This link expires in ${expiryMinutes} minutes</strong>
              </div>

              <p><strong>Didn't request this?</strong><br>
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>

              <div class="footer">
                <p>Best regards,<br>The Workscript Team</p>
                <p style="font-size: 12px; color: #9ca3af;">
                  This is an automated email. Please do not reply to this message.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
${greeting},

We received a request to reset your password for your Workscript account.

Click the link below to reset your password:
${resetLink}

⏰ This link expires in ${expiryMinutes} minutes.

Didn't request this?
If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

Best regards,
The Workscript Team
    `;

    await this.sendEmail({
      to: data.email,
      subject: 'Reset Your Password - Workscript',
      html,
      text,
    });
  }

  /**
   * Send email verification email
   *
   * Generates a formatted email with an email verification link.
   * In mock mode, logs to console. In production, would send via SMTP.
   *
   * @param data - Email verification data
   *
   * @example
   * ```typescript
   * await emailService.sendVerificationEmail({
   *   email: 'user@example.com',
   *   firstName: 'John',
   *   token: 'abc123xyz456',
   *   expiryHours: 24
   * });
   * ```
   */
  async sendVerificationEmail(data: EmailVerificationData): Promise<void> {
    const verifyLink = `${this.config.clientUrl}/verify-email?token=${data.token}`;
    const expiryHours = data.expiryHours || 24;
    const greeting = data.firstName ? `Hi ${data.firstName}` : 'Hello';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer { color: #6b7280; font-size: 14px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
            .info { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✉️ Verify Your Email</h1>
            </div>
            <div class="content">
              <p>${greeting},</p>

              <p>Welcome to Workscript! 🎉</p>

              <p>To complete your registration and start using your account, please verify your email address by clicking the button below:</p>

              <a href="${verifyLink}" class="button">Verify Email Address</a>

              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #10b981;">${verifyLink}</p>

              <div class="info">
                ⏰ <strong>This link expires in ${expiryHours} hours</strong>
              </div>

              <p><strong>Didn't create an account?</strong><br>
              If you didn't create an account with Workscript, you can safely ignore this email.</p>

              <div class="footer">
                <p>Best regards,<br>The Workscript Team</p>
                <p style="font-size: 12px; color: #9ca3af;">
                  This is an automated email. Please do not reply to this message.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
${greeting},

Welcome to Workscript! 🎉

To complete your registration and start using your account, please verify your email address by clicking the link below:

${verifyLink}

⏰ This link expires in ${expiryHours} hours.

Didn't create an account?
If you didn't create an account with Workscript, you can safely ignore this email.

Best regards,
The Workscript Team
    `;

    await this.sendEmail({
      to: data.email,
      subject: 'Verify Your Email - Workscript',
      html,
      text,
    });
  }
}

/**
 * Singleton instance for use throughout the application
 */
export const emailService = new EmailService();
