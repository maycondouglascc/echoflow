---
title: "EchoFlow — Implementation Plan"
description: "Full AI-led development plan for EchoFlow. This is the source of truth for all development decisions."
date: "2026-09-24"
status: "Active"
---

# EchoFlow — Implementation Plan

This document records the planned stack and product implementation phases. AGENTS.md defines current cross-agent instructions; accepted feature specifications and product decisions take precedence over unreviewed plan details. Check the phase status before starting work.

---

## Table of Contents

1. [AI Development Setup](#1-ai-development-setup)
2. [Tech Stack](#2-tech-stack)
3. [Project Setup](#3-project-setup)
4. [Environment Variables](#4-environment-variables)
5. [Development Phases](#5-development-phases)
6. [Build Order — File-by-File Sequence](#6-build-order--file-by-file-sequence)
7. [Project Conventions](#7-project-conventions)
8. [Database Schema & Migrations](#8-database-schema--migrations)
9. [Content Seeding](#9-content-seeding)
10. [Testing Strategy](#10-testing-strategy)
11. [Deployment Checklist](#11-deployment-checklist)

---

## 1. AI Development Setup

AGENTS.md is the shared project instruction file for coding agents. CLAUDE.md points Claude Code to the same rules. Product requirements live in docs/EchoFlow.md; planned architecture lives in docs/system_architecture.md; feature-specific requirements live in specs/.

GitHub Spec Kit 0.16.5 is initialized for Codex in .agents/skills. Codex invokes the installed workflow skills with the $speckit-* names; Claude Code uses /speckit-*. Use the full workflow for user-visible behavior and adjust it to the risk and size of each change. Small maintenance work does not need a full feature specification.

The normal feature cycle is: specify the user outcome, clarify meaningful ambiguity, plan the implementation, generate tasks, analyze the artifacts, implement in small slices, and converge against the accepted requirements. Specs record intent; tests, review, and device checks provide evidence.

Use short codex/ branches. Create a separate Git worktree for each concurrent writer, and isolate runtime data and credentials separately. Keep commits coherent and reviewable. Do not push, merge, or deploy without explicit instruction.


## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 16.3.6 (App Router) | Server components, API routes, streaming — all in one |
| UI runtime | React 19.2.8 | Pinned with the framework in package.json and package-lock.json |
| Language | TypeScript 5.9.3 (strict) | Required for all files |
| Lint and formatting | Biome 2.5.14 | Next.js and React domain rules; checked in CI |
| Styling | Tailwind CSS 3.4.19 | Existing product decision; exact version pinned |
| UI Components | shadcn/ui | Accessible, unstyled-first, owns the code |
| Database | Supabase (Postgres) | Auth + DB + Storage in one service |
| Auth | Supabase Auth | Sessions, RLS, social login ready |
| Storage | Supabase Storage | Audio files (.mp3, .webm) |
| TTS | ElevenLabs API | Natural native-sounding voice |
| Transcription | OpenAI Whisper (V2 only) | Best open-source transcription with timestamps |
| Deployment | Vercel | Native Next.js support, edge functions |
| Runtime | Node.js 24.19.0 and npm 11 | Node pin in .nvmrc; package engines checked locally and in CI |

**No Redux, no Zustand.** State is local (useState/useReducer) or server-side (Supabase). Add a global store only if a clear need emerges in V2+.

---

## 3. Project Setup

The Next.js foundation is already scaffolded in the repository. Use the pinned runtime and lockfile for local development:

    nvm use
    npm ci
    npm run dev

Required automated checks:

    npm run lint
    npm run typecheck
    npm run build

GitHub Actions runs these checks for pull requests and pushes to master. The CI workflow is the baseline integration check; configure GitHub branch protection to require its quality status before merging.

Do not rerun create-next-app over this repository. Add UI components when a feature needs them, following the accepted Tailwind CSS 3 and shadcn/ui decisions.



## 4. Environment Variables

.env.example lists the server and Supabase variable names planned for later features. Copy it to .env.local only when the feature requires those values. Local environment files are ignored by Git.

Keep Supabase service-role, ElevenLabs, and OpenAI credentials server-side. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY may be used by the browser, with RLS and server authorization providing the data boundary. Never put private keys in NEXT_PUBLIC variables, source, logs, or client imports. Only grant a task the credentials it needs; ordinary CI uses synthetic data and no paid provider secrets.

Do not create or depend on production credentials to complete local scaffolding. Configure real provider environments separately when a feature is ready for integration.



## 5. Development Phases

### Phase 0 — Foundation (Do First)
**Goal:** A reproducible Next.js base and a protected path to integrate verified features.

- [x] Bootstrap the Next.js 16 App Router project with strict TypeScript and the agreed Tailwind version
- [x] Pin the Node runtime and dependency lockfile
- [x] Add shared agent instructions and initialize Spec Kit for Codex
- [x] Add CI checks for lint, TypeScript, and production build
- [x] Add an environment example and ignore local secrets
- [ ] Create the Supabase project and configure development credentials
- [ ] Add server and browser Supabase helpers with the correct authorization boundaries
- [ ] Add versioned database migrations, RLS policies, and Storage policies; verify two-user isolation
- [ ] Build signup, login, logout, and protected routes
- [ ] Deploy a preview and verify authentication end to end

**Current state:** The local application foundation and automated CI workflow are in place. The user-facing authentication and data deliverable is still pending. Do not mark Phase 0 complete until its remaining integration and acceptance checks pass.



### Phase 1 — Scenario & Phrase Browsing
**Goal:** User can browse scenarios and see phrase lists.

- [ ] Seed database: 4 scenarios + 40 phrases (Section 9)
- [ ] Generate 40 ElevenLabs MP3s via seed script, upload to `phrase-audio` bucket
- [ ] Build `/home` — scenario list with card grid
- [ ] Build `/scenarios/[id]` — phrase list for a scenario, with completion indicators
- [ ] Build `PhraseCard` component
- [ ] Fetch phrases server-side (React Server Component)

**Deliverable:** User can browse all 40 phrases. Audio files are in Supabase Storage.

---

### Phase 2 — Core Practice Screen (MVP Critical)
**Goal:** Full 6-step shadowing loop works end-to-end.

- [ ] Build `/practice/[phraseId]` page (client component for media interactions)
- [ ] Build `AudioPlayer` component
  - Normal / slow speed toggle (slow = 0.7x playback rate)
  - Waveform visualization (wavesurfer.js)
  - Auto-advance state machine: idle → playing → ready-to-record
  - 300ms gap after audio ends before mic button appears
- [ ] Build `Recorder` component
  - Uses `MediaRecorder` API (browser)
  - Records as `audio/webm`
  - Uploads recording to `user-recordings` Supabase Storage bucket via `/api/upload-recording`
  - Returns playback URL for in-session use
- [ ] Build `WaveformVisualizer` component (live mic input waveform during recording)
- [ ] Build comparison playback UI — sequential: reference → user recording
- [ ] Auto-save progress: POST to `/api/progress` on advance
- [ ] Navigation: previous / next phrase within scenario

**Deliverable:** A user can complete the full 6-step loop for any phrase.

---

### Phase 3 — Progress Tracking
**Goal:** User sees their progress over time.

- [ ] Build progress dashboard on `/home` — overall completion percentage
- [ ] Show completion state on phrase cards (checkmark / not started)
- [ ] Show per-scenario progress bar on `/scenarios/[id]`
- [ ] Build `/practice/[phraseId]` "already completed" state — show previous recording alongside reference for re-listening

**Deliverable:** User sees meaningful progress indicators everywhere.

---

### Phase 4 — Polish & MVP Launch
**Goal:** Production-ready, smooth, and deployed.

- [ ] Error boundaries on practice screen (mic permission denied, upload failure)
- [ ] Loading skeletons on scenario and phrase pages
- [ ] Mobile-first responsive layout review (practice screen must work on phone)
- [ ] Keyboard shortcuts on practice screen: `Space` = play/record, `→` = next, `←` = prev
- [ ] Toast notifications for save confirmation and errors
- [ ] Favicon, page titles (`<title>` and og:image)
- [ ] Supabase Storage CORS config (allow your Vercel domain)
- [ ] Final Vercel production deploy
- [ ] Smoke test: full loop from signup → practice → progress visible

**Deliverable:** Shipped MVP at production URL.

---

### Phase 5 — V2: Video Import (Post-MVP)
**Goal:** Users can import any video and shadow it.

- [ ] Build `/import` — video upload UI
- [ ] Build `/api/transcribe` — proxy to OpenAI Whisper, return sentence timestamps
- [ ] Build `/api/clips` — slice video into per-sentence clips, store in Supabase
- [ ] Build video session practice screen (reuse `AudioPlayer` + `Recorder`)
- [ ] Store sessions in `video_sessions` table with JSONB `clips` array

---

## 6. Build Order — File-by-File Sequence

Follow this order to avoid dependency issues (each file only imports things already built).

### Phase 0 — Foundation
```
1.  CLAUDE.md                                    ← project rules
2.  .env.local / .env.example
3.  lib/supabase/client.ts                       ← browser Supabase client
4.  lib/supabase/server.ts                       ← server Supabase client (cookies)
5.  lib/supabase/middleware.ts                   ← session refresh helper
6.  middleware.ts                                ← route protection
7.  supabase/migrations/001_initial_schema.sql   ← all 5 tables + RLS
8.  app/(auth)/login/page.tsx
9.  app/(auth)/signup/page.tsx
10. app/(auth)/layout.tsx
11. app/(app)/layout.tsx                         ← authenticated layout shell
12. app/(app)/home/page.tsx                      ← stub (just "Welcome")
```

### Phase 1 — Browsing
```
13. types/database.ts                            ← TypeScript types from Supabase schema
14. scripts/seed.ts                              ← seed 4 scenarios + 40 phrases
15. scripts/generate-audio.ts                   ← call ElevenLabs, upload to Storage
16. lib/elevenlabs.ts                            ← TTS helper (server-only)
17. components/PhraseCard.tsx
18. app/(app)/home/page.tsx                      ← real implementation
19. app/(app)/scenarios/[id]/page.tsx
```

### Phase 2 — Practice Screen
```
20. app/api/upload-recording/route.ts            ← upload .webm to Supabase Storage
21. app/api/progress/route.ts                    ← save user_progress row
22. components/AudioPlayer.tsx
23. components/WaveformVisualizer.tsx
24. components/Recorder.tsx
25. app/(app)/practice/[phraseId]/page.tsx
```

### Phase 3 — Progress
```
26. app/(app)/home/page.tsx                      ← add progress stats
27. app/(app)/scenarios/[id]/page.tsx            ← add progress bar
28. app/(app)/practice/[phraseId]/page.tsx       ← add "already completed" state
```

### Phase 4 — Polish
```
29. components/ErrorBoundary.tsx
30. components/LoadingSkeleton.tsx
31. app/layout.tsx                               ← og:image, favicon, global title
32. All pages: responsive layout pass
```

---

## 7. Project Conventions

### TypeScript
- `strict: true` in `tsconfig.json` — no exceptions.
- All components use explicit prop interfaces (no `any`).
- Supabase query results must be typed against `types/database.ts`.

### Naming
- Files: `PascalCase` for components, `camelCase` for utilities and lib files.
- Variables/functions: `camelCase`.
- Constants: `SCREAMING_SNAKE_CASE` for true constants (`MAX_RECORDING_SECONDS`).
- Database columns: `snake_case` (Postgres convention).
- CSS classes: Tailwind utilities only — no custom CSS unless unavoidable.

### Server vs Client Components
- **Default: Server Component.** Only add `"use client"` when the component uses:
  - Browser APIs (`MediaRecorder`, `AudioContext`, `navigator`)
  - React hooks (`useState`, `useEffect`, `useRef`)
  - Event handlers
- Data fetching happens in Server Components (async `page.tsx`).
- Never fetch from the client when a Server Component can do it.

### Supabase Client Rules
```
lib/supabase/client.ts   → createBrowserClient()  → import in "use client" components
lib/supabase/server.ts   → createServerClient()   → import in Server Components + API routes
```
Never mix them. Never call `createBrowserClient` in a Server Component.

### API Routes
- All API routes live in `app/api/*/route.ts`.
- Always validate the request body before using it.
- Always check `auth.getUser()` before writing user data.
- Return JSON with `{ data, error }` envelope:
  ```ts
  return NextResponse.json({ data: result })
  return NextResponse.json({ error: 'message' }, { status: 400 })
  ```

### Audio Handling
- Reference audio: served directly from Supabase Storage public URL — no proxying needed.
- User recordings: uploaded to Supabase Storage `user-recordings/` bucket (private), accessed via signed URL.
- Max recording length: 30 seconds (`MAX_RECORDING_SECONDS = 30`).
- Recording format: `audio/webm;codecs=opus` (browser MediaRecorder default).
- Slow playback = `audioElement.playbackRate = 0.7` — no server-side processing needed.

### Error Handling
- API routes: always return structured `{ error: string }` on failure.
- Components: use React Error Boundaries for the practice screen (mic/audio failures must not crash the app).
- Never use `console.log` in production. Use `console.error` for unexpected failures only.

### No Premature Abstraction
- Only abstract when the same pattern appears 3+ times.
- No utility functions that wrap a single line.
- No global state management until V2 — local state is sufficient for MVP.

---

## 8. Database Schema & Migrations

### Migration: `supabase/migrations/001_initial_schema.sql`

```sql
-- SCENARIOS (static content)
create table scenarios (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  slug        text not null unique,
  "order"     int not null default 0,
  created_at  timestamptz default now()
);

-- PHRASES (static content)
create table phrases (
  id           uuid primary key default gen_random_uuid(),
  scenario_id  uuid not null references scenarios(id) on delete cascade,
  text         text not null,
  audio_url    text not null,       -- Supabase Storage path to normal-speed MP3
  slow_audio_url text,              -- Supabase Storage path to slow MP3 (optional: generate server-side via playbackRate instead)
  "order"      int not null default 0,
  created_at   timestamptz default now()
);

-- PROFILES (extends auth.users)
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz default now()
);

-- USER PROGRESS (per-user, per-phrase)
create table user_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  phrase_id     uuid not null references phrases(id) on delete cascade,
  recording_url text,              -- Supabase Storage signed URL to user's .webm
  completed_at  timestamptz default now(),
  unique(user_id, phrase_id)
);

-- VIDEO SESSIONS (V2 — video import)
create table video_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  source_url text not null,
  clips      jsonb not null default '[]',   -- [{start, end, transcript, clip_url}]
  created_at timestamptz default now()
);

-- INDEXES
create index on phrases(scenario_id, "order");
create index on user_progress(user_id, phrase_id);
create index on video_sessions(user_id);

-- ROW LEVEL SECURITY
alter table user_progress enable row level security;
alter table video_sessions enable row level security;
alter table profiles enable row level security;

-- RLS POLICIES
create policy "Users see own progress" on user_progress
  for all using (auth.uid() = user_id);

create policy "Users see own sessions" on video_sessions
  for all using (auth.uid() = user_id);

create policy "Users see own profile" on profiles
  for all using (auth.uid() = id);

-- scenarios and phrases are public read
alter table scenarios enable row level security;
alter table phrases enable row level security;

create policy "Anyone can read scenarios" on scenarios
  for select using (true);

create policy "Anyone can read phrases" on phrases
  for select using (true);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

### Supabase Storage Buckets
Create these in the Supabase dashboard (Storage → New bucket):

| Bucket | Public? | Purpose |
|---|---|---|
| `phrase-audio` | Yes | Pre-generated ElevenLabs MP3s (served directly) |
| `user-recordings` | No | User's recorded .webm files (signed URLs) |

---

## 9. Content Seeding

### The 40 Phrases

#### Scenario 1: Introducing Yourself
1. "Hi, my name is [name]. It's nice to meet you."
2. "I'm originally from [city], but I've been living here for a few years."
3. "I work as a [job title] at a tech company downtown."
4. "In my free time, I enjoy cooking and exploring new restaurants."
5. "I'm currently studying English to improve my communication skills."
6. "I have two younger siblings — a brother and a sister."
7. "I graduated from university about three years ago."
8. "I'm really passionate about music and play the guitar on weekends."
9. "One of my goals this year is to travel to at least two new countries."
10. "Feel free to ask me anything — I'm an open book!"

#### Scenario 2: At a Restaurant
1. "Could we get a table for two, please?"
2. "We have a reservation under the name Smith."
3. "Can I see the menu, please?"
4. "I'll have the grilled salmon with a side salad."
5. "Is the pasta dish vegetarian-friendly?"
6. "Could we get some water for the table?"
7. "Everything looks delicious — I'm having a hard time deciding."
8. "How spicy is the chicken curry on a scale of one to ten?"
9. "Could I get the check when you have a moment?"
10. "The meal was fantastic — please pass our compliments to the chef."

#### Scenario 3: Job Interview Basics
1. "Thank you so much for having me. I've been looking forward to this conversation."
2. "I have about five years of experience in software development."
3. "In my previous role, I led a team of four engineers on a product redesign."
4. "I'm particularly drawn to this position because of your company's focus on user experience."
5. "My greatest strength is my ability to break down complex problems into manageable steps."
6. "I'm still working on improving my public speaking skills — I've been taking a course."
7. "I work best in collaborative environments where feedback is encouraged."
8. "My salary expectation is in line with the market rate for this role."
9. "I'm available to start within two weeks of receiving an offer."
10. "Do you have any questions about my experience or qualifications?"

#### Scenario 4: Casual Small Talk
1. "Hey! How's it going? Haven't seen you in a while."
2. "Did you catch the game last night? It was unbelievable!"
3. "The weather has been so unpredictable lately — I can't keep up."
4. "I've been so busy with work, but things are finally starting to calm down."
5. "Have you tried that new café on Main Street? The coffee is amazing."
6. "I'm thinking of taking a road trip this weekend — any recommendations?"
7. "I just finished reading a great book. Do you like thrillers?"
8. "Any fun plans for the long weekend coming up?"
9. "I can't believe how fast this year is going — it's already February!"
10. "It was great running into you. Let's catch up properly soon!"

### Seeding Process

1. Insert scenarios into the `scenarios` table (can use Supabase dashboard or a script).
2. Insert all 40 phrases into the `phrases` table with `scenario_id` FK.
3. Run `scripts/generate-audio.ts` — this script:
   - Fetches all phrases with no `audio_url`
   - Calls `lib/elevenlabs.ts` with each phrase's text
   - Uploads the returned MP3 buffer to `phrase-audio` Supabase Storage bucket
   - Updates the `phrases.audio_url` with the Storage path
4. Verify all 40 rows have `audio_url` set before Phase 2 work begins.

**Voice choice:** Pick one ElevenLabs voice ID for all phrases at MVP (consistent reference voice). Store the `ELEVENLABS_VOICE_ID` in `.env.local`. Good starting points: "Rachel" or "Drew" from ElevenLabs library.

---

## 10. Testing Strategy

### Baseline checks

The initial repository has no behavior test suite. Its required CI checks are:

- npm run lint
- npm run typecheck
- npm run build

Add automated tests with the first behavior change and make them required in CI before accepting that feature. Do not add placeholder tests or a coverage target that does not prove product behavior.

### Tests by risk

- Pure logic and practice-state transitions: focused unit tests with boundary, cancel, retry, and failure cases.
- API routes and persistence: integration tests for authentication, validation, idempotency, and authorization.
- Supabase database and Storage: apply migrations from an empty local database and exercise policies using distinct user identities, including anonymous access where relevant. A service-role-only test does not prove RLS isolation.
- Important user journeys: browser automation for account access, practice, upload, and progress once those flows exist.
- Audio and browser media: deterministic audio fixtures in automated checks plus manual checks on current iOS Safari and Android Chrome devices for microphone permissions, playback, interruptions, and supported formats.
- External TTS and transcription: keep ordinary CI on fixtures. Run provider checks separately with explicit budgets and non-production credentials.

For bugs, add a regression check that fails for the reported behavior and passes after the correction. Tests must assert outcomes and invariants; do not mirror internal implementation details without user value.



## 11. Deployment Checklist

### Supabase
- [ ] Production project created (separate from dev)
- [ ] Migration `001_initial_schema.sql` applied to production
- [ ] Storage buckets created: `phrase-audio` (public), `user-recordings` (private)
- [ ] CORS policy on Storage: allow `https://your-vercel-domain.vercel.app`
- [ ] Auth → Email templates customized (optional)
- [ ] Auth → Site URL set to production Vercel URL
- [ ] Auth → Redirect URLs include production URL
- [ ] RLS policies verified in production

### Vercel
- [ ] Project connected to GitHub repo
- [ ] Configure only the runtime environment variables required by implemented features
- [ ] Production domain configured
- [ ] Deploy succeeds with zero build errors

### Pre-Launch Smoke Test
- [ ] Sign up with a fresh email
- [ ] Browse scenarios and phrases
- [ ] Complete the full 6-step loop on 3 different phrases
- [ ] Progress indicators update correctly
- [ ] Log out and log back in — progress is still there
- [ ] Test on mobile device

### Content Verification
- [ ] All 40 phrase audio files are accessible
- [ ] Audio quality is acceptable for each phrase
- [ ] Slow/normal speed toggle works correctly

---

*Last updated: 2026-09-24 | Status: Active | Version: 0.1.0*
