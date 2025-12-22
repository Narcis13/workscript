# Implementation Plan: Meta-Workflow Generator

This document provides a concrete, actionable implementation plan for the Meta-Workflow Generator feature. Tasks are organized by phases and include checkboxes for tracking progress. The workflow enables AI-powered generation of Workscript workflows from natural language requirements.

---

## PHASE 1: ENVIRONMENT PREPARATION

### 1.1 Verify Prerequisites

- [ ] **Task 1.1.1: Verify API server is running**
  - Run `cd apps/api && bun run dev`
  - Confirm server starts on port 3013
  - Check `/health` endpoint returns healthy status
  - _Requirements: 2_

- [ ] **Task 1.1.2: Verify Reflection API availability**
  - Open browser or use curl to test `GET http://localhost:3013/workscript/reflection/manifest/compact`
  - Confirm response includes `systemPrompt` field
  - Verify node documentation is comprehensive (45+ nodes)
  - _Requirements: 2_

- [ ] **Task 1.1.3: Verify AI endpoint availability**
  - Test `POST http://localhost:3013/ai/complete` with valid JWT
  - Confirm AI models are accessible
  - Check rate limits and quotas
  - _Requirements: 4_

- [ ] **Task 1.1.4: Verify workflow creation endpoint**
  - Test `POST http://localhost:3013/workscript/workflows/create` with sample workflow
  - Confirm workflow is saved to database
  - Verify response includes workflow ID
  - _Requirements: 10_

- [ ] **Task 1.1.5: Verify database connection**
  - Run `cd apps/api && bun run db:studio`
  - Open Drizzle Studio and confirm `workflows` table exists
  - Verify table schema matches expected structure
  - _Requirements: 10_

### 1.2 Create Output Directory

- [x] **Task 1.2.1: Create prompts directory if not exists**
  - Ensure `/apps/sandbox/resources/shared/prompts/` exists
  - Verify write permissions
  - _Requirements: 10_

---

## PHASE 2: WORKFLOW JSON STRUCTURE

### 2.1 Create Base Workflow File

- [x] **Task 2.1.1: Create workflow-generator.json file**
  - Create new file at `/apps/sandbox/resources/shared/prompts/workflow-generator.json`
  - Add base JSON structure with `id`, `name`, `version`, `description`
  - _Requirements: 1, 11_

- [x] **Task 2.1.2: Define initial state structure**
  - Add `initialState` object with:
    - `userRequest`: "" (empty string default)
    - `model`: "anthropic/claude-sonnet-4-20250514"
    - `apiBaseUrl`: "http://localhost:3013"
    - `retryCount`: 0
    - `maxRetries`: 3
    - `generationComplete`: false
  - _Requirements: 1, 3, 8, 13_

- [x] **Task 2.1.3: Initialize empty workflow array**
  - Add `"workflow": []` as the main workflow container
  - _Requirements: 7_

### 2.2 Implement Input Validation Node

- [ ] **Task 2.2.1: Add validateData node for input validation**
  - Configure `validationType: "required_fields"`
  - Set `data` to check `userRequest` and `JWT_token`
  - Set `requiredFields` array with both field names
  - _Requirements: 1_

- [ ] **Task 2.2.2: Add invalid? edge handler**
  - Add `log` node to output validation errors
  - Include `{{$.validationErrors}}` in message
  - _Requirements: 1, 12_

### 2.3 Implement Documentation Fetch

- [x] **Task 2.3.1: Add fetchApi node for manifest**
  - Configure URL: `{{$.apiBaseUrl}}/workscript/reflection/manifest/compact`
  - Set method: `GET`
  - Add Authorization header with Bearer token
  - _Requirements: 2, 14_

- [x] **Task 2.3.2: Add error? edge handler for fetch**
  - Add `editFields` node to set fallback documentation
  - Set `$.nodeDocumentation` to fallback message
  - _Requirements: 2_

- [x] **Task 2.3.3: Add success handler for fetch**
  - Add `editFields` node to extract `systemPrompt`
  - Set `$.nodeDocumentation` from `$.fetchResponse.systemPrompt`
  - _Requirements: 2, 13_

---

## PHASE 3: RETRY LOOP IMPLEMENTATION

### 3.1 Configure Loop Node

- [x] **Task 3.1.1: Add logic... looping node**
  - Use `logic...` suffix for loop behavior
  - Set operation to `equal` for checking generationComplete first (nested logic for compound condition)
  - _Requirements: 8_

- [x] **Task 3.1.2: Configure first loop condition**
  - Outer node checks `$.generationComplete == false` using `operation: "equal"`
  - _Requirements: 8_

