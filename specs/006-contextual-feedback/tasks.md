# Tasks: Contextual feedback

Input: spec.md, plan.md, research.md, data-model.md, contracts/feedback.md. All stories P1. One writer; read-only research completed. No publishing.

## Phase 1: Setup
- [X] T001 Pin lazy screenshot dependency in package.json/package-lock.json and verify ignored local build artifacts.

## Phase 2: Foundation and US3 — protected data
- [X] T002 [US3] Write validation/history/PNG regression fixtures in tests/feedback.test.mjs and anon/A/B ownership assertions in supabase/tests/feedback.sql.
- [X] T003 [US3] Implement strict metadata/history/PNG contract in src/lib/feedback.ts (FR-004, FR-008; SC-004).
- [X] T004 [US3] Add immutable owned feedback and private screenshot migration in supabase/migrations/202610040001_contextual_feedback.sql and update src/lib/supabase/database.types.ts (FR-006–008; SC-003).
- [X] T005 [US3] Implement authenticated bounded same-origin API and idempotent upload/persistence/cleanup in src/app/api/feedback/route.ts and src/lib/feedback-store.ts; test failure paths (FR-007–009; SC-002–003).

## Phase 3: US1 — submit improvement
- [X] T006 [US1] Write local browser submission/retry/cancel/focus/mobile tests in tests/e2e/feedback.spec.ts.
- [X] T007 [US1] Add FeedbackWidget dialog and floating entry point in src/components/FeedbackWidget.tsx, src/components/styles/feedback.css and src/app/(app)/layout.tsx; extend ModalDialog focus selector for textarea (FR-001–002, FR-009; SC-001–002, SC-005).

## Phase 4: US2 — review contextual attachments
- [X] T008 [US2] Implement lazy sanitized viewport capture in src/lib/feedback-capture.ts with bounded dimensions, form/private/media exclusions, local previews/removal/capture fallback in FeedbackWidget (FR-003, FR-005, FR-010; SC-005).
- [X] T009 [US2] Track bounded account-scoped paths/allowlisted practice actions in FeedbackWidget and src/components/ShadowingPractice.tsx; test pruning/privacy/navigation/viewport capture using real browser (FR-004–005, FR-010; SC-004).

## Phase 5: Validation and delivery
- [X] T010 Update privacy page and durable docs/EchoFlow.md, docs/system_architecture.md (FR-011).
- [ ] T011 Run lint/typecheck/build/unit, distinct-account table/Storage and feature browser tests; record evidence in quickstart.md. Apply additive migration to authorized remote project and verify live UI. Review authentication/RLS/dependency changes.
- [X] T012 Converge against spec/plan/tasks and commit coherent feature locally; report playlists and Feedback outcome and limits.

## Dependencies and acceptance
T001 -> T002 -> T003/T004 -> T005 -> T006/T007 -> T008/T009 -> T010/T011 -> T012. Tests precede implementation in each slice. US3 independently verifies access with anon/A/B; US1 submits text-only; US2 checks reviewed screenshot/context. Independent read-only searches/tests may run concurrently, edits remain sequential.

MVP includes all P1 stories; no deferred requested work. FR001–011 and SC001–005 each covered above; capture failure, network retry, removal, expired auth and wrong-origin cases included. No unresolved clarification: route/action history is the documented default; optional user preference can still steer implementation.

## Phase 6: Convergence

27 requirements/success criteria/acceptance scenarios, five plan decisions and five constitution principles assessed. No code gap; one HIGH partial rollout gap: the remote-backed app cannot persist until the additive migration is explicitly authorized (automatic approval review blocked shared-environment mutation). Local storage/API/UI evidence passed. No extension hooks installed.

- [ ] T013 Apply supabase/migrations/202610040001_contextual_feedback.sql to the authorized remote project only after explicit user approval, register migration version and verify private bucket/RLS/guest rejection per FR-006 and plan: remote enablement (partial). Finish T011 after remote verification.
