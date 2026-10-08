# Tasks: Practice feedback

**Input**: spec/plan/research/data-model/contracts/quickstart and execution.md. Implementation authorized on 2026-10-08; checked items have evidence in quickstart.md. Unchecked device/listener/capability and conditional tasks remain explicit. Tests mandatory FR014. [P] only in assigned wave after dependencies and exclusive resource/file ownership.

## Phase 1 — Setup

- [x] T001 Record coherent implementation base, dirty ownership, worktrees/ports/local Supabase isolation and reviewer assignment in `specs/008-practice-feedback/execution.md`; no reset/stash/push/secrets.
- [x] T002 Freeze interfaces/owner map in `specs/008-practice-feedback/contracts/practice.md`, read executor SKILL.md from execution.md; preserve owner history/local-ASR decisions.

## Phase 2 — Foundation

- [x] T003 Extract presentational `src/components/PracticeShell.tsx`, `src/components/PhrasePracticeList.tsx`, `src/components/PracticeControls.tsx` from `src/components/ShadowingPractice.tsx` without behavior change; A initial integration then C ownership.
- [x] T004 Define immutable attempt/run/account-generation/source events in new `src/lib/practice-events.ts`; A integrates types in `src/components/useShadowingPractice.ts`, no new resource/service starts.

## Phase 3 — US1 Hear own voice/rhythm (P1)

Goal/independent check: solo MVP first, sequential preserved, overlap explicit with mic-only recording and cancellation.

- [x] T005 [US1] Add failing solo/no-take/denied-retake cases in `tests/e2e/practice-refinement.spec.ts`, replace zero-solo-button expectation with meaningful coverage of no reference/mic/upload/highlight.
- [x] T006 [US1] Expose existing playRecording in `src/components/PracticeControls.tsx` + `src/components/ShadowingPractice.tsx`; disable request/record/save/no-take, preserve previous take on failures. A temporary controls owner, handoff C after.
- [x] T007 [P] [US1] Create tests and scheduled dual-source transport in `tests/practice-transport.test.mjs` + `src/lib/practice-transport.ts`; common clock/known offset/gain/unequal-duration/error/cancel,≤4 referenceURLs, no reference-to-recorder path. A waveB.
- [x] T008 [US1] Extend `src/lib/capture-session.ts` + `tests/capture-session.test.mjs` for repeat/with-reference policy and timing estimate; plain VAD retained, manual/30s/cleanup, with-reference manual/limit. After T007.
- [x] T009 [US1] Integrate coordinated playback/capture in `src/components/useShadowingPractice.ts`; take voice/offset metadata, cancellation/stale guards, both-ended comparison, existing highlight/word replay. After T008.
- [x] T010 [US1] Wire modes/volumes/fallback/always reachable Stop in `src/components/PracticeControls.tsx` + `src/components/ShadowingPractice.tsx`, with `tests/e2e/practice-concurrent-audio.spec.ts`; serialize C handoff, after T009.
- [ ] T011 [US1] Record10-run real-device marker offset-error/bleed/Bluetooth/interruption evidence in `specs/008-practice-feedback/quickstart.md`; no browser fake=device pass, unsupported profile sequential fallback. After T010.

## Phase 4 — US2 Words/linking (P1)

Goal/independent check: causal diagnosis before treatment; no unsafe exposed isolated word, reviewed natural linking. Pilot optional.

- [ ] T012 [P] [US2] Diagnose assets/alignment/seek/end/races with stratified real/listener samples in `docs/content/practice-audio-audit.md` and failing lexical fixtures under `tests/fixtures/practice-audio/`; B waveA, no paid generation.
- [x] T013 [US2] Test/implement reviewed-unit range/checksum/voice/type/fallback in `tests/practice-learning-units.test.mjs` + `src/lib/practice-learning-units.ts`; highlight cues independent. After T012.
- [x] T014 [US2] Add DTO/decoding to `src/lib/fixtures/voice-comparison.ts`, `src/lib/catalog-metadata.ts`, `src/lib/catalog.ts` and reviewed annotation `docs/content/practice-learning-units.json`; B catalog waits H T025 handoff, preserve wordTimings/private access.
- [x] T015 [US2] A alone integrates causal transport/unit playback in `src/lib/practice-transport.ts`, `src/components/useShadowingPractice.ts`, `src/components/ShadowingPractice.tsx` + `tests/e2e/practice-learning-units.spec.ts`; after T009/T014, no blanket padding.
- [ ] T016 [US2] Two independent listeners approve every exposed isolated unit and linking annotation in `docs/content/practice-audio-audit.md`; disagreement→withhold/fallback. After T015, clocks insufficient.
- [ ] T017 [US2] CONDITIONAL if diagnosis proves independent assets necessary: prepare finite unit×two-voice preview in `scripts/generate-openrouter-audio.py`, `tests/python/test_practice_learning_units.py`, `docs/content/practice-word-pilot.md`; stop before paid calls pending explicit budget/private-destination approval.
- [ ] T018 [US2] CONDITIONAL after approved pilot: H versions `supabase/migrations/202610080002_practice_learning_units.sql`, `supabase/tests/practice_learning_units.sql`, private `src/app/api/practice-audio/[unitId]/route.ts`, types; B modifies `scripts/import-reference-audio.ts`; A serializes integration. Test A/B/anon/checksum locally, no remote apply/import authorized. After T025.

