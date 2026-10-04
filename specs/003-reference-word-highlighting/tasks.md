# Tasks: Voice Choice and Word Highlighting

**Input**: Design documents from /specs/003-reference-word-highlighting/

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Automated regression checks are required by the repository instructions.

## Phase 1: Setup

**Purpose**: Existing project structure, dependencies, and test tooling already satisfy setup requirements; no new setup changes are needed.

## Phase 2: Foundational

**Purpose**: Define the catalog type used by the timing data and practice screen.

- [x] T001 Add a WordTiming type and optional per-variant timing list in src/lib/fixtures/voice-comparison.ts

## Phase 3: User Story 1 - Follow the spoken words (Priority: P1)

**Goal**: Show the current word during reference playback with timing that follows the media clock.

**Independent Test**: With mocked media time, verify that reference playback highlights the aligned word, comparison transitions from highlighted reference to unhighlighted personal recording, and ending or failure clears the highlight. Verify every selectable catalog variant has complete valid cues.

### Tests for User Story 1

- [x] T002 [US1] Extend media mocks and add failing word-alignment and playback regression cases in tests/e2e/shadowing.spec.ts

### Implementation for User Story 1

- [x] T003 [US1] Add locally prepared word intervals to all ten selectable variants in src/lib/fixtures/voice-comparison.json
- [x] T004 [US1] Track the active word from the native media clock and reset it on playback transitions in src/components/useShadowingPractice.ts
- [x] T005 [US1] Render phrase tokens and style the current reference word in src/components/ShadowingPractice.tsx

**Checkpoint**: Reference playback highlights the current word in both direct play and the reference part of comparison; personal playback remains unhighlighted.

## Phase 4: User Story 2 - Choose a voice by its name (Priority: P2)

**Goal**: Show only the original voice persona name in visible and accessible selection text.

**Independent Test**: Verify both radio choices are named Puck and Harper and the selector contains no synthesis metadata.

### Tests for User Story 2

- [x] T006 [US2] Update the voice-selection E2E assertions to require name-only accessible labels and no metadata in tests/e2e/shadowing.spec.ts

### Implementation for User Story 2

- [x] T007 [US2] Render only voiceName and use it for accessible labels and selection status in src/components/ShadowingPractice.tsx and src/components/useShadowingPractice.ts

**Checkpoint**: Voice selection remains functional across phrases and presents only Puck or Harper.

## Phase 5: Polish and Cross-Cutting Concerns

- [x] T008 [P] Record Word alignment in the domain glossary in CONTEXT.md
- [x] T009 [US1] Verify both voice timelines against decoded browser audio in tests/e2e/shadowing-real-audio.spec.ts
- [x] T010 [P] Update the curated phrase voice and word-highlight behavior in docs/EchoFlow.md
- [x] T011 [P] Run the feature test and repository quality gates described in specs/003-reference-word-highlighting/quickstart.md

## Dependencies and Execution Order

### Phase Dependencies

- Setup is already complete and requires no changes.
- Foundational type work precedes catalog and UI work.
- User Story 1 follows the foundational type; its test task comes before behavior implementation.
- User Story 2 is independent of the word-highlighting behavior and follows after the shared test file edits to avoid conflicts.
- Polish follows both user stories.

### User Story Dependencies

- **US1 (P1)**: Requires T001, then T002 before T003-T005.
- **US2 (P2)**: Independent of US1 behavior; T006 before T007. Keep edits to the shared E2E file sequential with T002.

### Parallel Opportunities

- T008 is already complete.
- T003, T004, and T005 touch related catalog and UI state and should be completed sequentially. T009 validates the integrated player.
- Avoid parallel edits to tests/e2e/shadowing.spec.ts.

## Implementation Strategy

1. Complete foundational catalog type work.
2. Write and run US1 regression coverage first to observe the expected failure.
3. Add the locally aligned catalog cues and implement media-clock synchronization and visible highlighting.
4. Write and run US2 selector assertions, then simplify the labels.
5. Run all feature and repository checks.

## Notes

- [P] marks a task independent from other incomplete tasks.
- No provider credentials, external transcription endpoint, new runtime dependency, or runtime alignment process is needed.
