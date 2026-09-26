# Implementation Plan: Voice Choice and Word Highlighting

**Branch**: codex/openrouter-audio-catalog | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from /specs/003-reference-word-highlighting/spec.md

## Summary

Show the original voice persona names in the selector, then synchronize a word highlight to the active reference sample. Keep one validated word timeline per selectable phrase/voice audio variant in the existing catalog. The browser reads the media clock and performs no transcript or alignment request during playback.

## Technical Context

**Language/Version**: TypeScript 5.9.3, React 19.2.8, Node.js 24.19.0
**Primary Dependencies**: Existing Next.js App Router and React dependencies; no new runtime dependency
**Storage**: Existing static JSON audio catalog and fixture files
**Testing**: Playwright E2E via npm run test:e2e; Biome, TypeScript, production build
**Target Platform**: Current web app in supported browsers
**Project Type**: Next.js web application
**Performance Goals**: Highlight word boundaries within the 100ms success criterion during foreground playback; do not delay audio start for alignment work
**Constraints**: Reference-only highlight; no playback-time transcription/network call; preserve playback and readable text if a timeline is absent
**Scale/Scope**: Five phrases, two selectable voices, ten current selectable reference variants

## Constitution Check

- **I. Small, reviewable slices**: Pass. Two independent user journeys cover playback tracking and voice labels.
- **II. Independent evidence**: Pass when the catalog invariant and browser playback tests are implemented and run.
- **III. User data and credentials**: Pass. No user data, credentials, or provider calls are introduced.
- **IV. Reviewability and traceability**: Pass. New feature specification, plan, tasks, code and regression checks remain on the existing related feature branch.
- **V. Simple and reproducible**: Pass. Reuse static catalog, browser media clock, and existing app dependencies.

## Research Summary

See research.md for trade-offs and decisions.

## Data Model

See data-model.md. Each selectable audio variant carries an ordered list of word intervals expressed in milliseconds relative to that file. Phrase text remains the canonical visible transcript.

## Project Structure

The feature extends CONTEXT.md, src/components/ShadowingPractice.tsx, src/components/useShadowingPractice.ts, src/lib/fixtures/voice-comparison.json, src/lib/fixtures/voice-comparison.ts, and tests/e2e/shadowing.spec.ts and tests/e2e/shadowing-real-audio.spec.ts. Feature artifacts live in this directory.

**Structure Decision**: Extend the existing audio catalog, practice hook, and practice screen. Keep cue data beside each audio variant so Puck and Harper can carry different timing for the same phrase. No new API, service, or runtime model dependency.

## Technical Decisions

1. Generate timestamp drafts locally from each existing audio file with word-timestamp speech recognition, compare the recognized tokens with canonical phrase words, and review the ordered boundaries against the audio duration before storing them. Keep only the final cue intervals in the app catalog.
2. Render the current spoken phrase word-by-word while preserving the original whitespace and punctuation. Style only the current word; do not announce each moving word through a live region.
3. Sample the native audio element's current time at animation-frame cadence while a reference is playing, updating React only when the word index changes. This follows the actual media clock through playback-rate changes, pause/resume, and seek events. Clear the index on transition away from reference playback.
4. Keep voice/provider/model/file details in the technical catalog for audio resolution and provenance, but use the voice's original name alone for visible and accessible selection text.

## Risks

- Word timestamp recognizers can place a boundary slightly early or late. Token equality, monotonicity, and duration bounds are automated checks; a human listening review remains required before release.
- Background browser scheduling can delay visual updates while the tab is hidden. On the next foreground frame, the highlight catches up to the actual audio position.
