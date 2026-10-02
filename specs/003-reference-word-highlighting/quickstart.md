# Quickstart: Voice Choice and Word Highlighting

## Local checks

1. Install dependencies with the repository's pinned Node/npm versions.
2. Run npm run lint, npm run typecheck, and npm run build.
3. Run npm run test:e2e. The E2E server uses the optimized build, so rebuild after application-source changes before running the suite.
4. The E2E suite checks every selectable catalog variant has one cue per canonical word, positive ordered intervals, and final boundaries within the declared audio duration.

No provider credentials or network access to transcription services are needed to play the samples. The real-audio E2E uses the decoded local WAV/MP3 files and native browser media clock; it makes no provider requests.

A final listening review on a supported real device is still required before release to confirm perceived word boundaries and playback/interruption behavior.