## Phase 5 — US3 Focus (P2)

Goal/independent check: desktop viewport/list-only scroll, mobile/zoom reachable, collapse preserves state/navigation/account.

- [x] T019 [P] [US3] Tests `tests/e2e/practice-focus-integration.spec.ts` + scoped layout `src/components/PracticeShell.tsx`, `src/components/styles/catalog-practice.css`; C waveA after T003.
- [x] T020 [US3] Collapse/restore/mobile drawer/focus in `src/components/PracticeShell.tsx`, alternate account/Privacy/Playlists props, no hidden focus or media reset; after T019, A maps root later T029.
- [x] T021 [US3] List/long phrase/responsive controls in `src/components/PhrasePracticeList.tsx`, `src/components/PracticeControls.tsx`; preserve Stop/error/mute/mode slots at shortheight/200%zoom. After T006 handoff.
- [ ] T022 [US3] Web-design-guidelines/screenshot/keyboard evidence in `specs/008-practice-feedback/quickstart.md`; root serialized quickstart recorder after T011, C fixes own files.

## Phase 6 — US4 Account listening history (P2)

Goal/independent check: full reference once per event/account, visits/retries/concurrent tabs safe, no user leakage.

- [x] T023 [P] [US4] Add local tables/atomic narrowRPC/grants/RLS in `supabase/migrations/202610080001_practice_listening_history.sql` and pgTAP `supabase/tests/practice_listening_history.sql`; A/B/anon/directwrites/idempotent-conflict/concurrency/rate60+dup exemption/overflow rollback/deletion/reconciliation; index(user_id,created_at) for quota query and same quota behavior check. H waveA isolatedDB, no remote apply.
- [x] T024 [US4] Implement input/auth/expectedUID/publication/error rules in `src/lib/practice-history-core.ts`, `src/lib/practice-history.ts`, `src/app/(app)/practice-history-actions.ts`, `tests/practice-history.test.mjs`; session client only. After T023.
- [x] T025 [US4] Generate `src/lib/supabase/database.types.ts`, expose databasePhraseId+owned counts `src/lib/catalog.ts`; pass props via `src/app/(app)/scenarios/[id]/page.tsx`, `src/app/(app)/scenarios/introducing-yourself/page.tsx`, `src/app/(app)/practice/[phraseId]/page.tsx`; H after T024 before B catalogT014.
- [x] T026 [P] [US4] Implement `src/components/usePracticeHistory.ts` + `tests/practice-history-client.test.mjs` against fake action;20volatile pending/3retries, count separate Unsaved, out-of-order committed responses/account guard, no blobs/text. H waveB after T025.
- [x] T027 [US4] Full-reference run events/dedup in `src/components/useShadowingPractice.ts` Listen/compare/speak-along; exclude words/chunks/take/partial/preload/reject. A after T009/T026.
- [x] T028 [US4] Count/Heard/separate Unsaved/Retry in `src/components/PhrasePracticeList.tsx`; C after T021/T026, Completed independent, no own persistence.
- [x] T029 [US4] A serializes root layout/history props in `src/components/ShadowingPractice.tsx`, e2e `tests/e2e/practice-history.spec.ts` refresh/accounts/concurrent/retry/logout/offline-loss; after T020/T025/T027/T028.

## Phase 7 — US5 Cues (P3)

Goal/independent check: opt-in low cues, visible+assistive states, mute, zero contaminated recording.

- [x] T030 [P] [US5] Test/implement ≤250ms local tones/dedup/drop/errors in `src/lib/practice-sounds.ts`, `tests/practice-sounds.test.mjs`; E waveC after T004.
- [x] T031 [US5] A wires committed ready/take-saved/playlist-completed and busy suppress/drop in `src/components/useShadowingPractice.ts`, `src/components/ShadowingPractice.tsx`; after T029, no queue.
- [x] T032 [US5] C adds opt-in/mute+visible readiness/saved/completed equivalents in `src/components/PracticeControls.tsx`, tests `tests/e2e/practice-sounds.spec.ts` busy/autoplay/dedup/visual; after T031.

## Phase 8 — US6 Local live text (P3 capability-gated)

Goal/independent check: proven local or unavailable+working recording, no upload/score/transcript-only stop.

