import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

/**
 * DashboardPage Component
 *
 * Main dashboard page for authenticated users.
 * Features:
 * - Welcome message with user's email
 * - Display user role with Badge component
 * - Quick links to other sections (Profile, Users, Workflow Demo)
 * - Full mobile responsiveness
 *
 * Requirements: 9
 * Task: 6.2.1
 */
export default function DashboardPage() {
  const { user } = useAuth();

  // Format role for display (capitalize first letter)
  const formatRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Determine badge variant based on role
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
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back{user?.email ? `, ${user.email}` : ''}
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">Your account role:</p>
            {user?.role && (
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {formatRole(user.role)}
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Profile Card */}
          <Link to="/dashboard/profile" className="block transition-transform hover:scale-105">
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">👤</span>
                  Profile
                </CardTitle>
                <CardDescription>
                  View and update your profile information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Change your password and manage account settings
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Users Card (Admin Only) */}
          {user?.role === 'admin' && (
            <Link to="/dashboard/users" className="block transition-transform hover:scale-105">
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">👥</span>
                    Users
                  </CardTitle>
                  <CardDescription>
                    View registered users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Access user list and basic information
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Workflow Demo Card */}
          <Link to="/workflow-demo" className="block transition-transform hover:scale-105">
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  Workflow Demo
                </CardTitle>
                <CardDescription>
                  Explore workflow capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Interactive demonstration of workflow features
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Account Information Section */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your current account details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Email</div>
                <div className="text-sm text-muted-foreground">{user?.email || 'Not available'}</div>
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Role</div>
                <div className="text-sm text-muted-foreground">
                  {user?.role ? formatRole(user.role) : 'Not available'}
                </div>
              </div>
              {user?.tenantId && (
                <div className="grid gap-2">
                  <div className="text-sm font-medium">Tenant ID</div>
                  <div className="text-sm text-muted-foreground font-mono">{user.tenantId}</div>
                </div>
              )}
              {user?.createdAt && (
                <div className="grid gap-2">
                  <div className="text-sm font-medium">Member Since</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
