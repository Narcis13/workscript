# Implementation Plan: String Template Interpolation

This document provides a concrete, actionable implementation plan for adding mustache-style string template interpolation `{{$.path.to.value}}` to the Workscript engine's StateResolver. Tasks are organized by phases and include checkboxes for tracking progress.

---

## PHASE 1: PREPARATION AND ANALYSIS

### 1.1 Codebase Review

- [x] **Task 1.1.1: Read current StateResolver implementation**
  - Open and review `/packages/engine/src/state/StateResolver.ts`
  - Understand the current `resolveStringValue()` method (lines 118-148)
  - Note the existing pattern at line 46: `/^\$\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)$/`
  - Understand `getNestedValue()` method for path resolution
  - _Requirements: R6 (Backward Compatibility)_

- [x] **Task 1.1.2: Read existing StateResolver tests**
  - Open and review `/packages/engine/src/state/StateResolver.test.ts`
  - Identify the test structure and patterns used
  - Note the `testState` fixture used in tests
  - Identify where new tests should be added (after line ~243)
  - _Requirements: All_

- [x] **Task 1.1.3: Review ExecutionEngine integration point**
  - Open `/packages/engine/src/engine/ExecutionEngine.ts`
  - Locate line 283 where `stateResolver.resolve()` is called
  - Confirm no changes needed to ExecutionEngine
  - _Requirements: R10 (Integration)_

- [x] **Task 1.1.4: Review EditFieldsNode pattern reference**
  - Open `/packages/nodes/src/data/EditFieldsNode.ts`
  - Note the existing `{{fieldName}}` pattern at lines 243-261
  - Understand how our `{{$.key}}` differs (requires `$.` prefix)
  - _Requirements: R7 (Pattern Validation)_

---

## PHASE 2: CORE IMPLEMENTATION

### 2.1 Add Template Pattern Constant

- [x] **Task 2.1.1: Add TEMPLATE_PATTERN regex constant**
  - Open `/packages/engine/src/state/StateResolver.ts`
  - Add after line 47 (after `DEFAULT_MAX_DEPTH`):
    ```typescript
    private static readonly TEMPLATE_PATTERN = /\{\{\$\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\}\}/g;
    ```
  - The pattern captures paths like `user.name` from `{{$.user.name}}`
  - Uses global flag `g` for multiple matches
  - _Requirements: R1, R2, R3_

### 2.2 Add Template Detection Method

- [x] **Task 2.2.1: Implement containsTemplatePattern private method**
  - Add after the `handleMissingKey` method (~line 193)
  - Implementation:
    ```typescript
    /**
     * Check if a string contains template interpolation patterns {{$.path}}
     */
    private containsTemplatePattern(value: string): boolean {
      // Reset lastIndex for global regex (critical for correctness!)
      StateResolver.TEMPLATE_PATTERN.lastIndex = 0;
      return StateResolver.TEMPLATE_PATTERN.test(value);
    }
    ```
  - _Requirements: R1, R11 (Safety)_

### 2.3 Add Template Interpolation Method

- [x] **Task 2.3.1: Implement interpolateTemplate private method**
  - Add after `containsTemplatePattern` method
  - Implementation:
    ```typescript
    /**
     * Interpolate template patterns {{$.path}} within a string
     * Replaces each {{$.path}} with the resolved state value (as string)
     * Missing keys are replaced with empty string (silent)
     *
     * @param template - String containing {{$.path}} patterns
     * @param state - Current workflow state
     * @returns Interpolated string with values substituted
     */
    private interpolateTemplate(
      template: string,
      state: Record<string, any>
    ): string {
      // Reset lastIndex for global regex
      StateResolver.TEMPLATE_PATTERN.lastIndex = 0;

      return template.replace(
        StateResolver.TEMPLATE_PATTERN,
        (match, keyPath) => {
          const value = this.getNestedValue(state, keyPath);

          // Missing keys become empty string (requirement: silent)
          if (value === undefined || value === null) {
            return '';
          }

          // Convert to string representation
          if (typeof value === 'object') {
            try {
              return JSON.stringify(value);
            } catch {
              return '';
            }
          }

          return String(value);
        }
      );
    }
    ```
  - _Requirements: R1, R2, R3, R4, R5, R12_

### 2.4 Modify resolveStringValue Method

