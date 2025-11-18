/**
 * DataTable Usage Example
 *
 * This file demonstrates how to use the DataTable component with various configurations.
 * It's intended as a reference for developers and is not part of the production build.
 */

import { useState } from 'react';
import { DataTable, Column, SortConfig } from './DataTable';
import { Badge } from '@/components/ui/badge';

// Example 1: Simple user table
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  status: 'active' | 'inactive';
  createdAt: Date;
}

const userColumns: Column<User>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorKey: 'name',
    sortable: true,
  },
  {
    id: 'email',
    header: 'Email',
    accessorKey: 'email',
  },
  {
    id: 'role',
    header: 'Role',
    accessorKey: 'role',
    cell: (user) => (
      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
        {user.role}
      </Badge>
    ),
    sortable: true,
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: (user) => (
      <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>
        {user.status}
      </Badge>
    ),
    sortable: true,
  },
  {
    id: 'createdAt',
    header: 'Created',
    accessorKey: 'createdAt',
    cell: (user) => new Date(user.createdAt).toLocaleDateString(),
    sortable: true,
  },
];

export function UserTableExample() {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [isLoading] = useState(false);

  const users: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      status: 'active',
      createdAt: new Date('2024-01-15'),
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'user',
      status: 'active',
      createdAt: new Date('2024-02-20'),
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'guest',
      status: 'inactive',
      createdAt: new Date('2024-03-10'),
    },
  ];

  // Sort the data based on sortConfig
  const sortedUsers = [...users].sort((a, b) => {
    if (!sortConfig) return 0;

    const aValue = a[sortConfig.column as keyof User];
    const bValue = b[sortConfig.column as keyof User];

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <DataTable
      columns={userColumns}
      data={sortedUsers}
      loading={isLoading}
      sortConfig={sortConfig}
      onSort={setSortConfig}
      emptyMessage="No users found"
    />
  );
}

// Example 2: Workflow execution table with nested properties
interface WorkflowExecution {
  id: string;
  workflow: {
    name: string;
    version: string;
  };
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  duration: number;
}

const executionColumns: Column<WorkflowExecution>[] = [
  {
    id: 'id',
    header: 'Execution ID',
    accessorKey: 'id',
    cell: (exec) => (
      <code className="text-xs">{exec.id.substring(0, 8)}...</code>
    ),
  },
  {
    id: 'workflowName',
    header: 'Workflow',
    accessorKey: 'workflow.name', // Nested property access
    sortable: true,
  },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    cell: (exec) => {
      const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
        pending: 'secondary',
        running: 'default',
        completed: 'default',
        failed: 'destructive',
      };
      return <Badge variant={variants[exec.status]}>{exec.status}</Badge>;
    },
    sortable: true,
  },
  {
    id: 'startTime',
    header: 'Start Time',
    accessorKey: 'startTime',
    cell: (exec) => new Date(exec.startTime).toLocaleString(),
    sortable: true,
  },
  {
    id: 'duration',
    header: 'Duration',
    accessorKey: 'duration',
    cell: (exec) => `${exec.duration}ms`,
    sortable: true,
  },
];

export function WorkflowExecutionTableExample() {
  const executions: WorkflowExecution[] = [
    {
      id: 'exec-1234-5678-90ab',
      workflow: { name: 'Process Orders', version: '1.0.0' },
      status: 'completed',
      startTime: new Date('2024-01-18T10:30:00'),
      duration: 1523,
    },
    {
      id: 'exec-abcd-efgh-ijkl',
      workflow: { name: 'Send Emails', version: '2.1.0' },
      status: 'running',
      startTime: new Date('2024-01-18T10:35:00'),
      duration: 0,
    },
  ];

  return (
    <DataTable
      columns={executionColumns}
      data={executions}
      emptyMessage="No executions found"
    />
  );
}

// Example 3: Table without sorting
interface SimpleItem {
  name: string;
  value: number;
}

const simpleColumns: Column<SimpleItem>[] = [
  {
    id: 'name',
    header: 'Name',
    accessorKey: 'name',
  },
  {
    id: 'value',
    header: 'Value',
    accessorKey: 'value',
  },
];

export function SimpleTableExample() {
  const items: SimpleItem[] = [
    { name: 'Item 1', value: 100 },
    { name: 'Item 2', value: 200 },
  ];

  return (
    <DataTable
      columns={simpleColumns}
      data={items}
      // No sorting functionality - onSort not provided
    />
  );
}

// Example 4: Loading state
export function LoadingTableExample() {
  return (
    <DataTable
      columns={userColumns}
      data={[]}
      loading={true} // Shows skeleton rows
    />
  );
}

// Example 5: Empty state
export function EmptyTableExample() {
  return (
    <DataTable
      columns={userColumns}
      data={[]}
      loading={false}
      emptyMessage="No data available. Create your first user to get started."
    />
  );
}
