/**
 * ResourceDetailPage - View resource details
 *
 * Displays resource metadata, preview, and interpolation tester.
 *
 * @module pages/resources/ResourceDetailPage
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Download,
  Pencil,
  Copy,
  Trash2,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResourceTypeIcon } from '@/components/resources/ResourceTypeIcon';
import { ResourcePreview } from '@/components/resources/ResourcePreview';
import { InterpolationTester } from '@/components/resources/InterpolationTester';
import {
  useResource,
  useResourceContent,
  useDeleteResource,
  useCopyResource,
} from '@/hooks/api/useResources';
import { downloadResourceFile } from '@/lib/resourceDownload';
import { formatFileSize } from '@/lib/utils';
import { toast } from 'sonner';

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: resource, isLoading, error } = useResource(id!);
  const isTextBased = ['prompt', 'document', 'data'].includes(resource?.type || '');
  const { data: content, isLoading: contentLoading, error: contentError } = useResourceContent(
    id!,
    isTextBased
  );

  const deleteMutation = useDeleteResource();
  const copyMutation = useCopyResource();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(
    searchParams.get('action') === 'copy'
  );
  const [copyName, setCopyName] = useState('');
  const [copyPath, setCopyPath] = useState('');

  // Clear action param after opening dialog
  useEffect(() => {
    if (searchParams.get('action') === 'copy') {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Set default copy name and generate unique path when resource loads
  useEffect(() => {
    if (resource && copyDialogOpen && !copyName) {
      setCopyName(`${resource.name} (Copy)`);
      // Generate a unique path by adding "-copy" before the extension
      const lastDotIndex = resource.path.lastIndexOf('.');
      const copyPath = lastDotIndex > 0
        ? `${resource.path.slice(0, lastDotIndex)}-copy${resource.path.slice(lastDotIndex)}`
        : `${resource.path}-copy`;
      setCopyPath(copyPath);
    }
  }, [resource, copyDialogOpen, copyName]);

  const handleDownload = async () => {
    if (!resource) return;
    await downloadResourceFile(resource.id, resource.name);
  };

  const handleDelete = async () => {
    if (!resource) return;
    await deleteMutation.mutateAsync(resource.id);
    navigate('/resources');
  };

  const validatePath = (path: string): boolean => {
    // Disallow path traversal
    if (path.includes('..') || path.includes('~')) return false;
    // Disallow absolute paths
    if (path.startsWith('/')) return false;
    // Only allow alphanumeric, dash, underscore, forward slash, dot
    return /^[a-zA-Z0-9\-_\/\.]+$/.test(path);
  };

  const handleCopy = async () => {
    if (!resource) return;

    if (copyPath && !validatePath(copyPath)) {
      toast.error('Invalid path', {
        description: 'Path cannot contain "..", "~", or start with "/". Use alphanumeric characters, dashes, underscores, dots, and forward slashes.',
      });
      return;
    }

    const newResource = await copyMutation.mutateAsync({
      id: resource.id,
      name: copyName,
      path: copyPath,
    });
    setCopyDialogOpen(false);
    navigate(`/resources/${newResource.id}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-destructive">Resource not found or failed to load.</p>
        <Button variant="link" onClick={() => navigate('/resources')}>
          Back to Resources
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/resources')} aria-label="Back to resources">
          <ArrowLeft className="size-4" />
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <ResourceTypeIcon type={resource.type} size="lg" />
            <h1 className="text-2xl font-bold">{resource.name}</h1>
            {resource.isPublic && <Badge variant="secondary">Public</Badge>}
          </div>
          {resource.description && (
            <p className="text-muted-foreground">{resource.description}</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleDownload} aria-label="Download resource">
            <Download className="size-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCopyDialogOpen(true)} aria-label="Copy resource">
            <Copy className="size-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate(`/resources/${id}/edit`)}>
            <Pencil className="size-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(true)} aria-label="Delete resource">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="pt-6">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium capitalize">{resource.type}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Size</dt>
              <dd className="font-medium">{formatFileSize(resource.size)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">MIME Type</dt>
              <dd className="font-medium">{resource.mimeType}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-medium">
                {formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })}
              </dd>
            </div>
          </dl>

          {resource.tags.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <dt className="text-muted-foreground text-sm mb-2">Tags</dt>
              <div className="flex gap-2 flex-wrap">
                {resource.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content / Preview */}
      {resource.type === 'prompt' ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <ResourcePreview
                  resource={resource}
                  content={content}
                  loading={contentLoading}
                  error={contentError ? 'Failed to load content' : undefined}
                  onDownload={handleDownload}
                />
              </CardContent>
            </Card>
          </div>
          <div>
            <InterpolationTester resourceId={resource.id} />
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResourcePreview
              resource={resource}
              content={content}
              loading={contentLoading}
              error={contentError ? 'Failed to load content' : undefined}
              onDownload={handleDownload}
            />
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Resource?"
        description={`Are you sure you want to delete "${resource.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />

      {/* Copy Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="copyName">New Name</Label>
              <Input
                id="copyName"
                value={copyName}
                onChange={(e) => setCopyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="copyPath">Path</Label>
              <Input
                id="copyPath"
                value={copyPath}
                onChange={(e) => setCopyPath(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCopy} disabled={!copyName || copyMutation.isPending}>
              {copyMutation.isPending ? 'Copying...' : 'Copy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
