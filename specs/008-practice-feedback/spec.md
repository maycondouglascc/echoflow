# Feature Specification: Practice feedback improvements

**Feature Branch**: `codex/practice-feedback-plan`

**Created**: 2026-10-08

**Status**: Planned; application implementation not authorized in this session

**Input**: Eight feedbacks provided by the owner: replay my take alone; repair cut/mixed word clips and explore words/chunks/linking; show live transcription; record alongside reference and compare simultaneously; show played phrases/counts; full-height panels with phrase-list scrolling; optional enjoyable sound cues; hide left panel.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hear my voice and compare rhythm (Priority: P1)

As a learner, I can hear only my take, keep the existing sequential comparison, and deliberately select synchronized reference/take playback to assess rhythm. I can explicitly begin a take while the reference plays.

**Why this priority**: These are direct gaps in the core shadowing loop. Solo replay already exists in code and must be made discoverable before duplicating playback logic.

**Independent Test**: Record a fixture phrase, replay only the take, compare sequentially, then compare both and record with reference. Inspect sound-source events and recording cleanup.

**Acceptance Scenarios**:

1. **Given** a saved page-local take, **When** I select My recording, **Then** only my take plays; no reference source starts and no reference highlight appears.
2. **Given** a take and loaded reference, **When** I select Both together, **Then** both start from their beginnings, preserving the recorded reference-start offset for a speak-along take, with at most 50 ms error relative to that expected offset in the deterministic timing test; both stop on Stop, phrase change, or leaving the page. The longer track may finish naturally after the shorter; only completion of both sources qualifies as a completed comparison.
3. **Given** normal practice, **When** I select Record with reference, **Then** microphone permission remains explicit, the take starts before the reference, manual Stop is always reachable, and any failure stops/release all started resources. Plain Speak and sequential comparison remain available.
4. **Given** a previously saved take, **When** another attempt is denied, cancelled, or empty, **Then** the previous take remains playable; a successful replacement discards its previous page-local recording.

### User Story 2 - Hear useful word and connected-speech examples (Priority: P1)

As a learner, I can hear a complete selected word without another word leaking into it, and select a reviewed short group of words to hear linking in the original sentence context.

**Why this priority**: Incorrect clips teach the wrong sound. Individual generation is a candidate treatment, not an assumed diagnosis.

**Independent Test**: A reviewed pronunciation fixture set covers both voices, boundaries, short function words, contractions and linking groups. Each exposed clip passes annotation and listening criteria.

**Acceptance Scenarios**:

1. **Given** a reviewed word example, **When** I replay it, **Then** the intended word is complete, no adjacent lexical word is audible, and the example uses the selected voice.
2. **Given** a word with no trustworthy isolated example, **When** I inspect the phrase, **Then** a whole phrase or reviewed contextual group is available; an unsafe clip is not presented as an isolated word.
3. **Given** an annotated linking group, **When** I select it, **Then** the complete contiguous group plays from the original sentence, is clearly labelled In context, and is distinct from an isolated-word example.

### User Story 3 - Focus on practice (Priority: P2)

As a learner, I can keep the practice controls visible, scroll the phrase list, and collapse/restore the left panel without losing my take or selected phrase.

**Why this priority**: Low-risk usability improvements can proceed alongside audio research after file ownership is separated.

**Independent Test**: Use long phrase lists at desktop and mobile viewports, keyboard-only navigation, zoom and focused-panel mode.

**Acceptance Scenarios**:

1. **Given** a desktop viewport of at least 1024×768, **When** the practice screen is open, **Then** both panels fill the available viewport height, the document has no practice-induced vertical scroll, and only the phrase list scrolls in the default layout.
2. **Given** a visible sidebar, **When** I collapse and restore it, **Then** the current phrase, take, counts and playback state are retained; a labelled keyboard-accessible restore control remains available in the main panel.
3. **Given** a narrow/short viewport or 200% zoom, **When** the default layout cannot fit, **Then** all controls remain reachable with a documented accessible scrolling fallback rather than clipped content.

### User Story 4 - See listening history (Priority: P2)

As a learner, I see which phrases I have heard and how many full reference listens I finished, saved to my account across visits.

**Why this priority**: Explicit owner decision: durable listening history per account; recordings and transcripts remain local.

**Independent Test**: Listen twice, retry the same save, interrupt another listen, refresh and repeat with two separate accounts and anonymous access.

**Acceptance Scenarios**:

1. **Given** a phrase count of zero, **When** a full reference completes through Listen, sequential comparison, simultaneous comparison or Record with reference, **Then** its count increments exactly once and it is labelled Heard.
2. **Given** a partial/failed reference, word/group replay, preload, personal playback or duplicate completion event, **When** it finishes or is interrupted, **Then** no full-listen increment occurs; retrying a completed-listen save with the same event identity never duplicates its increment.
3. **Given** counts accumulated in this page, **When** I change phrase/voice or focus mode, **Then** confirmed counts remain per phrase across voices and survive refresh and another authenticated visit. Heard is distinct from Completed; another account cannot read or change my history.

4. **Given** a failed/offline history save, **When** I continue practice, **Then** local pending progress is explicitly labelled Unsaved, can be retried with the same event identity, and never blocks recording. Leaving the page can discard unconfirmed events; this limit is explained. Concurrent tabs with distinct events aggregate without lost updates, and logout prevents a late event from being saved to another account.

### User Story 5 - Optional enjoyable sound cues (Priority: P3)

As a learner, I can enable discreet app sounds for readiness, saved take, and completed playlist without contaminating a recording or interrupting learning audio.

**Why this priority**: Motivation enhancement follows core audio correctness.

**Independent Test**: Toggle cues and exercise their events, blocked autoplay, recording and duplicate completion.

**Acceptance Scenarios**:

1. **Given** app sounds disabled by default, **When** I enable them in this page, **Then** the three documented cues may play only after the initiating user gesture and are paired with visual status; muting remains available.
2. **Given** an active/requesting microphone, any reference/take playback, or a stale event, **When** a cue event occurs, **Then** it is suppressed and is not queued for later. An unavailable cue never blocks practice.

### User Story 6 - Read provisional words while speaking (Priority: P3; discovery-gated)

As a learner, I can opt into available live transcription to see what was recognized. It is explicitly provisional and does not certify pronunciation.

**Why this priority**: Capability, audio privacy and browser support need evidence before committing to provider-dependent delivery.

**Independent Test**: Inject deterministic interim/final transcripts and errors; then exercise an explicitly authorized recognizer on supported real devices with English reference phrases.

**Acceptance Scenarios**:

1. **Given** a supported approved recognizer and explicit opt-in, **When** I speak, **Then** provisional words are differentiated from final words, associated only with the current attempt, and cleared when starting another take. The interface says recognition is not a pronunciation score.
2. **Given** absent/denied/failing recognition, **When** I record, **Then** recording, manual stop and existing silence stop continue; no cloud fallback or upload happens silently.
3. **Given** final recognized text matching the phrase, **When** I am still speaking, **Then** transcription alone cannot stop the take. Initial delivery keeps the existing silence/manual/30-second termination; optional end-of-phrase assistance requires separate noisy-device evidence and acceptance before activation.
4. **Given** local processing cannot be established, **When** I try live transcription, **Then** it remains unavailable and recording continues without it. Downloading an on-device language model may require separate informed action about destination/storage; microphone audio and recognized text never leave the device.

### Edge Cases

- Autoplay rejection, expired authentication, missing reference, decoding errors and delayed callbacks must return to an actionable state without losing an earlier take.
- Rapid Stop/start/phrase changes, navigation, tab interruption, device loss and voice changes must not attach late media/transcripts to another attempt.
- Speakers may leak the reference into the microphone; explain headphones and distinguish acoustic bleed from digitally mixed audio. Do not claim echo cancellation guarantees isolation.
- Very short words, merged phonemes, contractions, punctuation and mismatched timing/voice provenance invalidate unsafe isolated clips.
- Dynamic mobile toolbars, virtual keyboard, long translations and zoom must not trap focus or hide recording Stop.
- Sound cues and recognition must never change completion criteria or persist recordings/transcripts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Provide discoverable solo take replay with no reference playback/highlight.
- **FR-002**: Preserve sequential comparison as default and add an explicit Both together option, one shared start, independent volumes, shared Stop and cancellation; report unavailable synchronization rather than claiming success.
- **FR-003**: Add explicit Record with reference; record microphone only, never mix reference digitally into the saved take; reference failure stops the new attempt and preserves a previous take.
- **FR-004**: Keep a single owner of capture/playback lifecycle, manual stop, 30-second maximum and navigation cleanup; auto silence stop stays for plain Speak, while Record with reference uses manual/limit initially to avoid speaker-induced false detection.
- **FR-005**: Audit existing word timing and playback boundary errors before treatment; expose isolated words only when complete and free of adjacent lexical speech in reviewed samples, otherwise labelled contextual/phrase fallback. Every isolated unit exposed to users requires individual listening approval, not only a passing benchmark sample.
- **FR-006**: Support curated contiguous contextual groups including linking examples, label learning units/voice clearly, and bind timings/assets to phrase/voice/checksum. Generated isolated words must not replace natural contextual linking examples.
- **FR-007**: Persist full-reference completed-listen counts and Heard status per account/phrase, aggregated across voices, with idempotent event saves, authenticated ownership, retry/unsaved states and concurrent-tab safety; preserve playlist Completed semantics.
- **FR-008**: Fit practice panels to the available viewport on desktop with phrase-list-only default scrolling; define accessible fallback on short/mobile/zoom layouts.
- **FR-009**: Provide persistent-in-page collapse/restore with keyboard operation, accessible state announcement and safe focus movement; no recording/selection reset, and account, Privacy and Playlists remain reachable in focused mode.
- **FR-010**: Offer opt-in, easily muted, visually redundant readiness/saved-take/completed-playlist cues; suppress during media/capture, deduplicate transitions and degrade silently on audio failure.
- **FR-011**: Deliver exclusively on-device recognition with capability verification and no-transcription fallback; supported opt-in transcription shows interim/final state, no pronunciation-score claim, retry/fallback and attempt-scoped cleanup.
- **FR-012**: Keep termination independent from speech recognition initially; retain silence/manual/limit fallback, and gate future transcript-assisted stop behind measured false-stop and latency results.
- **FR-013**: Keep recordings/transcripts local and never transmit them; persist only account-owned listening events/counts. Preserve authenticated private reference authorization, server-only credentials and distinct-user isolation for history and any new private learning-unit access.
- **FR-014**: Add deterministic automated regression checks for every delivered behavior and explicit real-device gates for microphone, concurrent playback, acoustic bleed, synchronization, interruption and recognition. CI must never call paid providers.
- **FR-015**: ASR cloud is excluded. Any paid generation or remote import requires separately approved budget, destination/retention and publishing authorization; fixture work, audit and local adaptation can proceed first.

