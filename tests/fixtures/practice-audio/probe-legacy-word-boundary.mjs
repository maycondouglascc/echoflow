import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const fixture = JSON.parse(readFileSync(new URL("./lexical-boundaries.json", import.meta.url)));
const hook = readFileSync(
  new URL("../../../src/components/useShadowingPractice.ts", import.meta.url),
  "utf8",
);
const expression = hook.match(/const stopAtWordEnd = (\(\) => \{[\s\S]*?\n {4}\});/);
assert.ok(expression, "Probe must exercise the original hook's actual stopAtWordEnd body.");
const pcm = new Float32Array(fixture.durationMs);
for (let i = fixture.target.startMs; i < fixture.target.endMs; i++)
  pcm[i] = fixture.target.amplitude;
for (let i = fixture.neighbor.startMs; i < fixture.neighbor.endMs; i++)
  pcm[i] = fixture.neighbor.amplitude;
let leaked = 0;
for (const [profile, ticks] of [
  ["foreground", fixture.foregroundTicksMs],
  ["delayed", fixture.delayedTicksMs],
]) {
  let pausedAt;
  const audio = {
    currentTime: 0,
    pause() {
      pausedAt = audio.currentTime * 1000;
    },
  };
  const stopAtWordEnd = runInNewContext(`(${expression[1]})`, {
    audio,
    phaseRef: {
      current: {
        kind: "playing",
        playback: "word-replay",
        endMs: fixture.target.endMs,
        returnTo: "ready",
      },
    },
    playbackSequenceRef: { current: 0 },
    setCurrentWordIndex() {},
    transition() {},
  });
  for (const tick of ticks) {
    audio.currentTime = tick / 1000;
    if (stopAtWordEnd()) break;
  }
  assert.ok(pausedAt !== undefined);
  const neighborSamples = [...pcm.slice(fixture.target.startMs, Math.round(pausedAt))].filter(
    (v) => v === fixture.neighbor.amplitude,
  ).length;
  console.log(
    JSON.stringify({
      profile,
      pausedAtMs: pausedAt,
      overshootMs: pausedAt - fixture.target.endMs,
      neighborSamples,
    }),
  );
  leaked += neighborSamples;
}

if (process.argv.includes("--assert-isolated"))
  assert.equal(leaked, 0, "Adjacent synthetic lexical marker leaked past requested word boundary.");
