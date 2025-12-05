/**
 * ResourceList Component
 *
 * Data table displaying resources with actions dropdown.
 *
 * @module components/resources/ResourceList
 */

import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Eye, Pencil, Download, Copy, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ResourceTypeIcon } from './ResourceTypeIcon';
import { formatFileSize } from '@/lib/utils';
import type { Resource } from '@/types/resource.types';

interface ResourceListProps {
  resources: Resource[];
  loading?: boolean;
  onView: (resource: Resource) => void;
  onEdit?: (resource: Resource) => void;
  onDownload?: (resource: Resource) => void;
  onCopy?: (resource: Resource) => void;
  onDelete?: (resource: Resource) => void;
}

export function ResourceList({
  resources,
  loading,
  onView,
  onEdit,
  onDownload,
  onCopy,
  onDelete,
}: ResourceListProps) {
  if (loading) {
    return (
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-24">Type</TableHead>
              <TableHead className="w-20">Size</TableHead>
              <TableHead className="w-32">Tags</TableHead>
              <TableHead className="w-32">Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="size-5" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="size-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="border rounded-md p-8 text-center text-muted-foreground">
        No resources found matching your filters.
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="w-24">Type</TableHead>
            <TableHead className="w-20">Size</TableHead>
            <TableHead className="w-32">Tags</TableHead>
            <TableHead className="w-32">Created</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resources.map((resource) => (
            <TableRow
              key={resource.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onView(resource)}
            >
              <TableCell>
                <ResourceTypeIcon type={resource.type} size="sm" />
              </TableCell>
              <TableCell className="font-medium">
                <div>
                  <span>{resource.name}</span>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground truncate max-w-xs">
                      {resource.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {resource.type}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatFileSize(resource.size)}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {resource.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {resource.tags.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{resource.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell
                className="text-muted-foreground"
                title={new Date(resource.createdAt).toLocaleString()}
              >
                {formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onView(resource)}>
                      <Eye className="size-4 mr-2" /> View
                    </DropdownMenuItem>
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(resource)}>
                        <Pencil className="size-4 mr-2" /> Edit
                      </DropdownMenuItem>
                    )}
                    {onDownload && (
                      <DropdownMenuItem onClick={() => onDownload(resource)}>
                        <Download className="size-4 mr-2" /> Download
                      </DropdownMenuItem>
                    )}
                    {onCopy && (
                      <DropdownMenuItem onClick={() => onCopy(resource)}>
                        <Copy className="size-4 mr-2" /> Copy
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(resource)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="size-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default ResourceList;
