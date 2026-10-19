# Work playlists — approved content batch

Approved: 2026-10-04. Five work situations, fifteen canonical English phrases per
playlist, one Puck and one Harper reference per phrase: 75 phrases and 150 files.
The exact approved texts and order are in `work-playlists.json`. Existing Voice
Comparison content and user completions remain intact.

This is content maintenance within the accepted feature 005 catalog. It introduces
no new practice behavior, schema, authentication rule, or RLS policy. A new full
product feature specification is unnecessary for this bounded content batch.

## Execution and acceptance

- [x] Preserve all 75 approved texts in five ordered playlists.
- [x] Preview exactly 150 unique private destinations; verify missing voices and
  incomplete playlists are rejected with deterministic provider fixtures.
- [x] Generate Puck WAV and Harper MP3 references, with SHA-256 and provider provenance.
- [x] Align each file locally against the canonical text and validate positive,
  nonoverlapping word intervals within audio duration. Do not fabricate cues.
- [x] Regenerate the local seed and checksums only after all 150 variants are ready.
- [x] Upload to the existing private `phrase-audio` bucket, verify stored checksums,
  and atomically add the five playlists without changing existing content or users.
- [x] Verify 15 phrases and both voices per playlist, anonymous access remains denied,
  and applicable tooling, lint, typecheck, build and browser checks.

## Generation

Default `npm run audio:generate` remains the original ten-variant comparison batch.
For this batch, pass `--catalog docs/content/work-playlists.json`. Preview does not
read a key or use the network. Execution requires the private `OPENROUTER_API_KEY`
and explicit `--execute`. Existing complete files are skipped; there are no
provider retries. An interrupted metadata write uses the existing recovery journal.
All output stays under `assets/reference-audio/work`, outside `public`.

The user requested both voices explicitly. The generation budget is 150 successful
requests, with no automatic retries or replacement of existing audio. Local alignment
uses the already cached faster-whisper medium/small models; it calls no paid provider.

## Verification result

Completed on 2026-10-04 in `codex/work-playlists-catalog`. The authorized remote
project now has six playlists: the original five-phrase Voice Comparison and
five new fifteen-phrase work playlists. Every new phrase has Puck and Harper,
private stored bytes verified by SHA-256, canonical word cues and duration.

- 16 Python content/generator checks passed, including complete/resumed fake
  generation and invalidation of obsolete word cues after regeneration.
- 34 local SQL checks passed using anonymous access and distinct A/B users. The
  new content and test users existed only inside rolled-back test transactions.
- Lint, TypeScript, 4 deterministic Node test files and standard Turbopack build passed.
- Anonymous remote catalog/audio access was denied. The authenticated browser
  showed all five new playlists with 15 phrases and both voices. The first Team
  Meetings reference played with Puck and Harper; word replay controls matched
  the selected voice. Full real-device listening remains the existing release gate.
- Only approved catalog/audio content was added remotely. No schema, RLS,
  existing user data, or existing playlist was changed.

The SQL import is recorded in `work-playlists.sql`; the local fresh-stack seed
and checksum manifest include all six playlists and 163 reference assets
(160 active variants plus the three original archived baselines).