- [x] **Task 2.4.1: Update resolveStringValue to handle templates**
  - Replace the existing `resolveStringValue` method (lines 118-148)
  - Critical: Check full `$.path` pattern FIRST for backward compatibility
  - Then check template pattern SECOND
  - Implementation:
    ```typescript
    /**
     * Resolve a string value that might contain a state reference
     *
     * Supports two patterns:
     * 1. Full reference: "$.path" - Returns the raw value with type preservation
     * 2. Template interpolation: "Hello {{$.name}}" - Returns interpolated string
     */
    private resolveStringValue(
      value: string,
      state: Record<string, any>,
      path: string[]
    ): any {
      // FIRST: Check for full state reference pattern (existing behavior)
      // This preserves types (numbers, booleans, objects, arrays)
      const fullMatch = value.match(this.options.pattern);

      if (fullMatch) {
        const keyPath = fullMatch[1];

        if (!keyPath) {
          // Malformed pattern, return original value
          return value;
        }

        try {
          const resolvedValue = this.getNestedValue(state, keyPath);

          if (resolvedValue === undefined) {
            return this.handleMissingKey(keyPath, value, path);
          }

          return resolvedValue;
        } catch (error) {
          return this.handleMissingKey(keyPath, value, path);
        }
      }

      // SECOND: Check for template interpolation patterns {{$.path}}
      // This always returns a string (templates are for string building)
      if (this.containsTemplatePattern(value)) {
        return this.interpolateTemplate(value, state);
      }

      // No patterns found, return as-is
      return value;
    }
    ```
  - _Requirements: R1, R6, R7_

---

## PHASE 3: STATIC UTILITY METHODS

### 3.1 Add Public Static Helpers

- [x] **Task 3.1.1: Add containsTemplate static method**
  - Add after existing static methods (~line 231)
  - Implementation:
    ```typescript
    /**
     * Check if a string contains template patterns {{$.path}}
     * Useful for tooling and validation
     */
    static containsTemplate(value: string): boolean {
      StateResolver.TEMPLATE_PATTERN.lastIndex = 0;
      return StateResolver.TEMPLATE_PATTERN.test(value);
    }
    ```
  - _Requirements: R9_

- [x] **Task 3.1.2: Add extractTemplatePaths static method**
  - Add after `containsTemplate`:
    ```typescript
    /**
     * Extract all template key paths from a string
     * Example: "Hello {{$.user.name}}, score: {{$.score}}" => ["user.name", "score"]
     */
    static extractTemplatePaths(value: string): string[] {
      const paths: string[] = [];
      StateResolver.TEMPLATE_PATTERN.lastIndex = 0;
      let match;

      while ((match = StateResolver.TEMPLATE_PATTERN.exec(value)) !== null) {
        if (match[1]) {
          paths.push(match[1]);
        }
      }

      return paths;
    }
    ```
  - _Requirements: R9_

---

## PHASE 4: UNIT TESTS

### 4.1 Basic Template Tests

- [x] **Task 4.1.1: Add test file structure for templates**
  - Open `/packages/engine/src/state/StateResolver.test.ts`
  - Add new describe block after existing tests (~line 243):
    ```typescript
    describe('Template interpolation {{$.path}}', () => {
      // Tests will go here
    });
    ```
  - _Requirements: All_

- [x] **Task 4.1.2: Add single template interpolation test**
  - Test that a single template in a string is resolved:
    ```typescript
    test('should interpolate single template in string', () => {
      const config = 'Hello {{$.user.name}}!';
      const result = resolver.resolve(config, testState);
      expect(result).toBe('Hello Jane Smith!');
    });
    ```
  - _Requirements: R1_

- [x] **Task 4.1.3: Add multiple templates test**
  - Test that multiple templates in one string are all resolved:
    ```typescript
    test('should interpolate multiple templates in string', () => {
      const config = 'Hello {{$.user.name}}, your score is {{$.count}}!';
      const result = resolver.resolve(config, testState);
      expect(result).toBe('Hello Jane Smith, your score is 42!');
    });
    ```
  - _Requirements: R2_

- [x] **Task 4.1.4: Add deeply nested path test**
  - Test that deeply nested paths resolve correctly:
    ```typescript
    test('should handle deeply nested paths in templates', () => {
      const config = 'Email: {{$.user.profile.email}}';
      const result = resolver.resolve(config, testState);
      expect(result).toBe('Email: jane@example.com');
    });
    ```
  - _Requirements: R3_

### 4.2 Missing Key Tests

- [x] **Task 4.2.1: Add missing key empty string test**
  - Test that missing keys resolve to empty string:
    ```typescript
    test('should replace missing keys with empty string (silent)', () => {
      const config = 'Value: {{$.nonexistent}}';
      const result = resolver.resolve(config, testState);
      expect(result).toBe('Value: ');
    });
    ```
  - _Requirements: R4_

