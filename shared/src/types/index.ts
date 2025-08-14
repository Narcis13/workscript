export type ApiResponse = {
  message: string;
  success: true;
}

// Core workflow types and interfaces

export interface NodeMetadata {
  id: string;
  name: string;
  description?: string;
  version?: string;
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
  description?: string;
  initialState?: Record<string, any>;
  workflow: WorkflowStep[];
}

export type WorkflowStep = 
  | string                           // Simple node reference without configuration
  | { [nodeId: string]: NodeConfiguration };  // Node with configuration

export interface NodeConfiguration {
  [key: string]: ParameterValue | EdgeRoute;
}

export type ParameterValue = 
  | string 
  | number
  | boolean
  | Array<ParameterValue>
  | { [key: string]: ParameterValue };

export type EdgeRoute = 
  | string                    // Single node reference
  | EdgeRouteItem[]           // Sequence of nodes/configs
  | NestedNodeConfiguration;  // Nested configuration

export type EdgeRouteItem = 
  | string                    // Node ID in sequence
  | NestedNodeConfiguration;  // Nested config in sequence

export interface NestedNodeConfiguration {
  [nodeId: string]: NodeConfiguration;
}

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

// UI Workflow Infrastructure Types

export interface UINodeMetadata extends NodeMetadata {
  category: 'ui' | 'ui-layout' | 'ui-visualization' | 'ui-form' | 'ui-data';
  renderMode?: 'component' | 'container' | 'overlay';
}

export interface UIInteractionEvent {
  type: string;
  data: any;
  nodeId: string;
  timestamp: number;
}

export interface UIRenderData {
  component: string;
  props: Record<string, any>;
  nodeId: string;
  onInteraction?: (event: UIInteractionEvent) => void;
}

export interface UIEdgeMap extends EdgeMap {
  __ui_render?: () => UIRenderData;
}

export interface UIWorkflowDefinition extends WorkflowDefinition {
  renderMode: 'artifact' | 'inline' | 'modal';
  metadata: {
    title: string;
    description: string;
    aiGenerated: boolean;
    conversationContext?: string;
  };
}

// Component Library Types
export interface WorkflowUIComponent {
  nodeId: string;
  workflowState: any;
  onInteraction: (event: UIInteractionEvent) => void;
}

export interface FormField {
  name: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'radio';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: ValidationRules;
}

export interface ValidationRules {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  custom?: (value: any) => string | null;
}

export interface Column {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'boolean' | 'action';
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
}

export interface ActionButton {
  label: string;
  action: string;
  payload?: any;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  icon?: string;
}

export interface DashboardSection {
  id: string;
  title: string;
  component: string;
  props?: Record<string, any>;
  layout?: {
    width?: string;
    height?: string;
    position?: 'left' | 'right' | 'center' | 'full';
  };
}

export interface ChartData {
  labels?: string[];
  datasets: Array<{
    label?: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

export interface ChartConfig {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: {
    legend?: { display: boolean; position?: 'top' | 'bottom' | 'left' | 'right' };
    tooltip?: { enabled: boolean };
  };
  scales?: {
    x?: { display: boolean; title?: { display: boolean; text: string } };
    y?: { display: boolean; title?: { display: boolean; text: string } };
  };
}

// Abstract UINode base class
export abstract class UINode extends WorkflowNode {
  abstract metadata: UINodeMetadata;
  
  // UI nodes return both execution edges AND render instructions
  async execute(context: ExecutionContext, config?: any): Promise<UIEdgeMap> {
    const renderData = await this.prepareRenderData(context, config);
    const edges = await this.getEdges(context, config);
    
    return {
      ...edges,
      __ui_render: () => ({
        component: this.getComponentName(),
        props: renderData,
        nodeId: context.nodeId,
        onInteraction: this.createInteractionHandler(context)
      })
    };
  }
  
  protected abstract prepareRenderData(context: ExecutionContext, config?: any): Promise<any>;
  
  protected abstract getEdges(context: ExecutionContext, config?: any): Promise<EdgeMap>;
  
  protected abstract getComponentName(): string;
  
  // Create interaction handler for the UI component
  protected createInteractionHandler(context: ExecutionContext) {
    return (event: UIInteractionEvent) => {
      this.handleInteraction(event, context);
    };
  }
  
  // Handle UI interactions and update workflow state
  protected handleInteraction(event: UIInteractionEvent, context: ExecutionContext): void {
    // Default implementation - can be overridden by specific nodes
    this.updateStateFromInteraction(event, context);
    this.emitWorkflowEvent(event, context);
  }
  
  protected updateStateFromInteraction(event: UIInteractionEvent, context: ExecutionContext): void {
    // Update context state based on interaction
    const stateKey = `${context.nodeId}_interaction`;
    context.state[stateKey] = event;
    
    // Store specific interaction data
    if (event.data) {
      const dataKey = `${context.nodeId}_data`;
      context.state[dataKey] = event.data;
    }
  }
  
  protected emitWorkflowEvent(event: UIInteractionEvent, context: ExecutionContext): void {
    // This would integrate with the workflow engine's event system
    // For now, we just store the event for the engine to pick up
    const eventsKey = `${context.nodeId}_events`;
    if (!context.state[eventsKey]) {
      context.state[eventsKey] = [];
    }
    context.state[eventsKey].push(event);
  }
}

// UI Event System Types
export interface UIEventEmitter {
  on(event: string, handler: (data: any) => void): void;
  emit(event: string, data: any): void;
  off(event: string, handler?: (data: any) => void): void;
}

// Security and Validation Types
export interface UISecurityConfig {
  allowedComponents: Set<string>;
  allowedActions: Set<string>;
  maxComplexity: number;
  allowExternalData: boolean;
}

export interface UIValidationResult extends ValidationResult {
  securityWarnings?: SecurityWarning[];
}

export interface SecurityWarning {
  severity: 'low' | 'medium' | 'high';
  message: string;
  path: string;
  recommendation?: string;
}
