# Practice audio audit — 008, T012–013

Date: 2026-10-08. Local snapshot: `8a283c31873ea10397041e2c332d27fb17be5b60`.
No provider generation, upload, remote data or human listening was performed.

## Reproduction and limits

Run `node tests/fixtures/practice-audio/probe-legacy-word-boundary.mjs` for the diagnostic summary; add `--assert-isolated` for the deliberately red legacy-boundary assertion. The probe executes the actual `stopAtWordEnd` callback extracted from `useShadowingPractice.ts`, with a deterministic media clock and synthetic target/neighbor amplitude markers. It does not run browser decoding, seek or a real speaker.

Requested interval20–100ms; neighboring marker starts105ms. Foreground ticks ending96,112ms pause at112ms:12ms overshoot and7 neighboring samples at1kHz. Delayed tick180ms:80ms overshoot and55 neighboring samples. Therefore checking the end from RAF admits adjacent content even with mathematically correct cues. A foreground50ms tolerance does not establish lexical isolation. Background/device timing remains a separate check.

This is a reproducible transport failure pattern, **not proof of the specific phonetic cause of the owner's reported recordings**. Synthetic marker inclusion is an amplitude assertion; it is not a listening judgment or pronunciation evaluation. T015 must integrate duration-scheduled decoded playback rather than carry this polling mechanism into reviewed units; the legacy probe remains red until that integration removes/replaces the old path.

## Ranked hypotheses and observations

1. **End polling delay:** If polling causes contamination, delaying the next tick increases neighboring samples. Verified:12→80ms overshoot,7→55 neighbor samples. Precise scheduled duration is the future integration treatment; blanket padding would worsen this mechanism.
2. **Alignment differs from phonetic boundaries:** If cue intervals are good for highlights but not word isolation, clocks/checksums can pass while a listener hears a missing onset or neighboring phoneme. Not established without annotated listening. Every exposed isolated example must have two distinct approving listeners; no production word is approved here.
3. **Seek/decoder onset differences:** If media seek is inaccurate, MP3/WAV browser playback differs from decoded-buffer selection despite matching source duration. Not tested on browsers/devices here. Scheduling cannot correct a bad annotation.
4. **Wrong source/provenance:** If local assets do not match their variants, SHA/duration checks fail. All160 active variant byte hashes match;12 stratified first-phrase samples across six playlists/two voices have exact metadata/container-duration agreement. This reduces local mismatch suspicion, not remote/browser cache risk.
5. **Stale requests/races:** If async replay attaches an old phrase/source, rapid selection must expose a run-identity failure. Inspection finds existing phrase/sequence/capture guards before setting replay source; no race reproduced here. Preserve and extend those guards in T015; do not claim race absence from inspection alone.

## Factual content audit

Read the versioned Voice Comparison fixture and `docs/content/work-playlists.json`; filtered variants by their selectable model; hashed local `assets/reference-audio` bytes; checked cue cardinality/order/bounds; queried local ffprobe container duration for first phrase in each playlist and both voices.

- Six playlists,80 phrases,160 active variants;1356 word cues.
- Zero local SHA mismatches, zero nonpositive/overlapping/out-of-duration cues, zero phrase token-count mismatches, zero intervals shorter than50ms.
-1179 cues begin exactly at the preceding cue end. This is **not** proof of coarticulation or faulty alignment; it makes padding unsafe without reviewed bounds.
- First-phrase metadata/container durations (Puck / Harper, ms): Voice Comparison2440/3216; Team Meetings3120/2904; Deadlines2560/2472; Colleagues2400/2448; Clients2120/1872; Career Growth3040/2472. These are container durations, not audible onset measurements.

## Implemented seam and remaining gates

`practice-learning-units.ts` independently validates phrase/voice/reference checksum, exact contiguous token text, bounds, type, private isolated asset destination/checksum and two distinct complete/no-adjacent-speech review judgments. Unknown/stale/unapproved units yield an explicitly labelled whole-phrase **In context** fallback. Natural linking uses reviewed reference ranges; generated isolated assets cannot masquerade as linking. Highlight timings remain unchanged.

Tests contain only synthetic reviewer identities; they approve no production content. No listener annotations or provider assets were fabricated. Unit tests prove metadata withholding and synthetic sample selection, **not actual playback timing**. T014 must decode metadata; T015 must connect the seam and transport/UI; T016 must obtain independent human approval for every exposed unit. Until then existing UI remains unchanged and no claim of repaired perceptual quality is made.

## Integration result — 2026-10-08

T014 decoding and T015 playback are now integrated. Reviewed reference ranges use decoded-buffer `start(when, startSeconds, durationSeconds)`, with exact synthetic boundary and stale-owner tests. Whole-phrase fallback retains the HTML media path; its legacy RAF end probe still demonstrates why that path is unsuitable for isolated crops. No approved isolated range uses that poller. Highlight timings are unchanged.

All checked-in approvals remain empty. The visible fallback explicitly says **In context** and plays the whole selected-voice phrase; it is excluded from full-reference history. This implementation withholds unsafe word clips rather than certifying production pronunciation. Stratified listening diagnosis and two-listener approval for each proposed isolated/contextual unit remain pending. No paid pilot or asset/schema import ran.
