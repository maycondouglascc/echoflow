# Tasks: Prática local de shadowing

**Input**: Design documents from specs/001-local-shadowing/

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Add the behavior regression suite because AGENTS.md and the constitution require automated checks for the first behavior feature. Verify test failure before implementation where feasible.

**Organization**: One user story, P1, provides the complete local practice loop.

## Phase 1: Setup

**Purpose**: Test runner and configuration for a reproducible local browser journey.

- [X] T001 Add pinned @playwright/test devDependency, npm run test:e2e command and browser configuration in package.json, package-lock.json and playwright.config.ts; serve the locally built app and use a single Chromium worker.

---

## Phase 2: Foundational

**Purpose**: Integrate the automated check without weakening the existing CI gates.

- [X] T002 Install the matching Playwright Chromium and run npm run test:e2e in .github/workflows/ci.yml after build; preserve npm audit, lint, typecheck and build.

---

## Phase 3: User Story 1 - Praticar uma frase em um cenário de shadowing (Priority: P1) 🎯 MVP

**Goal**: Open the first local scenario, hear a reference phrase, record up to 30 seconds, and compare reference followed by personal recording; retry after microphone denial.

**Independent Test**: Run Playwright for navigation, reference playback, permission denial followed by recovery, recording duration, sequential comparison and absence of recorded bytes after a reload. Then perform the hardware-only pass from quickstart.md on iOS Safari and Android Chrome.

### Tests for User Story 1

- [X] T003 [US1] Write browser journey and privacy regression checks in tests/e2e/shadowing.spec.ts: three phrases and boundary navigation, reference playback and re-play, delayed record readiness, getUserMedia denial then success without reload, manual stop and 30-second stop, same-phrase recording retention across navigation, strict sequential comparison, no overlapping audio, no recording bytes in any request or browser storage, loss on reload, stop active playback/capture when navigating without implicit capture, reference playback error/interruption with recovery, unavailable microphone/MediaRecorder APIs, and empty or unplayable recordings. Use mock media APIs, fake clock and a non-sensitive blob marker.

### Implementation for User Story 1

- [X] T004 [US1] Define the immutable scenario and three phrase fixtures, stable order, exact English text and same-origin audio asset paths in src/lib/fixtures/introducing-yourself.json; export the typed fixture from src/lib/fixtures/introducing-yourself.ts.
- [X] T005 [US1] Generate the three local reference WAV fixtures in public/fixtures/audio/ from the canonical JSON; add scripts/generate-reference-audio.sh, scripts/generate-reference-audio.py and public/fixtures/audio/README.md with exact texts, eSpeak NG version, en-US voice, fixed speed, format, checksums and provenance; scope the WAVs to this local prototype without asserting redistribution rights; verify each WAV is decodable and byte-identical to deterministic regeneration.
- [X] T006 [US1] Implement the scenario entry link and static practice route in src/app/page.tsx and src/app/scenarios/introducing-yourself/page.tsx; display exactly three ordered phrases, phrase position, non-circular previous/next controls and disabled boundaries.
- [X] T007 [US1] Implement reference playback, delayed record enablement, permission request and recovery, a 30-second recording limit, in-memory per-phrase Blob playback, sequential comparison, status announcements and cleanup in src/components/ShadowingPractice.tsx; prevent stored bytes, uploads and implicit capture.
- [X] T008 [US1] Run npm audit --audit-level=high, npm run lint, npm run typecheck, npm run build, and npm run test:e2e against the production build; confirm the browser journey passes with simulated media APIs.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T001 is required before configuring CI or writing browser checks.
- **Foundational (Phase 2)**: T002 depends on the test command and configuration in T001.
- **User Story 1 (Phase 3)**: T003 depends on T001; T004–T008 depend on T003. T005 follows the canonical text and paths from T004; T006 follows T004 and T005; T007 integrates T004, T005 and T006; T008 requires the implemented application.

### User Story Dependencies

- **User Story 1 (P1)**: All necessary behavior belongs to this story; no external story is required.

### Parallel Opportunities

- None marked. Fixtures, tests, scenario routes, practice state and verification build on preceding contracts or assets; keeping the sequence clear reduces integration rework.

## Implementation Strategy

### Local MVP

1. Configure repeatable browser tests.
2. Preserve CI quality checks while adding the browser journey.
3. Add acceptance-driven browser tests before behavior implementation, including recovery and unsupported-media cases.
4. Add the canonical phrase fixture, generate static reference assets from it with provenance, then complete the scenario and practice journey.
5. Verify the journey locally, run the required quality checks and perform the explicit physical-device checks.

The deliverable remains runnable on a local development server; there is no deploy step.

## Notes

- T001–T008 and T010 are implemented and their automated/project gates pass. T009 remains pending because this session has no physical iOS Safari or Android Chrome devices for microphone and intelligibility checks.
- Recording tests use a synthetic marker only. Never use a real user's voice in test artifacts, reports, screenshots or fixtures.
- Automated microphone permission and audio events use browser mocks. Mocks do not replace the required tests on physical iOS and Android devices.


## Phase 4: Convergence

**Purpose**: Complete the real-device evidence required for browser audio and microphone behavior.

- [ ] T009 [US1] On physical iOS Safari and Android Chrome, listen to all three reference fixtures for intelligibility and verify microphone denial/recovery, manual stop, the 30-second cap, sequential comparison, and loss after reload; record each device result in the quickstart validation notes per SC-002 and SC-005 (partial).


## Phase 5: Convergence

**Purpose**: Recover when a reference or recording emits a media error after playback begins.

- [X] T010 [US1] Handle the audio element's asynchronous `error` event by clearing playback state and showing a recoverable message; add a browser regression for interrupted reference playback and verify that listening can be retried per FR-003, FR-008, and the playback interruption edge case (partial).
