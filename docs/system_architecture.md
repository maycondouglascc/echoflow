Remote preview provisioned with explicit authorization on 2026-10-01: Supabase project
`hllsxshahgvdqhzxdmef`, three migrations, private reference Storage and initial catalog.
Frontend preview on 127.0.0.1:4177 is not a published deployment; local tests remain on 4175.
Google OAuth, public SMTP and release-readiness gates remain pending. Evidence and secure
profile commands: `specs/005-public-platform-redesign/quickstart.md` (T040).

Current feature 005 architecture: public landing, authenticated catalog/practice, Supabase Auth,
Postgres and private Storage. Local evidence is in `specs/005-public-platform-redesign/quickstart.md`;
it does not prove remote deployment or real-device behavior.

---

## System Architecture

The browser may use the Supabase anon client for operations explicitly covered by RLS. Next.js route handlers handle operations that require server authorization, validation, or private provider credentials. Calls to ElevenLabs and OpenAI stay server-side. A prompt or folder layout alone cannot enforce these boundaries; server-only modules, authorization checks, RLS, and tests must enforce them. [vladimirsiedykh](https://vladimirsiedykh.com/blog/saas-architecture-patterns-nextjs)
The full data flow works like this:

- **Auth**: confirmed email/password, default one-time signup/recovery email links with server-verified session handoff, Google PKCE (external configuration pending). Proxy verifies claims/refreshes cookies; protected reads/actions call `auth.getUser()` deduplicated per render/request only. No session is cached across accounts or requests. RLS/grants deny anonymous catalog reads and enforce completion ownership. Suspense may stream a generic loading shell before authorization, never protected content.
- **Curated content**: one playlist, five phrases, ten active Puck/Harper references, three archived baselines. Private `phrase-audio`; each `/api/reference-audio/[variantId]` checks session/publication through the user's RLS client, returns bytes with Range and `private, no-store`, never a public/signed URL. Original files outside `public/` retain SHA-256.
- **Video import (V2, not implemented)**: requires a separate accepted feature and privacy controls.

---

## Core User Flow

Every screen in the app is just an entry point to the Practice Screen. The loop must feel like a rhythm, not a form. [dilsedesigner](https://www.dilsedesigner.com/p/crafting-an-mvp-the-key-to-user-acquisition)
**Key UX timing details:**

- First authenticated entry per account/tab opens a mascot-led modal using the auth dialog structure. Browser permission is requested only by Enable microphone, releases tracks immediately and starts no recording. Escape/close/Not now dismiss; rejection is retryable. Signup confirmation precedes this entry. The public server-rendered `/privacy` explains current data/microphone handling without requesting permission; legal approval remains a launch gate.
- Step 3 → 4: 300ms readiness gap; recording starts only on explicit Speak. A local energy detector stops after 1500ms silence following at least 200ms voice signal; initial silence does not stop recording. Manual stop/30s limit remain, Web Audio failures fall back to manual control. Device/noise validation is still required.
- Reference bytes are deduplicated and preloaded for the current/next phrase in the current voice, up to four page-owned object URLs, aborted/revoked on exit. No persistent/public HTTP cache; received buffers cannot be revoked retroactively. Voice changes preserve take/readiness/comparison; no new upload or database field.
- Step 5: play user recording and reference audio **sequentially**, not simultaneously — easier to self-evaluate
- No recording or partial progress is saved. After recording/comparing all five phrases in one page session, an idempotent action saves only the current user's playlist completion. The server enforces identity/publication/ownership, not physical practice attestation.

---

## Database Schema

Current tables: `playlists`, `phrases`, `audio_variants`, `playlist_completions`, UTC daily aggregate
`platform_metrics`. Migrations/seed are authoritative; generated types are in
`src/lib/supabase/database.types.ts`. No profiles, recordings, per-phrase progress or video sessions.
Key design decisions:

- **Audio**: private object paths, checksums, provenance and word timings; clients receive only Next endpoint paths.
- **RLS**: published catalog authenticated-only; append-only completion owned by `auth.uid()`; no authenticated Storage writes. pgTAP exercises anon and A/B, not only service role.
- **Analytics**: counts of first email confirmation, practice render events and new completion rows; no user ID/email/audio in counters. Access events are not unique people and may include prefetch renders. Abuse limits and spend/alert budgets remain release gates.

---

## Practice implementation ownership

`useShadowingPractice` owns practice transitions and page recording URLs. One synchronous
state update keeps event-handler refs and the rendered state together. `capture-session.ts`
owns the recorder, stream, progress/limit timers and speech watcher; all exits release those
resources through one idempotent cleanup. Navigation/unmount discard late recorder output.
Word replay requires an end time in the phase type; ordinary reference playback resolves
through the page-owned buffer explicitly rather than inferring its kind from a URL prefix.

The catalog decodes JSON model/audio/provenance/timing metadata before exposing typed values
to practice. Shared fonts/tokens/base rules stay in `globals.css`; landing, auth/dialog,
catalog/practice and privacy styles have separate sheets imported in fixed order by the root
layout. They preserve existing selectors, responsive rules and reduced-motion behavior.

## Future Folder Structure (V2 sketch, not current routes)

```
/src/app
  /api
    /tts          → POST: text → ElevenLabs → store MP3 in Supabase
    /transcribe   → POST: video → Whisper → return sentence timestamps
    /clips        → POST: timestamps → slice video → store clips
  /(auth)
    /login
    /signup
  /(app)
    /home         → scenario list + progress
    /practice/[phraseId]   → core practice screen
    /scenarios/[id]        → phrase list for a scenario
    /import       → video upload UI
/src/lib
  /supabase       → client + server Supabase instances
  /elevenlabs     → TTS helper function
  /whisper        → transcription helper
/src/components
  AudioPlayer.tsx
  Recorder.tsx
  WaveformVisualizer.tsx
  PhraseCard.tsx
```

This structure follows the Next.js App Router convention. Mark privileged modules as server-only and keep credentials out of client components. The folder structure and agent instructions are guidance; server-side authorization, RLS, dependency boundaries, and automated tests are the enforcement.

## Contextual feedback (006)

Feature 007 extends administrative review with a restricted Notion copy. Supabase remains
the immutable origin. An additive trigger/backfill enqueues one feedback_notion_exports row
per feedback; authenticated/anon callers cannot access its table or worker RPCs. A bounded Supabase Edge Function uses server secrets, claims with SKIP LOCKED and
10-minute fenced leases, queries Notion by Feedback ID, uploads PNG bytes directly and creates
one complete page. It never updates existing pages or Hermes triage fields. Request timeouts
and durable backoff protect availability; a creation marker blocks another POST after an
uncertain write. Operators reconcile unmatched/duplicate records. Next.js never uses the
worker credentials, so the application service-role prohibition remains intact.
Remote queue and dispatch migrations, Edge secrets, Vault target and invocation secret are
configured in the authorized project. Inserting an outbox job dispatches the Edge Function
through pg_net; pg_cron checks due work every minute. The function rejects unauthorized
calls before accessing credentials or claiming work. Dispatch failures cannot reject the
original feedback; leases and retry backoff allow recovery. The original Node worker remains
an optional alternative, not required for production. Eight historical feedbacks were verified
in Notion, including one screenshot. Independent Hermes permissions remain unverified. Deleting an original feedback cascades its
queue entry, not its Notion copy; account deletion requests must cover both services/files.
See specs/007-notion-feedback/quickstart.md for configuration and evidence.

Authenticated layout mounts an account-keyed FeedbackWidget. Its in-memory five-minute/20-event buffer records only allowlisted app paths and explicit practice action names. No replay, typed values, URL parameters, network logs, or personal audio/video. Opening creates a sanitized computed-geometry viewport staging tree and lazily imports html-to-image; controls, account identity, private nodes and media are omitted. The user reviews/removes attachments before explicit submit.

POST /api/feedback requires caller authentication and matching Origin, bounds multipart/PNG dimensions and metadata, uses the user's RLS client, and persists immutable owned app_feedback plus optional private feedback-screenshots/user-id/request-id.png. Request digest/UUID handles identical retries; failed inserts clean newly uploaded objects. No privileged key, public URL or screenshot client update permission. Existing administrative Supabase tooling is the team inbox. See specs/006-contextual-feedback/quickstart.md for separate-account checks and screenshot limitations.
