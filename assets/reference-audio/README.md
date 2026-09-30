# Reference audio catalog

The canonical catalog is src/lib/fixtures/voice-comparison.json. It binds each phrase to its model/voice choices, file path, format, checksum, duration, and provenance. The browser plays these pre-generated same-origin files; it does not call OpenRouter.

## Active OpenRouter samples

The ten user-provided audio exports are organized by phrase, model, and voice. The original uploaded filename is retained as provenance in the catalog.

| Phrase | Google · Puck (Gemini 3.8 Flash TTS) | Microsoft · Harper (MAI-Voice-2) |
|---|---|---|
| introducing-yourself-01 | openrouter/introducing-yourself-01--google-gemini-3-8-flash-tts--puck.wav | openrouter/introducing-yourself-01--microsoft-mai-voice-2--en-us-harper-mai-voice-2.mp3 |
| introducing-yourself-02 | openrouter/introducing-yourself-02--google-gemini-3-8-flash-tts--puck.wav | openrouter/introducing-yourself-02--microsoft-mai-voice-2--en-us-harper-mai-voice-2.mp3 |
| introducing-yourself-03 | openrouter/introducing-yourself-03--google-gemini-3-8-flash-tts--puck.wav | openrouter/introducing-yourself-03--microsoft-mai-voice-2--en-us-harper-mai-voice-2.mp3 |
| at-a-restaurant-01 | openrouter/at-a-restaurant-01--google-gemini-3-8-flash-tts--puck.wav | openrouter/at-a-restaurant-01--microsoft-mai-voice-2--en-us-harper-mai-voice-2.mp3 |
| job-interview-basics-02 | openrouter/job-interview-basics-02--google-gemini-3-8-flash-tts--puck.wav | openrouter/job-interview-basics-02--microsoft-mai-voice-2--en-us-harper-mai-voice-2.mp3 |

All ten supplied samples are mono, 24 kHz. Google files are PCM signed 16-bit WAV; Microsoft files are MP3. The Job Interview Basics sample came from openrouter-audio-output-109.mp3 and was transcribed as “I have about five years of experience in software development.” Checksums and exact measured durations are in the JSON catalog.

The manual exports do not contain known OpenRouter generation IDs or generation timestamps. Their catalog entries keep both values null rather than infer them from file timestamps.

## Archived eSpeak NG baseline

These three local samples remain unchanged and cataloged for provenance. They are archived and are not selectable in the current voice comparison; phrases 4 and 5 have no eSpeak baseline.

| File | Phrase | SHA-256 |
|---|---|---|
| introducing-yourself-01.wav | Hi, my name is Alex. It's nice to meet you. | 63200d82f67339c31bb6617627aa28a00ec1b9a1240ea051356e84a93fd792ac |
| introducing-yourself-02.wav | I'm originally from Recife, but I've been living here for a few years. | 30a0c9cc8afc36a7388c28f063e3609e4e54eb5e4f9dedb36e99877b89752d62 |
| introducing-yourself-03.wav | I work as a software engineer at a tech company downtown. | b7c7877ee4d0a18d8b78f96e118923f76d2e14ecc5e5c3148e155a4b284e7d23 |

Baseline generation details: eSpeak NG 1.52.0 C API, voice en-us, 150 words per minute, mono signed 16-bit PCM WAV at 22,050 Hz. Regenerate with scripts/generate-reference-audio.sh after installing the eSpeak NG library and voice data. This script regenerates only the three archived entries.

The upstream eSpeak NG source and voice data are GPL-3.0-or-later ([upstream license](https://github.com/espeak-ng/espeak-ng/blob/master/COPYING), [voice documentation](https://github.com/espeak-ng/espeak-ng/blob/master/docs/voices.md)). The project does not bundle the library or voice data. Review applicable terms before publishing or sharing those baseline WAVs.

## Preparing future OpenRouter batches

Preview the configured phrase/model/voice pairs without a key or network:

    python3 scripts/generate-openrouter-audio.py

The script reads the same fixture as the app. To request synthesis, set OPENROUTER_API_KEY in the local shell and pass --execute. Existing files are skipped unless --force is also passed. Requests run serially; the script validates audio content before atomically writing each file and records the returned generation ID, UTC time, and checksum. It never uses learner recordings and is not part of app playback, build, tests, or CI.

Google uses the TTS endpoint's PCM response and wraps it as mono 24 kHz signed 16-bit WAV. Microsoft uses the MP3 response directly. No API generation call was made to catalog the supplied batch.

Human listening on supported browsers and devices remains part of audio quality validation. File metadata and transcription identify samples but do not establish which voice sounds better for learners.
