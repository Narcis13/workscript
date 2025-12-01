# Requirements Document: String Template Interpolation

## Introduction

String Template Interpolation is a feature enhancement to the Workscript workflow engine that enables inline state value substitution within strings using mustache-style syntax `{{$.path.to.value}}`. This feature addresses a significant limitation in the current StateResolver implementation, which can only resolve strings that are entirely state references (e.g., `"$.user.name"` resolves to `"Alice"`), but cannot handle embedded interpolation like `"Hello $.user.name, welcome!"`.

The motivation for this feature stems from the need for more expressive and dynamic string composition in workflows. Currently, workflow authors must use separate nodes to concatenate strings with state values, leading to verbose and harder-to-read workflow definitions. With template interpolation, users can write intuitive templates like `"Hello {{$.user.name}}, your score is {{$.metrics.score}}!"` and have them automatically resolved to `"Hello Alice, your score is 85!"`.

This feature integrates directly into the existing StateResolver class in the `@workscript/engine` package, maintaining backward compatibility with the existing `$.key` syntax while adding new template interpolation capabilities. The implementation leverages regex-based pattern matching and the existing `getNestedValue()` infrastructure for path resolution, ensuring minimal code changes and maximum consistency with current behavior.

---

## Functional Requirements

### Requirement 1: Basic Template Interpolation

**User Story:** As a workflow developer, I want to embed state values within strings using `{{$.key}}` syntax, so that I can create dynamic messages without complex string concatenation.

#### Acceptance Criteria

1. WHEN a string contains `{{$.key}}` pattern THEN the pattern is replaced with the value from `state.key`
2. WHEN a string contains `{{$.user.name}}` and state has `{ user: { name: "Alice" } }` THEN the result is the string with "Alice" substituted
3. WHEN the template `"Hello {{$.user.name}}!"` is resolved THEN it returns `"Hello Alice!"`
4. WHEN a string contains only static text with no templates THEN it is returned unchanged
5. WHEN a string contains `{{$.key}}` at the beginning THEN the substitution works correctly
6. WHEN a string contains `{{$.key}}` at the end THEN the substitution works correctly
7. WHEN a string contains `{{$.key}}` in the middle THEN the substitution works correctly
8. WHEN the state value is a string THEN it is inserted directly into the template
9. WHEN the state value is a number THEN it is converted to string and inserted
10. WHEN the state value is a boolean THEN it is converted to string ("true"/"false") and inserted

---

### Requirement 2: Multiple Template Interpolation

**User Story:** As a workflow developer, I want to use multiple template placeholders in a single string, so that I can compose complex messages with multiple state values.

#### Acceptance Criteria

1. WHEN a string contains multiple `{{$.key}}` patterns THEN all patterns are replaced with their respective values
2. WHEN the template `"{{$.firstName}} {{$.lastName}}"` is resolved THEN both placeholders are substituted
3. WHEN the template `"User: {{$.name}}, Score: {{$.score}}, Active: {{$.active}}"` is resolved THEN all three values are substituted
4. WHEN templates are adjacent `"{{$.a}}{{$.b}}"` THEN both are substituted without extra spacing
5. WHEN templates are separated by various characters THEN each is resolved independently
6. IF one template resolves successfully and another fails THEN the successful one is still substituted
7. WHEN 10+ templates exist in a single string THEN all are resolved correctly
8. WHEN the same template appears multiple times `"{{$.name}} loves {{$.name}}"` THEN both occurrences are substituted

---

### Requirement 3: Nested Path Resolution

**User Story:** As a workflow developer, I want to reference deeply nested state values using dot notation, so that I can access complex data structures in templates.

#### Acceptance Criteria

1. WHEN a template contains `{{$.user.profile.email}}` THEN it resolves to `state.user.profile.email`
2. WHEN a template contains a 2-level path `{{$.user.name}}` THEN it resolves correctly
3. WHEN a template contains a 3-level path `{{$.user.profile.address}}` THEN it resolves correctly
4. WHEN a template contains a 4+ level path `{{$.a.b.c.d.e}}` THEN it resolves correctly
5. WHEN the path points to a valid nested value THEN that value is returned
6. WHEN an intermediate path segment doesn't exist THEN the template resolves to empty string
7. WHEN the final path segment doesn't exist THEN the template resolves to empty string
8. WHEN paths contain valid identifiers (letters, numbers, underscores) THEN they resolve correctly

---

### Requirement 4: Missing Key Handling

**User Story:** As a workflow developer, I want templates with missing keys to silently resolve to empty strings, so that my workflows don't fail unexpectedly due to missing data.

#### Acceptance Criteria

