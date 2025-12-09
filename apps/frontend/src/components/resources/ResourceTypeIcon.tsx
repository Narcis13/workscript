/**
 * ResourceTypeIcon Component
 *
 * Displays an icon with type-specific color for resource types.
 *
 * @module components/resources/ResourceTypeIcon
 */

import { FileCode, Image, Music, FileText, Database, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResourceType } from '@/types/resource.types';

const typeConfig: Record<ResourceType, { icon: LucideIcon; color: string }> = {
  prompt: { icon: FileCode, color: 'text-blue-500' },
  image: { icon: Image, color: 'text-green-500' },
  audio: { icon: Music, color: 'text-purple-500' },
  document: { icon: FileText, color: 'text-orange-500' },
  data: { icon: Database, color: 'text-cyan-500' },
};

interface ResourceTypeIconProps {
  type: ResourceType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-8',
};

export function ResourceTypeIcon({ type, size = 'md', className }: ResourceTypeIconProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return <Icon className={cn(sizeClasses[size], config.color, className)} />;
}

export default ResourceTypeIcon;
