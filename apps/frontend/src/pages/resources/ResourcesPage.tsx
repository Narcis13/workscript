/**
 * ResourcesPage - Resource list page
 *
 * Displays a filterable, sortable list of resources with pagination.
 *
 * @module pages/resources/ResourcesPage
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, FolderOpen } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { MobilePagination } from '@/components/shared/MobilePagination';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { ResourceList } from '@/components/resources/ResourceList';
import { ResourceFilterBar } from '@/components/resources/ResourceFilterBar';
import { useResources, useDeleteResource } from '@/hooks/api/useResources';
import { downloadResource } from '@/services/api/resources.api';
import { usePagination } from '@/hooks/usePagination';
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

  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);

  const pagination = usePagination({
    totalItems: data?.total || 0,
    initialPageSize: PAGE_SIZE,
    initialPage: filters.page || 1,
  });

  // Sync pagination with filters
  useEffect(() => {
    if (pagination.currentPage !== filters.page) {
      setFilters((f) => ({ ...f, page: pagination.currentPage }));
    }
  }, [pagination.currentPage]);

  const handleFiltersChange = (newFilters: ResourceFilters) => {
    setFilters(newFilters);
    if (newFilters.page === 1) {
      pagination.goToPage(1);
    }
  };

  const handleView = (resource: Resource) => navigate(`/resources/${resource.id}`);
  const handleEdit = (resource: Resource) => navigate(`/resources/${resource.id}/edit`);

  const handleDownload = async (resource: Resource) => {
    const blob = await downloadResource(resource.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resource.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (resource: Resource) => {
    navigate(`/resources/${resource.id}?action=copy`);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

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
          <Button onClick={() => navigate('/resources/new')}>
            <Plus className="size-4 mr-2" />
            Create Resource
          </Button>
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

          {pagination.totalPages > 1 && (
            <MobilePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              hasPreviousPage={pagination.hasPreviousPage}
              hasNextPage={pagination.hasNextPage}
              onPreviousPage={pagination.previousPage}
              onNextPage={pagination.nextPage}
              onGoToPage={pagination.goToPage}
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
