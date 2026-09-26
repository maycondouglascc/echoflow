# Research: Catálogo de áudio OpenRouter

**Feature**: specs/002-openrouter-audio-catalog/spec.md  
**Date**: 2026-09-25

## Decisions

### Use OpenRouter’s dedicated TTS endpoint in a local maintenance script

- **Decision**: Make one POST to /api/v1/audio/speech per missing phrase/model/voice combination, serially. Require --execute; the default is preview-only. Require --force before replacing existing outputs. Do not run the script against the live provider during implementation or CI.
- **Rationale**: The API returns raw audio bytes and a generation ID. A bounded local tool keeps provider credentials out of the client and preserves static playback.
- **Alternatives considered**: Synthesize on every playback (adds latency, cost, and runtime credentials); make an application route (adds server authorization and deployment configuration before needed). Both are outside this local prototype.

### Store Google PCM as WAV and MAI as MP3

- **Decision**: Google/Puck uses response_format pcm; the script wraps the returned signed 16-bit PCM bytes into a mono 24 kHz WAV container, matching the supplied Google WAVs. Microsoft/Harper uses response_format mp3 and stores the returned MPEG bytes directly.
- **Rationale**: This preserves the two supplied formats and follows the official TTS API’s documented output formats. The supplied Google WAVs are 24 kHz, mono, PCM signed 16-bit; supplied MAI MP3s are 24 kHz and mono.
- **Alternatives considered**: Convert both to MP3 (changes the current comparison artifacts); depend on ffmpeg for PCM wrapping (unnecessary because Python’s standard library can create a WAV container).

### Identify audio independently of uploaded filenames

- **Decision**: Use stable paths with phrase ID, slugged canonical model ID, voice ID and extension. Keep the original uploaded filename in provenance metadata. Record SHA-256 and do not fabricate generation timestamps or IDs for manually supplied assets.
- **Rationale**: Paths are human-readable while catalog IDs remain machine-stable; checksum detects accidental asset mismatch.
- **Alternatives considered**: Keep opaque output-number filenames as paths (requires opening the manifest to identify each one); infer metadata from container tags (the supplied files contain no model/voice tags).

### Keep eSpeak NG samples as archived baseline

- **Decision**: Include the three original assets under a non-selectable archived model record.
- **Rationale**: The user explicitly kept the originals alongside the new batch, and the prior feature records their provenance. The current UI still compares exactly two OpenRouter voices.
- **Alternatives considered**: Delete the baseline (loses comparison history); expose it as a third selectable option (contradicts the agreed two-model experiment and lacks matching phrases 4–5).

## Evidence

- OpenRouter TTS documentation: https://openrouter.ai/docs/guides/overview/multimodal/tts
  - POST /api/v1/audio/speech accepts model, input, voice, response_format; audio bytes are returned directly.
  - Supported response formats documented as mp3 and pcm; PCM MIME is audio/pcm and MP3 MIME is audio/mpeg.
  - Response header X-Generation-Id can be stored for tracking.
  - MAI-Voice-2 voice example uses en-US-Harper:MAI-Voice-2.
  - Gemini 3.8 TTS example uses a preset voice such as Kore; Puck is listed by the model API as a supported voice.
- Speech model catalog filtered to output_modalities=speech: https://openrouter.ai/api/v1/models?output_modalities=speech
  - Current Gemini 3.8 Flash TTS entry lists Puck among supported voices.
- Model pages:
  - https://openrouter.ai/google/gemini-3.8-flash-tts
  - https://openrouter.ai/microsoft/mai-voice-2
- Supplied-file analysis:
  - Ten OpenRouter samples are mono, 24 kHz; WAVs are PCM signed 16-bit; MP3s are MPEG audio.
  - The newly supplied openrouter-audio-output-109.mp3 transcribes to “I have about five years of experience in software development.”
  - The ten samples map to five distinct phrase texts, one WAV and one MP3 for each.
- No provider request was made during this research.

