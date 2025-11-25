/**
 * AutomationsPage - Automation List View
 *
 * Displays all automations with filtering, search, and management actions.
 * Part of Phase 4: Automation Management (Req 9)
 *
 * Features:
 * - Fetch automations using useAutomations hook
 * - Filter by status (enabled/disabled), trigger type, and search
 * - Display AutomationCard grid with actions
 * - Create Automation button with permission check
 * - Toggle, execute, delete actions on automations
 *
 * @module pages/automations/AutomationsPage
 */

import { useCallback, useContext, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAutomations,
  useToggleAutomation,
  useDeleteAutomation,
  useExecuteAutomation,
} from '@/hooks/api/useAutomations';
import { AutomationList } from '@/components/automations/AutomationList';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AuthContext } from '@/contexts/AuthContext';
import { Permission } from '@/types/auth';
import { TriggerType } from '@/types/automation.types';
import type { Automation, AutomationFilterOptions } from '@/types/automation.types';
import { Plus, Search, Filter, RefreshCw } from 'lucide-react';

/**
 * AutomationsPage Component
 *
 * Main page for listing and managing automations with full CRUD support.
 */
export default function AutomationsPage() {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);

  // ============================================
  // PERMISSION CHECKS
  // ============================================

  const hasCreatePermission = authContext?.user?.permissions.includes(Permission.AUTOMATION_CREATE) ?? false;
  const hasUpdatePermission = authContext?.user?.permissions.includes(Permission.AUTOMATION_UPDATE) ?? false;
  const hasDeletePermission = authContext?.user?.permissions.includes(Permission.AUTOMATION_DELETE) ?? false;
  const hasExecutePermission = authContext?.user?.permissions.includes(Permission.AUTOMATION_EXECUTE) ?? false;

  // ============================================
  // FILTER STATE
  // ============================================

  const [searchQuery, setSearchQuery] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<string>('all');
  const [triggerTypeFilter, setTriggerTypeFilter] = useState<string>('all');

  // Build filter options for API
  const filterOptions: AutomationFilterOptions = useMemo(() => {
    const filters: AutomationFilterOptions = {};

    if (searchQuery.trim()) {
      filters.search = searchQuery.trim();
    }

    if (enabledFilter !== 'all') {
      filters.enabled = enabledFilter === 'enabled';
    }

    if (triggerTypeFilter !== 'all') {
      filters.triggerType = triggerTypeFilter as TriggerType;
    }

    return filters;
  }, [searchQuery, enabledFilter, triggerTypeFilter]);

  // ============================================
  // DATA FETCHING
  // ============================================

  const {
    data: automations = [],
    isLoading,
    refetch,
    isRefetching,
  } = useAutomations(filterOptions);

  // ============================================
  // MUTATIONS
  // ============================================

  const toggleMutation = useToggleAutomation();
  const deleteMutation = useDeleteAutomation();
  const executeMutation = useExecuteAutomation();

  // ============================================
  // DELETE CONFIRMATION STATE
  // ============================================

  const [deleteTarget, setDeleteTarget] = useState<Automation | null>(null);

  // Track toggle loading states per automation
  const toggleLoadingStates = useMemo(() => {
    const states: Record<string, boolean> = {};
    if (toggleMutation.isPending && toggleMutation.variables) {
      states[toggleMutation.variables.id] = true;
    }
    return states;
  }, [toggleMutation.isPending, toggleMutation.variables]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleView = useCallback(
    (automationId: string) => {
      navigate(`/automations/${automationId}`);
    },
    [navigate]
  );

  const handleEdit = useCallback(
    (automationId: string) => {
      navigate(`/automations/${automationId}/edit`);
    },
    [navigate]
  );

  const handleDelete = useCallback((automationId: string) => {
    const automation = automations.find((a) => a.id === automationId);
    if (automation) {
      setDeleteTarget(automation);
    }
  }, [automations]);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation]);

  const handleToggle = useCallback(
    async (automationId: string, enabled: boolean) => {
      await toggleMutation.mutateAsync({ id: automationId, enabled });
    },
    [toggleMutation]
  );

  const handleExecute = useCallback(
    async (automationId: string) => {
      await executeMutation.mutateAsync({ id: automationId });
    },
    [executeMutation]
  );

  const handleWorkflowClick = useCallback(
    (workflowId: string) => {
      navigate(`/workflows/${workflowId}`);
    },
    [navigate]
  );

  const handleCreateClick = useCallback(() => {
    navigate('/automations/new');
  }, [navigate]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Automations"
        description="Manage scheduled and triggered workflow executions"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`size-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {hasCreatePermission && (
              <Button size="sm" onClick={handleCreateClick}>
                <Plus className="size-4" />
                Create Automation
              </Button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search automations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={enabledFilter} onValueChange={setEnabledFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="size-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>

        {/* Trigger Type Filter */}
        <Select value={triggerTypeFilter} onValueChange={setTriggerTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Trigger Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Triggers</SelectItem>
            <SelectItem value={TriggerType.CRON}>Cron Schedule</SelectItem>
            <SelectItem value={TriggerType.WEBHOOK}>Webhook</SelectItem>
            <SelectItem value={TriggerType.IMMEDIATE}>Manual Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Automation List */}
      <AutomationList
        automations={automations}
        loading={isLoading}
        onView={handleView}
        onEdit={hasUpdatePermission ? handleEdit : undefined}
        onDelete={hasDeletePermission ? handleDelete : undefined}
        onToggle={hasUpdatePermission ? handleToggle : undefined}
        onExecute={hasExecutePermission ? handleExecute : undefined}
        onWorkflowClick={handleWorkflowClick}
        toggleLoadingStates={toggleLoadingStates}
        permissions={{
          canUpdate: hasUpdatePermission,
          canDelete: hasDeletePermission,
          canExecute: hasExecutePermission,
          canToggle: hasUpdatePermission,
        }}
        emptyState={{
          title: 'No automations found',
          description: searchQuery || enabledFilter !== 'all' || triggerTypeFilter !== 'all'
            ? 'Try adjusting your search or filters'
            : 'Create your first automation to schedule workflows',
          actionButton: hasCreatePermission && !searchQuery && enabledFilter === 'all' && triggerTypeFilter === 'all'
            ? {
                label: 'Create Automation',
                onClick: handleCreateClick,
              }
            : undefined,
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will permanently delete this automation and unschedule all pending executions. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
