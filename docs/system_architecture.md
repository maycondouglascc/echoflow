Here's the full system design, broken into three views: architecture, user flow, and database.

---

## System Architecture

The app follows a clean 4-layer model: the **browser** (Next.js client) talks exclusively to **Next.js API Routes** deployed on Vercel, which in turn calls either **Supabase** (data + storage) or **external APIs** (ElevenLabs, Whisper). The browser never calls ElevenLabs or Whisper directly — all sensitive API keys stay server-side. [vladimirsiedykh](https://vladimirsiedykh.com/blog/saas-architecture-patterns-nextjs)
The full data flow works like this:

- **Auth**: Supabase Auth manages login/signup; Row-Level Security (RLS) policies on the DB ensure users only access their own data [vladimirsiedykh](https://vladimirsiedykh.com/blog/saas-architecture-patterns-nextjs)
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

- `**phrases.audio_url`** stores the Supabase Storage path to the pre-generated ElevenLabs MP3 — generated once, served forever [elevenlabs](https://elevenlabs.io/text-to-speech-api)
- `**video_sessions.clips**` is a JSONB column holding an array of `{start, end, transcript, clip_url}` objects — avoids needing a separate clips table for MVP [github](https://github.com/ivannissimrch/shadowing-app-spec)
- **RLS policies** on `user_progress` and `video_sessions` use `auth.uid()` to ensure zero cross-user data leakage [catjam](https://catjam.fi/articles/next-supabase-what-do-differently)

---

## Folder Structure (Next.js)

```
/app
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
/lib
  /supabase       → client + server Supabase instances
  /elevenlabs     → TTS helper function
  /whisper        → transcription helper
/components
  AudioPlayer.tsx
  Recorder.tsx
  WaveformVisualizer.tsx
  PhraseCard.tsx
```

This structure follows the Next.js App Router convention and keeps server-only code (API keys, Supabase admin) strictly inside `/app/api` and `/lib/server` — Cursor + Claude Code will automatically respect this boundary if you tell it to in your context prompt. [dev](https://dev.to/pipipi-dev/nextjs-supabase-project-structure-for-indie-development-36od)