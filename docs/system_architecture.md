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

- **Auth**: confirmed email/password, recovery, Google PKCE (external configuration pending). Proxy verifies claims/refreshes cookies; protected reads/actions call `auth.getUser()` deduplicated per render/request only. No session is cached across accounts or requests. RLS/grants deny anonymous catalog reads and enforce completion ownership. Suspense may stream a generic loading shell before authorization, never protected content.
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
