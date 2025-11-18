import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Column definition for the DataTable component.
 *
 * @template T - The type of data item in the table
 *
 * @property id - Unique identifier for the column
 * @property header - Display text for the column header
 * @property accessorKey - Key path to access the value from the data object (e.g., "user.name")
 * @property cell - Optional custom cell renderer function
 * @property sortable - Whether this column can be sorted (default: false)
 * @property className - Optional CSS class for the column cells
 * @property headerClassName - Optional CSS class for the column header
 *
 * @example
 * ```tsx
 * const columns: Column<User>[] = [
 *   {
 *     id: 'name',
 *     header: 'Name',
 *     accessorKey: 'name',
 *     sortable: true,
 *   },
 *   {
 *     id: 'email',
 *     header: 'Email',
 *     accessorKey: 'email',
 *     cell: (item) => <a href={`mailto:${item.email}`}>{item.email}</a>,
 *   },
 * ];
 * ```
 */
export interface Column<T> {
  id: string;
  header: string;
  accessorKey: string;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

/**
 * Sort configuration for the DataTable.
 *
 * @property column - The column ID to sort by
 * @property direction - Sort direction: 'asc' (ascending) or 'desc' (descending)
 */
export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

/**
 * Props for the DataTable component.
 *
 * @template T - The type of data item in the table
 *
 * @property columns - Array of column definitions
 * @property data - Array of data items to display
 * @property loading - Whether the table is in a loading state
 * @property onSort - Optional callback when a sortable column header is clicked
 * @property sortConfig - Current sort configuration (column and direction)
 * @property emptyMessage - Optional custom message when no data is available
 * @property className - Optional CSS class for the table container
 */
export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onSort?: (sortConfig: SortConfig) => void;
  sortConfig?: SortConfig | null;
  emptyMessage?: string;
  className?: string;
}

/**
 * Generic reusable DataTable component with sorting support.
 *
 * This component provides a flexible, type-safe table with the following features:
 * - Generic TypeScript typing for any data structure
 * - Sortable columns with visual indicators
 * - Custom cell renderers
 * - Loading state with skeleton rows
 * - Empty state handling
 * - Responsive design
 * - shadcn/ui table components for consistent styling
 *
 * @template T - The type of data item in the table
 *
 * @param props - DataTableProps<T>
 * @returns A rendered table component
 *
 * @example
 * ```tsx
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 *   status: 'active' | 'inactive';
 * }
 *
 * const columns: Column<User>[] = [
 *   {
 *     id: 'name',
 *     header: 'Name',
 *     accessorKey: 'name',
 *     sortable: true,
 *   },
 *   {
 *     id: 'email',
 *     header: 'Email',
 *     accessorKey: 'email',
 *   },
 *   {
 *     id: 'status',
 *     header: 'Status',
 *     accessorKey: 'status',
 *     cell: (user) => (
 *       <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>
 *         {user.status}
 *       </Badge>
 *     ),
 *     sortable: true,
 *   },
 * ];
 *
 * const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
 *
 * function MyTable() {
 *   return (
 *     <DataTable
 *       columns={columns}
 *       data={users}
 *       loading={isLoading}
 *       sortConfig={sortConfig}
 *       onSort={setSortConfig}
 *       emptyMessage="No users found"
 *     />
 *   );
 * }
 * ```
 *
 * @remarks
 * - The component uses TypeScript generics to ensure type safety
 * - Sorting is controlled externally via the onSort callback
 * - Loading state displays 5 skeleton rows by default
 * - Custom cell renderers receive the entire data item
 * - Nested object access is supported via dot notation in accessorKey
 */
export function DataTable<T>({
  columns,
  data,
  loading = false,
  onSort,
  sortConfig = null,
  emptyMessage = 'No data available',
  className,
}: DataTableProps<T>) {
  /**
   * Handle click on a sortable column header.
   * Toggles between ascending, descending, and no sort.
   */
  const handleSort = (columnId: string) => {
    if (!onSort) return;

    let newDirection: 'asc' | 'desc' = 'asc';

    // If clicking the same column, toggle direction
    if (sortConfig?.column === columnId) {
      newDirection = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    }

    onSort({ column: columnId, direction: newDirection });
  };

  /**
   * Get the sort icon for a column based on current sort state.
   */
  const getSortIcon = (columnId: string) => {
    if (!sortConfig || sortConfig.column !== columnId) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }

    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  /**
   * Get a nested property value from an object using dot notation.
   * Example: getNestedValue({ user: { name: 'John' } }, 'user.name') returns 'John'
   */
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  /**
   * Render the default cell content by accessing the value via accessorKey.
   */
  const renderCell = (item: T, column: Column<T>) => {
    if (column.cell) {
      return column.cell(item);
    }

    const value = getNestedValue(item, column.accessorKey);
    return value !== null && value !== undefined ? String(value) : '-';
  };

  return (
    <div className={cn('rounded-md border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.id}
                className={cn(
                  column.headerClassName,
                  column.sortable && onSort && 'cursor-pointer select-none'
                )}
                onClick={() =>
                  column.sortable && onSort ? handleSort(column.id) : undefined
                }
              >
                <div className="flex items-center">
                  {column.header}
                  {column.sortable && onSort && getSortIcon(column.id)}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            // Show skeleton rows while loading
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                {columns.map((column) => (
                  <TableCell key={column.id} className={column.className}>
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            // Show empty state
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            // Render data rows
            data.map((item, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.id} className={column.className}>
                    {renderCell(item, column)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