- [x] **Task 3.1.3: Configure second loop condition**
  - Nested logic node with `operation: "less"` check
  - Compare `$.retryCount` with `$.maxRetries`
  - _Requirements: 8_

- [x] **Task 3.1.4: Set false? edge to null**
  - Configure `false?` edge to `null` on both logic nodes to exit loop
  - _Requirements: 8_

### 3.2 Build Dynamic Prompt

- [x] **Task 3.2.1: Add editFields node for prompt building**
  - Created switch node with expression mode to determine retry vs first attempt
  - Switch evaluates `item > 0 ? 'retry' : 'first_attempt'`
  - Each branch uses editFields to set `$.currentPrompt`
  - _Requirements: 9_

- [x] **Task 3.2.2: Configure retry prompt logic**
  - When `$.retryCount > 0`, routes to `retry?` edge
  - Prepends "RETRY ATTEMPT X of Y" with previous error context
  - Emphasizes pure JSON output without markdown code blocks
  - Lists required workflow structure fields
  - Appends original `$.userRequest`
  - _Requirements: 9_

- [x] **Task 3.2.3: Configure first attempt prompt**
  - When `$.retryCount == 0`, routes to `first_attempt?` edge
  - Sets `$.currentPrompt` directly to `$.userRequest`
  - No retry prefix for first attempt
  - _Requirements: 9_

### 3.3 Implement AI Generation

- [x] **Task 3.3.1: Add ask-ai node**
  - Set `userPrompt` with current prompt and generation instructions
  - Configure critical formatting instructions
  - _Requirements: 4_

- [x] **Task 3.3.2: Configure model parameter**
  - Set `model` to `$.model` for configurable selection
  - _Requirements: 3, 4_

- [x] **Task 3.3.3: Configure system prompt**
  - Include `{{$.nodeDocumentation}}` for node reference
  - Add strict JSON-only output instructions
  - _Requirements: 4_

- [x] **Task 3.3.4: Add error? edge handler for AI**
  - Increment `$.retryCount` on error
  - Set `$.lastError` to "AI request failed"
  - _Requirements: 4, 8, 13_

### 3.4 Implement Response Cleanup

- [x] **Task 3.4.1: Add stringOperations node**
  - Configure operation: `replaceRegex`
  - Set field to `aiResponse`
  - Set outputField to `cleanedResponse`
  - _Requirements: 5_

- [x] **Task 3.4.2: Configure regex pattern**
  - Pattern: `^```(?:json)?\\s*|\\s*```$`
  - Replacement: empty string
  - Flags: `gm` (global, multiline)
  - _Requirements: 5_

### 3.5 Implement JSON Validation

- [x] **Task 3.5.1: Add validateData node for JSON**
  - Configure `validationType: "json"`
  - Set `data` to `$.cleanedResponse`
  - _Requirements: 6_

- [x] **Task 3.5.2: Add valid? edge handler**
  - Add `editFields` node
  - Set `$.generatedWorkflow` from `$.parsedJson`
  - _Requirements: 6, 13_

- [x] **Task 3.5.3: Add invalid? edge handler**
  - Increment `$.retryCount`
  - Set `$.lastError` to `$.validationErrors`
  - Add log node for retry message
  - _Requirements: 6, 8, 12_

### 3.6 Implement Structure Validation

- [x] **Task 3.6.1: Add logic node for null check**
  - Check if `$.generatedWorkflow` is not null
  - Only validate structure if JSON parsed successfully
  - _Requirements: 7_

- [x] **Task 3.6.2: Add validateData node for structure**
  - Configure `validationType: "required_fields"`
  - Set `data` to `$.generatedWorkflow`
  - Set `requiredFields` to `["id", "name", "version", "workflow"]`
  - _Requirements: 7_

- [x] **Task 3.6.3: Add valid? edge handler**
  - Set `$.generationComplete` to `true`
  - This exits the retry loop
  - _Requirements: 7, 8_

- [x] **Task 3.6.4: Add invalid? edge handler**
  - Increment `$.retryCount`
  - Set `$.lastError` to "Missing required fields"
  - Reset `$.generatedWorkflow` to null
  - _Requirements: 7, 8_

---

## PHASE 4: POST-GENERATION HANDLING

### 4.1 Handle Generation Failure

- [x] **Task 4.1.1: Add logic node after loop**
  - Check if `$.generationComplete == false`
  - Only execute if all retries failed
  - _Requirements: 8, 12_

- [x] **Task 4.1.2: Add failure log node**
  - Log message with max retries count
  - Include `$.lastError` for debugging
  - _Requirements: 8, 12_

### 4.2 Implement Database Save

- [x] **Task 4.2.1: Add logic node for save condition**
  - Check if `$.generationComplete == true`
  - Only save if generation succeeded
  - _Requirements: 10_