- [ ] T033 [P] [US6] Research verified local model/offline/coexistence in `docs/local-transcription-feasibility.md` primary docs+real devices; browser/system network proof, default unsupported; D read-only waveA when slot frees, cloud excluded.
- [x] T034 [P] [US6] Test/implement fail-closed local adapter `src/lib/practice-transcription.ts`, `tests/practice-transcription.test.mjs`; fake interim/final/stale/error, no generic remote-default API. D waveC after T033/T004.
- [x] T035 [US6] Private opt-in/interim/final component `src/components/LivePracticeTranscript.tsx`, `tests/e2e/practice-transcription.spec.ts` unsupported/offline/install-consent/no app mic-text network/screenshot/context; D after T034, no root/hook writes.
- [ ] T036 [US6] A integrates adapter lifecycle `src/lib/capture-session.ts`, `src/components/useShadowingPractice.ts`, `src/components/ShadowingPractice.tsx`; after T031/T035, one capture owner, VAD/manual/30s unchanged; with-reference text unavailable until verified.
- [ ] T037 [US6] D updates local-only model/privacy wording `src/app/privacy/page.tsx`, measured device results `docs/local-transcription-feasibility.md`; after T036, no cloud/assisted-stop activated.

## Final phase

- [x] T038 Root updates scoped contracts `docs/EchoFlow.md`, `docs/system_architecture.md`, `README.md`, preserving owner dirty edits; history metadata exception/overlap default/local-only.
- [ ] T039 Frozen diff focused auth/RLS/schema/privacy + listener/UI/device reviews, required lint/typecheck/build/unit/e2e/db(+Python if altered), actual results in `specs/008-practice-feedback/quickstart.md`; root one recorder, never weaken gates.
- [x] T040 After implementation execute speckit-converge, record accepted criteria/gaps in `specs/008-practice-feedback/tasks.md`, `pm-review.md`; no deploy/remote migration/paid calls without separate instruction.

## Dependencies, waves and [P]

T001→002→003→004; MVP005→006 then review. WaveA max3 writers B012→013, C019→020/021, H023→024→025. A integration/read-only reviewer after MVP; D033 when slot frees. WaveB A007→008→009, H026, B014 afterHcatalog; C028 after021/026. [P] allows only declared wave with stable inputs, disjoint files/resources.

Integration A010→011, A015→B016, A027→029 serializes all hook/root/transport edits; C/B source freeze during integration. WaveC E030, D034→035, B016/017 optional content (max3). Then A031→C032→A036→D037 serially. T018conditional schema waits H/types/catalog writer free;022/011 evidence root recording serialized. Final038→039→040. No phase-wide blanket blocking for unrelated stories; each independently testable with props/fakes after foundation.

Parallel examples: T012/T019/T023 read/write distinct audit, shell, DB; T007/T026/T014 distinct transport, history hook, metadata; T030/T034 distinct modules/tests. Tests+module same task have one writer. Same-file controls/root/catalog/types never parallel. Optional paid pilot explicitly left unstarted if gate unmet, not fake completed.

## Strategy

MVP solo first; independently validate focus, then history/media/content, optional cues/local text. Each slice includes failing regression→implementation→review; no demo implies deployment. Task paths are proposed new files where absent, anchored to existing modules; execution.md has exact owners/skills/reviewer probes/resources.

## Phase 9: Convergence

Assessment 2026-10-08: 15 FR, 7 SC, 20 acceptance scenarios, 8 architecture decisions and 5 constitution principles. Three partial evidence/capability findings; no additional unconditional paid work. These tasks make the remaining release gates traceable and do not certify human/device outcomes.

- [ ] T041 Record approved real Chrome/Safari/iOS/Android audio and UI profiles in `specs/008-practice-feedback/quickstart.md`: ten observed onset-error runs, headphones/speakers/Bluetooth, interruption/permission/device-loss cleanup, optical200% keyboard/Stop/layout proof; unsupported synchronization profile must keep actionable sequential fallback per SC-002/SC-005, FR-014, T011/T022/T039 (partial, HIGH).
- [ ] T042 Complete stratified perceptual diagnosis and obtain two independent listener judgments for every proposed isolated word/contextual linking annotation in `docs/content/practice-audio-audit.md` and `docs/content/practice-learning-units.json`; retain labelled full-phrase fallback for disagreement/unapproved units. Evaluate T017/T018 only if diagnosis proves separate assets necessary and separate budget/import authorization exists per FR-005/FR-006/SC-003, T012/T016 (partial, HIGH).
- [ ] T043 Verify an exclusively local installed English recognizer offline with browser/system network and simultaneous-recorder evidence in `docs/local-transcription-feasibility.md`; only after approval, integrate its attempt-scoped start/interim/final/cleanup/error lifecycle in `capture-session`/`useShadowingPractice`/`ShadowingPractice`, keeping with-reference text and transcript-assisted stop disabled until separately verified per FR-011/FR-012/SC-007, T033/T036/T037 (partial, MEDIUM).
