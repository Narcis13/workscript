---
description: Create a new UI component or UI workflow node with React best practices
---

You are helping create a new UI component or UI workflow node.

## UI Component Creation Workflow

### Step 1: Determine Component Type

Ask the user what they want to create:
1. **React Component** - Reusable UI component in `/client/src/components/`
2. **UI Workflow Node** - Interactive workflow node in `/client/nodes/ui/`
3. **Page Component** - Full page component

### Step 2: Component Planning

Gather requirements:
- Component name and purpose
- Props/inputs needed
- State management requirements
- User interactions (clicks, form submission, etc.)
- Data fetching needs
- Styling approach (Tailwind classes, shadcn/ui)

### Step 3: React Component Template

**For Standard Component:**
```typescript
import React from 'react';

interface YourComponentProps {
  prop1: string;
  prop2?: number;
  onAction?: (data: any) => void;
}

export const YourComponent: React.FC<YourComponentProps> = ({
  prop1,
  prop2,
  onAction
}) => {
  const [state, setState] = React.useState<any>(null);

  const handleAction = () => {
    // Handle interaction
    onAction?.({ /* data */ });
  };

  return (
    <div className="container mx-auto p-4">
      {/* Component JSX */}
    </div>
  );
};
```

**For UI Workflow Node:**
```typescript
import { UINode } from '../../shared/src/nodes/UINode';
import type { ExecutionContext, EdgeMap } from 'shared';

export class YourUINode extends UINode {
  metadata = {
    id: 'your-ui',
    name: 'Your UI Component',
    version: '1.0.0',
    description: 'Interactive UI component for workflows',
    inputs: ['config', 'data'],
    outputs: ['result', 'userInput'],
    ai_hints: {
      purpose: 'Render interactive UI for user input',
      when_to_use: 'When workflow needs user interaction',
      expected_edges: ['submit', 'cancel', 'error'],
      example_usage: '{"ui-1": {"fields": [...], "submit?": "process"}}',
      example_config: '{"fields": [], "title": "string"}',
      get_from_state: [],
      post_to_state: ['userInput', 'formData']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { title, fields, data } = config || {};

    try {
      // Prepare render data
      const renderData = {
        title,
        fields,
        data,
        nodeId: context.nodeId
      };

      // Store in state for UI to pick up
      context.state.uiRenderData = context.state.uiRenderData || {};
      context.state.uiRenderData[context.nodeId] = renderData;

      // Return edges for user interactions
      return {
        submit: (data: any) => {
          context.state.userInput = data;
          return { userInput: data };
        },
        cancel: () => {
          return { cancelled: true };
        },
        error: () => ({ error: 'UI interaction failed' })
      };
    } catch (error) {
      return {
        error: () => ({
          error: error instanceof Error ? error.message : 'UI node failed'
        })
      };
    }
  }
}

export default YourUINode;
```

### Step 4: Styling with Tailwind

Use Tailwind CSS v4 utility classes:
- Layout: `flex`, `grid`, `container`, `mx-auto`
- Spacing: `p-4`, `m-2`, `gap-4`
- Typography: `text-lg`, `font-bold`, `text-gray-700`
- Colors: `bg-blue-500`, `text-white`, `border-gray-300`
- Interactive: `hover:bg-blue-600`, `focus:ring-2`

Use shadcn/ui components when possible:
- Button, Input, Card, Dialog, Table, etc.

### Step 5: State Management

Choose appropriate approach:
- **Local State:** `useState` for component-only state
- **Workflow State:** Access via workflow execution context
- **Global State:** Consider React Context if needed

### Step 6: Testing

Create tests in `/client/__tests__/`:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { YourComponent } from '../src/components/YourComponent';

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent prop1="test" />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('handles user interaction', () => {
    const onAction = vi.fn();
    render(<YourComponent prop1="test" onAction={onAction} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onAction).toHaveBeenCalled();
  });
});
```

### Step 7: Accessibility

Ensure:
- [ ] Semantic HTML elements
- [ ] ARIA labels where needed
- [ ] Keyboard navigation support
- [ ] Focus management
- [ ] Color contrast meets WCAG standards

### Step 8: Integration

- Export component from appropriate index file
- Add to component library/storybook if applicable
- Document props and usage

Now, what UI component would you like to create?