- [x] **Task 4.2.2: Add fetchApi node for save**
  - Configure URL: `{{$.apiBaseUrl}}/workscript/workflows/create`
  - Set method: `POST`
  - Add Authorization and Content-Type headers
  - _Requirements: 10, 14_

- [x] **Task 4.2.3: Configure request body**
  - Set `name` from `$.generatedWorkflow.name`
  - Set `description` with user request context
  - Set `definition` to `$.generatedWorkflow`
  - Set `version` from `$.generatedWorkflow.version`
  - Set `isActive` to `true`
  - _Requirements: 10_

- [x] **Task 4.2.4: Add success? edge handler**
  - Set `$.savedWorkflow` from `$.fetchResponse.workflow`
  - Set `$.saveSuccess` to `true`
  - Add log node for success message
  - _Requirements: 10, 11, 12_

- [x] **Task 4.2.5: Add clientError? edge handler**
  - Set `$.saveError` from `$.fetchResponse.error`
  - Set `$.saveSuccess` to `false`
  - _Requirements: 10, 11_

- [x] **Task 4.2.6: Add serverError? edge handler**
  - Set `$.saveError` to generic server error message
  - Set `$.saveSuccess` to `false`
  - _Requirements: 10, 11_

- [x] **Task 4.2.7: Add error? edge handler**
  - Set `$.saveError` from `$.error`
  - Set `$.saveSuccess` to `false`
  - _Requirements: 10, 11_

### 4.3 Construct Final Result

- [x] **Task 4.3.1: Add editFields node for result**
  - Create `$.result` object
  - Set `success` based on generation and save status
  - _Requirements: 11_

- [x] **Task 4.3.2: Include workflow ID in result**
  - Set `workflowId` from `$.savedWorkflow.id`
  - _Requirements: 11_

- [x] **Task 4.3.3: Include workflow in result**
  - Set `workflow` from `$.generatedWorkflow`
  - _Requirements: 11_

- [x] **Task 4.3.4: Include attempt count in result**
  - Set `attempts` from `$.retryCount`
  - _Requirements: 11_

- [x] **Task 4.3.5: Include error in result**
  - Set `error` from `$.lastError` or `$.saveError`
  - Handle null cases appropriately
  - _Requirements: 11_

---

## PHASE 5: WORKFLOW VALIDATION

### 5.1 Syntax Validation

- [ ] **Task 5.1.1: Validate JSON syntax**
  - Parse the workflow JSON file
  - Fix any JSON syntax errors
  - Verify all brackets and commas are correct
  - _Requirements: Code Quality_

- [ ] **Task 5.1.2: Validate state references**
  - Check all `$.` references are valid
  - Verify template interpolation syntax `{{$.}}`
  - _Requirements: 13_

- [ ] **Task 5.1.3: Validate edge syntax**
  - Verify all edge names end with `?`
  - Check all edge handlers have valid targets
  - _Requirements: Code Quality_

### 5.2 Node Validation

- [ ] **Task 5.2.1: Verify all node types exist**
  - Check: `validateData`, `fetchApi`, `logic`, `logic...`, `ask-ai`, `stringOperations`, `editFields`, `log`
  - Cross-reference with registered nodes
  - _Requirements: Code Quality_

- [ ] **Task 5.2.2: Validate node configurations**
  - Check each node has required parameters
  - Verify parameter types are correct
  - _Requirements: Code Quality_

### 5.3 API Validation

- [ ] **Task 5.3.1: Test workflow via validation endpoint**
  - Call `POST /workscript/workflows/validate`
  - Submit the workflow JSON
  - Fix any validation errors
  - _Requirements: Code Quality_

---

## PHASE 6: TESTING

### 6.1 Unit Testing

- [ ] **Task 6.1.1: Test input validation**
  - Execute workflow without `userRequest`
  - Verify validation error is returned
  - _Requirements: 1_

- [ ] **Task 6.1.2: Test with missing JWT**
  - Execute workflow without `JWT_token`
  - Verify authentication error is returned
  - _Requirements: 1, 14_

- [ ] **Task 6.1.3: Test documentation fetch failure**
  - Stop reflection API temporarily
  - Execute workflow
  - Verify fallback documentation is used
  - _Requirements: 2_

### 6.2 Integration Testing

- [ ] **Task 6.2.1: Test simple workflow generation**
  - Input: "Create a workflow that logs 'Hello World'"
  - Verify workflow is generated with `log` node
  - Verify workflow is saved to database
  - _Requirements: 4, 10_

- [ ] **Task 6.2.2: Test complex workflow generation**
  - Input: "Create a workflow that filters a list and sorts the results"
  - Verify workflow includes `filter` and `sort` nodes
  - Verify proper edge connections
  - _Requirements: 4_

