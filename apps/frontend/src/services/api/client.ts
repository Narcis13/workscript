/**
 * API Client Configuration
 *
 * Centralized Axios client for all non-authentication API requests.
 * Features:
 * - Automatic JWT token injection via request interceptor
 * - Automatic token refresh on 401 responses
 * - Request retry after successful token refresh
 * - Global error handling
 * - Request/response logging in development
 *
 * Requirements Coverage:
 * - Requirement 16: Authentication Integration and Session Management
 * - Requirement 19: Error Handling, Validation, and User Feedback
 *
 * @module services/api/client
 */

import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { config } from '../../lib/config';

// ============================================
// CONSTANTS
// ============================================

/**
 * LocalStorage keys for token storage
 * Must match the keys used in AuthService
 */
const TOKEN_STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  EXPIRY_TIMESTAMP: 'token_expiry_timestamp',
} as const;

/**
 * Default timeout for API requests (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

// ============================================
// API CLIENT INSTANCE
// ============================================

/**
 * Main Axios instance for API requests
 * This should be used for all API calls except authentication endpoints
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: DEFAULT_TIMEOUT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// TOKEN MANAGEMENT
// ============================================

/**
 * Get the current access token from localStorage
 * @returns Access token or null if not found
 */
function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
}

/**
 * Get the current refresh token from localStorage
 * @returns Refresh token or null if not found
 */
function getRefreshToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
}

/**
 * Check if the token is close to expiration (within 5 minutes)
 * @returns true if token needs refresh
 */
function shouldRefreshToken(): boolean {
  const expiryTimestamp = localStorage.getItem(TOKEN_STORAGE_KEYS.EXPIRY_TIMESTAMP);
  if (!expiryTimestamp) {
    return false;
  }

  const expiry = new Date(expiryTimestamp).getTime();
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;

  return expiry - now < FIVE_MINUTES;
}

/**
 * Clear all authentication tokens from localStorage
 */
function clearTokens(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(TOKEN_STORAGE_KEYS.EXPIRY_TIMESTAMP);
}

// ============================================
// TOKEN REFRESH LOGIC
// ============================================

/**
 * Flag to prevent multiple simultaneous refresh requests
 */
let isRefreshing = false;

/**
 * Queue of callbacks waiting for token refresh to complete
 */
let refreshSubscribers: Array<(token: string) => void> = [];

/**
 * Add a callback to the refresh queue
 * @param callback - Function to call when refresh completes
 */
function subscribeToTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

/**
 * Execute all callbacks in the refresh queue with the new token
 * @param token - New access token
 */
function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

/**
 * Refresh the access token using the refresh token
 * @returns Promise resolving to new access token or null if refresh fails
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    console.warn('[API Client] No refresh token available');
    return null;
  }

  try {
    // Use a fresh axios instance to avoid interceptors
    const response = await axios.post(
      `${config.apiUrl}/auth/refresh`,
      { refreshToken },
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      }
    );

    const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;

    // Store new tokens
    localStorage.setItem(TOKEN_STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (newRefreshToken) {
      localStorage.setItem(TOKEN_STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
    }

    // Calculate and store expiry timestamp
    if (expiresIn) {
      const expiryDate = new Date(Date.now() + expiresIn * 1000);
      localStorage.setItem(TOKEN_STORAGE_KEYS.EXPIRY_TIMESTAMP, expiryDate.toISOString());
    }

    console.log('[API Client] Token refreshed successfully');
    return accessToken;
  } catch (error) {
    console.error('[API Client] Token refresh failed:', error);
    clearTokens();

    // Redirect to login page
    window.location.href = '/login?message=session-expired';
    return null;
  }
}

// ============================================
// REQUEST INTERCEPTOR
// ============================================

/**
 * Request interceptor - Inject access token into all requests
 */
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip token injection for auth endpoints
    if (config.url?.includes('/auth/')) {
      return config;
    }

    // Get current access token
    const accessToken = getAccessToken();

    if (accessToken) {
      // Inject token into Authorization header
      config.headers.Authorization = `Bearer ${accessToken}`;

      // Log request in development
      if (import.meta.env.DEV) {
        console.log(`[API Client] ${config.method?.toUpperCase()} ${config.url}`);
      }
    }

    return config;
  },
  (error) => {
    console.error('[API Client] Request error:', error);
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================

/**
 * Response interceptor - Handle 401 errors with automatic token refresh
 */
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`[API Client] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check if error is 401 Unauthorized
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Prevent infinite retry loop
      if (originalRequest.url?.includes('/auth/refresh')) {
        console.warn('[API Client] Token refresh endpoint returned 401, redirecting to login');
        clearTokens();
        window.location.href = '/login?message=session-expired';
        return Promise.reject(error);
      }

      // Mark this request as retried
      originalRequest._retry = true;

      // If a refresh is already in progress, wait for it
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeToTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      // Start token refresh
      isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();

        if (newToken) {
          // Update the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          // Notify all waiting requests
          onTokenRefreshed(newToken);

          // Retry the original request
          return apiClient(originalRequest);
        } else {
          // Refresh failed, reject all waiting requests
          return Promise.reject(error);
        }
      } catch (refreshError) {
        console.error('[API Client] Token refresh failed:', refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For other errors, log and reject
    if (import.meta.env.DEV) {
      console.error('[API Client] Response error:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
      });
    }

    return Promise.reject(error);
  }
);

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if the user is authenticated (has a valid token)
 * @returns true if user has an access token
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Logout the user by clearing tokens
 * This will trigger a redirect to login on the next API request
 */
export function logout(): void {
  clearTokens();
  window.location.href = '/login';
}

// ============================================
// EXPORTS
// ============================================

export default apiClient;
