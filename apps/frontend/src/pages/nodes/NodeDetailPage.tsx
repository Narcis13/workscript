/**
 * NodeDetailPage - Node Detail View
 *
 * Displays detailed information about a specific node including metadata,
 * inputs/outputs, AI hints, and an interactive test runner.
 *
 * **Features:**
 * - Complete node metadata display with tabbed organization
 * - Breadcrumb navigation (Nodes > {Node Name})
 * - Interactive test runner with Monaco editors
 * - Loading states with skeleton placeholders
 * - Error handling with retry functionality
 * - 404 handling for invalid node IDs
 *
 * **Requirements Coverage:**
 * - Requirement 2: Node Detail View and Metadata Display (Acceptance Criteria 1-10)
 * - Requirement 3: Node Test Runner and Execution (Acceptance Criteria 1-12)
 *
 * **Implementation Tasks:**
 * - Task 2.5.1: Create NodeDetailPage component
 * - Task 2.5.2: Test NodeDetailPage functionality
 *
 * **Example Usage:**
 * Route: `/nodes/:nodeId`
 * URL: `/nodes/math` displays the math node's details
 *
 * @module pages/nodes/NodeDetailPage
 */

import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { NodeDetailPanel } from '@/components/nodes/NodeDetailPanel';
import { NodeTestRunner } from '@/components/nodes/NodeTestRunner';
import { useNodeMetadata } from '@/hooks/api/useNodes';

/**
 * NodeDetailPage Component
 *
 * Displays comprehensive node documentation and provides an interactive testing environment.
 * Fetches node metadata from the API and renders it in a user-friendly tabbed interface.
 *
 * **Page Structure:**
 * 1. Breadcrumbs - Navigation trail (Nodes > {Node Name})
 * 2. Back Button - Quick navigation to nodes list
 * 3. NodeDetailPanel - Complete metadata display
 * 4. NodeTestRunner - Interactive execution testing
 *
 * **States Handled:**
 * - Loading: Shows skeleton loaders
 * - Success: Displays node details and test runner
 * - Error: Shows error message with retry button
 * - 404: Shows "Node not found" message with back button
 *
 * @returns React component
 */
export default function NodeDetailPage() {
  // ============================================
  // HOOKS
  // ============================================

  /**
   * Extract nodeId from route parameters
   * URL pattern: /nodes/:nodeId
   */
  const { nodeId } = useParams<{ nodeId: string }>();

  /**
   * Fetch node metadata from API
   * Automatically handles loading, error, and caching
   */
  const {
    data: node,
    isLoading,
    isError,
    error,
    refetch,
  } = useNodeMetadata(nodeId || '');

  // ============================================
  // DERIVED STATE
  // ============================================

  /**
   * Check if the error is a 404 (node not found)
   */
  const isNotFound = isError && (error as any)?.response?.status === 404;

  /**
   * Extract example config from AI hints for test runner
   */
  const exampleConfig = node?.ai_hints?.example_config
    ? typeof node.ai_hints.example_config === 'string'
      ? JSON.parse(node.ai_hints.example_config)
      : node.ai_hints.example_config
    : undefined;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Breadcrumbs Navigation */}
      <Breadcrumbs />

      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/nodes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Nodes
          </Link>
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" label="Loading node details..." />
          </div>
        </div>
      )}

      {/* Error State - 404 Not Found */}
      {isNotFound && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Node Not Found</AlertTitle>
          <AlertDescription>
            The node with ID "{nodeId}" could not be found. It may have been removed or the ID is incorrect.
          </AlertDescription>
          <div className="mt-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/nodes">Return to Nodes List</Link>
            </Button>
          </div>
        </Alert>
      )}

      {/* Error State - General Error */}
      {isError && !isNotFound && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Node</AlertTitle>
          <AlertDescription>
            {(error as any)?.message || 'An unexpected error occurred while loading the node details.'}
          </AlertDescription>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/nodes">Back to Nodes</Link>
            </Button>
          </div>
        </Alert>
      )}

      {/* Success State - Node Details */}
      {node && !isLoading && !isError && (
        <div className="space-y-6">
          {/* Node Metadata Panel */}
          <NodeDetailPanel node={node} />

          {/* Node Test Runner */}
          <NodeTestRunner
            nodeId={nodeId || ''}
            exampleConfig={exampleConfig}
          />
        </div>
      )}
    </div>
  );
}
