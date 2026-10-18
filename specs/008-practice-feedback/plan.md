# Implementation Plan: Practice feedback improvements

**Branch**: `codex/practice-feedback-plan` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: `specs/008-practice-feedback/spec.md`; eight feedbacks classified in [classification.md](classification.md). This session authorizes planning only; no application implementation, migration execution, paid call or publishing.

## Summary

Expose the existing solo-recording action; diagnose/repair word replay before choosing any generated words; add explicitly optional speak-along and simultaneous comparison with one media owner; save completed-reference listening history per account; fit the practice shell with focus mode; add opt-in sound cues; and provide only verified on-device live transcription with ordinary recording fallback. Recognition is not a pronunciation score. Three safe parallel workstreams after contracts: media, layout, and history backend; audio-quality and recognition research proceed in read-only/fixture lanes under slot limits.

The owner explicitly chose persistent history and local transcription on 2026-10-08. The requested overlap/history supersede older exclusions in specs001/002/005 and docs/system_architecture only within this feature. Canonical docs update alongside approved implementation, historical specs remain intact. No video import, stored takes, cloud ASR or unsolicited provider generation.

## Technical Context

**Language/Version**: TypeScript5.9.3, React19.2.8, Next16.3.6; Node24.19+ <25 / npm11; Python generator existing.
**Primary Dependencies**: existing Supabase2.117.2/SSR0.12.7, motion13.4.4, Web Audio/MediaRecorder; no new dependency presumed. Version evidence package.json, not latest internet assumption.
**Storage**: existing Postgres/private phrase-audio; new additive local planned migration for `phrase_listen_events` + `phrase_listen_counts`. Takes/transcripts page-local; new content assets remain private.
**Testing**: Node tests, Playwright fixture/e2e, Python generator fixtures, Supabase pgTAP distinct-user tests; device listening/timing mandatory.
**Target Platform / Project Type**: authenticated web practice desktop and mobile; Chrome desktop/Android, Safari desktop/iOS explicit release matrix.
**Performance Goals**: paired start-offset error≤50ms both deterministic and actual device onset; existing≤4 reference object-URL budget preserved, one active context/transport per page and tracks/timers always released. Frame-per-word highlight regression preserved.
**Constraints**: no provider calls CI; explicit mic consent; per-account ownership/RLS; local ASR fail-closed; no lockfile/CI changes presumed; unknown cause of clipping requires diagnosis.
**Scale/Scope**: actual six playlists/80 phrases/160 active variants (docs/content current update; older one-playlist prose stale). Audit sample stratified across playlists/voices, but each exposed isolated learning unit must be individually reviewed before publication. History grows by user full-listen events; bounded actions/rate limits, no acoustic attestation.

## Constitution Check

Before research and after design: PASS at planning level for small story slices, mandatory regression/device evidence, owner isolation/private media, deterministic fixtures, one-writer worktrees and unchanged quality gates. Future history/content migrations require focused SQL/security review and `test:db`; paid content pilot requires budget separately. No production mutation/remote import/deploy authorized. Tests/docs approval do not imply device or product success.

## Project Structure

```text
specs/008-practice-feedback/             # spec, classification, research, plan,
  data-model.md contracts/ quickstart.md # contracts & future validation
  execution.md tasks.md pm-review.md checklists/
src/components/
  ShadowingPractice.tsx                 # one integration writer (A)
  useShadowingPractice.ts               # core media owner A
  capture practice components (new): PracticeShell/PhrasePracticeList/PracticeControls
  styles/catalog-practice.css           # C scoped layout
src/lib/
  capture-session.ts speech-end.ts      # A lifecycle
  practice-transport.ts                 # new A scheduled audio
  practice-history.ts                   # new H server reads/writes
  practice-history-core.ts              # new H validation/idempotency DTO
  practice-transcription.ts             # new D strictly local adapter
  practice-sounds.ts                    # new E cue scheduler
  catalog-metadata.ts catalog.ts        # B learning-unit metadata
src/app/(app)/practice-history-actions.ts # new H action; existing getScenario read H
supabase/migrations/202610080001_practice_listening_history.sql # H
supabase/tests/practice_listening_history.sql                  # H
```

Additional exact file ownership and source paths are in tasks/execution. Before development inspect the dirty snapshot, create dedicated worktrees based on a coherent explicitly selected snapshot; never stash/overwrite current owner changes. New branch created from `codex/ai-memory` with working changes retained. Integration points are serialized even across independent stories.

## Phase 0 — research and bounded discovery

[R1–R8 research](research.md) records evidence and alternatives. Open technical feasibility gates:

- Word-quality cause: use failing lexical fixtures and actual reviewed samples to distinguish alignment, source phonetics, seek/end, races. Do not declare fixed based on clocks. If isolated speech cannot be validly extracted, offer contextual fallback; generation pilot separately approved.
- Local recognition: feature detect verified local processing, model availability and simultaneous recorder compatibility. No unsupported browser/server recognition API invocation. If on-device processing cannot be established, unavailable state is the supported outcome, without cloud fallback. Model-install/download needs clear destination/storage disclosure and user gesture; no microphone data over network.
- Device synchronization: measure decoded waveform onsets from physical/loopback capture with fixture markers, not promises/call timestamps. Measure error observed onset offset minus expected offset using impulse markers (not natural speech onset), and record error/jitter over10 paired starts per device and headphone/speaker/Bluetooth; if threshold fails leave that tested profile unsupported with sequential fallback and record it; runtime degrades on observable start/decode errors rather than pretending a browser user-agent certifies hardware.

