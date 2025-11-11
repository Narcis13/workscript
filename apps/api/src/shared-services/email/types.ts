/**
 * Email Service Types
 *
 * Type definitions for the email service used throughout the authentication system.
 * Currently uses a mock implementation that logs to console, but designed to be
 * easily swappable with real SMTP providers (Gmail, SendGrid, etc.)
 *
 * @module email/types
 */

/**
 * Base email configuration
 */
export interface EmailConfig {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** Plain text email body */
  text?: string;
  /** HTML email body (preferred) */
  html?: string;
  /** Sender email address (defaults to EMAIL_FROM env var) */
  from?: string;
}

/**
 * Password reset email data
 */
export interface PasswordResetEmailData {
  /** User's email address */
  email: string;
  /** User's first name (optional, for personalization) */
  firstName?: string;
  /** Password reset token (to be included in link) */
  token: string;
  /** Expiry time in minutes (default: 30) */
  expiryMinutes?: number;
}

/**
 * Email verification email data
 */
export interface EmailVerificationData {
  /** User's email address */
  email: string;
  /** User's first name (optional, for personalization) */
  firstName?: string;
  /** Email verification token (to be included in link) */
  token: string;
  /** Expiry time in hours (default: 24) */
  expiryHours?: number;
}

/**
 * Email service interface
 *
 * Implement this interface to create different email providers
 * (Mock, SMTP, SendGrid, AWS SES, etc.)
 */
export interface IEmailService {
  /**
   * Send a generic email
   */
  sendEmail(config: EmailConfig): Promise<void>;

  /**
   * Send password reset email with reset link
   */
  sendPasswordReset(data: PasswordResetEmailData): Promise<void>;

  /**
   * Send email verification email with verification link
   */
  sendVerificationEmail(data: EmailVerificationData): Promise<void>;
}

/**
 * Email service configuration from environment
 */
export interface EmailServiceConfig {
  /** Email service mode: 'mock' | 'smtp' */
  mode: 'mock' | 'smtp';
  /** Frontend URL for generating links */
  clientUrl: string;
  /** Sender email address */
  fromEmail: string;
  /** SMTP configuration (only for 'smtp' mode) */
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
}
