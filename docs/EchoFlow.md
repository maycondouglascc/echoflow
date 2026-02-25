---
title: "EchoFlow — English Speaking Practice via Shadowing"
description: "Product specification and system design for EchoFlow, an AI-powered English speaking practice app."
date: "2026-02-25"
status: "MVP Planning"
version: "0.1.0"
---

# EchoFlow

**Practice English speaking the way your brain learns best — by listening and repeating.**

EchoFlow is a web app that teaches English speaking fluency through the **shadowing technique**: users listen to a native-sounding audio clip and immediately repeat it out loud. The app records the user's voice, plays it back alongside the reference, and tracks progress over time.

---

## The Problem

Most English learners can read and write well but freeze when they need to speak. Traditional apps focus on vocabulary and grammar drills — not on the physical act of speaking. Shadowing is the most effective method for building speaking fluency, but there are no tools that make it accessible, structured, and easy to practice daily.

---

## The Solution

EchoFlow provides two practice modes:

### 🗂️ Curated Phrase Mode *(MVP)*

Pre-written phrases organized by real-life scenarios. Each phrase has:

- AI-generated audio (ElevenLabs) in a natural native voice
- A slow-speed and normal-speed toggle
- Visual waveform display during playback
- A one-tap record button that opens after playback ends
- Side-by-side replay of the reference vs. the user's recording

**Available scenarios at launch:**

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

