# Quickstart: Audio Catalog and Voice Selection

## Prerequisites

- Node.js version from package.json and npm dependencies installed.
- Python 3 available for the optional local catalog generator.
- No OpenRouter key is needed for app playback or script preview.

## Validate the local app

1. Run npm run dev.
2. Open /scenarios/voice-comparison.
3. Confirm five ordered phrases and the two options:
   - Gemini 3.8 Flash TTS · Puck
   - MAI-Voice-2 · en-US-Harper:MAI-Voice-2
4. Select each option and listen to the current phrase. The selected option should remain active while navigating.
5. Record a sample, select Compare, and confirm reference plays before the recording.
6. Reload and confirm Google/Puck is selected again and the personal recording is gone.

## Inspect the catalog

- Open src/lib/fixtures/voice-comparison.json.
- Confirm each phrase maps to one active WAV and one active MP3 variant.
- Confirm each active record’s SHA-256 matches the corresponding file.
- Confirm the original three eSpeak NG WAVs remain listed under the archived baseline.

## Preview generation without a provider

Run python3 scripts/generate-openrouter-audio.py. It should list exactly ten phrase/model/voice/output combinations and exit without reading an API key or making a request.

## Explicit provider generation

Set OPENROUTER_API_KEY in the local shell and run python3 scripts/generate-openrouter-audio.py --execute. Existing files are skipped. Add --force only when deliberately replacing the current samples. This command is not part of app runtime or CI and was not run for this feature.

## Automated checks

Run npm run lint, npm run typecheck, npm run build, npm run test:e2e, and npm run test:audio-generator. The tests use local fixtures or mocked responses; none should call OpenRouter.

## Manual media pass

On current iOS Safari and Android Chrome, listen to all five phrases in both voices, confirm intelligibility and switching behavior, then check recording and sequential comparison. Record device results before treating physical-device behavior as verified.


## Results (2026-09-25)

- npm run lint: passed.
- npm run typecheck: passed.
- npm run build: passed.
- npm run test:e2e: 14 passed.
- npm run test:audio-generator: 11 passed after adding interrupted-write recovery and MP3 validation coverage.
- npm run audio:generate: listed ten tasks without reading a key or making network requests.
- OpenRouter generation: not invoked; current user-provided files were cataloged.
- Physical iOS Safari and Android Chrome audio checks: pending.
