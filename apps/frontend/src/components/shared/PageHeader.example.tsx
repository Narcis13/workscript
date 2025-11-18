/**
 * PageHeader Component - Usage Examples
 *
 * This file demonstrates various ways to use the PageHeader component.
 * It is not meant to be imported in production code, but serves as documentation.
 */

import { Button } from "@/components/ui/button";
import { Plus, Filter, Download } from "lucide-react";
import { PageHeader } from "./PageHeader";

// ============================================================================
// Example 1: Basic page header with title only
// ============================================================================

export const BasicExample = () => (
  <PageHeader title="Dashboard" />
);

// ============================================================================
// Example 2: Page header with description
// ============================================================================

export const WithDescriptionExample = () => (
  <PageHeader
    title="Workflows"
    description="Manage and execute your workflow definitions"
  />
);

// ============================================================================
// Example 3: Page header with single action button
// ============================================================================

export const WithSingleActionExample = () => {
  const handleCreate = () => {
    console.log("Create workflow clicked");
  };

  return (
    <PageHeader
      title="Workflows"
      description="Manage and execute your workflow definitions"
      actions={
        <Button onClick={handleCreate}>
          <Plus className="size-4" />
          Create Workflow
        </Button>
      }
    />
  );
};

// ============================================================================
// Example 4: Page header with multiple actions
// ============================================================================

export const WithMultipleActionsExample = () => {
  const handleFilter = () => console.log("Filter clicked");
  const handleExport = () => console.log("Export clicked");

  return (
    <PageHeader
      title="Nodes"
      description="Browse available workflow nodes"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleFilter}>
            <Filter className="size-4" />
            Filters
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="size-4" />
            Export
          </Button>
        </div>
      }
    />
  );
};

// ============================================================================
// Example 5: Page header in a complete page layout
// ============================================================================

export const InPageLayoutExample = () => {
  const handleCreateAutomation = () => {
    console.log("Navigate to /automations/new");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Automations"
        description="Schedule and monitor automated workflow executions"
        actions={
          <Button onClick={handleCreateAutomation}>
            <Plus className="size-4" />
            Create Automation
          </Button>
        }
      />

      {/* Page Content */}
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Your automation list would appear here...
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// Example 6: Responsive behavior - stacks on mobile, side-by-side on desktop
// ============================================================================

export const ResponsiveExample = () => (
  <PageHeader
    title="Execution History"
    description="View and analyze workflow execution logs"
    actions={
      <div className="flex gap-2">
        <Button variant="outline">Filter by Date</Button>
        <Button variant="outline">Export Logs</Button>
        <Button>View Active</Button>
      </div>
    }
  />
);

// ============================================================================
// Example 7: With custom className for additional styling
// ============================================================================

export const WithCustomClassExample = () => (
  <PageHeader
    title="Monitoring"
    description="Real-time workflow execution tracking"
    className="bg-muted/50 rounded-lg p-4"
    actions={
      <Button variant="secondary">Refresh</Button>
    }
  />
);
