/**
 * ResourcePreview Component
 *
 * Type-specific preview for resources (markdown, image, audio, JSON, CSV, PDF).
 *
 * @module components/resources/ResourcePreview
 */

import { useState, lazy, Suspense } from 'react';
import rehypeSanitize from 'rehype-sanitize';
import DOMPurify from 'dompurify';
import { ZoomIn, ZoomOut, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Resource } from '@/types/resource.types';

const Markdown = lazy(() => import('react-markdown'));

interface ResourcePreviewProps {
  resource: Resource;
  content?: string;
  loading?: boolean;
  error?: string;
  onDownload?: () => void;
}

export function ResourcePreview({
  resource,
  content,
  loading,
  error,
  onDownload,
}: ResourcePreviewProps) {
  const [zoom, setZoom] = useState(1);

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Image preview
  if (resource.type === 'image') {
    const imageUrl = `/api/workscript/resources/${resource.id}/download`;
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
            src={imageUrl}
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
    const audioUrl = `/api/workscript/resources/${resource.id}/download`;
    return (
      <div className="p-6 border rounded-lg bg-muted/20">
        <audio controls className="w-full">
          <source src={audioUrl} type={resource.mimeType} />
          Your browser does not support the audio element.
        </audio>
      </div>
    );
  }

  // PDF preview
  if (resource.mimeType === 'application/pdf') {
    const pdfUrl = `/api/workscript/resources/${resource.id}/download`;
    return (
      <div className="border rounded-lg overflow-hidden">
        <embed
          src={pdfUrl}
          type="application/pdf"
          width="100%"
          height="600px"
          className="bg-white"
        />
      </div>
    );
  }

  // JSON preview
  if (resource.type === 'data' && resource.mimeType === 'application/json') {
    try {
      const parsed = JSON.parse(content || '');
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
