export type ApiResponse = {
  message: string;
  success: true;
}

// Core workflow types and interfaces

export interface NodeMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  inputs?: string[];
  outputs?: string[];
}

export interface ExecutionContext {
  state: Record<string, any>;
  inputs: Record<string, any>;
  workflowId: string;
  nodeId: string;
  executionId: string;
}

export type EdgeMap = Record<string, any>;

export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  initialState?: Record<string, any>;
  workflow: Record<string, NodeConfiguration>;
}

export type NodeConfiguration = Record<string, any>;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

export interface ExecutionResult {
  executionId: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  finalState?: Record<string, any>;
  error?: string;
  startTime: Date;
  endTime?: Date;
}

// Abstract WorkflowNode base class
export abstract class WorkflowNode {
  abstract metadata: NodeMetadata;
  
  abstract execute(
    context: ExecutionContext, 
    config?: Record<string, any>
  ): Promise<EdgeMap>;
}
