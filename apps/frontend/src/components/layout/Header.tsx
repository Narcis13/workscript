import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

/**
 * Header component for application navigation
 *
 * Provides consistent header across all pages with:
 * - Logo/branding on the left
 * - Navigation links (Dashboard, Workflow Demo)
 * - User menu dropdown on right (if authenticated)
 * - Login/register links (if not authenticated)
 * - Responsive design with mobile menu support
 * - Admin-only navigation items (conditional)
 *
 * Features:
 * - Sticky positioning for always-visible navigation
 * - User avatar with initials
 * - Role-based conditional rendering
 * - Logout functionality
 * - Mobile-responsive navigation
 *
 * Requirements: 9, 17
 */
export function Header() {
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  /**
   * Get user initials from email for avatar display
   * @returns First letter of email in uppercase, or 'U' if no email
   */
  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Branding - Left */}
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow">
                <span className="text-white text-sm font-bold">W</span>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-50 hidden sm:inline">
                Workscript
              </span>
            </Link>

            {/* Navigation Links - Desktop */}
            {isAuthenticated && (
              <nav className="hidden md:flex items-center gap-1">
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <Link to="/workflow-demo">
                  <Button variant="ghost" size="sm">
                    Workflow Demo
                  </Button>
                </Link>
                {isAdmin && (
                  <Link to="/dashboard/users">
                    <Button variant="ghost" size="sm">
                      Users
                    </Button>
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* User Menu / Auth Links - Right */}
          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              // User Dropdown Menu
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full"
                    aria-label="User menu"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.email}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">
                        {user.role}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/profile" className="cursor-pointer">
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/users" className="cursor-pointer">
                        Users
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600 dark:text-red-400"
                    onClick={handleLogout}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Login/Register Links (if not authenticated)
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm">Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