- [x] **Task 4.2.2: Add null value test**
  - Test that null values resolve to empty string:
    ```typescript
    test('should handle null values as empty string', () => {
      const stateWithNull = { ...testState, nullValue: null };
      const config = 'Value: {{$.nullValue}}';
      const result = resolver.resolve(config, stateWithNull);
      expect(result).toBe('Value: ');
    });
    ```
  - _Requirements: R4_

- [x] **Task 4.2.3: Add undefined value test**
  - Test that undefined values resolve to empty string:
    ```typescript
    test('should handle undefined values as empty string', () => {
      const stateWithUndefined = { ...testState, undefinedValue: undefined };
      const config = 'Value: {{$.undefinedValue}}';
      const result = resolver.resolve(config, stateWithUndefined);
      expect(result).toBe('Value: ');
    });
    ```
  - _Requirements: R4_

### 4.3 Complex Value Tests

- [x] **Task 4.3.1: Add object stringification test**
  - Test that objects are JSON.stringify'd:
    ```typescript
    test('should stringify objects in templates', () => {
      const config = 'User data: {{$.user}}';
      const result = resolver.resolve(config, testState);
      expect(result).toContain('"name"');
      expect(result).toContain('Jane Smith');
    });
    ```
  - _Requirements: R5_

- [x] **Task 4.3.2: Add array stringification test**
  - Test that arrays are JSON.stringify'd:
    ```typescript
    test('should stringify arrays in templates', () => {
      const config = 'Items: {{$.list}}';
      const result = resolver.resolve(config, testState);
      expect(result).toBe('Items: ["item1","item2","item3"]');
    });
    ```
  - _Requirements: R5_

### 4.4 Backward Compatibility Tests

- [x] **Task 4.4.1: Add type preservation test for numbers**
  - CRITICAL: Verify `$.key` full reference still preserves types:
    ```typescript
    test('should preserve full $.path pattern behavior - numbers', () => {
      const numConfig = '$.count';
      const numResult = resolver.resolve(numConfig, testState);
      expect(numResult).toBe(42);
      expect(typeof numResult).toBe('number');
    });
    ```
  - _Requirements: R6_

- [x] **Task 4.4.2: Add type preservation test for booleans**
  - Test boolean type preservation:
    ```typescript
    test('should preserve full $.path pattern behavior - booleans', () => {
      const boolConfig = '$.active';
      const boolResult = resolver.resolve(boolConfig, testState);
      expect(boolResult).toBe(true);
      expect(typeof boolResult).toBe('boolean');
    });
    ```
  - _Requirements: R6_

- [x] **Task 4.4.3: Add type preservation test for objects**
  - Test object type preservation:
    ```typescript
    test('should preserve full $.path pattern behavior - objects', () => {
      const objConfig = '$.user';
      const objResult = resolver.resolve(objConfig, testState);
      expect(typeof objResult).toBe('object');
      expect(objResult.name).toBe('Jane Smith');
    });
    ```
  - _Requirements: R6_

### 4.5 Pattern Validation Tests

- [x] **Task 4.5.1: Add test for missing $. prefix**
  - Test that `{{name}}` without `$.` is NOT matched:
    ```typescript
    test('should NOT match template pattern without $. prefix', () => {
      const config = 'Hello {{user.name}}!';
      const result = resolver.resolve(config, testState);
      expect(result).toBe('Hello {{user.name}}!'); // Unchanged
    });
    ```
  - _Requirements: R7_

- [x] **Task 4.5.2: Add test for JS template literal syntax**
  - Test that `${$.key}` is NOT matched:
    ```typescript
    test('should NOT match JS template literal syntax', () => {
      const config = 'Hello ${$.user.name}!';
      const result = resolver.resolve(config, testState);
      expect(result).toBe('Hello ${$.user.name}!'); // Unchanged
    });
    ```
  - _Requirements: R7_

### 4.6 Nested Config Tests

- [x] **Task 4.6.1: Add nested object config test**
  - Test templates in nested objects:
    ```typescript
    test('should work with templates in nested objects', () => {
      const config = {
        message: 'Hello {{$.user.name}}!',
        nested: {
          greeting: 'Welcome {{$.developer}}'
        }
      };
      const result = resolver.resolve(config, testState);
      expect(result).toEqual({
        message: 'Hello Jane Smith!',
        nested: {
          greeting: 'Welcome John Doe'
        }
      });
    });
    ```
  - _Requirements: R8_

