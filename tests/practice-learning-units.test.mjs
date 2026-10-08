import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { decodeLearningUnit, learningReplayForWord } from "../src/lib/practice-learning-units.ts";

const reference = {
  phraseId: "example",
  text: "Could you help?",
  voiceId: "puck",
  sha256: "a".repeat(64),
  src: "/api/reference-audio/example",
  durationMs: 180,
};
// Synthetic review identities test validation only: no actual audio is approved.
const reviews = ["fixture-one", "fixture-two"].map((reviewerId) => ({
  reviewerId,
  complete: true,
  noAdjacentLexicalSpeech: true,
}));
const context = {
  id: "could-you",
  phraseId: reference.phraseId,
  voiceId: reference.voiceId,
  referenceSha256: reference.sha256,
  kind: "linking-chunk",
  tokenStart: 0,
  tokenEnd: 1,
  text: "Could you",
  source: { kind: "reference-range", startMs: 20, endMs: 100 },
  reviews,
};
const isolated = {
  ...context,
  id: "could",
  kind: "isolated-word",
  tokenEnd: 0,
  text: "Could",
  source: {
    kind: "private-asset",
    src: "/api/practice-audio/could",
    sha256: "b".repeat(64),
    durationMs: 90,
  },
};

test("only individually approved matching phrase/voice/checksum units are exposed", () => {
  assert.equal(decodeLearningUnit(context, reference)?.kind, "linking-chunk");
  for (const bad of [
    null,
    {},
    { ...context, voiceId: "harper" },
    { ...context, phraseId: "other" },
    { ...context, referenceSha256: "b".repeat(64) },
    { ...context, reviews: [] },
    { ...context, reviews: [reviews[0], reviews[0]] },
    { ...context, reviews: [reviews[0], { ...reviews[1], complete: false }] },
    { ...context, reviews: [reviews[0], { ...reviews[1], noAdjacentLexicalSpeech: false }] },
  ]) {
    assert.equal(decodeLearningUnit(bad, reference), null);
    assert.equal(learningReplayForWord(reference, [bad], 0).kind, "whole-phrase");
  }
});
test("invalid token/type/range/source never becomes an isolated word", () => {
  for (const bad of [
    { ...context, tokenStart: -1 },
    { ...context, tokenEnd: 3 },
    { ...context, tokenEnd: 0.5 },
    { ...context, text: "fabricated" },
    { ...context, source: { ...context.source, endMs: 181 } },
    { ...context, source: { ...context.source, startMs: NaN } },
    { ...context, source: { ...context.source, endMs: 20 } },
    { ...context, kind: "isolated-word" },
    { ...isolated, source: context.source },
    { ...isolated, source: { ...isolated.source, src: "https://public.invalid/audio" } },
    { ...isolated, source: { ...isolated.source, sha256: "bad" } },
  ])
    assert.equal(decodeLearningUnit(bad, reference), null);
});
test("isolated assets win over context only with their own approval; linking stays natural", () => {
  const replay = learningReplayForWord(reference, [context, isolated], 0);
  assert.equal(replay.kind, "isolated-word");
  assert.equal(replay.src, "/api/practice-audio/could");
  assert.equal(replay.sha256, "b".repeat(64));
  assert.equal(
    learningReplayForWord(reference, [context, isolated], 1).label,
    "In context: Could you",
  );
  assert.equal(learningReplayForWord(reference, [], 0).label, "In context: Could you help?");
  assert.equal(learningReplayForWord(reference, [], 3), null);
  assert.equal(learningReplayForWord({ ...reference, durationMs: 0 }, [], 0), null);
});
test("validated context duration excludes neighboring PCM markers without mutating highlight cues", () => {
  const fixture = JSON.parse(
    readFileSync(new URL("./fixtures/practice-audio/lexical-boundaries.json", import.meta.url)),
  );
  const pcm = new Float32Array(fixture.durationMs);
  pcm.fill(fixture.target.amplitude, fixture.target.startMs, fixture.target.endMs);
  pcm.fill(fixture.neighbor.amplitude, fixture.neighbor.startMs, fixture.neighbor.endMs);
  const before = JSON.stringify(context);
  const replay = learningReplayForWord(reference, [context], 0);
  const selected = pcm.slice(replay.startMs, replay.endMs);
  assert.equal(selected.length, 80);
  assert.ok(selected.every((sample) => sample === fixture.target.amplitude));
  assert.equal(JSON.stringify(context), before);
});
