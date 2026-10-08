import assert from "node:assert/strict";
import test from "node:test";
import { trackPlaybackCompletion } from "../src/lib/practice-events.ts";

const identity = {
  runId: "run",
  phraseId: "phrase",
  variantId: "voice",
  accountGeneration: "account",
  mode: "simultaneous",
};
test("reference completion counts once independently from longer take", () => {
  const tracker = trackPlaybackCompletion(identity);
  assert.equal(Object.isFrozen(tracker.run), true);
  assert.deepEqual(tracker.ended("reference"), {
    referenceComplete: true,
    comparisonComplete: false,
  });
  assert.deepEqual(tracker.ended("reference"), {
    referenceComplete: false,
    comparisonComplete: false,
  });
  assert.deepEqual(tracker.ended("take"), { referenceComplete: false, comparisonComplete: true });
  assert.deepEqual(tracker.ended("take"), { referenceComplete: false, comparisonComplete: false });
});
test("shorter take finishing first waits for reference; cancellation blocks late completion", () => {
  const tracker = trackPlaybackCompletion(identity);
  assert.deepEqual(tracker.ended("take"), { referenceComplete: false, comparisonComplete: false });
  tracker.cancel();
  assert.deepEqual(tracker.ended("reference"), {
    referenceComplete: false,
    comparisonComplete: false,
  });
});
test("words/chunks/solo never count full listens or comparisons", () => {
  for (const mode of ["word", "chunk", "solo"]) {
    const tracker = trackPlaybackCompletion({ ...identity, mode });
    tracker.ended("take");
    assert.deepEqual(tracker.ended("reference"), {
      referenceComplete: false,
      comparisonComplete: false,
    });
  }
});