- [x] **Task 4.6.2: Add array config test**
  - Test templates in arrays:
    ```typescript
    test('should work with templates in arrays', () => {
      const config = [
        'Hello {{$.developer}}',
        'Email: {{$.user.profile.email}}'
      ];
      const result = resolver.resolve(config, testState);
      expect(result).toEqual([
        'Hello John Doe',
        'Email: jane@example.com'
      ]);
    });
    ```
  - _Requirements: R8_

### 4.7 Static Method Tests

- [x] **Task 4.7.1: Add containsTemplate test suite**
  - Add describe block for static helpers:
    ```typescript
    describe('Static helper methods for templates', () => {
      test('containsTemplate should detect template patterns', () => {
        expect(StateResolver.containsTemplate('Hello {{$.name}}')).toBe(true);
        expect(StateResolver.containsTemplate('No templates here')).toBe(false);
        expect(StateResolver.containsTemplate('$.path')).toBe(false);
        expect(StateResolver.containsTemplate('{{name}}')).toBe(false);
      });
    });
    ```
  - _Requirements: R9_

- [x] **Task 4.7.2: Add extractTemplatePaths test**
  - Test path extraction:
    ```typescript
    test('extractTemplatePaths should return all paths', () => {
      const paths = StateResolver.extractTemplatePaths('{{$.user.name}} and {{$.score}}');
      expect(paths).toEqual(['user.name', 'score']);
    });

    test('extractTemplatePaths should return empty array for no templates', () => {
      const paths = StateResolver.extractTemplatePaths('No templates');
      expect(paths).toEqual([]);
    });
    ```
  - _Requirements: R9_

### 4.8 Edge Case Tests

- [x] **Task 4.8.1: Add adjacent templates test**
  - Test templates directly next to each other:
    ```typescript
    test('should handle adjacent templates', () => {
      const config = '{{$.developer}}{{$.user.name}}';
      const result = resolver.resolve(config, testState);
      expect(result).toBe('John DoeJane Smith');
    });
    ```
  - _Requirements: R2_

- [x] **Task 4.8.2: Add mixed content test**
  - Test complex mixed content:
    ```typescript
    test('should handle mixed content with multiple templates', () => {
      const config = 'User {{$.user.name}} (count: {{$.count}}) - {{$.developer}}';
      const result = resolver.resolve(config, testState);
      expect(result).toBe('User Jane Smith (count: 42) - John Doe');
    });
    ```
  - _Requirements: R2_

- [x] **Task 4.8.3: Add same template multiple times test**
  - Test duplicate template placeholders:
    ```typescript
    test('should handle same template multiple times', () => {
      const config = '{{$.user.name}} loves {{$.user.name}}';
      const result = resolver.resolve(config, testState);
      expect(result).toBe('Jane Smith loves Jane Smith');
    });
    ```
  - _Requirements: R2_

---

## PHASE 5: INTEGRATION TESTING

### 5.1 Engine Integration Tests

- [x] **Task 5.1.1: Add integration test for templates in workflow**
  - Create or update `/packages/engine/src/state/StateResolver.integration.test.ts`
  - Test that templates work end-to-end through ExecutionEngine:
    ```typescript
    test('should resolve templates during workflow execution', async () => {
      const workflow = {
        id: 'template-test',
        name: 'Template Test',
        version: '1.0.0',
        initialState: { user: { name: 'Alice' }, score: 100 },
        workflow: [
          {
            'log': {
              message: 'Hello {{$.user.name}}, score: {{$.score}}!',
              'success?': null
            }
          }
        ]
      };

      // Execute workflow and verify log output contains resolved values
    });
    ```
  - _Requirements: R10_

- [x] **Task 5.1.2: Add integration test for state changes**
  - Test that templates resolve to updated state values:
    ```typescript
    test('should resolve templates with current state between nodes', async () => {
      // Create workflow that modifies state, then uses templates
      // Verify templates see the updated state
    });
    ```
  - _Requirements: R10_

---

## PHASE 6: DOCUMENTATION

### 6.1 Update Engine Documentation

- [x] **Task 6.1.1: Update StateResolver JSDoc comments**
  - Add JSDoc for new methods in StateResolver.ts
  - Document the `{{$.path}}` syntax
  - Explain the difference between `$.path` and `{{$.path}}`
  - _Requirements: Non-functional (Maintainability)_

