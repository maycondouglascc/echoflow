# CLAUDE.md — EchoFlow Development Rules

Read this file at the start of every session. These rules are non-negotiable.

---

## Product Summary

**EchoFlow** is a Next.js 14+ (App Router) web app for English speaking practice via the shadowing technique. Users listen to a native audio clip and record themselves repeating it. The app compares the two recordings and tracks progress.

Full plan: `docs/IMPLEMENTATION_PLAN.md`
Architecture: `docs/system_architecture.md`
Product spec: `docs/EchoFlow.md`

---

## Absolute Rules (Never Break)

### 1. API Keys Stay Server-Side
- `ELEVENLABS_API_KEY` and `OPENAI_API_KEY` are **only** used inside:
  - `app/api/*/route.ts`
  - `lib/elevenlabs.ts`
  - `lib/whisper.ts`
- `NEXT_PUBLIC_*` variables are only for: Supabase anon key and URL.
- **Never** import `lib/elevenlabs.ts` or `lib/whisper.ts` from a client component.
- **Never** call ElevenLabs or OpenAI from the browser.

### 2. Supabase Client — Right Client, Right Context
```
lib/supabase/client.ts   → createBrowserClient()  → "use client" components only
lib/supabase/server.ts   → createServerClient()   → Server Components and API routes
```
Never mix them. Never call `createBrowserClient()` in a Server Component.

### 3. RLS is the Security Layer
- `user_progress` and `video_sessions` have Row-Level Security enabled.
- RLS policies use `auth.uid()` — users can only access their own data.
- API routes must call `auth.getUser()` before any write operation.
- Never use the Supabase service role key in client components.

### 4. Default to Server Components
- Add `"use client"` **only** when the component uses:
  - Browser APIs (`MediaRecorder`, `AudioContext`, `navigator`, `window`)
  - React hooks (`useState`, `useEffect`, `useRef`, `useCallback`)
  - Event handlers passed as props
- Data fetching always happens in Server Components (async `page.tsx`).

### 5. No Premature Abstraction
- Only create a helper/utility when the exact same pattern repeats 3+ times.
- No wrapper functions around a single line.
- No global state store for MVP — `useState` and `useReducer` are enough.

---

## Tech Stack (Locked — No Changes Without Discussion)

| Concern | Tool |
|---|---|
| Framework | Next.js 14+ App Router |
| Language | TypeScript strict |
| Styling | Tailwind CSS v3 |
| UI Components | shadcn/ui |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth |
| File Storage | Supabase Storage |
| TTS | ElevenLabs |
| Transcription | OpenAI Whisper (V2 only) |
| Deployment | Vercel |

---

## Folder Structure

```
/app
  /api
    /tts                   ← POST: text → ElevenLabs → store MP3
    /upload-recording      ← POST: .webm → Supabase Storage
    /progress              ← POST: save user_progress row
    /transcribe            ← POST: video → Whisper (V2)
    /clips                 ← POST: timestamps → slice clips (V2)
  /(auth)
    /login
    /signup
  /(app)
    /home                  ← scenario list + progress
    /scenarios/[id]        ← phrase list for a scenario
    /practice/[phraseId]   ← core practice screen
    /import                ← video upload (V2)
/lib
  /supabase
    client.ts              ← browser client
    server.ts              ← server client
  elevenlabs.ts            ← TTS helper (server-only)
  whisper.ts               ← transcription helper (server-only, V2)
/components
  AudioPlayer.tsx
  Recorder.tsx
  WaveformVisualizer.tsx
  PhraseCard.tsx
/types
  database.ts              ← TypeScript types from DB schema
/scripts
  seed.ts                  ← seed scenarios + phrases
  generate-audio.ts        ← call ElevenLabs, upload to Storage
/supabase
  /migrations
    001_initial_schema.sql
```

---

## Naming Conventions

| Thing | Convention |
|---|---|
| Component files | `PascalCase.tsx` |
| Utility/lib files | `camelCase.ts` |
| Constants | `SCREAMING_SNAKE_CASE` |
| DB columns | `snake_case` |
| CSS | Tailwind utilities only |

---

## API Route Conventions

- Validate request body before using it.
- Always check auth before writing:
  ```ts
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  ```
- Return a `{ data, error }` envelope:
  ```ts
  return NextResponse.json({ data: result })
  return NextResponse.json({ error: 'message' }, { status: 400 })
  ```

---

## Audio Handling Rules

- Reference audio: served directly from Supabase Storage public URL (bucket: `phrase-audio`).
- User recordings: uploaded to `user-recordings` bucket (private), accessed via signed URL.
- Slow speed = `audioElement.playbackRate = 0.7` — no server processing needed.
- Max recording length: `MAX_RECORDING_SECONDS = 30`.
- Recording format: `audio/webm;codecs=opus`.
- After audio ends: **300ms delay** before mic button appears (UX timing rule).
- Comparison playback: play reference first, then user recording (sequential, not simultaneous).

---

## Practice Screen State Machine

The practice screen follows this exact state sequence:
```
idle → playing → waiting (300ms) → recording → reviewing → saved → (next phrase)
```
Never skip states. The state drives all UI changes on the practice screen.

---

## What NOT to Do

- Do not generate or hardcode API keys anywhere in source files.
- Do not add error handling for scenarios that cannot happen.
- Do not add comments to code that is self-evident.
- Do not create files unless they are explicitly required.
- Do not push to remote or commit unless the user explicitly asks.
- Do not run `npx` commands that modify package.json without asking first.
- Do not use `any` in TypeScript.
- Do not use `console.log` (use `console.error` for unexpected failures only).

---

## Current Phase

> **Update this line at the start of each session.**
> Phase 0 — Foundation (not started)

---

## Environment Variables

See `.env.example` for the full list. Never commit `.env.local`.

## How to use this going forward

At the start of each session, tell Claude: "We're working on Phase X — Step Y: [task]". Claude will read CLAUDE.md, find the right place in the build order, and implement consistently.
Update the Current Phase line in CLAUDE.md as you move through phases.