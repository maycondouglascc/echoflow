# Feature Specification: Smooth Word Highlight and Word Replay

**Feature Branch**: `codex/smooth-word-replay`

**Created**: 2026-09-26

**Status**: Approved

**Input**: User wants smoother movement between the currently spoken words and wants a clicked transcript word to play again.

## User Scenarios & Testing

### User Story 1 - Follow the moving highlight (Priority: P1)

While a learner listens to a reference phrase, the highlighted word should move calmly with the spoken audio. The phrase should remain visually steady as the highlight changes.

**Why this priority**: The highlight is already part of the core listening experience; abrupt movement and text reflow make that experience harder to follow.

**Independent Test**: Play a reference phrase, move the media clock across several word boundaries, and verify that the highlight animates while each word and line keeps its position.

**Acceptance Scenarios**:

1. **Given** reference audio is playing, **When** the current word changes, **Then** the highlight moves smoothly to the next word without moving or resizing the transcript words.
2. **Given** the device requests reduced motion, **When** the current word changes, **Then** the highlight changes without a traveling layout animation.
3. **Given** comparison playback is playing its reference portion, **When** the spoken word changes, **Then** the same steady highlight behavior is used.

### User Story 2 - Replay a word from the transcript (Priority: P1)

A learner can select a word in the displayed phrase to hear that word again in the currently selected reference voice.

**Why this priority**: Replaying a difficult word in place makes the transcript directly useful for pronunciation practice without restarting the full phrase.

**Independent Test**: Select a transcript word and verify that playback starts at that word's aligned interval, ends at its boundary, and uses the selected voice.

**Acceptance Scenarios**:

1. **Given** a selectable reference voice and an aligned phrase, **When** the learner activates a word by pointer or keyboard, **Then** only that word's reference interval is played.
2. **Given** reference or comparison playback is underway, **When** the learner activates another word, **Then** the current playback or comparison sequence stops and the selected word begins.
3. **Given** a word replay ends, **Then** playback stops and the practice screen returns to its prior safe state without starting microphone capture.
4. **Given** the learner is requesting microphone access, recording, or saving a recording, **When** they view the transcript, **Then** word replay is unavailable and cannot interrupt capture.
5. **Given** an audio variant lacks a usable interval for a word, **Then** that word remains readable and is not presented as an actionable replay control.

## Edge Cases

- Rapidly selecting different words must leave only the latest selected word playing.
- A selected word may be the final aligned word in the phrase; replay must stop at its cue boundary and not fall through into the rest of the file.
- Selecting a word during the personal-recording portion of comparison replaces that playback with the selected reference word.
- Reduced-motion preferences must not change transcript geometry or disable word replay.

## Requirements

### Functional Requirements

- **FR-001**: The current-word highlight MUST transition smoothly between aligned words without changing transcript wrapping or word dimensions.
- **FR-002**: The highlight MUST honor the device's reduced-motion preference by skipping spatial travel when reduced motion is requested.
- **FR-003**: Every word with an available alignment MUST be operable by pointer and keyboard as a replay action.
- **FR-004**: Activating a word MUST play only that word's interval from the currently selected reference voice.
- **FR-005**: Activating a word during other playback MUST stop that playback and start the requested interval; it MUST NOT continue a comparison sequence.
- **FR-006**: Word replay MUST be unavailable while microphone permission is pending or the learner is recording or saving.
- **FR-007**: Replay MUST stop at the selected interval's end and return to the previous idle or ready practice state without automatically opening the microphone.
- **FR-008**: A word without a usable interval MUST remain readable and MUST NOT be exposed as an enabled replay action.

### Key Entities

- **Transcript word**: A word in the visible phrase, including its punctuation.
- **Word interval**: The start and end in the selected reference audio associated with one transcript word.
- **Word replay**: Playback of one aligned interval in the selected reference voice.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Word element bounding boxes and line breaks are identical before and after at least five highlight changes in a phrase.
- **SC-002**: The highlight reaches a newly active word within 180 milliseconds of the word index changing when reduced motion is off; with reduced motion on, it changes without spatial travel.
- **SC-003**: Activating an aligned word starts playback at its interval start and stops no later than 50 milliseconds after its interval end in foreground playback.
- **SC-004**: Word replay works with both selectable voices, in direct playback and during an active comparison, without playing a provider request or generating new timing data.

## Assumptions

- The existing per-variant word intervals are the source of truth for replay boundaries; each selected voice has its own timing.
- The learner intends to replay only the selected word, not the remainder of the phrase.
- Clicking a word during any ordinary audio playback replaces the current playback; capture and microphone-permission flows remain protected.
- If the current phrase/voice variant has no interval for a word, the text remains visible but that word is not clickable.
