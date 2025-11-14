/**
 * Validation Schemas Tests
 *
 * This file contains tests for form validation schemas.
 * Tests verify that validation rules work as expected.
 */

import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  resetPasswordSchema,
  calculatePasswordStrength,
} from '../validations';

describe('loginSchema', () => {
  it('should validate correct login data', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email format', () => {
    const result = loginSchema.safeParse({
      email: 'invalid-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('should validate correct registration data', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    expect(result.success).toBe(true);
  });

  it('should reject password without uppercase', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password without lowercase', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'PASSWORD123',
      confirmPassword: 'PASSWORD123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password without number', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'PasswordABC',
      confirmPassword: 'PasswordABC',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'Pass12',
      confirmPassword: 'Pass12',
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-matching passwords', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123',
      confirmPassword: 'Password456',
    });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('should validate correct password change data', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPassword123',
      newPassword: 'NewPassword456',
      confirmNewPassword: 'NewPassword456',
    });
    expect(result.success).toBe(true);
  });

  it('should reject when new passwords do not match', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPassword123',
      newPassword: 'NewPassword456',
      confirmNewPassword: 'NewPassword789',
    });
    expect(result.success).toBe(false);
  });

  it('should reject when new password is same as current', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'Password123',
      newPassword: 'Password123',
      confirmNewPassword: 'Password123',
    });
    expect(result.success).toBe(false);
  });

  it('should reject weak new password', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'OldPassword123',
      newPassword: 'weak',
      confirmNewPassword: 'weak',
    });
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('should validate correct email', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'test@example.com',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = resetPasswordSchema.safeParse({
      email: 'invalid-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('calculatePasswordStrength', () => {
  it('should return weak for empty password', () => {
    const result = calculatePasswordStrength('');
    expect(result.strength).toBe('weak');
    expect(result.score).toBe(0);
  });

  it('should return weak for short password', () => {
    const result = calculatePasswordStrength('Pass1');
    expect(result.strength).toBe('weak');
  });

  it('should return medium for decent password', () => {
    const result = calculatePasswordStrength('Password123');
    expect(result.strength).toBe('medium');
  });

  it('should return strong for strong password', () => {
    const result = calculatePasswordStrength('StrongP@ssw0rd123!');
    expect(result.strength).toBe('strong');
  });

  it('should provide feedback for missing requirements', () => {
    const result = calculatePasswordStrength('password');
    expect(result.feedback).toContain('Add uppercase letters');
    expect(result.feedback).toContain('Add numbers');
  });
});
