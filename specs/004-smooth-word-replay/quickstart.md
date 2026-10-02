# Quickstart: Smooth Word Highlight and Word Replay

## Prerequisites

- Node.js 24.19.0
- Dependencies installed from package-lock.json
- The local phrase catalog and audio files are available

## Validate the feature

1. Run the focused browser tests:

   ```bash
   npm run test:e2e -- shadowing.spec.ts
   npm run test:e2e -- shadowing-real-audio.spec.ts
   ```

2. Verify the complete quality gates:

   ```bash
   npm run lint
   npm run typecheck
   npm run build
   ```

## Expected outcomes

- Moving the media clock across word boundaries moves a shared highlight without changing token bounds or wrapping.
- With reduced motion enabled, the highlight updates without spatial travel.
- Activating a transcript word plays only its selected variant's cue and stops near the cue end.
- Activating a word interrupts phrase/comparison playback and does not interrupt microphone capture.
- Real-media checks pass for both Puck and Harper.

Real device playback should be checked on supported mobile browsers before release because native seeking and autoplay behavior can differ from desktop Chromium.
