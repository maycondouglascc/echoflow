# Contract: Audio Catalog and Generator

## Application Catalog

- The catalog is local, static and shared by the scenario page and generator.
- A model has a canonical ID, provider name, display name, voice ID, voice label, selectable/archive state and output configuration.
- A phrase has stable ID, order, source category and canonical text.
- An audio variant is keyed by phrase ID plus model ID and voice ID. It identifies public path, stored format, content type, provenance, SHA-256 and optional generation metadata.
- Active model/voice IDs: google/gemini-3.8-flash-tts + Puck; microsoft/mai-voice-2 + en-US-Harper:MAI-Voice-2.
- The eSpeak NG variants remain cataloged but are marked archived and are not returned as selectable options.

## Practice Screen

- The sample set exposes five phrases tagged with their source categories; the selector exposes exactly two choices and communicates both model and voice.
- Choice is page-session state with Google/Puck as default.
- Reference playback and comparison use the selected variant for the active phrase.
- Changing choice while audio, microphone request, or recording is active is disabled.
- A missing file or mapping reports a recoverable reference-audio error; it never silently falls back to a different voice.
- Recording remains in memory and comparison stays sequential.

## Batch CLI

Command: python3 scripts/generate-openrouter-audio.py

- Default: print a dry-run plan for the catalog and make zero network calls.
- Execution: add --execute. Requires OPENROUTER_API_KEY before any request.
- Existing output: skipped by default; --force is required to overwrite.
- No automatic retries. Requests run serially, at most once per active variant per invocation.
- Before replacing an asset, the script atomically records a pending metadata journal. The next explicit --execute run checks the asset checksum and completes the catalog update before skipping existing files; preview remains read-only.
- MP3 responses must contain complete MPEG Layer III frames; PCM responses must contain complete configured samples before they are stored.
- Each successful output is written through a temporary sibling file and atomically replaced; metadata is updated incrementally.
- Errors redact authorization data and reject unexpected status, Content-Type or empty audio bytes.
- Google response_format is pcm, stored as WAV using the model configuration; Microsoft response_format is mp3 and stored as MP3.
- Generated metadata includes X-Generation-Id (when present), UTC timestamp and SHA-256. Imported user samples keep their original uploaded filename and null generation metadata.
- The command never reads or includes learner recordings.

### API Request

POST https://openrouter.ai/api/v1/audio/speech

Headers:
- Authorization: Bearer value from OPENROUTER_API_KEY
- Content-Type: application/json
- HTTP-Referer and X-Title may identify the local EchoFlow generator

JSON body:
- model: canonical model id
- input: phrase text
- voice: voice id
- response_format: model-specific format (pcm or mp3)

Response:
- raw audio bytes
- content-type audio/pcm for PCM or audio/mpeg for MP3
- optional X-Generation-Id

