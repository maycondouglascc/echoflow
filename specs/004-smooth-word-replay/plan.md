# Implementation Plan: Smooth Word Highlight and Word Replay

**Branch**: `codex/smooth-word-replay` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from /specs/004-smooth-word-replay/spec.md

## Summary

Make the spoken-word highlight move between transcript tokens without changing their geometry, and let learners replay a single aligned word from the currently selected reference voice. Use Motion's shared layout element for the highlight, respect reduced-motion preferences, and keep playback bounded by the selected word's stored cue.

## Technical Context

**Language/Version**: TypeScript 5.9.3, React 19.2.8, Node.js 24.19.0

**Primary Dependencies**: Next.js 16.3.6; add Motion for React from the `motion` package

**Storage**: Existing local audio catalog and per-variant word cue data; no new persisted data

**Testing**: Playwright E2E tests; Biome lint; TypeScript check; production build

**Target Platform**: Existing supported browsers, including mobile browsers used for playback

**Project Type**: Next.js App Router web application

**Performance Goals**: Highlight reaches the changed word within 180 ms; cue replay starts at its aligned position and stops within 50 ms of the end boundary in foreground playback

**Constraints**: Transcript line wrapping and word dimensions stay fixed during highlight changes; honor reduced motion; no transcription or provider call during playback; preserve microphone capture protections

**Scale/Scope**: Ten selectable audio variants across five phrases; one active phrase/voice preload at a time

## Constitution Check

- **I. Build in small, reviewable slices**: Pass. Deliver smooth highlight and word replay as separate, independently tested commits.
- **II. Prove behavior with independent evidence**: Pass. Add deterministic playback-clock coverage and browser tests against real local media.
- **III. Protect user data and credentials**: Pass. No user data, credentials, or external provider calls are added.
- **IV. Preserve reviewability and traceability**: Pass. Link implementation tasks to this feature spec and commit each user journey coherently.
- **V. Keep the system simple and reproducible**: Pass. Add Motion because the requirement is a shared layout transition, and use the existing word cues and local audio assets.

## Project Structure

### Documentation

```text
specs/004-smooth-word-replay/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md
```

### Source and checks

```text
src/components/ShadowingPractice.tsx
src/components/useShadowingPractice.ts
tests/e2e/shadowing.spec.ts
tests/e2e/shadowing-real-audio.spec.ts
package.json
package-lock.json
```

**Structure Decision**: Extend the existing practice component and hook, keep cues in the existing catalog, and add no API or service.

## Technical Decisions

1. Render transcript tokens in stable inline boxes. Place one Motion shared-layout highlight as an absolute child so its movement cannot insert padding or reflow text.
2. Import Motion's client-compatible API for Next App Router and apply the user's reduced-motion preference to the local highlight transition.
3. Add a dedicated hidden audio element for the selected reference variant with preload enabled. Keep the existing audio element for phrase playback and learner recordings.
4. Record word replay in the practice state with the selected cue's word index, start, and end. Pause the ordinary player, seek the preloaded reference player, and stop it at the cue end using the existing animation-frame media-clock loop.
5. Keep word replay pointer and keyboard accessible. Do not enable it when a cue is missing or the microphone flow is requesting, recording, or saving.
6. Test transition geometry, reduced-motion behavior, selected-voice source selection, interruption and recovery, and real media seek/stop behavior.

## Risks

- Word boundaries are aligned to the active reference asset. A voice or phrase change must always switch both the audio source and its cue list together.
- Browser media seeking differs across platforms. Deterministic E2E covers the state machine; real-device playback should still be checked before release.
