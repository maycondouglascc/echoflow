# Research: Voice Choice and Word Highlighting

## Decision 1: Store one validated word timeline per audio variant

**Chosen**: Keep local, word-level cues alongside each of the ten selectable reference audio variants, verify their transcript and timing structure, and reserve perceived-boundary review for final listening QA.

**Why**: Each speaker has different pacing and pronunciation. A single timing list per written phrase would drift for one of the voices. Duration-weighted estimates are quick but misplace pauses, emphasis, and short words. A per-play transcription step can delay the first sound and depends on runtime availability or service calls. Static per-file cue intervals allow the reference audio to start immediately and keep playback independent of transcription services.

**Preparation and checks**: Create cue drafts on the development machine from each existing audio file, with local faster-whisper 1.2.1 medium word-timestamp recognition prompted by the canonical phrase. The model was loaded from the local cache and made no network requests. Match output to the canonical token sequence and reject missing, extra, or reordered tokens. Check every interval is positive, ordered, non-overlapping, and within its file duration. This batch matched the canonical token sequence for all ten variants and passed those timing checks. A human listening review on a supported real device remains a release check because the local environment cannot judge perceived acoustic boundaries. The client receives only cue words and time intervals as content data; no recognizer runs at runtime.

## Decision 2: Drive the highlight from the media clock

**Chosen**: Read the current media position at animation-frame cadence during reference playback and render only when the active word changes.

**Why**: The media clock already accounts for pause, resume, seeking, and playback rate. Sampling it each display frame keeps short words from being skipped by infrequent media-time events. The number of current phrases is small, and the state changes only at word boundaries.

**Fallback**: When a selected variant has no valid cues, keep the phrase readable and allow audio playback without an active-word highlight.

## Decision 3: Keep technical voice details out of the selector

**Chosen**: Show the original names Puck and Harper as the complete visible and accessible names for the two choices.

**Why**: Learners choose a voice persona. Provider, synthesis-model, identifier, and format fields are useful to the catalog but add no learner-facing choice value.
