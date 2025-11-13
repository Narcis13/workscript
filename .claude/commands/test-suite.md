---
description: Create comprehensive test suite for a feature, node, API, or component
---

You are helping create a comprehensive test suite using Vitest.

## Test Suite Creation Workflow

### Step 1: Identify Test Target

Ask the user what to test:
- Workflow node (universal/server/client)
- API endpoint
- UI component
- Service/utility function
- Integration test
- E2E test

### Step 2: Determine Test Type

Choose appropriate testing approach:

#### Unit Tests
- Individual functions/methods
- Isolated component testing
- Mock external dependencies
- Fast execution

#### Integration Tests
- Multiple components together
- Database interactions
- API integrations
- Real dependencies (where appropriate)

#### E2E Tests
- Full user workflows
- Browser automation
- Complete stack testing

### Step 3: Node Testing Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import YourNode from '../YourNode';
import type { ExecutionContext } from '../types';

describe('YourNode', () => {
  let node: YourNode;
  let context: ExecutionContext;

  beforeEach(() => {
    node = new YourNode();
    context = {
      workflowId: 'test-workflow',
      nodeId: 'test-node',
      state: {},
      registry: mockRegistry,
      edgeContext: {}
    };
  });

  describe('metadata', () => {
    it('should have correct metadata structure', () => {
      expect(node.metadata.id).toBe('your-node');
      expect(node.metadata.name).toBeTruthy();
      expect(node.metadata.version).toBe('1.0.0');
      expect(node.metadata.ai_hints).toBeDefined();
    });
  });

  describe('execute()', () => {
    describe('success cases', () => {
      it('should execute successfully with valid config', async () => {
        const config = {
          param1: 'value1',
          param2: 123
        };

        const result = await node.execute(context, config);

        expect(result.success).toBeDefined();
        const data = result.success();
        expect(data.result).toBeTruthy();
      });

      it('should update state correctly', async () => {
        const config = { param1: 'test' };

        await node.execute(context, config);

        expect(context.state.resultKey).toBeTruthy();
      });

      it('should handle edge case: empty input', async () => {
        const config = { param1: '' };
        const result = await node.execute(context, config);
        // Assert expected behavior
      });
    });

    describe('error cases', () => {
      it('should return error for missing required param', async () => {
        const config = {}; // Missing param1

        const result = await node.execute(context, config);

        expect(result.error).toBeDefined();
        const errorData = result.error();
        expect(errorData.error).toContain('Missing');
      });

      it('should handle invalid input type', async () => {
        const config = { param1: 123 }; // Wrong type

        const result = await node.execute(context, config);

        expect(result.error).toBeDefined();
      });

      it('should handle exceptions gracefully', async () => {
        const config = { param1: 'trigger-error' };

        const result = await node.execute(context, config);

        expect(result.error).toBeDefined();
      });
    });

    describe('edge routing', () => {
      it('should return success edge', async () => {
        const config = { param1: 'value' };
        const result = await node.execute(context, config);
        expect(result.success).toBeDefined();
      });

      it('should return custom edge when condition met', async () => {
        const config = { param1: 'special-value' };
        const result = await node.execute(context, config);
        expect(result.custom_edge).toBeDefined();
      });
    });
  });
});
```

### Step 4: API Testing Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../../src/index';

describe('POST /api/resource', () => {
  beforeAll(async () => {
    // Setup test database, mock services
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('success cases', () => {
    it('should create resource successfully', async () => {
      const payload = {
        field1: 'value1',
        field2: 123
      };

      const res = await app.request('/api/resource', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should return 400 for invalid payload', async () => {
      const payload = { field1: 123 }; // Wrong type

      const res = await app.request('/api/resource', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.success).toBe(false);
    });
  });

  describe('authentication', () => {
    it('should return 401 without token', async () => {
      const res = await app.request('/api/resource', {
        method: 'POST',
        body: JSON.stringify({ field1: 'value' }),
        headers: { 'Content-Type': 'application/json' }
      });

      expect(res.status).toBe(401);
    });
  });

  describe('authorization', () => {
    it('should return 403 for unauthorized user', async () => {
      const res = await app.request('/api/resource/123', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer other-user-token' }
      });

      expect(res.status).toBe(403);
    });
  });
});
```

### Step 5: React Component Testing Template

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YourComponent } from '../YourComponent';

describe('YourComponent', () => {
  describe('rendering', () => {
    it('should render correctly with default props', () => {
      render(<YourComponent prop1="test" />);
      expect(screen.getByText('test')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      render(<YourComponent prop1="test" loading={true} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render error state', () => {
      render(<YourComponent prop1="test" error="Error message" />);
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should call onAction when button clicked', async () => {
      const onAction = vi.fn();
      render(<YourComponent prop1="test" onAction={onAction} />);

      const button = screen.getByRole('button', { name: 'Action' });
      await userEvent.click(button);

      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('should handle form submission', async () => {
      const onSubmit = vi.fn();
      render(<YourComponent onSubmit={onSubmit} />);

      const input = screen.getByLabelText('Input');
      await userEvent.type(input, 'test value');

      const submitButton = screen.getByRole('button', { name: 'Submit' });
      await userEvent.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith({ input: 'test value' });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<YourComponent prop1="test" />);
      expect(screen.getByLabelText('Label text')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      render(<YourComponent prop1="test" />);
      const button = screen.getByRole('button');

      button.focus();
      expect(button).toHaveFocus();

      await userEvent.keyboard('{Enter}');
      // Assert action was triggered
    });
  });
});
```

### Step 6: Test Coverage Goals

Aim for:
- **Statements:** 80%+
- **Branches:** 75%+
- **Functions:** 80%+
- **Lines:** 80%+

Run coverage: `bun test --coverage`

### Step 7: Testing Best Practices

#### AAA Pattern
- **Arrange:** Set up test data and context
- **Act:** Execute the code under test
- **Assert:** Verify the results

#### Test Naming
- Use descriptive names
- Format: "should [expected behavior] when [condition]"
- Group related tests with `describe`

#### Test Independence
- Each test should be independent
- No shared state between tests
- Use `beforeEach` for setup
- Use `afterEach` for cleanup

#### Mocking Strategy
- Mock external dependencies
- Use `vi.fn()` for function mocks
- Use `vi.mock()` for module mocks
- Don't mock what you're testing

#### Assertions
- One logical assertion per test
- Use specific matchers
- Provide meaningful failure messages

### Step 8: Run Tests

```bash
# Run all tests
cd [package] && bun test

# Run specific test file
cd [package] && bun test YourNode.test.ts

# Watch mode
cd [package] && bun test --watch

# Coverage
cd [package] && bun test --coverage

# UI mode
cd [package] && bun test --ui
```

Now, what would you like to create tests for?
