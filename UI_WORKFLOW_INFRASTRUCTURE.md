# UI Workflow Infrastructure

This document explains the foundational infrastructure implemented for AI-generated interactive UI workflows as described in `ui_workflows_proposal.md`.

## 🏗️ Infrastructure Components

### 1. Core Types & Interfaces (`shared/src/types/index.ts`)

**New UI-specific types added:**
- `UINodeMetadata` - Extended metadata for UI nodes
- `UIInteractionEvent` - Events from user interactions
- `UIRenderData` - Data for rendering UI components  
- `UIEdgeMap` - Extended edge mapping with UI render info
- `UIWorkflowDefinition` - Workflow definitions for UI artifacts
- `WorkflowUIComponent` - Base interface for UI components
- Form, Dashboard, Chart, and other component-specific interfaces

### 2. UINode Base Class (`shared/src/types/index.ts`)

**Abstract base class for UI nodes:**
```typescript
export abstract class UINode extends WorkflowNode {
  // Returns both execution edges AND render instructions
  async execute(context: ExecutionContext, config?: any): Promise<UIEdgeMap>
  
  // Abstract methods to implement:
  protected abstract prepareRenderData(context, config): Promise<any>
  protected abstract getEdges(context, config): Promise<EdgeMap>  
  protected abstract getComponentName(): string
  
  // Built-in interaction handling
  protected handleInteraction(event: UIInteractionEvent, context): void
}
```

### 3. Event System (`shared/src/ui/index.ts`)

**Complete event management system:**
- `UIWorkflowEventEmitter` - Event emitting/handling
- `UIEventFactory` - Creating standard events
- `UIStateManager` - Managing UI state across nodes
- `UIWorkflowContext` - Combined state and event management

### 4. Security Framework (`shared/src/ui/security.ts`)

**Comprehensive security validation:**
- `UIWorkflowSecurityValidator` - Main validation class
- `DEFAULT_UI_SECURITY_CONFIG` - Safe defaults for AI workflows
- Pattern detection for malicious content
- Component whitelist validation
- Resource usage limits

### 5. Client UI Nodes (`client/nodes/ui/`)

**Implemented UI node types:**
- `FormUINode` - Dynamic forms with validation
- `DashboardUINode` - Interactive dashboard layouts
- `ActionButtonGroupUINode` - Button groups with actions
- `ChartUINode` - Data visualization (basic)
- `DataTableUINode` - Interactive tables (basic)
- `FileProcessorUINode` - File upload handling (basic)

### 6. React Components (`client/src/components/workflow-ui/`)

**UI rendering infrastructure:**
- `WorkflowArtifact` - Main renderer for UI workflows
- `UIComponentRenderer` - Dynamic component loading
- Basic implementations for each component type
- Comprehensive styling in `workflow-ui.css`

## 🎯 Key Features Implemented

### ✅ Multi-Environment Architecture
- UI nodes work alongside regular workflow nodes
- Same workflow engine supports both server and UI operations
- Environment-aware node registration

### ✅ Security-First Design  
- AI-generated workflows are validated before execution
- Component whitelisting prevents malicious UI injection
- Pattern detection for dangerous content
- Resource usage monitoring

### ✅ Event-Driven Interactions
- UI components emit structured interaction events
- Events flow back into workflow execution engine
- State management across UI and workflow contexts

### ✅ Type-Safe Infrastructure
- Full TypeScript coverage for all UI workflow types
- Strongly-typed interfaces for components and events
- IDE support for workflow development

## 🚀 Usage Example

### Basic UI Workflow Definition
```typescript
const sampleUIWorkflow: UIWorkflowDefinition = {
  id: 'sample-ui-workflow',
  name: 'Sample UI Workflow', 
  version: '1.0.0',
  renderMode: 'artifact',
  metadata: {
    title: 'Sample Interactive Form',
    description: 'Demonstrates UI workflow infrastructure',
    aiGenerated: true
  },
  workflow: [
    {
      "user-form": {
        "component": "WorkflowForm",
        "fields": [
          { "name": "name", "type": "text", "label": "Name", "required": true },
          { "name": "email", "type": "email", "label": "Email" }
        ],
        "success?": "process-data"
      }
    },
    {
      "process-data": {
        "operation": "transform",
        "data": "@state.formData",
        "success?": "display-result"  
      }
    },
    {
      "display-result": {
        "component": "Dashboard",
        "title": "Processing Complete",
        "sections": [
          {
            "id": "result",
            "title": "Result",
            "component": "Card",
            "props": { "data": "@state.processedData" }
          }
        ]
      }
    }
  ]
};
```

### Using WorkflowArtifact Component
```tsx
import { WorkflowArtifact } from './components/workflow-ui';

function MyApp() {
  return (
    <WorkflowArtifact
      workflow={sampleUIWorkflow}
      onComplete={(result) => console.log('Workflow completed:', result)}
      onError={(error) => console.error('Workflow error:', error)}
      onInteraction={(event) => console.log('UI interaction:', event)}
    />
  );
}
```

## 📋 Implementation Status

### ✅ Completed Infrastructure
- [x] Base types and interfaces
- [x] UINode abstract class  
- [x] Event system architecture
- [x] Security validation framework
- [x] Client-side UI nodes (basic implementations)
- [x] WorkflowArtifact renderer component
- [x] Component library foundation
- [x] Styling and responsive design

### 🔄 Next Steps (Not Implemented Yet)
- [ ] Complete React component implementations
- [ ] AI integration for generating UI workflows
- [ ] Advanced chart/visualization components
- [ ] File processing capabilities  
- [ ] Integration with existing workflow engine events
- [ ] Testing workflows and validation
- [ ] Documentation and examples

## 🔧 Development Guidelines

### Creating Custom UI Nodes
1. Extend `UINode` base class
2. Implement required abstract methods
3. Handle UI interactions appropriately
4. Add to client node registry
5. Create corresponding React component

### Security Considerations
- All UI workflows are validated before execution
- Components must be whitelisted in security config
- User inputs are sanitized and validated
- External data access is controlled

### Testing UI Workflows
- Use security validator for workflow validation
- Test UI interactions with event system
- Verify state management across nodes
- Check responsive design and accessibility

## 📚 Related Files

- `ui_workflows_proposal.md` - Original design proposal
- `shared/src/ui/` - Core UI infrastructure 
- `client/nodes/ui/` - UI node implementations
- `client/src/components/workflow-ui/` - React components
- `CLAUDE.md` - Project documentation

This infrastructure provides the foundation for building AI-generated interactive UIs as outlined in the original proposal. The next development phase would focus on implementing complete React components and integrating with AI systems for workflow generation.