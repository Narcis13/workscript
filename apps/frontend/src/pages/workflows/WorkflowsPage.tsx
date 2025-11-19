/**
 * WorkflowsPage - Workflow List View
 *
 * Displays all workflows with search, filtering, and management actions.
 * Part of Phase 3: Workflow Management (Req 4)
 *
 * @module pages/workflows/WorkflowsPage
 */

import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Workflow } from 'lucide-react';

/**
 * WorkflowsPage Component
 *
 * TODO: Implement in Phase 3 (Tasks 3.3.1 - 3.3.2)
 * - Fetch workflows using useWorkflows hook
 * - Implement search filtering
 * - Display WorkflowCard grid
 * - Add Create Workflow button
 * - Handle delete with confirmation
 *
 * Requirements: Req 4 (Workflow List)
 */
export default function WorkflowsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Workflows
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Manage and execute your workflow definitions
          </p>
        </div>

        {/* Placeholder Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Workflow className="h-8 w-8 text-slate-400" />
              <div>
                <CardTitle>Coming Soon</CardTitle>
                <CardDescription>
                  Workflow management will be implemented in Phase 3
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This page will allow you to view, create, edit, and delete workflow definitions,
              as well as execute them with custom initial states.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