- [ ] **Task 6.2.3: Test email workflow generation**
  - Input: "Create a workflow that sends an email with a cake recipe to test@example.com"
  - Verify workflow includes email-related nodes
  - Verify proper configuration
  - _Requirements: 4_

### 6.3 Retry Testing

- [ ] **Task 6.3.1: Simulate invalid JSON response**
  - Modify AI prompt temporarily to produce invalid JSON
  - Verify retry mechanism triggers
  - Verify retry count increments
  - _Requirements: 8_

- [ ] **Task 6.3.2: Test max retries exhausted**
  - Configure `maxRetries` to 1
  - Ensure AI produces invalid JSON
  - Verify proper failure message
  - _Requirements: 8_

- [ ] **Task 6.3.3: Test successful retry**
  - Ensure first attempt fails, second succeeds
  - Verify final result shows correct attempt count
  - _Requirements: 8, 9, 11_

### 6.4 Model Testing

- [ ] **Task 6.4.1: Test default model**
  - Execute without specifying `$.model`
  - Verify `anthropic/claude-sonnet-4-20250514` is used
  - _Requirements: 3_

- [ ] **Task 6.4.2: Test custom model**
  - Set `$.model` to `openai/gpt-4o`
  - Verify correct model is called
  - _Requirements: 3_

- [ ] **Task 6.4.3: Test invalid model**
  - Set `$.model` to invalid value
  - Verify error is captured properly
  - _Requirements: 3_

---

## PHASE 7: DOCUMENTATION

### 7.1 Update Skill Documentation

- [ ] **Task 7.1.1: Add workflow generator to new-workflow skill**
  - Document the meta-workflow in skill examples
  - Include usage instructions
  - _Requirements: Documentation_

- [ ] **Task 7.1.2: Document initialState parameters**
  - Document `userRequest`, `model`, `apiBaseUrl`
  - Document `maxRetries` configuration
  - _Requirements: Documentation_

### 7.2 Create Usage Examples

- [ ] **Task 7.2.1: Create example requests document**
  - Include 5-10 example user requests
  - Show expected generated workflows
  - _Requirements: Documentation_

- [ ] **Task 7.2.2: Document error scenarios**
  - List common errors and solutions
  - Include troubleshooting guide
  - _Requirements: Documentation_

### 7.3 API Documentation

- [ ] **Task 7.3.1: Document execution endpoint usage**
  - Show how to execute the meta-workflow via API
  - Include curl examples
  - _Requirements: Documentation_

---

## PHASE 8: FINAL VERIFICATION

### 8.1 Build & Deploy Readiness

- [ ] **Task 8.1.1: Test production build**
  - Run `bun run build`
  - Fix any build errors
  - Test built application
  - _Requirements: Code Quality_

- [ ] **Task 8.1.2: Verify workflow file is included**
  - Check workflow JSON is accessible after build
  - Verify file permissions
  - _Requirements: Code Quality_

### 8.2 End-to-End Testing

- [ ] **Task 8.2.1: Full workflow execution test**
  - Execute complete workflow via API
  - Verify workflow is generated
  - Verify workflow is saved
  - Execute the generated workflow
  - _Requirements: All_

- [ ] **Task 8.2.2: Frontend UI test (if applicable)**
  - Test workflow execution from frontend
  - Verify results are displayed correctly
  - _Requirements: All_

### 8.3 Final Acceptance

- [ ] **Task 8.3.1: Review all requirements**
  - Go through each requirement
  - Verify all acceptance criteria met
  - Document any deviations
  - _Requirements: All_

- [ ] **Task 8.3.2: Performance verification**
  - Measure generation time for various requests
  - Verify under 60 second target
  - _Requirements: Performance_

- [ ] **Task 8.3.3: Security review**
  - Verify JWT handling is secure
  - Check for any exposed secrets
  - Review generated workflow safety
  - _Requirements: Security_

---

## Summary

**Total Tasks:** 85
**Estimated Time:** 2-3 days

**Critical Path:**
1. Phase 1: Environment Preparation (0.5 days)
2. Phase 2: Workflow JSON Structure (0.5 days)
3. Phase 3: Retry Loop Implementation (0.5 days)
4. Phase 4: Post-Generation Handling (0.5 days)
5. Phase 5: Workflow Validation (0.25 days)
6. Phase 6: Testing (0.5 days)
7. Phase 7: Documentation (0.25 days)
8. Phase 8: Final Verification (0.25 days)

**Key Milestones:**
- [ ] Workflow JSON file created and validated
- [ ] Retry loop implemented and working
- [ ] Database persistence functional
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Final acceptance completed

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-21
**Status:** Ready for Implementation
