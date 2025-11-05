/**
 * Event system exports
 */

export { EventEmitter } from './EventEmitter';
export { 
  WebSocketEventSystem,
  type WorkflowLifecycleEvent,
  type NodeExecutionEvent,
  type WorkflowProgressEvent,
  type ErrorNotificationEvent,
  type SystemNotificationEvent,
  type WebSocketEvent,
  type WorkflowLifecycleCallback,
  type NodeExecutionCallback,
  type WorkflowProgressCallback,
  type ErrorNotificationCallback,
  type SystemNotificationCallback
} from './WebSocketEventSystem';