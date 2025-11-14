import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

/**
 * AuthLayout component for authentication pages
 *
 * Provides a centered card layout with branding for login, register, and password reset pages.
 * Features:
 * - Centered responsive card design
 * - Branding/logo area at the top
 * - Optional title and description
 * - Full mobile responsiveness
 *
 * Requirements: 9, 17
 */
export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Branding/Logo Area */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            {/* Logo placeholder - can be replaced with actual logo image */}
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl font-bold">W</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Workscript
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Agentic Workflow Orchestration
          </p>
        </div>

        {/* Auth Form Card */}
        <Card className="w-full">
          {(title || description) && (
            <CardHeader>
              {title && <CardTitle className="text-2xl">{title}</CardTitle>}
              {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
          )}
          <CardContent className="space-y-4">
            {children}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} Workscript. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
