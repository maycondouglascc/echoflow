# Data model: practice feedback

## Existing entities / compatibility

`phrases.id` is canonical database UUID; `phrases.slug` becomes fixture phrase.id currently. Expose a distinct `databaseId` for history, never infer UUID from slug. `audio_variants` keep highlight `word_timings`, original provenance and authenticated private bytes. `playlist_completions` remains separate and unchanged. History does not attest listening or authorize completion on the server.

## Durable history (new additive migration)

### phrase_listen_events

Fields: `user_id uuid` ownership FK auth.users (cascade consistent with account deletion), `event_id uuid` client random identity, `phrase_id uuid` FK phrases, `created_at timestamptz` server default. Composite primary key `(user_id,event_id)`; composite index `(user_id,created_at)` supports bounded per-user minute quota scans as history grows; no voice/audio/blob/transcript/duration/IP metadata. A duplicate event with another phrase is a conflict, not another increment. Append-only: callers cannot update/delete individual events or write counters directly. Server event validation imposes UUID shape and published phrase access; server can't verify physical listening.

### phrase_listen_counts

Fields: `user_id uuid`, `phrase_id uuid`, `count bigint CHECK(0<=count AND count<=9007199254740991)`, `updated_at timestamptz`; primary key `(user_id,phrase_id)`. Atomic upsert increments only for newly inserted event; return JSON-safe number. If saturated, reject limit_reached and rollback the entire transaction including event insert (test no orphan event). Counter must stay exactly aggregate of events; reconciliation query/test ensures this invariant. No backfill invented: all users start at zero when new feature begins. A phrase hidden/deleted is not exposed through history read; cascade event/count dependencies coherently when permitted by catalog deletion policy. Account deletion cascades both tables.

### Access / writes

RLS enabled both tables: anon denied; authenticated selects only `user_id=auth.uid()` and published owned scope. Direct authenticated INSERT/UPDATE/DELETE revoked (read SELECT stays RLS-scoped). A narrow `record_phrase_listen(p_event_id,p_phrase_id,p_expected_user_id)` RPC uses definer privilege only for this atomic operation, fixed empty search_path, fully qualified tables, explicit `auth.uid()` nonnull and expected_user match, published phrase check and no trusted client owner; execute revoked from public/anon, granted authenticated. SECURITY DEFINER requires focused reviewer audit; server action still uses the user's session client, never service role. Function transaction inserts event ON CONFLICT, compares existing phrase on duplicate, increments counter only if inserted, returns canonical count. Distinct-user SQL tests include direct table mutation, function misuse and visibility.

Action input counts/batch sizes never trusted; one event per request, max attempts policy in contract. A per-user bound of60 events/minute enforced transactionally before **new** event insertion (duplicates bypass quota for safe retry), using server-created event timestamps under a user-scoped transaction advisory lock. Existing queue limits are UX bounds, not server authorization. Validate phrase UUID/publication each time, return not_available without leaking other user data.

No persistent client retry store in v1: successful history survives visits; unsaved events exist only in this account-keyed page, max20. UI clearly labels unsaved and loss-on-exit. Offline/retry do not block recording; request origin and server action checks follow existing conventions. Retries reuse account/event/phrase identity. Late responses can only affect their account-page generation.

## Page-only entities

### PracticeAttempt

`attemptId`, `phraseId`, `databasePhraseId`, `capturedVoiceId`, captureMode repeat|with-reference, `startedAtMonotonicMs`, `referenceOffsetMs` (estimated scheduled reference onset after recorder.start monotonic timestamp, nonnegative; MediaRecorder startup latency limitation documented), optional take URL/blob/duration, provisional/final transcript. Recorded leading silence preserved. Never log/store/send blob or recognized text. Voice switch idle keeps take; alternate voice comparison labelled because take metadata records original voice.

### PlaybackRun

`runId`, immutable phrase/variant/take/account-page-generation identities; mode reference|solo|sequential|simultaneous|word|chunk|speak-along; active sources and phase; `countsFullReference` flag; reference start/end/cancel markers; completed-once flags. Comparison completion requires both reference and take natural finish; listening event requires reference natural full finish only. Cancellation/interruption invalidate incomplete sources but not an already emitted full-reference event. Full reference restarted after stop receives new run ID; stale callbacks never emit another event.

### LearningUnit (reviewed content; not necessarily new DB table)

`id`, phrase/variant/voice/source SHA-256; tokenStart/end inclusive; kind isolated-word|contextual-word|linking-chunk; display text; source existing-reference-range(startMs,endMs) or private asset; provenance; review status/independent listener judgments. Require contiguous token bounds, exact source voice/checksum and `0<=start<end<=duration`. Highlight wordTimings independent. Unknown/invalid unit → no isolated control; phrase/context fallback. If isolated private assets need distinct catalog entities, introduce `phrase_learning_units` in separately reviewed additive `202610080002_practice_learning_units.sql`, with published authenticated-read RLS, no client writes, private route session+publication checks. That migration is gated by diagnosis/pilot, not mandatory just to expose contextual ranges.

### Preferences / recognition

Focus, cue enabled/muted and compare mode page-local. Local adapter states unsupported|needs-model|ready|listening|error|stopped; no text when unavailable. Model download/install needs action/disclosure. On stop/navigation/attempt replacement recognition stops idempotently and callbacks ignored. Recognition doesn't own microphone teardown and never stops recording from text match.
