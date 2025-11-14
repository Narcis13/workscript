/**
 * Form Validation Schemas
 *
 * This file contains Zod validation schemas for all authentication forms.
 * Schemas are used with react-hook-form for type-safe form validation.
 *
 * Requirements Coverage:
 * - Requirement 2: User Login - email and password validation
 * - Requirement 1: User Registration - email, password strength, confirmation
 * - Requirement 4: Password Change - current, new, confirm passwords
 * - Requirement 18: Form Validation - real-time validation with Zod
 */

import { z } from 'zod';

/**
 * Password validation requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
};

/**
 * Base password schema with security requirements
 * Validates: min 8 chars, uppercase, lowercase, number
 */
const passwordSchema = z
  .string()
  .min(passwordRequirements.minLength, {
    message: `Password must be at least ${passwordRequirements.minLength} characters`,
  })
  .regex(/[A-Z]/, {
    message: 'Password must contain at least one uppercase letter',
  })
  .regex(/[a-z]/, {
    message: 'Password must contain at least one lowercase letter',
  })
  .regex(/[0-9]/, {
    message: 'Password must contain at least one number',
  });

/**
 * Email validation schema
 * Validates proper email format
 */
const emailSchema = z
  .string()
  .min(1, { message: 'Email is required' })
  .email({ message: 'Invalid email format' });

/**
 * Login Form Validation Schema
 *
 * Fields:
 * - email: Required, valid email format
 * - password: Required, minimum length (login doesn't need full strength validation)
 *
 * Requirements: 2, 18
 * Acceptance Criteria:
 * - 2.2: Email must be validated as proper format
 * - 18.1: Email format validation on blur
 * - 18.3: All fields validated on submit
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'Password is required' }),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Register Form Validation Schema
 *
 * Fields:
 * - email: Required, valid email format
 * - password: Required, meets security requirements (min 8, uppercase, lowercase, number)
 * - confirmPassword: Required, must match password
 *
 * Requirements: 1, 18
 * Acceptance Criteria:
 * - 1.2: Email validated as proper format
 * - 1.3: Password meets security requirements (min 8, uppercase, lowercase, number)
 * - 18.2: Password strength validation in real-time
 * - 18.7: Password confirmation must match exactly
 */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'], // Set error on confirmPassword field
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Change Password Form Validation Schema
 *
 * Fields:
 * - currentPassword: Required
 * - newPassword: Required, meets security requirements
 * - confirmNewPassword: Required, must match newPassword
 *
 * Additional validation:
 * - New password must be different from current password
 *
 * Requirements: 4, 18
 * Acceptance Criteria:
 * - 4.3: New password meets security requirements
 * - 4.8: New password confirmation must match exactly
 * - Custom: New password should differ from current password
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Current password is required' }),
    newPassword: passwordSchema,
    confirmNewPassword: z.string().min(1, { message: 'Please confirm your new password' }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match',
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * Reset Password Form Validation Schema (UI Only)
 *
 * Fields:
 * - email: Required, valid email format
 *
 * Note: This is UI only - backend email functionality not implemented
 *
 * Requirements: 2, 8
 * Acceptance Criteria:
 * - Email format validation
 */
export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/**
 * Password Strength Calculator
 *
 * Calculates password strength based on:
 * - Length (0-4 points)
 * - Character variety (uppercase, lowercase, numbers, special chars)
 *
 * Returns:
 * - strength: 'weak' | 'medium' | 'strong'
 * - score: 0-10
 * - feedback: Array of missing requirements
 *
 * Used for: Requirement 1.4 - Password strength indicator
 */
export function calculatePasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  feedback: string[];
} {
  if (!password) {
    return { strength: 'weak', score: 0, feedback: ['Password is required'] };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length check (0-4 points)
  if (password.length >= 8) score += 2;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  if (password.length < 8) {
    feedback.push('Use at least 8 characters');
  }

  // Character variety checks (1 point each)
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add uppercase letters');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add numbers');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 2; // Special characters worth more
  } else {
    feedback.push('Add special characters for extra security');
  }

  // Determine strength level
  let strength: 'weak' | 'medium' | 'strong';
  if (score <= 4) {
    strength = 'weak';
  } else if (score <= 7) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return { strength, score, feedback };
}

/**
 * Password Strength Colors
 *
 * Maps strength levels to Tailwind CSS color classes
 * Used for visual password strength indicator
 */
export const passwordStrengthColors = {
  weak: 'bg-red-500',
  medium: 'bg-yellow-500',
  strong: 'bg-green-500',
} as const;

/**
 * Password Strength Text
 *
 * Maps strength levels to display text
 */
export const passwordStrengthText = {
  weak: 'Weak',
  medium: 'Medium',
  strong: 'Strong',
} as const;
