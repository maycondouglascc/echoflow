# Tasks: Smooth Word Highlight and Word Replay

**Input**: Design documents from `/specs/004-smooth-word-replay/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Required by the project instructions for behavior changes. Add deterministic Playwright coverage and real-media coverage.

**Organization**: Tasks are grouped by user story so each experience can be implemented and checked independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No project-wide setup is needed; the change extends the existing practice component and test suite.

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No shared blocker exists. Each story can be implemented in its own commit after its checks are ready.

## Phase 3: User Story 1 - Follow the moving highlight (Priority: P1)

**Goal**: The active-word indicator moves smoothly while the transcript remains stationary.

**Independent Test**: Drive the reference media clock across at least five word boundaries and compare token bounding boxes, then repeat with reduced motion enabled.

### Tests for User Story 1

- [ ] T001 [P] [US1] Add Playwright checks for stable word bounds and reduced-motion behavior in `tests/e2e/shadowing.spec.ts`.

### Implementation for User Story 1

- [ ] T002 [US1] Add the Motion dependency and lockfile entry in `package.json` and `package-lock.json`.
- [ ] T003 [US1] Render a shared highlight layer over fixed transcript tokens and respect reduced motion in `src/components/ShadowingPractice.tsx`.

**Checkpoint**: The highlight transitions without moving words, and reduced-motion playback updates without spatial travel.

## Phase 4: User Story 2 - Replay a word from the transcript (Priority: P1)

**Goal**: Activating a transcript word plays only its aligned interval from the selected reference voice.

**Independent Test**: Replay a word from each voice, interrupt phrase and comparison playback, and verify the audio stops at the cue end without starting capture.

### Tests for User Story 2

- [ ] T004 [P] [US2] Add deterministic replay, interruption, capture-protection, and completion checks in `tests/e2e/shadowing.spec.ts`.
- [ ] T005 [P] [US2] Add native-media seek and cue-stop coverage for both voices in `tests/e2e/shadowing-real-audio.spec.ts`.

### Implementation for User Story 2

- [ ] T006 [US2] Add word-replay playback state, media-clock selection, and cue-end stopping in `src/components/useShadowingPractice.ts`.
- [ ] T007 [US2] Add a preloaded selected-reference audio element and accessible transcript replay controls in `src/components/ShadowingPractice.tsx`.

**Checkpoint**: Word replay uses the selected asset's cue, interrupts other playback, and returns to the prior safe practice state.

## Final Phase: Polish and Cross-Cutting Concerns

- [ ] T008 [P] Update feature and domain descriptions for word replay in `docs/EchoFlow.md` and `CONTEXT.md`.
- [ ] T009 Run focused Playwright tests, `npm run lint`, `npm run typecheck`, and `npm run build`; reconcile implementation against the acceptance criteria in `specs/004-smooth-word-replay/spec.md`.
