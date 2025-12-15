/**
 * ResourcePreview Component
 *
 * Type-specific preview for resources (markdown, image, audio, JSON, CSV, PDF).
 * Uses blob URLs for binary content to handle authentication properly.
 *
 * @module components/resources/ResourcePreview
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import rehypeSanitize from 'rehype-sanitize';
import DOMPurify from 'dompurify';
import { ZoomIn, ZoomOut, Download, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { downloadResource } from '@/services/api/resources.api';
import type { Resource } from '@/types/resource.types';

const Markdown = lazy(() => import('react-markdown'));

interface ResourcePreviewProps {
  resource: Resource;
  content?: string;
  loading?: boolean;
  error?: string;
  onDownload?: () => void;
}

/**
 * Hook to fetch binary content and create a blob URL
 */
function useBlobUrl(resourceId: string, enabled: boolean) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    downloadResource(resourceId)
      .then((blob) => {
        if (isMounted) {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.response?.data?.message || 'Failed to load content');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [resourceId, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  return { blobUrl, loading, error };
}

export function ResourcePreview({
  resource,
  content,
  loading,
  error,
  onDownload,
}: ResourcePreviewProps) {
  const [zoom, setZoom] = useState(1);

  // Determine if we need to fetch binary content
  const needsBinaryFetch =
    resource.type === 'image' ||
    resource.type === 'audio' ||
    resource.mimeType === 'application/pdf';

  const {
    blobUrl,
    loading: blobLoading,
    error: blobError,
  } = useBlobUrl(resource.id, needsBinaryFetch);

  if (loading || blobLoading) {
    return (
      <div className="flex items-center justify-center h-96 border rounded-lg bg-muted/20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || blobError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{error || blobError}</AlertDescription>
      </Alert>
    );
  }

  // Image preview
  if (resource.type === 'image') {
    if (!blobUrl) {
      return <Skeleton className="h-96 w-full" />;
    }
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
          >
            <ZoomOut className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          >
            <ZoomIn className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground self-center">
            {Math.round(zoom * 100)}%
          </span>
        </div>
        <div className="border rounded-lg overflow-auto max-h-[600px] bg-muted/20">
          <img
            src={blobUrl}
            alt={resource.name}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            className="max-w-none"
          />
        </div>
      </div>
    );
  }

  // Audio preview
  if (resource.type === 'audio') {
    if (!blobUrl) {
      return <Skeleton className="h-24 w-full" />;
    }
    return (
      <div className="p-6 border rounded-lg bg-muted/20">
        <audio controls className="w-full">
          <source src={blobUrl} type={resource.mimeType} />
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  }

  // PDF preview
  if (resource.mimeType === 'application/pdf') {
    if (!blobUrl) {
      return <Skeleton className="h-96 w-full" />;
    }
    return (
      <div className="border rounded-lg overflow-hidden">
        <iframe
          src={blobUrl}
          title={resource.name}
          width="100%"
          height="600px"
          className="bg-white"
        />
      </div>
    );
  }

  // JSON preview
  if (resource.type === 'data' && resource.mimeType === 'application/json') {
    // Handle undefined/empty content during loading
    if (!content) {
      return <Skeleton className="h-96 w-full" />;
    }
    try {
      const parsed = JSON.parse(content);
      return (
        <div className="border rounded-lg p-4 bg-muted/20 overflow-auto max-h-[600px]">
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        </div>
      );
    } catch {
      return (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>Invalid JSON content</AlertDescription>
        </Alert>
      );
    }
  }

  // CSV preview
  if (resource.mimeType === 'text/csv') {
    const rows = (content || '').split('\n').filter(Boolean);
    const headers = rows[0]?.split(',') || [];
    const data = rows.slice(1, 101); // Limit to 100 rows

    return (
      <div className="border rounded-lg overflow-auto max-h-[600px]">
        <table className="w-full text-sm">
          <thead className="bg-muted sticky top-0">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-medium border-b">
                  {DOMPurify.sanitize(h, { ALLOWED_TAGS: [] })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b hover:bg-muted/50">
                {row.split(',').map((cell, j) => (
                  <td key={j} className="px-3 py-2">
                    {DOMPurify.sanitize(cell, { ALLOWED_TAGS: [] })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 101 && (
          <p className="p-3 text-sm text-muted-foreground text-center border-t">
            Showing first 100 of {rows.length - 1} rows
          </p>
        )}
      </div>
    );
  }

  // Markdown/text preview (prompt, document)
  if (content !== undefined) {
    return (
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <div className="border rounded-lg p-6 prose prose-sm dark:prose-invert max-w-none max-h-[600px] overflow-auto">
          <Markdown
            rehypePlugins={[rehypeSanitize]}
            disallowedElements={['script', 'iframe', 'object', 'embed']}
            unwrapDisallowed={true}
          >
            {content}
          </Markdown>
        </div>
      </Suspense>
    );
  }

  return (
    <div className="text-center p-12 text-muted-foreground">
      <p>Preview not available for this file type</p>
      {onDownload && (
        <Button variant="outline" className="mt-4" onClick={onDownload}>
          <Download className="size-4 mr-2" /> Download to view
        </Button>
      )}
    </div>
  );
}

export default ResourcePreview;
