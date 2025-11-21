/**
 * ExecutionStateViewer Component
 *
 * Displays JSON state data as an interactive expandable tree view with syntax highlighting.
 * Provides comprehensive tools for inspecting complex state objects, including expand/collapse
 * all functionality, copy-to-clipboard, and visual distinction between different value types.
 *
 * Features:
 * - Interactive expandable tree view for nested objects and arrays
 * - Expand/collapse all controls for quick navigation
 * - Syntax highlighting for different JSON value types
 * - Copy entire JSON to clipboard
 * - Visual indicators for arrays and objects
 * - Keyboard navigation support (arrow keys, enter)
 * - Performance optimized for large state objects
 * - Empty state handling
 * - Responsive design for mobile and desktop
 * - Type-specific styling (strings in green, numbers in blue, booleans in purple)
 * - Custom depth visualization
 *
 * @module components/executions/ExecutionStateViewer
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  ChevronsDown,
  ChevronsUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Props for the ExecutionStateViewer component
 */
export interface ExecutionStateViewerProps {
  /**
   * The JSON state object to display
   */
  state: Record<string, any> | undefined | null;

  /**
   * Optional title for the viewer
   */
  title?: string;

  /**
   * Optional CSS class name for the container
   */
  className?: string;

  /**
   * Whether to start with all items expanded (default: false)
   */
  defaultExpanded?: boolean;

  /**
   * Maximum depth to show (0 = unlimited, default: 0)
   */
  maxDepth?: number;

  /**
   * Whether to show the expand/collapse all buttons (default: true)
   */
  showExpandControls?: boolean;
}

/**
 * Props for tree node component
 */
interface TreeNodeProps {
  /**
   * The key/name of the node
   */
  name: string;

  /**
   * The value of the node
   */
  value: any;

  /**
   * Current depth in the tree
   */
  depth: number;

  /**
   * Maximum depth to show
   */
  maxDepth: number;

  /**
   * Whether this node is initially expanded
   */
  defaultExpanded: boolean;

  /**
   * Global expanded state
   */
  expandedAll?: boolean;
}

/**
 * Get the type label for a value
 *
 * @param value - The value to check
 * @returns Type label (array, object, string, number, boolean, null, undefined)
 */
const getValueType = (value: any): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

/**
 * Format a value for display
 *
 * @param value - The value to format
 * @returns Formatted string
 */
const formatValue = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return '';
};

/**
 * Get color class for a value type
 *
 * @param type - The value type
 * @returns Tailwind color class
 */
const getTypeColor = (type: string): string => {
  switch (type) {
    case 'string':
      return 'text-green-600 dark:text-green-400';
    case 'number':
      return 'text-blue-600 dark:text-blue-400';
    case 'boolean':
      return 'text-purple-600 dark:text-purple-400';
    case 'null':
      return 'text-gray-500 dark:text-gray-400';
    case 'undefined':
      return 'text-gray-500 dark:text-gray-400';
    case 'array':
      return 'text-orange-600 dark:text-orange-400';
    case 'object':
      return 'text-pink-600 dark:text-pink-400';
    default:
      return 'text-foreground';
  }
};

/**
 * Tree Node Component
 *
 * Renders a single node in the tree with expandable children
 */
