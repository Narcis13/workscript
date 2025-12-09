---
status: pending
priority: p3
issue_id: "013"
tags: [code-review, testing]
dependencies: []
---

# No Test Coverage for Resources Feature

## Problem Statement

Zero test files found for the entire Resources UI feature (17 files, ~2500 lines of code).

**Why it matters:** No automated verification of functionality, regressions possible.

## Findings

### Missing Test Files
All of these need tests:
- `apps/frontend/src/services/api/__tests__/resources.api.test.ts`
- `apps/frontend/src/hooks/api/__tests__/useResources.test.tsx`
- `apps/frontend/src/components/resources/__tests__/ResourceUploader.test.tsx`
- `apps/frontend/src/components/resources/__tests__/ResourceList.test.tsx`
- `apps/frontend/src/components/resources/__tests__/InterpolationTester.test.tsx`
- `apps/frontend/src/pages/resources/__tests__/ResourcesPage.test.tsx`

### Critical Test Gaps
1. API service functions
2. React Query hooks
3. Form validation
4. File upload logic
5. Interpolation tester

## Proposed Solutions

### Option 1: Add comprehensive test suite (Recommended)
**Pros:** Full coverage
**Cons:** Significant effort
**Effort:** Large (4-6 hours)
**Risk:** N/A

## Recommended Action

Add test suite incrementally, prioritizing:
1. API service tests (mock axios)
2. Hook tests (React Testing Library + MSW)
3. Component tests for critical interactions

## Technical Details

**Test Framework:** Vitest (already configured)

## Acceptance Criteria

- [ ] API service functions have unit tests
- [ ] React Query hooks have integration tests
- [ ] Critical user flows tested
- [ ] >70% code coverage

## Work Log

| Date | Action | Notes |
|------|--------|-------|
| 2025-12-05 | Created | Identified during code review |
