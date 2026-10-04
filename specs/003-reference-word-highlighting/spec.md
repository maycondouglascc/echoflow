# Feature Specification: Voice Choice and Word Highlighting

**Feature Branch**: codex/openrouter-audio-catalog

**Created**: 2026-09-25

**Status**: Approved

**Input**: User wants learners to choose a reference voice by its original voice name and see the words highlighted as they are spoken during audio playback.

## User Scenarios & Testing

### User Story 1 - Follow the spoken words (Priority: P1)

When a learner plays a reference sample, the phrase on screen highlights the word currently being spoken. This helps them follow the audio and connect pronunciation with the written phrase.

**Why this priority**: Following a reference phrase is the core shadowing experience and the main requested improvement.

**Independent Test**: Play a reference phrase and compare the highlighted word with the audio position; repeat during a comparison playback.

**Acceptance Scenarios**:

1. **Given** a phrase and a selected reference voice, **When** the learner starts the reference audio, **Then** the spoken word is highlighted in the displayed phrase as playback advances.
2. **Given** reference audio is playing, **When** playback pauses, resumes, or changes position, **Then** the highlight follows the audio position.
3. **Given** the learner compares a reference with a personal recording, **When** the reference portion plays, **Then** its spoken word is highlighted; **When** the personal recording plays, **Then** no word is highlighted.
4. **Given** reference playback ends, fails, or the learner changes phrase or voice, **Then** the highlight is cleared.

### User Story 2 - Choose a voice by its name (Priority: P2)

When a learner chooses a reference voice, they see the voice's original name without provider, model, identifier, or file-format details.

**Why this priority**: Voice persona is meaningful to learners; synthesis implementation metadata is not.

**Independent Test**: Inspect both voice choices and their accessible names.

**Acceptance Scenarios**:

1. **Given** the reference voice choices, **When** the learner views the selector, **Then** it shows the original names “Puck” and “Harper”.
2. **Given** a voice choice is read by assistive technology, **Then** its accessible name identifies only that voice by name.

### Edge Cases

- A short word may occupy a brief interval; the highlight must still follow the audio clock closely enough to be visible.
- Silence between words may have no active highlight.
- If an audio variant has no usable word alignment, the phrase remains readable and playback remains available without a false highlight.

## Requirements

### Functional Requirements

- **FR-001**: During reference playback, the phrase MUST identify the word aligned to the current audio position.
- **FR-002**: Word highlighting MUST follow the reference audio position when playback pauses, resumes, or seeks.
- **FR-003**: Word highlighting MUST appear during the reference portion of comparison playback and MUST be absent during personal recording playback.
- **FR-004**: The current-word highlight MUST clear when reference playback ends or fails, or when the phrase or voice changes.
- **FR-005**: Each selectable phrase and voice combination MUST have word-level alignment for every word in the displayed phrase.
- **FR-006**: The voice selector MUST display only the original voice names “Puck” and “Harper”; synthesis provider, model, voice identifier, and output format MUST remain hidden from the learner.
- **FR-007**: Reference audio MUST begin without waiting for a transcription or alignment operation during playback.

### Key Entities

- **Phrase**: The written utterance practiced by the learner.
- **Voice**: The speaker persona selected by its original name.
- **Reference audio**: A voice-specific rendition of a phrase.
- **Word alignment**: The connection between a phrase word and the interval in which it is spoken in one reference audio.

## Success Criteria

### Measurable Outcomes

- **SC-001**: For each of the 10 selectable phrase-and-voice samples, every written word has one ordered, non-overlapping playback interval within the sample duration.
- **SC-002**: During playback, the visible highlight changes within 100 milliseconds of an aligned word boundary under normal foreground playback.
- **SC-003**: Starting reference playback adds no wait for transcript generation.
- **SC-004**: Learners see “Puck” and “Harper” as the voice choices, with no synthesis metadata in visible or accessible selector text.

## Assumptions

- The current catalog contains five phrases and two selectable reference voices; archived baseline audio is not part of the word-highlight experience.
- Personal recordings can differ in pace and content, so the reference transcript is not synchronized to personal recording playback.
- Voice names “Puck” and “Harper” are the original display names already recorded in the catalog.