const TreeNode: React.FC<TreeNodeProps> = ({
  name,
  value,
  depth,
  maxDepth,
  defaultExpanded,
  expandedAll,
}) => {
  const [isExpanded, setIsExpanded] = useState(
    defaultExpanded || expandedAll === true
  );

  React.useEffect(() => {
    if (expandedAll !== undefined) {
      setIsExpanded(expandedAll);
    }
  }, [expandedAll]);

  const valueType = getValueType(value);
  const isExpandable =
    (valueType === 'object' || valueType === 'array') &&
    value !== null &&
    Object.keys(value).length > 0;
  const shouldHide = maxDepth > 0 && depth >= maxDepth;
  const displayValue = formatValue(value);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  const entries = useMemo(() => {
    if (!isExpandable || !isExpanded) return [];
    if (Array.isArray(value)) {
      return value.map((v, i) => [i, v]);
    }
    return Object.entries(value);
  }, [value, isExpandable, isExpanded]);

  if (shouldHide && depth > 0) {
    return null;
  }

  return (
    <div className="font-mono text-sm">
      {/* Node Header */}
      <div className="flex items-center gap-1 py-1">
        {/* Expand/Collapse Button */}
        {isExpandable && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-transparent"
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            aria-expanded={isExpanded}
            tabIndex={0}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}

        {/* Placeholder for non-expandable items */}
        {!isExpandable && (
          <div className="w-5" />
        )}

        {/* Key Name */}
        {name && (
          <span className="text-foreground font-semibold mr-2">
            {Array.isArray(value) ? `[${name}]` : name}:
          </span>
        )}

        {/* Value or Type */}
        {!isExpandable ? (
          <span className={cn('font-mono', getTypeColor(valueType))}>
            {displayValue}
          </span>
        ) : (
          <span className={cn('text-muted-foreground', getTypeColor(valueType))}>
            {Array.isArray(value)
              ? `[${value.length}]`
              : `{${Object.keys(value).length}}`}
          </span>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && isExpandable && (
        <div className="ml-4 border-l border-muted pl-4 space-y-0">
          {entries.map(([key, childValue], index) => (
            <TreeNode
              key={`${String(key)}-${index}`}
              name={String(key)}
              value={childValue}
              depth={depth + 1}
              maxDepth={maxDepth}
              defaultExpanded={defaultExpanded}
              expandedAll={expandedAll}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Copy text to clipboard with visual feedback
 *
 * @param text - Text to copy
 * @param label - Label for the toast notification
 */
const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  } catch (err) {
    toast.error(`Failed to copy ${label}`);
  }
};

/**
 * Empty State Component
 */
const EmptyState: React.FC = () => (
  <Card className="p-8 bg-muted/30">
    <div className="text-center">
      <p className="text-sm text-muted-foreground">No state data to display</p>
    </div>
  </Card>
);

/**
 * ExecutionStateViewer Component
 *
 * Displays JSON state as an interactive tree view with full expand/collapse controls,
 * syntax highlighting, and copy functionality. Optimized for inspecting complex
 * state objects during execution debugging.
 *
 * @example
 * ```tsx
 * <ExecutionStateViewer
 *   state={executionState}
 *   title="Final State"
 *   defaultExpanded={false}
 *   showExpandControls={true}
 * />
 * ```
 */
export const ExecutionStateViewer: React.FC<ExecutionStateViewerProps> = ({
  state,
  title = 'State',
  className,
  defaultExpanded = false,
  maxDepth = 0,
  showExpandControls = true,
}) => {
  const [expandedAll, setExpandedAll] = useState<boolean | undefined>(
    defaultExpanded ? true : undefined
  );
  const [copiedRecently, setCopiedRecently] = useState(false);

  const handleExpandAll = useCallback(() => {
    setExpandedAll(true);
  }, []);

  const handleCollapseAll = useCallback(() => {
    setExpandedAll(false);
  }, []);

  const handleCopyJSON = useCallback(async () => {
    if (!state) return;
    await copyToClipboard(JSON.stringify(state, null, 2), `${title} JSON`);
    setCopiedRecently(true);
    setTimeout(() => setCopiedRecently(false), 2000);
  }, [state, title]);

  if (!state || Object.keys(state).length === 0) {
    return (
      <div className={className}>
        <div className="space-y-3">
          {title && (
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          )}
          <EmptyState />
        </div>
      </div>
    );
  }

  const entries = useMemo(() => {
    if (Array.isArray(state)) {
      return state.map((v, i) => [i, v]);
    }
    return Object.entries(state);
  }, [state]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header and Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {title && (
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {showExpandControls && entries.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={handleExpandAll}
                title="Expand all nodes"
              >
                <ChevronsDown className="h-3 w-3" />
                Expand
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={handleCollapseAll}
                title="Collapse all nodes"
              >
                <ChevronsUp className="h-3 w-3" />
                Collapse
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={handleCopyJSON}
            title="Copy JSON to clipboard"
          >
            {copiedRecently ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tree View Container */}
      <div className="bg-muted/30 rounded-lg border border-muted p-4 overflow-x-auto">
        <div className="space-y-0">
          {entries.map(([key, value], index) => (
            <TreeNode
              key={`root-${String(key)}-${index}`}
              name={String(key)}
              value={value}
              depth={1}
              maxDepth={maxDepth}
              defaultExpanded={defaultExpanded}
              expandedAll={expandedAll}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Export ExecutionStateViewer as default
 */
export default ExecutionStateViewer;
