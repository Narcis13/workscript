# Requirements Document: Meta-Workflow Generator

## Introduction

The Meta-Workflow Generator is a foundational feature of the Workscript Agentic Workflow Engine that enables automated generation of production-ready workflows from natural language requirements using AI. This self-generating capability represents the core vision of Workscript: a workflow system that can create workflows to solve user problems autonomously.

This feature integrates with the existing Workscript infrastructure by leveraging the Reflection API for node documentation, the workflow execution engine for running the meta-workflow, and the database persistence layer for saving generated workflows. The meta-workflow itself is built using existing Workscript nodes, demonstrating the composability and power of the node-based architecture.

The implementation uses a combination of AI-powered generation (via the `ask-ai` node), multi-step validation, retry logic for robustness, and API integration for persistence. The workflow supports configurable AI models, automatic cleanup of malformed AI responses, and comprehensive error handling with up to 3 retry attempts.

---

## Functional Requirements

### Requirement 1: User Request Input Validation

**User Story:** As a user, I want the workflow generator to validate my input before processing, so that I receive clear feedback if required information is missing.

#### Acceptance Criteria

1. WHEN the workflow is executed without a `userRequest` in initialState THEN the workflow should return an error indicating missing required input
2. WHEN the workflow is executed without a `JWT_token` in state THEN the workflow should return an error indicating missing authentication
3. WHEN both `userRequest` and `JWT_token` are present THEN the workflow should proceed to fetch node documentation
4. IF the `userRequest` is an empty string THEN it should be treated as missing and validation should fail
5. WHEN validation fails THEN the specific missing field should be logged for debugging
6. WHEN validation succeeds THEN the workflow should continue without interruption
7. IF multiple fields are missing THEN all missing fields should be reported in the validation errors
8. WHEN the `apiBaseUrl` is not provided THEN it should default to `http://localhost:3013`

---

### Requirement 2: Node Documentation Fetching

**User Story:** As a workflow generator, I want to fetch up-to-date node documentation from the Reflection API, so that generated workflows use accurate and current node configurations.

#### Acceptance Criteria

1. WHEN the workflow starts processing THEN it should call `GET /workscript/reflection/manifest/compact`
2. WHEN the API call succeeds THEN the `systemPrompt` field should be extracted and stored in `$.nodeDocumentation`
3. WHEN the API call fails THEN a fallback message should be used indicating to use general Workscript knowledge
4. IF the API returns a non-200 status THEN the workflow should continue with fallback documentation
5. WHEN the API times out THEN the workflow should continue with fallback documentation after 10 seconds
6. WHEN successful THEN the `$.fetchResponse` should contain the full manifest response
7. IF the JWT token is invalid THEN the API should return 401 and the workflow should handle this as an error
8. WHEN the reflection endpoint is unavailable THEN the workflow should still attempt generation with reduced accuracy
9. WHEN documentation is fetched THEN it should include all 45+ registered nodes with their configurations
10. IF the response is malformed THEN the workflow should fall back to default documentation

---

### Requirement 3: Configurable AI Model Selection

**User Story:** As a user, I want to specify which AI model to use for workflow generation, so that I can choose between speed, cost, and quality tradeoffs.

#### Acceptance Criteria

1. WHEN `$.model` is provided in initialState THEN that model should be used for generation
2. WHEN `$.model` is not provided THEN `anthropic/claude-sonnet-4-20250514` should be used as default
3. WHEN an invalid model identifier is provided THEN the AI node should return an appropriate error
4. IF the model is `openai/gpt-4o` THEN it should be accepted and used
5. IF the model is `anthropic/claude-3.5-sonnet` THEN it should be accepted and used
6. WHEN the model rate-limits THEN the error should be captured and retry logic should trigger
7. WHEN the model is unavailable THEN the error should be captured with appropriate error code
8. IF a custom model endpoint is needed THEN the `baseUrl` parameter should be configurable

---

### Requirement 4: AI Workflow Generation

**User Story:** As a user, I want the AI to generate a complete, valid Workscript workflow JSON based on my natural language description, so that I can automate tasks without manual coding.

#### Acceptance Criteria