1. WHEN a template references a key that doesn't exist in state THEN it resolves to empty string
2. WHEN `{{$.nonexistent}}` is in the template and "nonexistent" is not in state THEN the result is `""`
3. WHEN the template is `"Value: {{$.missing}}"` THEN the result is `"Value: "`
4. WHEN state is an empty object `{}` THEN all templates resolve to empty string
5. WHEN a nested path has a missing intermediate segment THEN it resolves to empty string
6. WHEN the state value is explicitly `null` THEN it resolves to empty string
7. WHEN the state value is explicitly `undefined` THEN it resolves to empty string
8. IF multiple templates have missing keys THEN all resolve to empty string independently
9. WHEN some templates resolve and others are missing THEN resolved values appear and missing ones are empty

---

### Requirement 5: Complex Value Handling

**User Story:** As a workflow developer, I want to embed object and array state values in templates, so that I can include structured data in my messages.

#### Acceptance Criteria

1. WHEN a template references an object value THEN it is JSON.stringify'd into the string
2. WHEN a template references an array value THEN it is JSON.stringify'd into the string
3. WHEN `{{$.user}}` references `{ name: "Alice", age: 30 }` THEN the result contains the JSON representation
4. WHEN `{{$.items}}` references `["a", "b", "c"]` THEN the result is `'["a","b","c"]'`
5. WHEN `{{$.nested.obj}}` references a deeply nested object THEN it is JSON.stringify'd correctly
6. WHEN the object contains special characters THEN JSON.stringify handles them properly
7. WHEN the array is empty `[]` THEN the result is `'[]'`
8. WHEN the object is empty `{}` THEN the result is `'{}'`

---

### Requirement 6: Backward Compatibility with $.key Syntax

**User Story:** As a workflow developer, I want my existing `$.key` full-reference syntax to continue working with type preservation, so that I don't need to update existing workflows.

#### Acceptance Criteria

1. WHEN a string is exactly `"$.key"` (full reference) THEN it resolves to the raw value with type preservation
2. WHEN `"$.count"` references a number `42` THEN the result is the number `42`, not the string `"42"`
3. WHEN `"$.active"` references a boolean `true` THEN the result is the boolean `true`, not the string `"true"`
4. WHEN `"$.user"` references an object THEN the result is the object itself, not a JSON string
5. WHEN `"$.items"` references an array THEN the result is the array itself, not a JSON string
6. WHEN full `$.path` pattern is detected THEN it is processed BEFORE template patterns
7. WHEN a config value is `"$.nested.path"` THEN type preservation still applies to nested paths
8. IF `"$.missing"` references a non-existent key THEN existing behavior (based on resolver strategy) applies
9. WHEN mixing full references and templates in an object config THEN each is handled appropriately

---

### Requirement 7: Template Pattern Validation

**User Story:** As a workflow developer, I want only valid template patterns to be recognized, so that similar-looking but invalid syntax doesn't cause unexpected behavior.

#### Acceptance Criteria

1. WHEN a template is missing the `$.` prefix like `{{name}}` THEN it is NOT recognized and left unchanged
2. WHEN a template uses different bracket syntax like `${$.key}` THEN it is NOT recognized and left unchanged
3. WHEN a template has unbalanced braces like `{{$.key}` THEN it is NOT recognized
4. WHEN a template has extra braces like `{{{$.key}}}` THEN only the valid inner pattern is matched
5. WHEN a template has spaces like `{{ $.key }}` THEN it is NOT recognized (strict matching)
6. WHEN a template has empty path like `{{$.}}` THEN it is NOT recognized
7. WHEN a template has invalid path characters THEN it is NOT recognized
8. WHEN a template uses valid identifier characters (a-z, A-Z, 0-9, _) THEN it is recognized
9. WHEN a template starts with a number like `{{$.123key}}` THEN it is NOT recognized

---

### Requirement 8: Template Resolution in Nested Configs

**User Story:** As a workflow developer, I want templates in nested configuration objects and arrays to be resolved, so that I can use templates anywhere in my node configs.

#### Acceptance Criteria

1. WHEN a config object has nested strings with templates THEN all are resolved
2. WHEN a config array has strings with templates THEN all elements are resolved
3. WHEN config is `{ message: "Hello {{$.name}}", nested: { greeting: "Hi {{$.name}}" } }` THEN both are resolved
4. WHEN config is `["Hello {{$.a}}", "World {{$.b}}"]` THEN both elements are resolved
5. WHEN config has deeply nested templates (3+ levels) THEN all are resolved
6. WHEN arrays contain mixed types including template strings THEN only strings are processed
7. WHEN objects contain mixed value types including template strings THEN only strings are processed
8. WHEN the recursion depth limit is reached THEN resolution stops (safety mechanism)

---

### Requirement 9: Static Utility Methods

**User Story:** As a developer extending the engine, I want static utility methods to check for and extract template patterns, so that I can build tooling around templates.

#### Acceptance Criteria

