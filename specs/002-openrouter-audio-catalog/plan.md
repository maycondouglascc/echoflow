# Implementation Plan: Catálogo de áudio por modelo e voz

**Branch**: codex/openrouter-audio-catalog | **Date**: 2026-09-25 | **Spec**: specs/002-openrouter-audio-catalog/spec.md

**Input**: Feature specification from specs/002-openrouter-audio-catalog/spec.md

## Summary

Add a “Voice Comparison” sample set with five phrases from their source categories, catalog each reference sample by phrase/model/voice, and let the learner choose between Google/Puck and Microsoft/Harper for the whole page session. Preserve the three eSpeak NG samples as archived baseline. Add a local OpenRouter batch generator that reads the same catalog, defaults to preview-only, and writes metadata only after valid responses. The app continues to play static same-origin files and never receives an OpenRouter secret.

## Technical Context

**Language/Version**: TypeScript 5.9 / Node.js 24.19 for the Next.js app; Python 3 standard library for the content-generation script  
**Primary Dependencies**: Next.js 16, React 19, Playwright 1.63; Python standard library only  
**Storage**: Static JSON catalog and files under public/fixtures/audio; transient page state for chosen model and personal recordings  
**Testing**: Playwright E2E and Python unittest with mocked HTTP; no live provider calls  
**Target Platform**: Local Next.js web app and local Python CLI  
**Project Type**: Web application with a maintenance script  
**Performance Goals**: Load catalog locally; do not add network activity during playback; generate serially to keep the batch bounded  
**Constraints**: Exactly five phrases × two selectable OpenRouter voices; default is preview-only; require explicit execution and explicit overwrite; never expose the key to browser code; preserve personal recording privacy  
**Scale/Scope**: One scenario, five phrases, two active model/voice pairs, ten user-supplied OpenRouter samples, three archived eSpeak baseline samples

## Constitution Check

- Small, reviewable scope: one scenario, catalog, selector, and one bounded generator.
- Behavior evidence: adapt existing E2E journey for five phrases and selector; add no live-provider dependency; use Python standard-library tests for request/format logic.
- Credential and recording boundaries: API key is read only by the local script; personal recordings remain page memory and are never input to the script.
- Reproducibility: catalog is checked in, file names are deterministic, and default script mode makes no network calls.
- Existing spec 001 says three eSpeak references for the first prototype. This feature supersedes the active reference choices for this scenario; it preserves those files in the catalog as archived. Runtime playback still uses pre-generated local assets and requires no provider.
- Gate: PASS. No authentication, persistence, production data, deployment, or CI changes are needed.

## Research Summary

See research.md for OpenRouter request/response details and the observed local asset map.

## Project Structure

### Documentation (this feature)

specs/002-openrouter-audio-catalog/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── audio-catalog-and-generator.md
├── checklists/
│   └── requirements.md
└── tasks.md

### Source Code

src/lib/fixtures/
├── voice-comparison.json
└── voice-comparison.ts

src/app/scenarios/voice-comparison/page.tsx
src/app/scenarios/introducing-yourself/page.tsx  # compatibility redirect
src/components/
├── ShadowingPractice.tsx
└── useShadowingPractice.ts

scripts/
└── generate-openrouter-audio.py

public/fixtures/audio/
├── README.md
├── introducing-yourself-01.wav
├── introducing-yourself-02.wav
├── introducing-yourself-03.wav
└── openrouter/

tests/
├── e2e/shadowing.spec.ts
└── python/test_openrouter_audio_generator.py

Other updates: src/app/page.tsx, package.json, and the root CONTEXT.md glossary.

**Structure Decision**: Keep the catalog beside the existing canonical scenario fixture so the server-rendered route imports a single local source. The browser receives only public model/audio metadata. Keep synthesis as a local Python maintenance script, not an app route or runtime API.

## Complexity Tracking

No constitution violations or new dependencies.

