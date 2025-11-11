# Authentication Integration Guide

**Version:** 1.0.0
**Last Updated:** November 2025

This guide provides comprehensive examples and patterns for integrating the Workscript authentication system into your applications.

---

## Table of Contents

1. [Frontend Integration](#frontend-integration)
2. [Mobile Integration](#mobile-integration)
3. [Server-to-Server Authentication](#server-to-server-authentication)
4. [Testing Authenticated Endpoints](#testing-authenticated-endpoints)
5. [Common Patterns & Best Practices](#common-patterns--best-practices)
6. [Migration Guide](#migration-guide)
7. [Troubleshooting](#troubleshooting)

---

## Frontend Integration

### React Authentication Service

Create a centralized authentication service for your React application:

```typescript
// src/services/AuthService.ts

import axios, { AxiosInstance } from 'axios';

export interface User {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

class AuthService {
  private api: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3013',
      withCredentials: true, // Important for session cookies
    });

    // Setup request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Setup response interceptor for auto token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not a refresh request, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();

            // Update the failed request with new token
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            // Retry the original request
            return this.api(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Register a new user
   */
  async register(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await this.api.post('/auth/register', { email, password });
    const { user, accessToken, refreshToken, expiresIn } = response.data.data;

    // Store tokens
    this.setTokens({ accessToken, refreshToken, expiresIn });

    return { user, tokens: { accessToken, refreshToken, expiresIn } };
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await this.api.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken, expiresIn } = response.data.data;

    // Store tokens
    this.setTokens({ accessToken, refreshToken, expiresIn });

    return { user, tokens: { accessToken, refreshToken, expiresIn } };
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();

    try {
      await this.api.post('/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens regardless of API response
      this.clearTokens();
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User> {
    const response = await this.api.get('/auth/me');
    return response.data.data;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string> {
    // If refresh is already in progress, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = this.getRefreshToken();

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/auth/refresh`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        // Update stored tokens
        this.setTokens({
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: 900, // 15 minutes
        });

        return accessToken;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Change user password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await this.api.post('/auth/change-password', {
      oldPassword,
      newPassword,
    });
  }

  // Token management methods
  private setTokens(tokens: AuthTokens): void {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('tokenExpiry', String(Date.now() + tokens.expiresIn * 1000));
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getRefreshToken(): string | null {
    return localStorage.setItem('refreshToken');
  }

  private clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
  }

  isTokenExpired(): boolean {
    const expiry = localStorage.getItem('tokenExpiry');
    if (!expiry) return true;

    return Date.now() >= parseInt(expiry, 10);
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !this.isTokenExpired();
  }

  getApi(): AxiosInstance {
    return this.api;
  }
}

export const authService = new AuthService();
```

### React Authentication Context

```typescript
// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, User, AuthTokens } from '../services/AuthService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on mount
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch (error) {
          console.error('Failed to get current user:', error);
          authService.logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user: loggedInUser } = await authService.login(email, password);
      setUser(loggedInUser);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user: registeredUser } = await authService.register(email, password);
      setUser(registeredUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Protected Route Component

```typescript
// src/components/ProtectedRoute.tsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    // Redirect to login, save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredPermission && !user?.permissions.includes(requiredPermission)) {
    // User doesn't have required permission
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

### Usage Example

```typescript
// src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { WorkflowsPage } from './pages/WorkflowsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/workflows"
            element={
              <ProtectedRoute requiredPermission="workflow:create">
                <WorkflowsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

## Mobile Integration

### iOS (Swift) - Secure Token Storage

```swift
// KeychainHelper.swift

import Foundation
import Security

class KeychainHelper {
    static let shared = KeychainHelper()

    private let service = "com.workscript.app"

    func save(key: String, value: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        SecItemDelete(query as CFDictionary) // Delete any existing item

        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    func get(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let string = String(data: data, encoding: .utf8) else {
            return nil
        }

        return string
    }

    func delete(key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess
    }
}
```

```swift
// AuthService.swift

import Foundation

class AuthService {
    static let shared = AuthService()

    private let baseURL = "https://api.workscript.com"
    private let keychain = KeychainHelper.shared

    func login(email: String, password: String) async throws -> User {
        let url = URL(string: "\(baseURL)/auth/login")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = ["email": email, "password": password]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AuthError.loginFailed
        }

        let authResponse = try JSONDecoder().decode(AuthResponse.self, from: data)

        // Store tokens in keychain
        _ = keychain.save(key: "accessToken", value: authResponse.data.accessToken)
        _ = keychain.save(key: "refreshToken", value: authResponse.data.refreshToken)

        return authResponse.data.user
    }

    func logout() async throws {
        guard let refreshToken = keychain.get(key: "refreshToken") else {
            return
        }

        let url = URL(string: "\(baseURL)/auth/logout")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")

        if let accessToken = keychain.get(key: "accessToken") {
            request.addValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }

        let body = ["refreshToken": refreshToken]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        _ = try await URLSession.shared.data(for: request)

        // Clear tokens from keychain
        _ = keychain.delete(key: "accessToken")
        _ = keychain.delete(key: "refreshToken")
    }

    func getAccessToken() -> String? {
        return keychain.get(key: "accessToken")
    }
}
```

### Android (Kotlin) - Secure Token Storage

```kotlin
// KeychainHelper.kt

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class KeychainHelper(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences = EncryptedSharedPreferences.create(
        context,
        "workscript_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun save(key: String, value: String) {
        sharedPreferences.edit().putString(key, value).apply()
    }

    fun get(key: String): String? {
        return sharedPreferences.getString(key, null)
    }

    fun delete(key: String) {
        sharedPreferences.edit().remove(key).apply()
    }

    fun clear() {
        sharedPreferences.edit().clear().apply()
    }
}
```

---

## Server-to-Server Authentication

### Using API Keys

API keys are ideal for server-to-server or machine-to-machine authentication.

#### Creating an API Key

```bash
curl -X POST https://api.workscript.com/api/keys \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Integration",
    "permissions": ["workflow:read", "workflow:execute"],
    "rateLimit": 1000
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "key_abc123",
    "key": "wks_live_a7f3b2c9e1d4f5a8b2c7e1f4a8b2c7e1...",
    "name": "Production Integration",
    "permissions": ["workflow:read", "workflow:execute"],
    "rateLimit": 1000,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**⚠️ Important:** Save the `key` value immediately. It's only shown once and cannot be retrieved later.

#### Using API Keys in Requests

```javascript
// Node.js example

const axios = require('axios');

const API_KEY = 'wks_live_a7f3b2c9e1d4f5a8b2c7e1f4a8b2c7e1...';

async function executeWorkflow(workflowId, input) {
  const response = await axios.post(
    `https://api.workscript.com/workflows/${workflowId}/execute`,
    { input },
    {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}
```

#### API Key Best Practices

1. **Store Securely:** Use environment variables or secret management services (AWS Secrets Manager, HashiCorp Vault)

```javascript
// ✅ Good
const API_KEY = process.env.WORKSCRIPT_API_KEY;

// ❌ Bad
const API_KEY = 'wks_live_abc123...'; // Hardcoded
```

2. **Rotate Regularly:** Create new keys and revoke old ones every 90 days

3. **Principle of Least Privilege:** Only grant permissions that are actually needed

```json
{
  "name": "Read-Only Analytics",
  "permissions": ["workflow:read"] // Only read permission
}
```

4. **Monitor Usage:** Track `lastUsedAt` to detect unused or compromised keys

---

## Testing Authenticated Endpoints

### Unit Testing with Mocked Auth

```typescript
// tests/auth.mock.ts

export const mockAuthService = {
  login: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
  isAuthenticated: jest.fn(),
};

export const mockUser = {
  id: 'user_test123',
  email: 'test@example.com',
  role: 'user',
  permissions: ['workflow:read', 'workflow:execute'],
};
```

```typescript
// tests/Dashboard.test.tsx

import { render, screen } from '@testing-library/react';
import { AuthContext } from '../contexts/AuthContext';
import { Dashboard } from '../pages/Dashboard';
import { mockUser } from './auth.mock';

describe('Dashboard', () => {
  it('renders user email when authenticated', () => {
    const mockAuthContext = {
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    };

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Dashboard />
      </AuthContext.Provider>
    );

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    const mockAuthContext = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    };

    // Test redirect logic
  });
});
```

### Integration Testing

```typescript
// tests/integration/auth.test.ts

import axios from 'axios';

describe('Auth Integration Tests', () => {
  const API_URL = process.env.TEST_API_URL || 'http://localhost:3013';
  let accessToken: string;
  let refreshToken: string;

  it('should register a new user', async () => {
    const email = `test_${Date.now()}@example.com`;
    const password = 'SecurePass123!';

    const response = await axios.post(`${API_URL}/auth/register`, {
      email,
      password,
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.data.user.email).toBe(email);
    expect(response.data.data.accessToken).toBeDefined();

    accessToken = response.data.data.accessToken;
    refreshToken = response.data.data.refreshToken;
  });

  it('should access protected endpoint with token', async () => {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.data.email).toBeDefined();
  });

  it('should refresh access token', async () => {
    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken,
    });

    expect(response.status).toBe(200);
    expect(response.data.data.accessToken).toBeDefined();
    expect(response.data.data.refreshToken).toBeDefined();
  });

  it('should logout successfully', async () => {
    const response = await axios.post(
      `${API_URL}/auth/logout`,
      { refreshToken },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
  });
});
```

---

## Common Patterns & Best Practices

### 1. Automatic Token Refresh

Implement token refresh **before** the token expires, not after:

```typescript
class TokenRefreshScheduler {
  private refreshTimer: NodeJS.Timeout | null = null;

  scheduleRefresh(expiresIn: number) {
    // Refresh 1 minute before expiry
    const refreshTime = (expiresIn - 60) * 1000;

    this.refreshTimer = setTimeout(async () => {
      try {
        await authService.refreshAccessToken();

        // Schedule next refresh
        this.scheduleRefresh(900); // 15 minutes
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Logout user
        authService.logout();
      }
    }, refreshTime);
  }

  cancel() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export const tokenRefreshScheduler = new TokenRefreshScheduler();
```

### 2. Multi-Tab Synchronization

Keep authentication state synced across multiple browser tabs:

```typescript
// src/utils/AuthSync.ts

class AuthSync {
  constructor() {
    // Listen for storage changes from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key === 'auth_event') {
        const data = JSON.parse(event.newValue || '{}');

        switch (data.type) {
          case 'login':
            window.location.reload();
            break;
          case 'logout':
            window.location.href = '/login';
            break;
        }
      }
    });
  }

  broadcastLogin() {
    localStorage.setItem('auth_event', JSON.stringify({
      type: 'login',
      timestamp: Date.now(),
    }));
  }

  broadcastLogout() {
    localStorage.setItem('auth_event', JSON.stringify({
      type: 'logout',
      timestamp: Date.now(),
    }));
  }
}

export const authSync = new AuthSync();
```

### 3. Retry Failed Requests

```typescript
async function retryRequest<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;

      // Don't retry authentication errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw error;
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }

  throw new Error('Max retries exceeded');
}
```

### 4. Permission-Based UI Rendering

```typescript
// src/hooks/usePermission.ts

import { useAuth } from '../contexts/AuthContext';

export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  return user?.permissions.includes(permission) || false;
}

