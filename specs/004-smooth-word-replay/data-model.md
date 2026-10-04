# Data Model: Smooth Word Highlight and Word Replay

## Existing catalog entities

### Phrase

- `id`: stable phrase identifier
- `text`: canonical transcript rendered in the practice screen
- `audioVariants`: available voice-specific reference assets

### Audio variant

- `modelId` and `voiceId`: identify the selected reference persona and its underlying asset
- `src`: local audio file for the variant
- `wordTimings`: ordered word intervals associated with this exact audio file

### Word timing

- `word`: transcript token, including its punctuation
- `startMs`: inclusive playback position where the word begins
- `endMs`: exclusive playback position where the word ends

The feature adds no persisted entity and does not change the catalog format.

## Runtime playback state

A word replay is represented as an active playback with:

- phrase identifier
- playback kind `word-replay`
- return target (`idle` or `ready`)
- selected word index and cue start/end milliseconds

The selected audio variant remains the source of both media and word cues. When the cue ends or playback fails, the runtime returns to the saved target and clears the active highlight. During microphone request, recording, and save phases, word replay is unavailable.
