# Research: Smooth Word Highlight and Word Replay

## Decisions

### Animate one highlight element, not the transcript layout

**Decision**: Use Motion for React shared layout animation for the active highlight background. Keep each transcript word's text and box in a fixed inline position; only an absolutely positioned background moves between words.

**Rationale**: The current active style adds padding only to the highlighted word. That changes inline text geometry when the active index changes, causing the reported jump. A shared highlight preserves visual continuity across words while keeping transcript text stationary. Motion documents `layoutId` as a shared element transition and performs layout movement with transforms.

**Alternatives considered**:
- CSS color/background transitions on each word: smoother colors, but no continuous movement between words.
- Hand-written FLIP or requestAnimationFrame transforms: duplicates layout measurement and interruption handling already supplied by Motion.
- Animating the text or its dimensions: rejected because the text is content the learner is actively reading and must not move.

### Use Motion's reduced-motion policy and a short transition

**Decision**: Set Motion's reduced-motion behavior to respect the user's system preference. Use a short ease-out transition for this frequent, state-driven change; do not add bounce or scale effects.

**Rationale**: This is state indication and a bridge between positions, not decoration. The highlight may change repeatedly as the audio advances. The external `animate` skill says to avoid keyframes for rapidly-triggered transitions, keep UI transitions under 300ms, include reduced-motion behavior from the start, and reserve Motion for layout/shared-element work. We use the skill's criteria without installing it into the repository.

**Alternatives considered**:
- A spring with visible bounce: rejected because the highlight advances repeatedly and bounce would compete with reading.
- No animation: acceptable for reduced-motion users, but does not address the requested abrupt spatial change for other users.

### Keep word replay on a preloaded reference media element

**Decision**: Render one hidden media element for the current selected reference variant with preload enabled. Word replay uses that element, seeks to the selected cue, plays it, and stops at the cue end. The existing player continues handling complete reference clips and personal recordings.

**Rationale**: The 10 selected audio assets total about 1.1 MB and each file is at most 200 KB. Preloading only the current phrase and selected voice keeps the user's click path short and avoids replacing the personal recording's media source while obtaining metadata. Each voice/phrase already has its own locally stored word cues, so replay has no provider or transcription request.

**Alternatives considered**:
- Reuse the active media element and change its source on word click: adds a metadata wait when personal playback is active and may lose browser user activation before playback begins.
- Play the whole reference phrase from the beginning: does not fulfill the request to replay the selected word.
- Estimate cue boundaries from text length: less accurate than the aligned interval already stored for the exact audio variant.

### Protect the practice state around replay

**Decision**: Treat word replay as its own playback kind. Starting it interrupts ordinary audio and comparison sequencing; reaching the cue end or an error returns the user to the preexisting idle/ready state. Disable the action while microphone access or capture is active.

**Rationale**: A word replay should not accidentally start the recording step or keep the comparison sequence running after the user has chosen a different action.

## Sources

- [Motion shared layout animations](https://motion.dev/docs/react-layout-animations) — `layoutId` links a shared visual element across components and supports transition customization.
- [Motion React installation for Next.js](https://motion.dev/docs/react-installation) — App Router supports `motion/react` and `motion/react-client`; the latter can reduce client JavaScript.
- [Motion reduced-motion accessibility](https://motion.dev/docs/react-accessibility) — Motion can honor system reduced-motion settings and disable layout/transform animation.
- [Skill directory entry: animate](https://www.skills.sh/emilkowalski/skills/animate) — construction guidance, 97.3K installs and 40.9K repository stars at research time; the underlying skill recommends Motion for layout transitions and reduced-motion support.
- [Skill source: animate](https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md) — detailed rules used to choose a short, interruptible transition without moving readable content.
- [Skill directory entry: improve-animations](https://www.skills.sh/emilkowalski/skills/improve-animations) — related audit-and-plan skill; it does not implement changes.