export function useHasAnyPermission(permissions: string[]): boolean {
  const { user } = useAuth();
  return permissions.some((perm) => user?.permissions.includes(perm)) || false;
}
```

```typescript
// Usage in components

import { usePermission } from '../hooks/usePermission';

function WorkflowActions() {
  const canCreate = usePermission('workflow:create');
  const canDelete = usePermission('workflow:delete');

  return (
    <div>
      {canCreate && <button>Create Workflow</button>}
      {canDelete && <button>Delete Workflow</button>}
    </div>
  );
}
```

---

## Migration Guide

### From Firebase Auth

```typescript
// Before (Firebase)
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();
await signInWithEmailAndPassword(auth, email, password);

// After (Workscript)
import { authService } from './services/AuthService';

await authService.login(email, password);
```

### From Auth0

```typescript
// Before (Auth0)
import { useAuth0 } from '@auth0/auth0-react';

const { loginWithRedirect, logout, user, isAuthenticated } = useAuth0();

// After (Workscript)
import { useAuth } from './contexts/AuthContext';

const { login, logout, user, isAuthenticated } = useAuth();
```

### From Custom JWT System

If you're migrating from a custom JWT system:

1. **Update Token Storage:** Use the same localStorage keys or migrate data

2. **Update API Calls:** Replace your authentication endpoints

3. **Update Middleware:** Use the Workscript authentication middleware

4. **Migrate User Data:** Export users from old system, import to Workscript

---

## Troubleshooting

### Common Issues

#### 1. "Invalid or expired token" Error

**Cause:** Access token expired (15-minute lifetime)

**Solution:** Implement automatic token refresh

```typescript
// Check if token refresh is working
console.log('Token expiry:', localStorage.getItem('tokenExpiry'));
console.log('Current time:', Date.now());
```

#### 2. CORS Errors

**Cause:** Frontend origin not allowed by API

**Solution:** Add your frontend URL to `CLIENT_URL` environment variable

```bash
# In apps/api/.env
CLIENT_URL=http://localhost:5173,https://app.example.com
```

#### 3. Session Cookie Not Set

**Cause:** `withCredentials` not enabled in frontend

**Solution:**

```typescript
// Axios
axios.create({
  baseURL: 'http://localhost:3013',
  withCredentials: true, // Enable cookies
});

// Fetch
fetch('http://localhost:3013/auth/login', {
  credentials: 'include', // Enable cookies
});
```

#### 4. "Account locked" Error

**Cause:** Too many failed login attempts (5 by default)

**Solution:** Wait 15 minutes or contact admin to unlock

#### 5. API Key Not Working

**Cause:** Several possible issues

**Solutions:**

- Verify key format starts with `wks_live_` or `wks_test_`
- Check key hasn't expired (`expiresAt` field)
- Verify key has required permissions
- Ensure using `X-API-Key` header (not `Authorization`)

```bash
# Correct
curl -H "X-API-Key: wks_live_..." https://api.workscript.com/workflows

# Incorrect
curl -H "Authorization: Bearer wks_live_..." https://api.workscript.com/workflows
```

---

## Additional Resources

- **Main Auth Documentation:** `/apps/api/src/shared-services/auth/README.md`
- **API Reference:** See route files in `/apps/api/src/routes/`
- **Examples:** Check `/apps/frontend/` for reference implementation

---

**Last Updated:** November 2025
**Version:** 1.0.0
**Feedback:** Report issues at https://github.com/workscript/workscript/issues
