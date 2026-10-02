import assert from "node:assert/strict";
import test from "node:test";
import { SpeechEndDetector } from "../src/lib/speech-end.ts";

test("initial silence and a brief noise do not stop capture", () => {
  const detector = new SpeechEndDetector();
  assert.equal(detector.update(0, 5000), false);
  detector.update(0.1, 5100);
  assert.equal(detector.update(0, 10000), false);
});
test("only continuous 1500ms silence after sustained voice ends capture", () => {
  const detector = new SpeechEndDetector();
  detector.update(0.1, 0);
  detector.update(0.1, 250);
  assert.equal(detector.update(0, 1749), false);
  detector.update(0.1, 1750);
  assert.equal(detector.update(0, 3249), false);
  assert.equal(detector.update(0, 3250), true);
});