- [x] **Task 6.1.2: Update packages/engine/CLAUDE.md**
  - Add section about template interpolation syntax
  - Document under "State Syntax" section
  - Add examples showing template usage
  - _Requirements: Non-functional (Maintainability)_

- [x] **Task 6.1.3: Update root CLAUDE.md if needed**
  - Add template syntax to the State Syntax table if appropriate
  - Ensure workflow examples show template capability
  - _Requirements: Non-functional (Maintainability)_

---

## PHASE 7: BUILD AND VERIFY

### 7.1 Build Verification

- [ ] **Task 7.1.1: Run TypeScript type check**
  - Execute: `bun run typecheck` from monorepo root
  - Verify no type errors in new code
  - _Requirements: Non-functional (Code Quality)_

- [ ] **Task 7.1.2: Build engine package**
  - Execute: `bun run build:engine`
  - Verify build succeeds without errors
  - _Requirements: Non-functional (Code Quality)_

- [ ] **Task 7.1.3: Build all packages**
  - Execute: `bun run build`
  - Verify full build succeeds
  - _Requirements: Non-functional (Code Quality)_

### 7.2 Test Verification

- [ ] **Task 7.2.1: Run StateResolver unit tests**
  - Execute: `bun test StateResolver.test.ts`
  - Verify all tests pass including new template tests
  - _Requirements: All_

- [ ] **Task 7.2.2: Run all engine tests**
  - Execute: `cd packages/engine && bun test`
  - Verify no regressions in existing tests
  - _Requirements: R6 (Backward Compatibility)_

- [ ] **Task 7.2.3: Run full test suite**
  - Execute: `bun run test`
  - Verify no regressions across the monorepo
  - _Requirements: All_

---

## PHASE 8: FINAL VERIFICATION

### 8.1 Acceptance Criteria Review

- [ ] **Task 8.1.1: Verify Requirement 1 - Basic Template Interpolation**
  - Manually verify all acceptance criteria
  - Run specific tests that cover R1
  - _Requirements: R1_

- [ ] **Task 8.1.2: Verify Requirement 2 - Multiple Templates**
  - Manually verify all acceptance criteria
  - Run specific tests that cover R2
  - _Requirements: R2_

- [ ] **Task 8.1.3: Verify Requirement 3 - Nested Paths**
  - Manually verify all acceptance criteria
  - Run specific tests that cover R3
  - _Requirements: R3_

- [ ] **Task 8.1.4: Verify Requirement 4 - Missing Keys**
  - Manually verify all acceptance criteria
  - Run specific tests that cover R4
  - _Requirements: R4_

- [ ] **Task 8.1.5: Verify Requirement 5 - Complex Values**
  - Manually verify all acceptance criteria
  - Run specific tests that cover R5
  - _Requirements: R5_

- [ ] **Task 8.1.6: Verify Requirement 6 - Backward Compatibility**
  - CRITICAL: Verify type preservation still works
  - Run backward compatibility tests
  - _Requirements: R6_

- [ ] **Task 8.1.7: Verify Requirements 7-12**
  - Verify pattern validation (R7)
  - Verify nested configs (R8)
  - Verify static methods (R9)
  - Verify integration (R10)
  - Verify performance/safety (R11)
  - Verify error handling (R12)
  - _Requirements: R7-R12_

### 8.2 Code Review Checklist

- [ ] **Task 8.2.1: Review code quality**
  - Check for TypeScript strict mode compliance
  - Verify no `any` types where avoidable
  - Check naming conventions consistency
  - Verify proper error handling
  - _Requirements: Non-functional (Code Quality)_

- [ ] **Task 8.2.2: Verify test coverage**
  - Ensure all new methods have tests
  - Verify edge cases are covered
  - Check for missing test scenarios
  - _Requirements: Non-functional (Maintainability)_

---

## Summary

**Total Tasks:** 52
**Estimated Time:** 2-3 days

**Critical Path:**
1. Phase 1: Preparation (0.5 days)
2. Phase 2: Core Implementation (0.5 days)
3. Phase 3: Static Methods (0.25 days)
4. Phase 4: Unit Tests (0.5 days)
5. Phase 5: Integration Tests (0.25 days)
6. Phase 6: Documentation (0.25 days)
7. Phase 7: Build & Verify (0.25 days)
8. Phase 8: Final Verification (0.5 days)

**Key Milestones:**
- Core template interpolation working
- All backward compatibility maintained
- All unit tests passing
- Integration tests passing
- Documentation complete
- Full build successful

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-01
**Status:** Ready for Implementation
