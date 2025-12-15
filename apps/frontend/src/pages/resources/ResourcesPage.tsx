/**
 * ResourcesPage - Resource list page
 *
 * Displays a filterable, sortable list of resources with pagination.
 *
 * @module pages/resources/ResourcesPage
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, FolderOpen, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { MobilePagination } from '@/components/shared/MobilePagination';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { ResourceList } from '@/components/resources/ResourceList';
import { ResourceFilterBar } from '@/components/resources/ResourceFilterBar';
import { useResources, useDeleteResource, useSyncResources } from '@/hooks/api/useResources';
import { downloadResourceFile } from '@/lib/resourceDownload';
import type { Resource, ResourceFilters } from '@/types/resource.types';

const PAGE_SIZE = 20;

export default function ResourcesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters from URL
  const [filters, setFilters] = useState<ResourceFilters>(() => ({
    search: searchParams.get('search') || undefined,
    type: (searchParams.get('type') as ResourceFilters['type']) || undefined,
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
    sortBy: (searchParams.get('sortBy') as ResourceFilters['sortBy']) || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    page: Number(searchParams.get('page')) || 1,
    limit: PAGE_SIZE,
  }));

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.type) params.set('type', filters.type);
    if (filters.tags?.length) params.set('tags', filters.tags.join(','));
    if (filters.sortBy !== 'createdAt') params.set('sortBy', filters.sortBy!);
    if (filters.sortOrder !== 'desc') params.set('sortOrder', filters.sortOrder!);
    if (filters.page && filters.page > 1) params.set('page', String(filters.page));
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const { data, isLoading } = useResources(filters);
  const deleteMutation = useDeleteResource();
  const syncMutation = useSyncResources();

  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);

  const handleSync = useCallback(() => {
    syncMutation.mutate({});
  }, [syncMutation]);

  // Calculate pagination values directly from filters state
  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);
  const currentPage = filters.page || 1;

  const handleFiltersChange = useCallback((newFilters: ResourceFilters) => {
    setFilters(newFilters);
  }, []);

  const handleView = useCallback((resource: Resource) => {
    navigate(`/resources/${resource.id}`);
  }, [navigate]);

  const handleEdit = useCallback((resource: Resource) => {
    navigate(`/resources/${resource.id}/edit`);
  }, [navigate]);

  const handleDownload = useCallback(async (resource: Resource) => {
    await downloadResourceFile(resource.id, resource.name);
  }, []);

  const handleCopy = useCallback((resource: Resource) => {
    navigate(`/resources/${resource.id}?action=copy`);
  }, [navigate]);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[placeholder*="Search"]')?.focus();
      }

      if (e.key === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigate('/resources/new');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const resources = data?.resources || [];
  const isEmpty = !isLoading && resources.length === 0 && !filters.search && !filters.type;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Resources"
        description="Manage prompts, files, and data for your workflows"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncMutation.isPending}
            >
              <RefreshCw className={`size-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              {syncMutation.isPending ? 'Syncing...' : 'Sync'}
            </Button>
            <Button onClick={() => navigate('/resources/new')}>
              <Plus className="size-4 mr-2" />
              Create Resource
            </Button>
          </div>
        }
      />

      {isEmpty ? (
        <EmptyState
          icon={FolderOpen}
          title="No resources yet"
          description="Upload files or create content to use in your workflows"
          actionButton={{
            label: 'Create Resource',
            onClick: () => navigate('/resources/new'),
            icon: Plus,
          }}
        />
      ) : (
        <>
          <ResourceFilterBar
            filters={filters}
            onFiltersChange={handleFiltersChange}
            resultCount={resources.length}
            totalCount={data?.total}
          />

          <ResourceList
            resources={resources}
            loading={isLoading}
            onView={handleView}
            onEdit={handleEdit}
            onDownload={handleDownload}
            onCopy={handleCopy}
            onDelete={setDeleteTarget}
          />

          {totalPages > 1 && (
            <MobilePagination
              currentPage={currentPage}
              totalPages={totalPages}
              hasPreviousPage={currentPage > 1}
              hasNextPage={currentPage < totalPages}
              onPreviousPage={() => setFilters(f => ({ ...f, page: Math.max(1, (f.page || 1) - 1) }))}
              onNextPage={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}
              onGoToPage={(page) => setFilters(f => ({ ...f, page }))}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Resource?"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
