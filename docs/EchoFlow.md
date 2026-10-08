---
title: "EchoFlow — English Speaking Practice via Shadowing"
description: "Product specification and system design for EchoFlow, an AI-powered English speaking practice app."
date: "2026-02-25"
status: "Public beta implementation — release gates pending"
version: "0.2.0"
---

# EchoFlow

**Practice English speaking the way your brain learns best — by listening and repeating.**

EchoFlow is a web app that teaches English speaking fluency through the **shadowing technique**: users listen to a native-sounding audio clip and immediately repeat it out loud. The app records the user's voice, plays it back alongside the reference, and tracks progress over time.

---

## The Problem

Current feature 005: public free-beta landing; confirmed account required for playlists, phrases,
practice and all reference audio. One **Voice Comparison** playlist, five phrases, **Puck/Harper**.
Listen, Speak, Compare, word highlight/replay and microphone recovery are preserved. Recordings
and voice selection stay in page memory; only **Completed** persists per account after five
recordings/comparisons. Search/filter use the real catalog. Supabase Auth/database/private Storage
are implemented locally; remote Google/email/domain, legal approval, spend/abuse limits, real
devices and deployment remain release gates. Larger catalog and modes below are future roadmap.

First authenticated entry explains microphone permission in a mascot-led modal; Enable microphone
requests browser permission without recording. A public `/privacy` page explains this beta; legal
approval remains pending. Speak
supports automatic stop after 1.5 seconds of silence following voice activity, with manual fallback.
Voice changes keep the take and comparison progress. Confirmation after signup is explicit.

Most English learners can read and write well but freeze when they need to speak. Traditional apps focus on vocabulary and grammar drills — not on the physical act of speaking. Shadowing is the most effective method for building speaking fluency, but there are no tools that make it accessible, structured, and easy to practice daily.

---

## The Solution

EchoFlow provides two practice modes:

### 🗂️ Curated Phrase Mode *(future expansion)*

Pre-written phrases organized by real-life scenarios. Each phrase has:

- AI-generated audio (ElevenLabs) in a natural native voice
- A slow-speed and normal-speed toggle
- Visual waveform display during playback
- A one-tap record button that opens after playback ends
- Side-by-side replay of the reference vs. the user's recording
- A reference voice selector that presents each speaker persona by its original voice name
- A transcript highlight that smoothly follows reference playback; learners can replay an aligned word in the selected voice, while personal recordings remain unhighlighted

**Proposed expanded scenarios (not current catalog):**

| Scenario | Phrases |
|---|---|
| Introducing Yourself | 10 |
| At a Restaurant | 10 |
| Job Interview Basics | 10 |
| Casual Small Talk | 10 |

### 🎬 Video Import Mode *(V2)*

Users upload a video or paste a link. The app:

1. Sends the video to OpenAI Whisper for transcription with sentence-level timestamps
2. Slices it into individual sentence clips
3. Turns each clip into a shadowing exercise

This unlocks practice with real-world content — interviews, movies, talks, podcasts — making it the key differentiator from existing apps.

---

## Core Practice Loop

Every session follows the same 6-step rhythm:

## Catalog and feedback update (2026-10-04)

The catalog now includes the original Voice Comparison and five workplace playlists: Team Meetings, Deadlines and Priorities, Working with Colleagues, Client Conversations, Feedback and Career Growth. Each new playlist has 15 phrases with Puck and Harper (150 new reference audios). Generation/import evidence is under docs/content/.

Feedback is available from the lower-right button throughout the authenticated area. People send improvement suggestions with optional reviewed viewport screenshot and recent route/action context. Attachments remain local until Send feedback; recordings are never included. Suggestions/screenshots are private and account-owned, reviewed through existing Supabase administrative tooling. Feature 006 intentionally adds this optional context persistence beyond feature 005's completion-only persistence; it does not persist practice recordings or continuous session replay.
Feature 007 automatically exports historical/new feedback and included screenshots
to a restricted Notion inbox for Hermes triage. Production uses a durable queue, Supabase
Edge Function dispatch on new feedback and minute recovery checks; eight historical
feedbacks have been verified in Notion. Independent Hermes integration access remains to be confirmed.
Supabase remains origin; Notion status, priority and Hermes notes are preserved independently.