### Key Entities

- **Practice attempt**: phrase, voice, capture mode, own start timing, local take and optional provisional transcript; never persisted.
- **Playback run**: unique attempt/run identity, sources/mode, completion/cancellation and reference full-listen eligibility.
- **Listening history**: account-owned phrase → nonnegative completed full-reference count; independently persisted from take/playlist completion. Each completion has a unique replay event identity for deduplication.
- **Learning unit**: annotated word or contiguous linking/contextual group, text range, voice, reference source/checksum and reviewed example status.
- **Practice preference**: page-owned focus/sound/compare mode; resets on page exit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All scripted solo replay scenarios start zero reference sound sources; prior takes survive all denied/cancelled/empty replacement scenarios.
- **SC-002**: Paired playback has ≤50 ms start-offset error (observed source offset minus expected recorded offset; zero for ordinary takes) in deterministic checks and on each approved real-device pair; unsupported devices receive actionable fallback. Real-device evidence is required before synchronized-mode release.
- **SC-003**: Every exposed isolated word is judged complete with zero adjacent lexical speech by two independent listeners; disagreements block that sample. Context groups retain the complete annotated group. This is a publication gate, not a claim about existing quality.
- **SC-004**: Scripted completed-listen counts exactly match the defined event matrix, including duplicates/cancellation, concurrent tabs and idempotent retries; confirmed counts survive refresh and A/B/anonymous access respects ownership.
- **SC-005**: At 1024×768 and 1440×900 default desktop layouts, the document has no practice-induced vertical scroll and the list scrolls; at 390×844, 844×390 and 200% zoom all controls and restore are keyboard reachable.
- **SC-006**: All automated cue-suppression scenarios emit zero cue starts during playback/capture; all cues have visual equivalents and muting.
- **SC-007**: All injected unsupported/denied/timeout recognizer scenarios preserve manual recording, zero unintended external upload and zero transcript-only stops. Live-recognition latency and noisy-device results are measured during authorized discovery, not promised before a supported recognizer exists.

## Assumptions

- These feedbacks refer to current authenticated audio practice; the phrase “reference video” is interpreted as reference media. Video import stays V2 and is excluded.
- This is a proposed scoped change to the older sequential-only/no-overlap contract, directly requested by the owner. Default sequential behavior and explicit microphone consent remain; per-account history explicitly supersedes completion-only persistence for listening metadata, never recordings/transcripts. Canonical docs will be updated alongside authorized implementation, not silently during planning.
- Owner chose account-persisted history and exclusively local transcription with fallback without text on 2026-10-08. “Already played” means a finished full reference listen summed across voices per phrase, chosen by PM; history is UI-observed, not attested physical listening.
- “100vh” expresses full available viewport height; accessible dynamic-viewport and zoom fallback take precedence over literal clipping.
- Sound preferences/focus are page-local; cross-session settings are outside scope. No new analytics service, persisted recordings/transcripts, pronunciation scoring, automated phonetic grading or default paid calls are introduced.
- Local-recognizer availability and paid isolated-word generation are discovery-gated. Local recognition never falls back to cloud; paid generation is not authorized by this plan.
