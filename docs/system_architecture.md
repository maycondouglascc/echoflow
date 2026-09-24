This document records the proposed system architecture, user flow, and database direction. It is not evidence that these integrations or controls already exist. The current checkout has the Next.js scaffold; Supabase, authentication, user data, and provider integrations are still pending. Reconcile conflicts in the product flow and data model through an accepted Spec Kit feature specification before implementing them.

---

## System Architecture

The browser may use the Supabase anon client for operations explicitly covered by RLS. Next.js route handlers handle operations that require server authorization, validation, or private provider credentials. Calls to ElevenLabs and OpenAI stay server-side. A prompt or folder layout alone cannot enforce these boundaries; server-only modules, authorization checks, RLS, and tests must enforce them. [vladimirsiedykh](https://vladimirsiedykh.com/blog/saas-architecture-patterns-nextjs)
The full data flow works like this:

- **Auth (planned)**: Supabase Auth manages login/signup. RLS policies must restrict user data by owner and be verified through tests using separate user identities before this is treated as working.
- **Curated content**: Phrases and their pre-generated MP3s live in Supabase Storage; the client fetches the audio URL directly — no API call needed at playtime
- **Video import**: client uploads video → Supabase Storage → `/api/transcribe` calls Whisper → `/api/clips` slices the transcript → results stored as a JSONB array in `video_sessions`

---

## Core User Flow

Every screen in the app is just an entry point to the Practice Screen. The loop must feel like a rhythm, not a form. [dilsedesigner](https://www.dilsedesigner.com/p/crafting-an-mvp-the-key-to-user-acquisition)
**Key UX timing details:**

- Step 3 → 4 transition: 300ms gap after audio ends before mic opens (feels natural, not abrupt)
- Step 5: play user recording and reference audio **sequentially**, not simultaneously — easier to self-evaluate
- Step 6: auto-save on advance; no "save" button needed (reduces friction)

---

## Database Schema

Five tables cover the entire MVP, with a clear separation between static content (`scenarios`, `phrases`) and dynamic user data (`user_progress`, `video_sessions`). [supabase](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)
Key design decisions:

- **Phrase audio (planned)**: Store a stable Storage object path and audio/version metadata. Generate temporary signed URLs at read time for private objects; do not persist expiring URLs.
- `**video_sessions.clips**` is a JSONB column holding an array of `{start, end, transcript, clip_url}` objects — avoids needing a separate clips table for MVP [github](https://github.com/ivannissimrch/shadowing-app-spec)
- **RLS (planned)**: Policies must derive ownership from the authenticated identity. Zero cross-user access is an acceptance criterion to prove with integration tests, not an assumption.

---

## Planned Folder Structure (Next.js)

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
