# Practice and history contracts

## Media ownership

A single `useShadowingPractice` owner publishes view/actions; `capture-session` alone owns stream/recorder/VAD/30s/timers; `practice-transport` owns reference/take source scheduling and context/gains. No UI component initializes audio/recognition resources.

- `playRecording()` → solo page take; requires valid take, no pending capture; stop existing playback safely, preserves readiness; no reference loading/start, no highlight.
- `startCapture(mode: repeat | with-reference)` → request permission explicitly, immutable attempt token. repeat existing Listen→ready→Speak; with-reference allowed idle/ready and during reference, cancels old reference then prepares/restarts the full phrase with a new coordinated run. Capture starts before scheduled reference from zero. Timestamp immediately after recorder.start on performance monotonic clock; map scheduled AudioContext time to that monotonic timeline and retain the estimated offset. MediaRecorder startup latency/sample onset is not directly attested by this timestamp: decode preserves leading samples, known-offset fixture and device output tests gate actual rhythm; expose/fallback if tolerance unproven. If permission delayed/denied no lost prior take. Mixing digital reference into recorder forbidden. with-reference disables VAD until later measured endpointing design; manual/30s remain.
- `compare(mode: sequential | simultaneous)` → take required. Sequential old order preserved. Simultaneous prepares/decode both before scheduling; common time plus take referenceOffset determines alignment. Repeat-take offset0; speak-along mic starts at t0, reference at t0+recorded offset so leading mic silence/rhythm retained. Independent volumes normalized/clamped [0,1] with per-source gains default0.5; limit summed gain≤1. No cross-route URL inference.
- `stop()` → pauses/stops all sources, capture and recognition associated with active attempt, cleanup idempotent; completion only natural ends, never Stop.
- Voice selection while active is disabled; idle change preserves take and exposes captured voice if mismatched. Phrase change cancels active run/capture, retains existing successful takes until page teardown.
- Legacy ordinary audio/word source retains existing ref handles until owner replacement proves all highlight/replay/e2e behavior. Only one source pathway active at a time; new transport must not leave hidden audioRef playback running.

`view` exports flags independently for capture request/record/save and playback kinds; cannot represent with-reference only as existing mutually-exclusive playing/recording union. `onFullReferenceComplete(run)` emits **one** event only after full duration natural finish for allowed mode. `onComparisonComplete(run)` emits only after both tracks naturally completed; dedup independently. Error/cancel tokens invalidate future events, but a previously completed reference counts even if take still playing then cancelled. Highlight reference only; personal solo audio never highlights.

## Persistent history interface

Server action proposed `recordPracticeListen({eventId,phraseId,expectedUserId})`, in `src/app/(app)/practice-history-actions.ts`; session is server-verified, UUID inputs strict, expectedUserId used solely to reject cross-account stale requests. One event request, no count/text/blob accepted. Action uses user-bound RPC, returns:

- success `{ok:true,eventId,phraseId,count,duplicate:boolean}` canonical aggregate after atomic commit as a safe JSON number (max9007199254740991); saturation returns permanent limit_reached without inserting event or incrementing counter.
- `{ok:false,reason:"unauthenticated"|"not_available"|"identity_changed"|"conflict"|"rate_limited"|"temporarily_unavailable"|"limit_reached",retryable:boolean}`; no private details/provider text logged. rate_limited may retry same ID after bounded cooldown, other permanent rejects stop queue.

Read initial history with `getScenario` user client, published phrase UUID mapping and owned counts only; never service-role read. Client hook sends full reference completion with crypto-random eventId and immutable account context; history reads/writes never include mic/recognized text. Duplicate same account,event+same phrase returns success no count increase; different phrase conflict.

