---
description: Comprehensive code quality, completeness, and best practices review
---

You are performing a comprehensive code review for quality, completeness, and best practices.

## Code Review Framework

### Step 1: Identify Scope

Ask the user what to review:
- Specific file(s) or directory
- Recent git changes
- Feature branch
- Pull request
- Node implementation
- API endpoint
- UI component

### Step 2: Architecture Compliance

Check alignment with project architecture:

#### Shared-Core Architecture
- [ ] Core engine logic in `/shared/src/`?
- [ ] Nodes placed correctly based on dependencies?
  - Universal (no deps) → `/shared/nodes/`
  - Server deps → `/server/nodes/`
  - Browser APIs → `/client/nodes/`
- [ ] No duplication between packages?
- [ ] Imports use `shared` package correctly?

#### Monorepo Structure
- [ ] Dependencies declared in correct package.json?
- [ ] No cross-package imports except through exports?
- [ ] Build order respected (shared → server/client)?

### Step 3: Code Quality Review

#### TypeScript Best Practices
- [ ] Strict mode compliance?
- [ ] No `any` types (or justified)?
- [ ] Types exported for public APIs?
- [ ] Interfaces over types for objects?
- [ ] Generics used appropriately?
- [ ] Type guards for runtime checks?

```typescript
// BAD
function process(data: any) {
  return data.value;
}

// GOOD
interface ProcessData {
  value: string;
}

function process(data: ProcessData): string {
  return data.value;
}
```

#### Error Handling
- [ ] All async operations wrapped in try-catch?
- [ ] Errors include context and actionable messages?
- [ ] Error types defined for expected errors?
- [ ] Edge cases handled?
- [ ] No swallowed errors?

```typescript
// BAD
try {
  await operation();
} catch (e) {
  console.log('error');
}

// GOOD
try {
  await operation();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return {
    error: () => ({
      error: `Operation failed: ${message}`,
      context: { operation: 'operationName' }
    })
  };
}
```

#### Function Quality
- [ ] Single Responsibility Principle?
- [ ] Functions under 50 lines?
- [ ] Descriptive names?
- [ ] Pure functions where possible?
- [ ] Side effects documented?
- [ ] Parameters under 5?

#### Code Organization
- [ ] Logical file structure?
- [ ] Related code grouped?
- [ ] Constants extracted?
- [ ] Magic numbers/strings avoided?
- [ ] DRY (Don't Repeat Yourself)?

### Step 4: Completeness Review

#### Node Implementation
- [ ] Metadata complete with all fields?
- [ ] AI hints provided?
- [ ] All inputs validated?
- [ ] All outputs documented?
- [ ] All edge cases defined?
- [ ] State updates documented?
- [ ] Example usage provided?
- [ ] Default export present?

```typescript
// Check for complete metadata
metadata = {
  id: 'node-id',              // ✓ Present
  name: 'Node Name',          // ✓ Present
  version: '1.0.0',           // ✓ Present
  description: 'Description', // ✓ Present
  inputs: [...],              // ✓ Present
  outputs: [...],             // ✓ Present
  ai_hints: {                 // ✓ Present
    purpose: '',
    when_to_use: '',
    expected_edges: [],
    example_usage: '',
    example_config: '',
    get_from_state: [],
    post_to_state: []
  }
};
```

#### API Endpoint Implementation
- [ ] Request validation (zod schema)?
- [ ] Response types defined?
- [ ] Error responses standardized?
- [ ] Authentication/authorization?
- [ ] Rate limiting considered?
- [ ] Logging added?
- [ ] Documentation/comments?

#### UI Component Implementation
- [ ] Props interface defined?
- [ ] PropTypes or TypeScript types?
- [ ] Accessibility (ARIA labels)?
- [ ] Responsive design?
- [ ] Loading states?
- [ ] Error states?
- [ ] Empty states?
- [ ] Keyboard navigation?

### Step 5: Testing Coverage

- [ ] Unit tests present?
- [ ] Test coverage >80%?
- [ ] Happy path tested?
- [ ] Error cases tested?
- [ ] Edge cases tested?
- [ ] Integration tests where needed?
- [ ] Tests are readable?
- [ ] Tests are maintainable?

```typescript
// Good test structure
describe('YourNode', () => {
  describe('execute()', () => {
    it('should handle valid input successfully', async () => {
      // Arrange
      const context = createMockContext();
      const config = { validInput: 'test' };

      // Act
      const result = await node.execute(context, config);

      // Assert
      expect(result.success).toBeDefined();
    });

    it('should return error for missing input', async () => {
      const context = createMockContext();
      const config = {};

      const result = await node.execute(context, config);

      expect(result.error).toBeDefined();
    });
  });
});
```

### Step 6: Documentation Review

- [ ] JSDoc comments for public APIs?
- [ ] Complex logic explained?
- [ ] TODOs documented or removed?
- [ ] README updated if needed?
- [ ] Examples provided?
- [ ] Breaking changes noted?

```typescript
/**
 * Processes workflow data and transforms it according to config
 *
 * @param context - Execution context with state and node info
 * @param config - Node configuration with transformation rules
 * @returns EdgeMap with success or error edges
 *
 * @example
 * ```typescript
 * const result = await node.execute(context, {
 *   operation: 'transform',
 *   data: [1, 2, 3]
 * });
 * ```
 */
async execute(context: ExecutionContext, config?: any): Promise<EdgeMap>
```

### Step 7: Performance Review

- [ ] No unnecessary re-renders (React)?
- [ ] Efficient algorithms (O(n) vs O(n²))?
- [ ] Database queries optimized?
- [ ] Proper indexing?
- [ ] Caching where appropriate?
- [ ] Memory leaks prevented?
- [ ] Large data sets handled?

### Step 8: Maintainability Review

- [ ] Code is readable?
- [ ] Consistent style?
- [ ] No overly complex logic?
- [ ] Easy to extend?
- [ ] Easy to test?
- [ ] Dependencies justified?
- [ ] Technical debt documented?

### Step 9: Generate Review Report

Provide structured feedback:

#### ✅ Strengths
- What is done well
- Good patterns observed
- Positive highlights

#### 🔴 Critical Issues (Must Fix)
- Bugs and logic errors
- Security vulnerabilities
- Architecture violations

#### 🟡 Improvements Needed
- Code quality issues
- Missing error handling
- Incomplete implementations
- Missing tests

#### 🔵 Suggestions
- Performance optimizations
- Better naming
- Refactoring opportunities
- Future enhancements

#### 📋 Checklist Summary
- [ ] Architecture compliant
- [ ] TypeScript strict mode
- [ ] Error handling complete
- [ ] Tests present and passing
- [ ] Documentation adequate
- [ ] Performance acceptable
- [ ] Maintainable code

For each issue:
- **Location:** `file.ts:line`
- **Severity:** Critical / High / Medium / Low
- **Issue:** Description of the problem
- **Fix:** Recommended solution with code example

Now, what code would you like me to review?
