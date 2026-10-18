# Tasks: Notion feedback
## Phase 1: Setup
- [x] T001 Record accepted artifacts and Notion schema in specs/007-notion-feedback/contracts/notion.md (FR-005).
## Phase 2: Foundation
- [x] T002 Add atomic queue/backfill and fenced RPCs in supabase/migrations/202610040002_notion_feedback.sql (FR-002/004/006).
- [x] T003 Test trigger/backfill, lease fencing and anon/A/B denial in supabase/tests/notion_feedback.sql (FR-008).
## Phase 3: US1 inbox
- [x] T004 [US1] Add deterministic payload/file/upload/schema tests in tests/notion-feedback.test.mjs (FR-001/008).
- [x] T005 [US1] Implement native Notion client and complete payload in src/lib/notion-feedback.ts (FR-001/005/006).
## Phase 4: US2 recovery
- [x] T006 [US2] Test rejection, ambiguous create, duplicate, resumed delivery in tests/notion-feedback.test.mjs (FR-003/004/008).
- [x] T007 [US2] Implement queue adapter and supervised polling worker in src/lib/notion-feedback-queue.ts and scripts/notion-feedback-worker.ts (FR-003/004).
## Phase 5: US3 triage and privacy
- [x] T008 [US3] Create inbox, views and Hermes guide in Notion; record links in contracts/notion.md (FR-005).
- [x] T009 [US3] Update sender explanation and privacy in src/components/FeedbackWidget.tsx and src/app/privacy/page.tsx (FR-007).
## Phase 6: Verification and operations
- [x] T010 Add secure setup wizard and service example in scripts/setup-notion-feedback.sh and ops/notion-feedback.service; update README.md/docs/system_architecture.md (FR-006/007).
- [x] T011 Run mandatory checks and record results in specs/007-notion-feedback/quickstart.md (FR-008).
- [ ] T012 Activate remote migration and supervised worker after secrets/host/deployment authorization; verify historical/new export and Hermes access in quickstart.md (FR-003/008; external gate).

## Dependencies and strategy
T001 -> T002/T003 -> US1 -> US2 -> US3 -> verification -> external activation. One writer; no concurrent mutations. Read-only API research can run independently. MVP is US1 plus safe recovery; never enable exporter before permissions and schema validation. Unit payload and SQL access checks are independently runnable once foundation exists.

## Phase 7: Convergence
- [ ] T013 Complete external acceptance evidence after T012 in specs/007-notion-feedback/quickstart.md: prove old/new feedback delivery with actual screenshot, supervised restart and Hermes read/update access per FR-003/008, US1/AC2 and US3/AC1 (partial; external activation gate).

## Phase 8: Hosted automatic execution
- [x] T014 Implement and test bounded Edge handler plus shared portable core in src/lib/notion-feedback-core.ts, src/lib/notion-feedback-queue-core.ts, src/lib/notion-feedback-handler.ts, supabase/functions/notion-feedback/index.ts and tests/notion-feedback-handler.test.mjs (FR-003/006; user authorization).
- [x] T015 Test/deploy event dispatch and minute recovery in supabase/migrations/202610040003_notion_feedback_dispatch.sql and supabase/tests/notion_feedback_dispatch.sql; securely configure Edge/Vault and verify cron/existing export in quickstart.md (FR-003/008).