`usePracticeHistory` proposal owns confirmed counts and pending event IDs separate from media state; initial values scoped to account. Confirmed count updates use max(current,response.count) to avoid out-of-order regression; reload canonical counts. Show only canonical confirmed count plus a SEPARATE Unsaved-event badge, never add pending into canonical count; tests include two commits before out-of-order replies and duplicate responses. Network failures use exponential bounded retry1s/2s/4s max3, then manual Retry; max20 queued unsaved page events and clear backlog warning thereafter, continued practice allowed. No navigation flush under a changed account. Offline no silent loss promise; leaving can discard unconfirmed IDs, confirmed persists.

RPC writes rate limit≤60 new events/minute/user, duplicates safe without quota. Server cannot establish audio truly played; described as reported practice history. RLS/direct mutation/definer permissions included security review. Cookie/Origin protections consistent existing server-action handling; no unprotected route.

## Reviewed learning units

`replayUnit(unitId)` validates selected phrase+voice/checksum, type/token bounds and approved status; contextual range uses buffer source offsets and precise duration scheduling. Isolated source private endpoint only if reviewed independent asset available. `wordTimings` remains highlighting, not mutated to improve crop; unsupported word uses labelled context/group/whole phrase. Linking is original natural connected speech; generated words never masquerade as linking. Capture/request/save blocks replay. Source cancellation follows same run owner and emits no full-listen event.

## Layout and component contracts

Proposed `PracticeShell({sidebar,toolbar,children,collapsed,onCollapsedChange})` owns viewport/focus only; `PhrasePracticeList({phrases,selectedId,counts,pending,onSelect})` consumes props and never saves history. `PracticeControls({state,actions})` no media ownership; root integration A maps callbacks. C owns these extracted components/CSS after initial extraction. Root owns account node placement while sidebar hidden; alternate account/Privacy/Playlists path remains visible.

Default desktop ≥1024×768 panel available height equals100dvh minus48px current shell outer margins. Use CSS custom shell spacing if existing margins change. Phrase list overflow only; panels/root min-height0. Narrow layouts use phrase drawer; landscape/short/zoom can choose ordinary scrolling fallback to preserve all controls. Sidebar focus moved to main restore button on collapse; restoration returns to previous list target when still present. aria-expanded/controls and stable label, no focus inside hidden subtree. Scoped CSS avoids landing/catalog/modal changes.

## Sound events

`emitPracticeCue({eventId,kind:ready|take-saved|playlist-completed}, {enabled,busy})`; disabled default. Drop while any capture request/record/save or learning-media source active; no queue. Emit ready only after normal Listen readiness300ms before Speak begins, saved only after all mic tracks stopped and take accepted, completion after persisted playlist confirmation once. Cue timing after user gesture, short≤250ms, neutral non-speech waveform at low normalized amplitude; licensed/local asset or Web Audio generated tones, no paid generator. Visible equivalents MUST show readiness, saved take and completed playlist with concise text/indicator when cues are enabled; preserve the existing assistive status, which is sr-only and is not itself a visual equivalent. Mute reachable focused mode. Playback reject ignored.

## On-device transcript adapter

`probeLocalRecognition()` performs only capability/local-model checks; `startLocalRecognition({attemptId,lang:"en",onInterim,onFinal,onUnavailable,onError})` starts only after explicit opt-in and confirmed device processing. browser generic SpeechRecognition without proven local mode forbidden. No app cloud endpoint. `stop()` idempotent, stale events ignored, final supersedes interim text, no expected-text substitution. Provider unavailable/offline/no model → recording remains available without text. Installation/downloading model metadata/assets requires disclosed user action and its own network scope, never microphone payload. Locale English shown as selected recognition language; not pronunciation grade. Compare/with-reference recognizer disabled initially until device tests show contamination/coexistence safe; display clear unavailable reason rather than recognizing reference as user speech. Stop remains VAD/manual/limit, not transcript-only.

All transcript text marked private to `feedback-capture` and absent from recent feedback event details, screenshots, metrics and server requests. Existing privacy text changes only for local optional processing/model installation. Voice blobs remain local.
