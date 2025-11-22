/**
 * Authentication Service
 *
 * Singleton service that handles all authentication-related API communication.
 * Features:
 * - Token management (storage, retrieval, expiry checking)
 * - Automatic token refresh via axios interceptors
 * - Prevention of multiple simultaneous refresh requests
 * - Automatic retry of failed requests after successful token refresh
 * - User authentication methods (login, register, logout, getCurrentUser)
 * - Password management (changePassword)
 *
 * @module services/AuthService
 */

import axios, { type AxiosInstance, AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { config } from '../lib/config';
import { getErrorMessage } from '../lib/errorHandling';
import type {
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  LogoutRequest,
  LogoutResponse,
  GetCurrentUserResponse,
  AuthTokens,
} from '../types/auth';

// ============================================
// CONSTANTS
// ============================================

/**
 * LocalStorage keys for token storage
 */
const TOKEN_STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  EXPIRY_TIMESTAMP: 'token_expiry_timestamp',
} as const;

/**
 * Token refresh buffer in milliseconds (5 minutes before actual expiry)
 * This allows proactive token refresh before the token actually expires
 */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

// ============================================
// AUTHENTICATION SERVICE CLASS
// ============================================

/**
 * AuthService - Singleton authentication service
 *
 * This service manages all authentication-related functionality including:
 * - User registration, login, logout
 * - Token storage and retrieval
 * - Automatic token refresh on 401 responses
 * - Password management
 *
 * @class AuthService
 */
