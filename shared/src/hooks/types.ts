/**
 * Hook system types and interfaces for the workflow engine
 */

import type { ExecutionContext } from '../types';

/**
 * Hook event types that can be listened to
 */
export type HookEventType = 
  // Workflow lifecycle hooks
  | 'workflow:before-start'
  | 'workflow:after-start' 
  | 'workflow:before-end'
  | 'workflow:after-end'
  | 'workflow:on-error'
  | 'workflow:on-timeout'
  // Node execution hooks
  | 'node:before-execute'
  | 'node:after-execute'
  | 'node:on-error'
  | 'node:on-edge-taken'
  | 'node:on-state-change'
  // State management hooks
  | 'state:before-update'
  | 'state:after-update'
  | 'state:on-lock'
  | 'state:on-snapshot'
  | 'state:on-rollback'
  // Custom event hooks
  | string; // Allow custom event names

/**
 * Context passed to hook handlers
 */
export interface HookContext {
  /** Event type that triggered the hook */
  eventType: HookEventType;
  /** Current execution context */
  executionContext?: ExecutionContext;
  /** Workflow ID */
  workflowId?: string;
  /** Node ID (for node-specific events) */
  nodeId?: string;
  /** Event-specific data */
  data?: any;
  /** Timestamp of the event */
  timestamp: Date;
}

/**
 * Hook handler function signature
 */
export type HookHandler = (context: HookContext) => Promise<void> | void;

/**
 * Hook filter function to determine if hook should execute
 */
export type HookFilter = (context: HookContext) => boolean;

/**
 * Hook registration options
 */
export interface HookOptions {
  /** Unique name for the hook */
  name: string;
  /** Hook handler function */
  handler: HookHandler;
  /** Optional filter function to conditionally execute hook */
  filter?: HookFilter;
  /** Priority for execution order (higher = earlier, default: 0) */
  priority?: number;
  /** Whether hook should only execute once */
  once?: boolean;
  /** Node types to filter for (only for node events) */
  nodeFilter?: string[];
}

/**
 * Registered hook with metadata
 */
export interface RegisteredHook extends HookOptions {
  /** Unique ID assigned during registration */
  id: string;
  /** Event type this hook listens to */
  eventType: HookEventType;
  /** Whether this hook has been executed (for once hooks) */
  executed?: boolean;
}

/**
 * Hook execution result
 */
export interface HookExecutionResult {
  /** Hook that was executed */
  hook: RegisteredHook;
  /** Execution duration in milliseconds */
  duration: number;
  /** Whether execution was successful */
  success: boolean;
  /** Error if execution failed */
  error?: Error;
}

/**
 * Event emitter callback function
 */
export type EventCallback = (data: any) => Promise<void> | void;

/**
 * Event listener registration
 */
export interface EventListener {
  /** Unique ID for the listener */
  id: string;
  /** Event name */
  event: string;
  /** Callback function */
  callback: EventCallback;
  /** Whether listener should only execute once */
  once?: boolean;
}