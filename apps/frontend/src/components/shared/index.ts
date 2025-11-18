/**
 * Shared Components Index
 *
 * This file exports all shared utility components for easier importing.
 * Instead of importing from individual files, you can import multiple components from this index.
 *
 * @example
 * ```tsx
 * // Before (individual imports)
 * import { EmptyState } from "@/components/shared/EmptyState";
 * import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
 * import { PageHeader } from "@/components/shared/PageHeader";
 *
 * // After (index import)
 * import { EmptyState, LoadingSpinner, PageHeader } from "@/components/shared";
 * ```
 */

export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";

export { LoadingSpinner } from "./LoadingSpinner";
export type { LoadingSpinnerProps } from "./LoadingSpinner";

export { ErrorBoundary } from "./ErrorBoundary";
export type { ErrorBoundaryProps, ErrorBoundaryState } from "./ErrorBoundary";

export { ConfirmDialog } from "./ConfirmDialog";
export type { ConfirmDialogProps } from "./ConfirmDialog";

export { StatusBadge } from "./StatusBadge";
export type { StatusBadgeProps } from "./StatusBadge";

export { DataTable } from "./DataTable";
export type { DataTableProps, ColumnDef } from "./DataTable";

export { SearchInput } from "./SearchInput";
export type { SearchInputProps } from "./SearchInput";

export { PageHeader } from "./PageHeader";
export type { PageHeaderProps } from "./PageHeader";