class AuthService {
  private axiosInstance: AxiosInstance;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  /**
   * Constructor - Creates axios instance with interceptors
   * @private
   */
  constructor() {
    // Create a dedicated axios instance for auth requests
    this.axiosInstance = axios.create({
      baseURL: config.apiUrl,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  // ============================================
  // INTERCEPTOR SETUP
  // ============================================

  /**
   * Setup request and response interceptors for automatic token handling
   * @private
   */
  private setupInterceptors(): void {
    // Request interceptor - Add access token to all requests
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const accessToken = this.getAccessToken();

        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle 401 errors with automatic token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response, // Pass through successful responses
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Check if error is 401 and we haven't already retried
        if (error.response?.status === 401 && !originalRequest._retry) {
          // Don't try to refresh on login/register/refresh endpoints
          // Use exact path matching to avoid false positives
          const requestPath = originalRequest.url || '';
          const authEndpoints = ['/auth/login', '/auth/register', '/auth/refresh'];
          const isAuthEndpoint = authEndpoints.some(endpoint =>
            requestPath === endpoint || requestPath.endsWith(endpoint)
          );

          if (isAuthEndpoint) {
            return Promise.reject(error);
          }

          // Mark request as retried to prevent infinite loops
          originalRequest._retry = true;

          // If already refreshing, wait for the refresh to complete
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.axiosInstance(originalRequest));
              });
            });
          }

          // Start refresh process
          this.isRefreshing = true;

          try {
            const newAccessToken = await this.refreshAccessToken();

            // Update the original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }

            // Notify all subscribers waiting for refresh
            this.onRefreshSuccess(newAccessToken);

            // Retry the original request
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            // Refresh failed - clear tokens and reject
            this.onRefreshFailure();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
            this.refreshSubscribers = [];
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Called when token refresh succeeds - notifies all waiting requests
   * @private
   */
  private onRefreshSuccess(token: string): void {
    this.refreshSubscribers.forEach((callback) => callback(token));
  }

  /**
   * Called when token refresh fails - clear tokens and logout user
   * @private
   *
   * TODO: Add event emitter to notify components of logout (for toast notifications)
   * TODO: Consider adding configurable redirect behavior
   */
  private onRefreshFailure(): void {
    this.clearTokens();
    // Optionally redirect to login page here
    // window.location.href = '/login';
  }

  // ============================================
  // TOKEN MANAGEMENT (PRIVATE)
  // ============================================

  /**
   * Store authentication tokens in localStorage
   * @private
   * @param tokens - Access and refresh tokens with expiry info
   */
  private setTokens(tokens: { accessToken: string; refreshToken: string; expiresIn: number }): void {
    const expiryTimestamp = Date.now() + (tokens.expiresIn * 1000);

    localStorage.setItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    localStorage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    localStorage.setItem(TOKEN_STORAGE_KEYS.EXPIRY_TIMESTAMP, expiryTimestamp.toString());
  }

  /**
   * Get access token from localStorage
   * @private
   * @returns Access token or null if not found
   */
  private getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Get refresh token from localStorage
   * @private
   * @returns Refresh token or null if not found
   */
  private getRefreshToken(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Get token expiry timestamp from localStorage
   * @private
   * @returns Expiry timestamp or null if not found
   */
  private getExpiryTimestamp(): number | null {
    const timestamp = localStorage.getItem(TOKEN_STORAGE_KEYS.EXPIRY_TIMESTAMP);
    return timestamp ? parseInt(timestamp, 10) : null;
  }

  // ============================================
  // TOKEN MANAGEMENT (PUBLIC)
  // ============================================

  /**
   * Clear all tokens from localStorage
   * Called on logout or when refresh fails
   */
  public clearTokens(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(TOKEN_STORAGE_KEYS.EXPIRY_TIMESTAMP);
  }

  /**
   * Check if access token is expired or will expire soon
   * @returns true if token is expired or will expire within buffer time
   */
  public isTokenExpired(): boolean {
    const expiryTimestamp = this.getExpiryTimestamp();

    if (!expiryTimestamp) {
      return true; // No expiry timestamp means no valid token
    }

    // Check if token is expired or will expire within buffer time
    const now = Date.now();
    return now >= (expiryTimestamp - TOKEN_REFRESH_BUFFER_MS);
  }

  /**
   * Check if user is authenticated (has valid tokens)
   * @returns true if user has access and refresh tokens
   */
  public isAuthenticated(): boolean {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();

    return !!(accessToken && refreshToken);
  }

  // ============================================
  // TOKEN REFRESH
  // ============================================

  /**
   * Refresh the access token using the refresh token
   * @private
   * @returns New access token
   * @throws Error if refresh fails
   */
  private async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.axiosInstance.post<RefreshTokenResponse>(
        '/auth/refresh',
        { refreshToken } as RefreshTokenRequest
      );

      const { accessToken, refreshToken: newRefreshToken } = response.data.data;

      // Store new tokens (backend implements token rotation)
      // Note: expiresIn is not returned by refresh endpoint, use default 15 min (900 seconds)
      // TODO: Request backend to return expiresIn in refresh response for accurate token management
      this.setTokens({
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900, // 15 minutes
      });

      return accessToken;
    } catch (error) {
      // Refresh failed - clear tokens
      this.clearTokens();
      throw error;
    }
  }

  // ============================================
  // AUTHENTICATION METHODS
  // ============================================

  /**
   * Register a new user account
   * @param email - User email address
   * @param password - User password (min 8 chars, uppercase, lowercase, number)
   * @returns User object and tokens
   * @throws Error if registration fails
   */
  async register(email: string, password: string): Promise<User> {
    try {
      const response = await this.axiosInstance.post<RegisterResponse>(
        '/auth/register',
        { email, password } as RegisterRequest
      );

      const { user, accessToken, refreshToken, expiresIn } = response.data.data;

      // Store tokens
      this.setTokens({ accessToken, refreshToken, expiresIn });

      return user;
    } catch (error) {
      // Use centralized error handling
      const message = getErrorMessage(error, 'register');
      throw new Error(message);
    }
  }

  /**
   * Login with email and password
   * @param email - User email address
   * @param password - User password
   * @returns User object and tokens
   * @throws Error if login fails
   */
  async login(email: string, password: string): Promise<User> {
    try {
      const response = await this.axiosInstance.post<LoginResponse>(
        '/auth/login',
        { email, password } as LoginRequest
      );

      const { user, accessToken, refreshToken, expiresIn } = response.data.data;

      // Store tokens
      this.setTokens({ accessToken, refreshToken, expiresIn });

      return user;
    } catch (error) {
      // Use centralized error handling
      const message = getErrorMessage(error, 'login');
      throw new Error(message);
    }
  }

  /**
   * Logout current user
   * Calls logout endpoint and clears local tokens
   * @throws Error if logout API call fails (tokens are cleared regardless)
   */
  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();

    try {
      if (refreshToken) {
        // Call logout endpoint to invalidate tokens on backend
        await this.axiosInstance.post<LogoutResponse>(
          '/auth/logout',
          { refreshToken } as LogoutRequest
        );
      }
    } catch (error) {
      // Log error but don't throw - we still want to clear local tokens
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear tokens locally
      this.clearTokens();
    }
  }

  /**
   * Get current authenticated user
   * @returns Current user object
   * @throws Error if not authenticated or request fails
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.axiosInstance.get<GetCurrentUserResponse>('/auth/me');
      return response.data.data;
    } catch (error) {
      // Use centralized error handling
      const message = getErrorMessage(error, 'fetchUser');
      throw new Error(message);
    }
  }

  /**
   * Change user password
   * @param currentPassword - Current password for verification
   * @param newPassword - New password (must meet security requirements)
   * @returns Success message
   * @throws Error if password change fails
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<string> {
    try {
      const response = await this.axiosInstance.post<ChangePasswordResponse>(
        '/auth/change-password',
        { currentPassword, newPassword } as ChangePasswordRequest
      );

      return response.data.message;
    } catch (error) {
      // Use centralized error handling
      const message = getErrorMessage(error, 'changePassword');
      throw new Error(message);
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

/**
 * Singleton instance of AuthService
 * Import this instance to use authentication functionality throughout the app
 *
 * @example
 * ```typescript
 * import { authService } from '@/services/AuthService';
 *
 * // Login
 * const user = await authService.login('user@example.com', 'password123');
 *
 * // Register
 * const newUser = await authService.register('new@example.com', 'Password123');
 *
 * // Get current user
 * const currentUser = await authService.getCurrentUser();
 *
 * // Logout
 * await authService.logout();
 *
 * // Check authentication status
 * if (authService.isAuthenticated()) {
 *   console.log('User is logged in');
 * }
 * ```
 */
export const authService = new AuthService();

/**
 * Export the AuthService class for type reference
 */
export type { AuthService };

/**
 * Default export for convenience
 */
export default authService;