1. WHEN calling `StateResolver.containsTemplate("Hello {{$.name}}")` THEN it returns `true`
2. WHEN calling `StateResolver.containsTemplate("No templates here")` THEN it returns `false`
3. WHEN calling `StateResolver.containsTemplate("$.path")` THEN it returns `false` (not a template)
4. WHEN calling `StateResolver.containsTemplate("{{name}}")` THEN it returns `false` (missing `$.`)
5. WHEN calling `StateResolver.extractTemplatePaths("{{$.a}} and {{$.b}}")` THEN it returns `["a", "b"]`
6. WHEN calling `StateResolver.extractTemplatePaths("No templates")` THEN it returns `[]`
7. WHEN calling `StateResolver.extractTemplatePaths("{{$.user.name}}")` THEN it returns `["user.name"]`
8. WHEN the same path appears multiple times THEN `extractTemplatePaths` returns it each time

---

### Requirement 10: Integration with ExecutionEngine

**User Story:** As a workflow developer, I want template interpolation to work automatically during workflow execution, so that I don't need to call any special functions.

#### Acceptance Criteria

1. WHEN a node config contains templates THEN they are resolved before the node executes
2. WHEN ExecutionEngine calls `stateResolver.resolve(config, state)` THEN templates in config are interpolated
3. WHEN a LogNode has `{ message: "Hello {{$.name}}" }` THEN the resolved message is logged
4. WHEN any node receives config with templates THEN it sees the resolved values
5. WHEN state changes between node executions THEN templates resolve to current state values
6. IF template resolution fails THEN the node still receives a valid config (with empty strings for failures)
7. WHEN multiple nodes in sequence use templates THEN each resolves against current state

---

### Requirement 11: Performance and Safety

**User Story:** As a platform administrator, I want template resolution to be performant and safe, so that it doesn't impact workflow execution speed or cause infinite loops.

#### Acceptance Criteria

1. WHEN resolving templates THEN the regex pattern is reset (lastIndex = 0) to avoid stale state
2. WHEN resolving large strings with many templates THEN performance remains acceptable
3. WHEN templates contain circular references in objects THEN JSON.stringify handles it gracefully
4. WHEN recursion depth exceeds the limit (default 10) THEN resolution stops
5. WHEN the global regex flag is used THEN lastIndex is properly managed between calls
6. IF resolution encounters an error THEN it fails gracefully without crashing the workflow
7. WHEN the same StateResolver instance is reused THEN previous calls don't affect subsequent calls

---

### Requirement 12: Error Handling

**User Story:** As a workflow developer, I want template resolution errors to be handled gracefully, so that my workflows continue executing even when individual templates fail.

#### Acceptance Criteria

1. WHEN a template path resolution throws an error THEN the template resolves to empty string
2. WHEN JSON.stringify fails on a circular object THEN an appropriate fallback is used
3. WHEN the state object is null or undefined THEN templates resolve to empty strings
4. WHEN getNestedValue throws an exception THEN the exception is caught and empty string returned
5. IF regex execution fails THEN the original string is returned unchanged
6. WHEN an unexpected value type is encountered THEN String() conversion is attempted
7. WHEN String() conversion fails THEN empty string is returned

---

## Non-Functional Requirements

### Performance

- Template resolution should add minimal overhead to node execution (< 1ms for typical configs)
- Regex compilation should happen once (static pattern) not per-call
- Large strings (10KB+) with many templates should resolve in < 10ms
- Memory usage should not significantly increase during template resolution

### Security

- Template syntax should not allow code execution or injection attacks
- Templates should only access state values, not execute arbitrary expressions
- No eval() or Function() should be used in the implementation
- JSON.stringify should be used safely without exposing internal structures

### Maintainability

- Implementation should be contained within StateResolver class
- New methods should follow existing coding conventions
- All new code should have comprehensive test coverage (> 95%)
- Code should be well-documented with JSDoc comments

### Code Quality

- TypeScript strict mode compliance
- No `any` types except where absolutely necessary
- Consistent naming conventions with existing codebase
- All existing tests must continue to pass

---

## Out of Scope

The following features are explicitly NOT included in this implementation:

1. **Escaped braces** - No support for `\{\{` to output literal `{{`
2. **Filters/formatters** - No support for `{{$.date | format}}` pipe syntax
3. **Default values** - No support for `{{$.name || "Unknown"}}` fallback syntax
4. **Expressions** - No support for `{{$.age + 5}}` arithmetic or logic
5. **Conditional templates** - No support for `{{#if $.active}}...{{/if}}` blocks
6. **Iteration templates** - No support for `{{#each $.items}}...{{/each}}` loops
7. **Partial templates** - No support for including other templates
8. **Template caching** - No pre-compilation or caching of resolved templates
9. **Custom delimiters** - No ability to change from `{{}}` to other delimiters

---

## Success Metrics

Implementation will be considered successful when:

1. All 12 requirements have passing acceptance criteria tests
2. Existing StateResolver tests continue to pass (backward compatibility)
3. Integration tests demonstrate templates working in workflow execution
4. Performance benchmarks show < 1ms overhead for typical configs
5. Code coverage for new code exceeds 95%
6. Documentation is updated in engine CLAUDE.md and relevant README files
7. No regressions in existing workflow functionality

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-01
**Status:** Draft - Ready for Implementation
