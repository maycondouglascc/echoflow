# Data Model: Audio Catalog

## Scenario

- **Fields**: id, title, description, ordered phrases with content categories, model registry, archived model registry.
- **Rules**: exactly two selectable model/voice definitions for the active comparison; archived definitions are excluded from the selector.

## Phrase

- **Fields**: stable id, order, source category, canonical text, archived baseline variants, active variants.
- **Rules**: five phrases in increasing order; categories reflect the product source scenario; one active variant for each selectable model/voice; the source text sent to TTS is the canonical phrase text.
- **Current canonical texts**:
  1. Hi, my name is Alex. It's nice to meet you.
  2. I'm originally from Recife, but I've been living here for a few years.
  3. I work as a software engineer at a tech company downtown.
  4. Could we get a table for two, please?
  5. I have about five years of experience in software development.

## Audio Model and Voice

- **Fields**: canonical model id, provider, display name, voice id, voice display name, selection status, API response format, stored file format, MIME types, and PCM container settings where applicable.
- **Rules**: a model and voice together identify a selectable speaker choice. The Google/Puck definition produces WAV assets from PCM; Microsoft/Harper produces MP3. The eSpeak NG model record is archived.
- **Identifiers**:
  - google/gemini-3.8-flash-tts + Puck
  - microsoft/mai-voice-2 + en-US-Harper:MAI-Voice-2
  - archived baseline: eSpeak NG 1.52.0 + en-us

## Audio Variant

- **Fields**: stable variant id, phrase id (inferred from containment), model id, voice id, public asset path, stored format and MIME, provenance, SHA-256, optional duration, optional generation id, optional generation timestamp.
- **Rules**: each active phrase/model pair has one variant; all IDs must resolve to one model and one phrase. The checksum is calculated from stored file bytes. Unknown provenance details remain null rather than inferred.

## Generation Record

- **Fields**: generation id from X-Generation-Id, UTC timestamp, checksum.
- **Rules**: manually imported samples have null generation id and timestamp; script-generated samples record both after a successful API response and atomic file write.

## Learner Session

- **Fields**: selected model/voice id and in-memory personal recordings by phrase.
- **Rules**: selected model defaults to Google/Puck on page load, applies across phrases, and disappears on reload. Personal recordings keep existing session-only behavior and are never sent to TTS.

