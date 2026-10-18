import assert from "node:assert/strict";
import test from "node:test";
import { createPracticeCuePlayer } from "../src/lib/practice-sounds.ts";

test("cues require opt-in and gesture; busy and duplicate events are dropped permanently", () => {
  const tones = [];
  const player = createPracticeCuePlayer((kind) => {
    tones.push(kind);
  });
  const event = (eventId) => ({ eventId, kind: "ready" });
  player.emitPracticeCue(event("disabled"), { enabled: false, busy: false, userGesture: true });
  player.emitPracticeCue(event("gesture"), { enabled: true, busy: false, userGesture: false });
  player.emitPracticeCue(event("busy"), { enabled: true, busy: true, userGesture: true });
  player.emitPracticeCue(event("busy"), { enabled: true, busy: false, userGesture: true });
  player.emitPracticeCue(event("ready"), { enabled: true, busy: false, userGesture: true });
  player.emitPracticeCue(event("ready"), { enabled: true, busy: false, userGesture: true });
  assert.deepEqual(tones, ["ready"]);
  player.dispose();
  player.emitPracticeCue(event("late"), { enabled: true, busy: false, userGesture: true });
  assert.deepEqual(tones, ["ready"]);
});

test("failed cues are nonblocking and stopping suppresses active sound", () => {
  let stops = 0;
  const player = createPracticeCuePlayer(() => () => {
    stops++;
  });
  player.emitPracticeCue(
    { eventId: "saved", kind: "take-saved" },
    { enabled: true, busy: false, userGesture: true },
  );
  player.stop();
  player.stop();
  assert.equal(stops, 1);
  const failed = createPracticeCuePlayer(() => {
    throw new Error("autoplay");
  });
  assert.doesNotThrow(() =>
    failed.emitPracticeCue(
      { eventId: "failed", kind: "ready" },
      { enabled: true, busy: false, userGesture: true },
    ),
  );
});

test("local tone is bounded to 160ms and never waits for a suspended context", () => {
  const original = globalThis.AudioContext;
  const scheduled = [],
    amplitudes = [];
  let context,
    resumeCount = 0;
  globalThis.AudioContext = class {
    constructor() {
      context = this;
      this.state = "suspended";
      this.currentTime = 12;
      this.destination = {};
    }
    resume() {
      resumeCount++;
      return Promise.resolve();
    }
    close() {
      return Promise.resolve();
    }
    createOscillator() {
      return {
        frequency: {},
        connect() {},
        disconnect() {},
        start: (time) => scheduled.push(["start", time]),
        stop: (time) => scheduled.push(["stop", time]),
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: (value) => amplitudes.push(value),
          linearRampToValueAtTime: (value) => amplitudes.push(value),
        },
        connect() {},
        disconnect() {},
      };
    }
  };
  try {
    const player = createPracticeCuePlayer();
    player.unlock();
    player.emitPracticeCue(
      { eventId: "suspended", kind: "ready" },
      { enabled: true, busy: false, userGesture: true },
    );
    assert.deepEqual(scheduled, []);
    context.state = "running";
    player.emitPracticeCue(
      { eventId: "suspended", kind: "ready" },
      { enabled: true, busy: false, userGesture: true },
    );
    assert.deepEqual(scheduled, []);
    player.emitPracticeCue(
      { eventId: "fresh", kind: "ready" },
      { enabled: true, busy: false, userGesture: true },
    );
    assert.deepEqual(scheduled, [
      ["start", 12],
      ["stop", 12.16],
    ]);
    assert.deepEqual(amplitudes, [0, 0.035, 0]);
    assert.equal(resumeCount, 1);
    player.dispose();
  } finally {
    globalThis.AudioContext = original;
  }
});
