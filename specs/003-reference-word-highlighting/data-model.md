# Data Model: Word-Aligned Reference Playback

## Phrase

- Existing canonical text shown to the learner.
- Split into whitespace-delimited visible words without changing punctuation or spacing.
- Has one audio variant per available voice.

## Audio variant

- Existing identity, source, output format, duration, and provenance fields remain available for source selection and technical history.
- Each selectable current reference variant carries its own ordered word timing list.
- Archived baseline variants are outside this feature and do not need word timings.

## Word timing

- word: the exact visible token from the canonical phrase, including punctuation attached to that token.
- startMs: inclusive offset from the start of this specific audio file.
- endMs: exclusive offset from the start of this audio file.
- Each interval is positive, ordered, non-overlapping, and within the audio duration.
- Silence and gaps between intervals may have no highlighted word.

## Playback state

- A current word index exists only while a reference variant is playing, including the reference half of comparison playback.
- It is cleared for personal recording playback and after ending, playback error, navigation, or voice selection.
- Pause retains the word at the paused media position; resume and seeking recompute from the audio clock.