1. WHEN the AI is called THEN it should receive both the user request and node documentation in the prompt
2. WHEN generating THEN the AI should be instructed to return ONLY valid JSON without markdown code blocks
3. WHEN the AI responds THEN the response should be stored in `$.aiResponse`
4. IF the AI includes markdown code blocks THEN they should be stripped by the cleanup step
5. WHEN the AI generates a workflow THEN it must include `id`, `name`, `version`, and `workflow` fields
6. WHEN generating THEN the AI should use proper state syntax (`$.key`, `{{$.key}}`)
7. IF the user request is ambiguous THEN the AI should make reasonable assumptions
8. WHEN generating THEN the AI should prefer flat workflow structure over deep nesting
9. WHEN generating THEN the AI should include error handling edges where appropriate
10. IF the AI fails to respond THEN the error should be captured and retry logic should trigger
11. WHEN generating THEN the AI should only use node types from the documented node list
12. WHEN the response is received THEN response metadata should be stored in `$.aiResponseData`

---

### Requirement 5: AI Response Cleanup

**User Story:** As a workflow generator, I want to automatically clean malformed AI responses, so that common formatting issues don't cause generation failures.

#### Acceptance Criteria

1. WHEN the AI response contains ` ```json ` at the start THEN it should be removed
2. WHEN the AI response contains ` ``` ` at the end THEN it should be removed
3. WHEN the response contains multiple markdown blocks THEN all should be removed
4. WHEN cleanup is complete THEN the cleaned response should be stored in `$.cleanedResponse`
5. IF the response has leading/trailing whitespace around code blocks THEN it should be handled
6. WHEN using regex cleanup THEN flags should include multiline (`gm`)
7. IF the response is already clean JSON THEN it should pass through unchanged
8. WHEN cleanup fails THEN the original response should still be available for debugging

---

### Requirement 6: JSON Validation

**User Story:** As a workflow generator, I want to validate that the AI response is valid JSON before proceeding, so that invalid responses are caught and can trigger retry logic.

#### Acceptance Criteria

1. WHEN `$.cleanedResponse` is valid JSON THEN it should be parsed and stored in `$.parsedJson`
2. WHEN `$.cleanedResponse` is invalid JSON THEN validation should fail with specific error
3. IF JSON parsing fails THEN `$.retryCount` should be incremented
4. WHEN validation fails THEN `$.lastError` should contain the validation error details
5. IF the parsed JSON is a primitive (not object) THEN validation should fail
6. WHEN validation succeeds THEN `$.generatedWorkflow` should be set to the parsed object
7. IF the JSON has syntax errors THEN the specific error location should be captured
8. WHEN validation fails THEN a log message should indicate the retry attempt number

---

### Requirement 7: Workflow Structure Validation

**User Story:** As a workflow generator, I want to validate that the generated workflow has all required fields, so that only properly structured workflows are saved.

#### Acceptance Criteria

1. WHEN `$.generatedWorkflow` exists THEN it should be validated for required fields
2. WHEN the workflow is missing `id` THEN validation should fail
3. WHEN the workflow is missing `name` THEN validation should fail
4. WHEN the workflow is missing `version` THEN validation should fail
5. WHEN the workflow is missing `workflow` array THEN validation should fail
6. IF validation fails THEN `$.retryCount` should be incremented
7. IF validation fails THEN `$.generatedWorkflow` should be reset to null for retry
8. WHEN all required fields are present THEN `$.generationComplete` should be set to true
9. IF `version` is not in semver format THEN the API validation may reject it later
10. WHEN structure validation succeeds THEN the retry loop should exit

---

### Requirement 8: Retry Logic for Failed Generation

**User Story:** As a user, I want the workflow generator to automatically retry if the AI produces invalid output, so that transient failures don't prevent successful generation.

#### Acceptance Criteria

1. WHEN the workflow starts THEN `$.retryCount` should be initialized to 0
2. WHEN the workflow starts THEN `$.maxRetries` should default to 3
3. WHEN `$.retryCount < $.maxRetries` AND `$.generationComplete == false` THEN the generation loop should continue
4. WHEN retrying THEN the prompt should include context about the previous failure
5. IF all retry attempts fail THEN the workflow should exit with a clear error message
6. WHEN retry occurs THEN the retry attempt number should be logged
7. WHEN a retry succeeds THEN `$.generationComplete` should be set to true immediately
8. IF the first attempt succeeds THEN no retry should occur
9. WHEN the loop exits THEN `$.retryCount` should reflect total attempts made
10. IF generation never succeeds THEN `$.lastError` should contain the final error

