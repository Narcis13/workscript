import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useHasRole } from '@/hooks/usePermission';
import { Role } from '@/types/auth';
import type { UserListItem } from '@/types/auth';

/**
 * UsersPage Component (Admin Only)
 *
 * Minimal user management dashboard for admin users.
 * Features:
 * - Admin role check (redirect to /unauthorized if not admin)
 * - User list display in Table component
 * - Email, role (Badge), and created date columns
 * - Loading skeleton state
 * - Read-only (no CRUD operations)
 * - Placeholder with current user if API endpoint doesn't exist
 * - Full mobile responsiveness
 *
 * Requirements: 11, 12
 * Task: 6.2.3
 */
export default function UsersPage() {
  const { user } = useAuth();
  const isAdmin = useHasRole(Role.ADMIN);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check admin role - redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Fetch user list (or use current user as placeholder)
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Note: User list API endpoint doesn't exist yet
        // As per requirements, display current user info as placeholder
        if (user) {
          const placeholderUser: UserListItem = {
            id: user.id,
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
            isActive: user.isActive,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
          };
          setUsers([placeholderUser]);
        }
      } catch (err) {
        console.error('Error loading users:', err);
        setError('Failed to load user list');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  // Format role for display (capitalize first letter)
  const formatRole = (role: string): string => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Determine badge variant based on role
  const getRoleBadgeVariant = (role: Role): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (role) {
      case Role.ADMIN:
        return 'destructive';
      case Role.USER:
        return 'default';
      case Role.API:
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format last login with time
  const formatLastLogin = (dateString?: string): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-1/4" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-1/6" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-1/5" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-1/6" />
        </div>
      ))}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            View and manage registered users in the system
          </p>
        </div>

        {/* Info Alert - API endpoint doesn't exist */}
        <Alert>
          <AlertDescription>
            <strong>Note:</strong> User list API endpoint is not yet implemented.
            Displaying current user information as placeholder.
          </AlertDescription>
        </Alert>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Users Table Card */}
        <Card>
          <CardHeader>
            <CardTitle>Registered Users</CardTitle>
            <CardDescription>
              A list of all registered users with their roles and account information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton />
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              /* Responsive table wrapper */
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Email</TableHead>
                      <TableHead className="min-w-[100px]">Role</TableHead>
                      <TableHead className="min-w-[120px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Created</TableHead>
                      <TableHead className="min-w-[140px]">Last Login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((userItem) => (
                      <TableRow key={userItem.id}>
                        {/* Email Column */}
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1">
                            <span>{userItem.email}</span>
                            {userItem.emailVerified && (
                              <Badge variant="outline" className="w-fit text-xs">
                                ✓ Verified
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Role Column */}
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(userItem.role)}>
                            {formatRole(userItem.role)}
                          </Badge>
                        </TableCell>

                        {/* Status Column */}
                        <TableCell>
                          <Badge
                            variant={userItem.isActive ? 'default' : 'secondary'}
                            className={userItem.isActive ? 'bg-green-600' : ''}
                          >
                            {userItem.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>

                        {/* Created Date Column */}
                        <TableCell className="text-muted-foreground">
                          {formatDate(userItem.createdAt)}
                        </TableCell>

                        {/* Last Login Column */}
                        <TableCell className="text-muted-foreground">
                          {formatLastLogin(userItem.lastLoginAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>About This Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This page provides a read-only view of registered users in the system.
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Only administrators can access this page</li>
              <li>User list is read-only (no create/update/delete operations)</li>
              <li>Email verification status is indicated with a badge</li>
              <li>User roles and account status are clearly displayed</li>
              <li>Full user management features will be added in future updates</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
