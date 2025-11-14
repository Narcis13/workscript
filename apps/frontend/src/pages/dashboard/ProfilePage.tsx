import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm';
import { useAuth } from '@/hooks/useAuth';

/**
 * ProfilePage Component
 *
 * User profile page for authenticated users to view their information
 * and change their password.
 *
 * Features:
 * - Display user information (email, role, tenant ID, member since)
 * - Role badge with appropriate variant
 * - ChangePasswordForm integration for password management
 * - Fully responsive layout
 * - Clean card-based design
 *
 * Requirements Coverage:
 * - Requirement 4: Password Change (includes ChangePasswordForm)
 * - Requirement 9: Navigation and Layout (uses DashboardLayout)
 * - Requirement 17: Responsive Design (mobile-friendly layout)
 *
 * Acceptance Criteria (Task 6.2.2):
 * - ✅ Uses DashboardLayout
 * - ✅ Displays user information (email, role)
 * - ✅ Includes ChangePasswordForm component
 * - ✅ Responsive design
 *
 * @component
 * @example
 * ```tsx
 * // In router:
 * <Route path="/dashboard/profile" element={<ProfilePage />} />
 * ```
 */
export default function ProfilePage() {
  const { user } = useAuth();

  /**
   * Format role for display (capitalize first letter)
   */
  const formatRole = (role: string): string => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  /**
   * Determine badge variant based on user role
   */
  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'user':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account information and security settings
          </p>
        </div>

        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your current account details and role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Email */}
              <div className="grid gap-2">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email Address
                </div>
                <div className="text-base text-slate-900 dark:text-slate-100">
                  {user?.email || 'Not available'}
                </div>
              </div>

              <Separator />

              {/* Role */}
              <div className="grid gap-2">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Account Role
                </div>
                <div>
                  {user?.role ? (
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {formatRole(user.role)}
                    </Badge>
                  ) : (
                    <span className="text-slate-500 dark:text-slate-400">Not available</span>
                  )}
                </div>
              </div>

              {/* Tenant ID (if available) */}
              {user?.tenantId && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Tenant ID
                    </div>
                    <div className="text-sm font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded inline-block">
                      {user.tenantId}
                    </div>
                  </div>
                </>
              )}

              {/* Member Since (if available) */}
              {user?.createdAt && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Member Since
                    </div>
                    <div className="text-base text-slate-900 dark:text-slate-100">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Permissions (if available) */}
              {user?.permissions && user.permissions.length > 0 && (
                <>
                  <Separator />
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Permissions
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {user.permissions.map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Password Management Card */}
        <Card>
          <CardHeader>
            <CardTitle>Password Management</CardTitle>
            <CardDescription>
              Change your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Integrate ChangePasswordForm component */}
            <ChangePasswordForm />
          </CardContent>
        </Card>

        {/* Security Tips Card (Additional helpful information) */}
        <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base">Security Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                <span>Use a strong, unique password that you don't use elsewhere</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                <span>Include a mix of uppercase, lowercase, numbers, and special characters</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                <span>Change your password regularly (every 3-6 months)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                <span>Never share your password with anyone</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