---

### Requirement 9: Enhanced Retry Prompts

**User Story:** As a workflow generator, I want retry attempts to include additional context about previous failures, so that the AI can correct its mistakes.

#### Acceptance Criteria

1. WHEN `$.retryCount > 0` THEN the prompt should include "RETRY ATTEMPT" prefix
2. WHEN retrying THEN the prompt should emphasize returning pure JSON without markdown
3. WHEN retrying THEN the original user request should still be included
4. IF the previous error was "Invalid JSON" THEN the retry prompt should emphasize JSON syntax
5. IF the previous error was "Missing required fields" THEN the retry prompt should list required fields
6. WHEN building retry prompt THEN `$.currentPrompt` should contain the enhanced prompt
7. WHEN first attempt THEN `$.currentPrompt` should equal `$.userRequest` without retry context

---

### Requirement 10: Database Persistence via API

**User Story:** As a user, I want my generated workflow to be automatically saved to the database, so that I can execute it immediately without manual saving.

#### Acceptance Criteria

1. WHEN `$.generationComplete == true` THEN the workflow should be saved via API
2. WHEN saving THEN `POST /workscript/workflows/create` should be called
3. WHEN saving THEN the request body should include `name`, `description`, `definition`, `version`, `isActive`
4. WHEN the save succeeds THEN `$.savedWorkflow` should contain the created workflow
5. WHEN the save succeeds THEN `$.saveSuccess` should be set to true
6. IF the API returns a client error (4xx) THEN `$.saveError` should capture the error message
7. IF the API returns a server error (5xx) THEN `$.saveError` should capture a generic message
8. IF the network request fails THEN `$.saveError` should capture the network error
9. WHEN saving THEN the description should include the original user request for reference
10. WHEN saved THEN `$.savedWorkflow.id` should be the unique workflow identifier
11. IF validation fails on the server THEN the error should be captured in `$.saveError`
12. WHEN saving THEN `isActive` should be set to true by default

---

### Requirement 11: Final Result Construction

**User Story:** As a user, I want a clear summary of the generation result, so that I know whether it succeeded and can access the generated workflow.

#### Acceptance Criteria

1. WHEN the workflow completes THEN `$.result` should contain a summary object
2. WHEN successful THEN `$.result.success` should be true
3. WHEN failed THEN `$.result.success` should be false
4. WHEN successful THEN `$.result.workflowId` should contain the saved workflow ID
5. WHEN available THEN `$.result.workflow` should contain the generated workflow object
6. WHEN complete THEN `$.result.attempts` should show how many attempts were made
7. IF an error occurred THEN `$.result.error` should contain the error message
8. IF generation failed THEN `$.result.error` should contain `$.lastError`
9. IF save failed THEN `$.result.error` should contain `$.saveError`

---

### Requirement 12: Logging and Debugging

**User Story:** As a developer, I want comprehensive logging throughout the generation process, so that I can debug issues and monitor workflow execution.

#### Acceptance Criteria

1. WHEN input validation fails THEN the missing fields should be logged
2. WHEN JSON validation fails THEN the retry number should be logged
3. WHEN generation succeeds THEN the saved workflow ID should be logged
4. WHEN generation fails completely THEN the final error should be logged
5. IF the save fails THEN the error details should be logged
6. WHEN documentation fetch fails THEN a warning should be logged
7. WHEN retrying THEN the current attempt number out of max should be logged

---

### Requirement 13: State Management

**User Story:** As the workflow engine, I want proper state management throughout execution, so that all components have access to required data.

#### Acceptance Criteria

1. WHEN the workflow starts THEN `$.generationComplete` should be initialized to false
2. WHEN generation succeeds THEN `$.generationComplete` should be set to true
3. WHEN AI responds THEN `$.aiResponse` should contain the raw response
4. WHEN JSON is parsed THEN `$.parsedJson` should contain the parsed object
5. WHEN validated THEN `$.generatedWorkflow` should contain the workflow object
6. IF validation fails THEN `$.generatedWorkflow` should be reset to null
7. WHEN errors occur THEN `$.lastError` should be updated with the most recent error
8. WHEN the API responds THEN `$.fetchResponse` should be updated accordingly
9. WHEN the prompt is built THEN `$.currentPrompt` should contain it
10. WHEN cleaned THEN `$.cleanedResponse` should contain the cleaned AI response

