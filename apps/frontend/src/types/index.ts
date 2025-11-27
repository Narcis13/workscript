/**
 * Types Barrel Export
 *
 * Re-exports all type definitions for easy importing throughout the application.
 * Import types from '@/types' or '@/types/index' instead of individual files.
 *
 * @example
 * ```typescript
 * import type { Workflow, ConnectionSummary, ApiResponse } from '@/types';
 * ```
 *
 * @module types
 */

// =============================================================================
// API TYPES
// =============================================================================
export type {
  ApiResponse,
  ApiError,
  PaginatedResponse,
  ApiListResponse,
  ApiSuccessResponse,
  BulkOperationResponse,
  ValidationErrorResponse,
  HealthCheckResponse,
  HttpMethod,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  ApiClientConfig,
  QueryParams,
  FileUploadRequest,
  FileUploadResponse,
  BatchRequest,
  BatchResponse,
  RateLimitInfo,
  CacheMetadata,
} from './api.types';

// =============================================================================
// AUTH TYPES
// =============================================================================
export * from './auth';

// =============================================================================
// WORKFLOW TYPES
// =============================================================================
export type {
  Workflow,
  CreateWorkflowPayload,
  UpdateWorkflowPayload,
  ParsedWorkflow,
  ValidationResult,
  ValidationWarning,
  ExecutionResult,
  NodeExecutionLog,
  StateChange,
  ExecuteWorkflowRequest,
  DuplicateWorkflowRequest,
  WorkflowFilterOptions,
  WorkflowStats,
  WorkflowWithStats,
} from './workflow.types';

// =============================================================================
// AUTOMATION TYPES
// =============================================================================
export * from './automation.types';

// =============================================================================
// EXECUTION TYPES
// =============================================================================
export * from './execution.types';

// =============================================================================
// NODE TYPES
// =============================================================================
export * from './node.types';

// =============================================================================
// INTEGRATION TYPES
// =============================================================================
export type {
  // Provider types
  ProviderMetadata,
  // Connection types
  ConnectionSummary,
  ConnectionDetails,
  // Test connection types
  TestConnectionResult,
  // API response types
  ProvidersResponse,
  ProviderResponse,
  ConnectionsResponse,
  ConnectionResponse,
  TestConnectionResponse,
  RenameConnectionResponse,
  DeleteConnectionResponse,
  OAuthCallbackSuccessResponse,
  OAuthCallbackErrorResponse,
  OAuthCallbackResponse,
  IntegrationApiError,
  // OAuth flow types
  OAuthInitiateParams,
  OAuthCallbackParams,
  // Connection status types
  ConnectionStatusType,
  ConnectionStatusInfo,
  // Filter types
  ConnectionsFilter,
  // Error code type
  IntegrationErrorCode,
} from './integration.types';

// Export error codes constant
export { IntegrationErrorCodes } from './integration.types';
