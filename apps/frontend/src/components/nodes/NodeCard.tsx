/**
 * NodeCard Component
 *
 * Displays a workflow node's summary information in a card format.
 * Shows node ID, name, version, description, source badge, and provides
 * a "View Details" action to navigate to the node's detail page.
 *
 * Features:
 * - Responsive card layout with hover effects
 * - Source badge (universal/server/client)
 * - Truncated description (max 3 lines)
 * - Click to navigate to node detail page
 * - Accessible keyboard navigation
 *
 * @module components/nodes/NodeCard
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Package, Server, Globe } from 'lucide-react';
import type { NodeMetadata } from '@/types/node.types';
import { NodeSource } from '@/types/node.types';

/**
 * Props for the NodeCard component
 */
export interface NodeCardProps {
  /**
   * Node metadata to display
   */
  node: NodeMetadata;

  /**
   * Optional CSS class name
   */
  className?: string;

  /**
   * Optional callback when card is clicked
   */
  onClick?: (nodeId: string) => void;
}

/**
 * Get the appropriate icon for a node source
 */
const getSourceIcon = (source: NodeSource) => {
  switch (source) {
    case NodeSource.UNIVERSAL:
      return <Globe className="h-3 w-3" />;
    case NodeSource.SERVER:
      return <Server className="h-3 w-3" />;
    case NodeSource.CLIENT:
      return <Package className="h-3 w-3" />;
    default:
      return <Package className="h-3 w-3" />;
  }
};

/**
 * Get the appropriate badge variant for a node source
 */
const getSourceVariant = (source: NodeSource): 'default' | 'secondary' | 'outline' => {
  switch (source) {
    case NodeSource.UNIVERSAL:
      return 'default';
    case NodeSource.SERVER:
      return 'secondary';
    case NodeSource.CLIENT:
      return 'outline';
    default:
      return 'outline';
  }
};

/**
 * Truncate text to a maximum number of lines
 */
const truncateDescription = (text: string | undefined, maxLength: number = 120): string => {
  if (!text) return 'No description available';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

/**
 * NodeCard Component
 *
 * Displays a single node's information in a card format with navigation to detail page.
 *
 * @example
 * ```tsx
 * <NodeCard
 *   node={nodeMetadata}
 *   onClick={(id) => console.log('Clicked node:', id)}
 * />
 * ```
 */
export const NodeCard: React.FC<NodeCardProps> = ({ node, className, onClick }) => {
  const navigate = useNavigate();

  /**
   * Handle card click - navigate to node detail page
   */
  const handleCardClick = () => {
    if (onClick) {
      onClick(node.id);
    }
    navigate(`/nodes/${encodeURIComponent(node.id)}`);
  };

  /**
   * Handle button click - prevent event bubbling
   */
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleCardClick();
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <Card
      className={`
        cursor-pointer transition-all duration-200
        hover:shadow-lg hover:scale-[1.02] hover:border-primary/50
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${className || ''}
      `}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${node.name}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{node.name}</CardTitle>
            <CardDescription className="text-xs font-mono mt-1 truncate">
              {node.id}
            </CardDescription>
          </div>
          <Badge variant={getSourceVariant(node.source)} className="shrink-0 flex items-center gap-1">
            {getSourceIcon(node.source)}
            <span className="capitalize">{node.source}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {truncateDescription(node.description)}
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="text-xs">
            v{node.version}
          </Badge>
          {node.category && (
            <Badge variant="outline" className="text-xs capitalize">
              {node.category}
            </Badge>
          )}
          {node.deprecated && (
            <Badge variant="destructive" className="text-xs">
              Deprecated
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto group"
          onClick={handleButtonClick}
          aria-label={`View ${node.name} details`}
        >
          View Details
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};

/**
 * Export NodeCard as default
 */
export default NodeCard;