---

### Requirement 14: API Authentication

**User Story:** As a secure system, I want all API calls to use proper authentication, so that only authorized users can generate and save workflows.

#### Acceptance Criteria

1. WHEN calling the reflection API THEN the Authorization header should contain `Bearer {{$.JWT_token}}`
2. WHEN calling the create workflow API THEN the Authorization header should contain `Bearer {{$.JWT_token}}`
3. IF the token is expired THEN the API should return 401 and the error should be captured
4. IF the token lacks permissions THEN the API should return 403 and the error should be captured
5. WHEN making API calls THEN the Content-Type header should be `application/json`
6. WHEN the JWT token is auto-injected by WorkflowService THEN it should be available in `$.JWT_token`

---

### Requirement 15: Timeout Handling

**User Story:** As a reliable system, I want appropriate timeouts for all API calls, so that the workflow doesn't hang indefinitely on slow responses.

#### Acceptance Criteria

1. WHEN calling the reflection API THEN the timeout should be configured appropriately
2. WHEN calling the AI endpoint THEN the timeout should accommodate model response time
3. WHEN calling the save API THEN the timeout should be 15 seconds or more
4. IF a timeout occurs THEN it should be treated as an error and handled accordingly
5. WHEN a timeout triggers THEN the error should indicate it was a timeout

---

## Non-Functional Requirements

### Performance

1. The workflow should complete generation within 60 seconds for typical requests
2. Each retry attempt should not add more than 30 seconds to total execution time
3. The reflection API call should complete within 10 seconds
4. The workflow save should complete within 5 seconds

### Security

1. JWT tokens must never be logged or exposed in error messages
2. Generated workflows must not contain hardcoded secrets or credentials
3. API calls must use HTTPS in production environments
4. The workflow should not execute arbitrary code from user input

### Reliability

1. The retry mechanism should handle 95% of transient AI failures
2. The workflow should gracefully degrade when the reflection API is unavailable
3. Database save failures should not lose the generated workflow (available in final state)
4. Network errors should be properly categorized and reported

### Maintainability

1. The workflow JSON should be well-documented with inline comments
2. State keys should have clear, descriptive names
3. Error messages should be actionable and specific
4. The workflow should follow Workscript best practices (flat structure, defensive guards)

### Code Quality

1. The workflow JSON must pass Workscript validation
2. All node configurations must use correct syntax
3. Edge handlers must be properly defined for all possible outcomes
4. State references must use proper `$.` syntax

---

## Out of Scope

The following features are explicitly NOT included in this implementation:

1. **Interactive refinement** - Users cannot iteratively refine the generated workflow through conversation
2. **Multi-model ensemble** - Only one AI model is used per generation attempt
3. **Workflow execution** - The generated workflow is saved but not automatically executed
4. **Template-based generation** - No pre-built templates; all generation is from scratch
5. **Version control** - Generated workflows don't track versions or changes
6. **Rollback capability** - No automatic rollback if a generated workflow fails
7. **Cost estimation** - No estimation of AI API costs before generation
8. **Parallel generation** - Only one workflow is generated per request
9. **Custom validation rules** - Only standard Workscript validation is applied
10. **Workflow optimization** - Generated workflows are not automatically optimized

---

## Success Metrics

The implementation will be considered successful when:

1. ✅ The workflow generator successfully generates valid workflows from natural language 80%+ of the time
2. ✅ Retry logic successfully recovers from AI formatting errors 90%+ of the time
3. ✅ Generated workflows pass Workscript validation on first save attempt
4. ✅ The average generation time is under 30 seconds for simple requests
5. ✅ All 15 requirements have their acceptance criteria met
6. ✅ The workflow can be executed via the API and frontend UI
7. ✅ The workflow is self-documenting and follows Workscript conventions
8. ✅ Error messages are clear and actionable for debugging
9. ✅ The feature integrates seamlessly with existing Workscript infrastructure

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-21
**Status:** Draft - Ready for Implementation
