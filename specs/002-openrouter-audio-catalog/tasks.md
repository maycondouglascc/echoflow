# Tasks: Catálogo de áudio por modelo e voz

**Input**: Design documents from specs/002-openrouter-audio-catalog/

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: User-approved verification plan includes adapting the E2E coverage and adding offline generator tests. All provider responses use local fixtures or a mocked HTTP server; no OpenRouter call.

**Organization**: Three user stories: choose voice, maintain a reliable catalog, preview and run a bounded generator.

## Phase 1: Shared Catalog

**Purpose**: Establish stable source data and paths used by the app and script.

- [X] T001 Update src/lib/fixtures/voice-comparison.json with five canonical phrases tagged by their source category, two selectable OpenRouter model/voice records, ten active variants, and the three non-selectable eSpeak baseline variants.
- [X] T002 Move the ten user-provided OpenRouter files into stable phrase/model/voice filenames under public/fixtures/audio/openrouter/; record original filenames, formats, measured metadata, and SHA-256 in the catalog. Preserve the three eSpeak files byte-for-byte.
- [X] T003 Update src/lib/fixtures/voice-comparison.ts with typed model, archived model, and audio variant records; keep the fixture immutable and add catalog-shape validation if supported without runtime side effects.
- [X] T004 Update scripts/generate-reference-audio.py and public/fixtures/audio/README.md so eSpeak regeneration targets only the three archived fixture paths and the audio inventory describes active and archived assets.

---

## Phase 2: User Story 1 - Escolher uma voz de referência (Priority: P1)

**Goal**: Let the learner choose Google/Puck or Microsoft/Harper for listening and comparison throughout the page session.

**Independent Test**: E2E opens the five-phrase scenario, switches both voice options, navigates, and confirms the selected source is used for reference and comparison while personal audio stays session-only.

### Tests for User Story 1

- [X] T005 Update tests/e2e/shadowing.spec.ts to expect five phrases and the stable default Google/Puck asset; cover choosing MAI/Harper, retaining selection across navigation, and using that variant in sequential comparison.

### Implementation for User Story 1

- [X] T006 Update src/components/useShadowingPractice.ts with session-scoped selected model/voice state; resolve the active phrase variant for reference playback and comparison, reset record readiness on a choice change, and reject incomplete mappings without fallback.
- [X] T007 Update src/components/ShadowingPractice.tsx with two accessible model/voice choices and the selected model label; disable switching during audio playback, microphone permission requests, and recording.
- [X] T008 Update src/app/page.tsx, src/app/scenarios/voice-comparison/page.tsx, and the legacy route redirect to reflect five phrases and pre-generated reference choices.

---

## Phase 3: User Story 2 - Identificar e manter amostras de áudio (Priority: P1)

**Goal**: Make every active or archived sample traceable to its phrase and synthesis identity.

**Independent Test**: Compare all fixture references to file headers, source filenames, and checksums; verify five pairs and three archived baselines.

### Implementation for User Story 2

- [X] T009 Document the audio catalog, model/voice glossary, provenance, and archived eSpeak status in public/fixtures/audio/README.md and CONTEXT.md.
- [X] T010 Add an offline catalog consistency check in tests/python/test_openrouter_audio_generator.py for five phrases, ten active variants, two model/voice pairs, three archived assets, and matching local checksums.

---

## Phase 4: User Story 3 - Preparar lote pela API (Priority: P2)

**Goal**: Preview ten deterministic TTS tasks and allow explicit, safe OpenRouter generation for future content updates.

**Independent Test**: Run default preview without a key or network; unit tests mock the HTTP response and assert request fields, audio formats, atomic writes, metadata capture, overwrite protection, and failures.

### Tests for User Story 3

- [X] T011 Add tests/python/test_openrouter_audio_generator.py for preview-only behavior, PCM-to-WAV wrapping, request/response validation, missing credentials, metadata recording, and overwrite protection.

### Implementation for User Story 3

- [X] T012 Add scripts/generate-openrouter-audio.py using the shared catalog, serial OpenRouter requests, explicit --execute, explicit --force for overwrites, temporary files with atomic replacement, and incremental generation metadata updates.
- [X] T013 Add npm scripts for offline generator tests and preview invocation; document explicit paid API invocation and non-CI status in specs/002-openrouter-audio-catalog/quickstart.md.
- [X] T014 Confirm no OpenRouter request is triggered by app runtime, CI, build, or default script preview; keep the credential only in the local script process.

---

## Phase 5: Polish and Convergence

- [X] T015 Run npm run lint, npm run typecheck, npm run build, npm run test:e2e, npm run test:audio-generator, and validate the ten media files and checksums.
- [ ] T016 On physical iOS Safari and Android Chrome, manually listen to all ten samples and verify selector changes, reference playback, recording, and sequential comparison; record results in quickstart.md. Pending: physical devices are not available in this workspace.

## Dependencies & Execution Order

1. T001 defines the source schema; T002 populates its stable asset paths; T003 types the schema.
2. T004 preserves the legacy eSpeak generator against the revised fixture.
3. T005 updates existing acceptance evidence before T006 and T007 change UI behavior.
4. T006 resolves the selected source and T007 presents and controls the choice.
5. T009/T010 cover static asset traceability; T011 covers the offline script contract before T012.
6. T013 documents the safe generator interface; T014 checks the security and cost boundary.
7. T015 follows implementation; T016 remains device-only convergence.

## Notes

- No real OpenRouter requests are needed to implement or verify this feature.
- T016 requires physical devices unavailable to this workspace and may remain pending.