## Phase 1 — contracts/design

1. Stable capture/transport/hook contracts in [contracts/practice.md](contracts/practice.md). One media owner, cancellation tokens, three gain paths, no digital reference input into recorder. For speak-along start recorder before scheduled reference after consent; preserve actual reference offset and leading mic silence in metadata. Simultaneous replay schedules starts that recreate that recorded offset; plain-take comparison starts both at zero. Voice switch while active is blocked; switching idle preserves the take, warns if reference voice differs from capture.
2. Separate highlight cues from reviewed replay units. Contextual groups use natural source offsets; isolated assets private/current-voice/checksum/provenance; no stale highlight metadata padding. Add schema for units only if diagnosis and pilot show required, via a separately reviewed additive migration, not speculative schema on every phrase.
3. History transaction per account/event; schema/SQL/RLS [data-model.md](data-model.md). Source event only valid reference natural completion; full compare history counts reference even if take continues, but compared marker only once both comparison sources finished. Save failures nonblocking/unsaved, retry same ID while page remains. Cancel/logout does not resubmit A event under B.
4. Layout owner receives props/actions, no media ownership. Desktop view budget = available viewport−shell margins (48px current), list scroll only; mobile drawer and short/zoom fallback. Collapse retains Playlists/Privacy/account in alternate toolbar; focus restored deliberately.
5. Cue scheduler consumes a committed event after media cleanup, dedup ID and current busy/mute state. New transcript display marked private and excluded from feedback screenshot/context staging. Recognition events scoped to attempt; never contribute server progress.

## Error prevention and recovery

| Failure | Prevent | Detect / recovery | Owner |
| --- | --- | --- | --- |
| Reference mixed into saved mic | MediaRecorder input mic stream only; never connect reference output to capture destination | Synthetic loopback fixture detects digital leakage; headphone hint for acoustic bleed; stop attempt on source failure, keep prior take | A |
| False silence stop while reference audible | speak-along initially manual/30s only; plain Speak VAD remains | Noise/speaker trial; manual stop always visible; no transcript-only stop | A/D |
| Two sources drift or clip | Common AudioContext scheduled start; gains≤0.5 each defaults, bounded volume; offset metadata | device onset/skew measured; play rejection/decoder fails stop all, sequential fallback, retain take | A |
| Late capture/ended/transcript after navigation | Immutable attempt/run/account tokens and idempotent cleanup; validate callback before state/event save | Rapid-switch/unmount tests; discard late output, revoke object URLs/tracks/timers | A/D/H |
| Word cut/neighbor audible | Causal diagnosis, checksum-bound cues/units, individually reviewed assets | Two independent listeners per exposed isolated unit; unsafe unit withheld contextual/phrase fallback | B |
| Lost/duplicate history | Transaction insert event on conflict, increment only actual insert; unique(account,event), account identity from auth, phrase UUID from catalog | A/B/anon pgTAP; same retry→one count; distinct concurrent events→two; failed saves labelled pending, retry same ID, refresh confirmed state | H/A |
| A pending event written as B | Account-bound caller token reset on account change; server compares claimed owner to auth; never implicit remap | Switch-account late request tests; deny mismatched identity and discard A queue | H/A |
| History outage blocks recording | Decouple event queue from practice state, no retries storm; max20 pending page events, then visible Save history retry before further persistence (practice continues) | Controlled timeout/backoff bounded3 attempts, manual retry; unsaved events volatile and loss disclosed | H/A |
| Hidden controls/scroll trap | Scoped min-height0 layout; preserve modal/body behavior; restore button outside sidebar, short/zoom fallback | mobile portrait/landscape/200% keyboard checks; accessible natural scroll if required | C |
| Cue contaminates mic or blocks audio | opt-in; drop when requesting/capture/playback; never queue; transition dedup | cue unit test zero starts; autoplay/cue failure ignored, visual status retained | E/A |
| Recognizer uploads by default | Strict verified on-device mode and offline/capability guard before start; no general API fallback | Network assertion/no audio or text upload; failure closes adapter and ordinary recording remains | D |
| New text leaks to feedback | Private-mark transcript subtree; no transcript/recognized text in action metadata | Screenshot/context fixture excludes learner text; feedback remains intact | D/A |
| Migration/backfill harm | Additive local migration, no destructive updates; empty history initially, transactional schema tests | Focused security review; production apply separately authorized, rollback plan remove new objects only after export/recovery review | H |

## Delivery / integration

[Execution briefs](execution.md) define owners, wave dependencies, worktree/resource isolation, skills and reviewer probes. MVP F01 is small and can be reviewed first. C layout is independently useful after extraction. Persisted history H requires schema before A client wiring; media integration A serializes all writes to the hook/root component. D/E module work can parallelize only after shared contracts; their UI/media integration waits for A. B paid generation is a gated branch; contextual fixes can ship without it. Final gates: lint, typecheck, build, unit/e2e; db with two users for history/units; Python if generator altered. No actual execution results claimed here.
