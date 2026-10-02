import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// Native TypeScript execution; resolve the same relative TS imports as the bundler.
const hook = registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier)) {
      return next(`${specifier}.ts`, context);
    }
    return next(specifier, context);
  },
});
const { beginCapture } = await import("../src/lib/capture-session.ts");
hook.deregister();

function setup(t, { startFails = false, stopFails = false, constructFails = false } = {}) {
  t.mock.timers.enable({ apis: ["Date", "setTimeout", "setInterval"], now: 1000 });
  let recorder,
    stops = 0;
  const original = Object.getOwnPropertyDescriptor(globalThis, "MediaRecorder");
  class Recorder {
    static isTypeSupported() {
      return true;
    }
    state = "inactive";
    mimeType = "audio/webm";
    constructor() {
      if (constructFails) throw new Error("construction failed");
      recorder = this;
    }
    start() {
      if (startFails) throw new Error("start failed");
      this.state = "recording";
    }
    stop() {
      if (stopFails) throw new Error("stop failed");
      this.state = "inactive";
    }
    finish(empty = false) {
      this.ondataavailable({ data: new Blob(empty ? [] : ["audio"], { type: this.mimeType }) });
      this.onstop();
    }
  }
  Object.defineProperty(globalThis, "MediaRecorder", { configurable: true, value: Recorder });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "MediaRecorder", original);
    else delete globalThis.MediaRecorder;
  });
  const events = { progress: [], saving: [], saved: [], errors: [] };
  const stream = { getTracks: () => [{ stop: () => stops++ }] };
  const callbacks = {
    onProgress: (duration) => events.progress.push(duration),
    onSaving: (...args) => events.saving.push(args),
    onSaved: (blob) => events.saved.push(blob),
    onError: (message) => events.errors.push(message),
  };
  return {
    stream,
    callbacks,
    events,
    get recorder() {
      return recorder;
    },
    get stops() {
      return stops;
    },
  };
}

test("manual save releases once and accepts the final asynchronous chunk", (t) => {
  const fixture = setup(t);
  const capture = beginCapture(fixture.stream, fixture.callbacks);
  t.mock.timers.tick(500);
  capture.stop("manual");
  capture.stop("manual");
  assert.equal(fixture.stops, 1);
  assert.deepEqual(fixture.events.saving, [["manual", 500]]);
  fixture.recorder.finish();
  fixture.recorder.onstop();
  assert.equal(fixture.events.saved.length, 1);
  assert.equal(fixture.events.saved[0].size, 5);
  t.mock.timers.tick(60000);
  assert.deepEqual(fixture.events.progress, [0]);
  assert.equal(fixture.stops, 1);
});
for (const reason of ["navigation", "unmount"]) {
  test(`${reason} discards late recorder output and errors`, (t) => {
    const fixture = setup(t);
    const capture = beginCapture(fixture.stream, fixture.callbacks);
    capture.stop(reason);
    fixture.recorder.finish();
    fixture.recorder.onerror();
    assert.equal(fixture.stops, 1);
    assert.deepEqual(fixture.events.saved, []);
    assert.deepEqual(fixture.events.errors, []);
    t.mock.timers.tick(60000);
    assert.deepEqual(fixture.events.saving, []);
  });
}
test("recorder startup failure releases the stream", (t) => {
  const fixture = setup(t, { startFails: true });
  assert.throws(() => beginCapture(fixture.stream, fixture.callbacks), /start failed/);
  assert.equal(fixture.stops, 1);
});
test("stop failure reports once and still releases all capture resources", (t) => {
  const fixture = setup(t, { stopFails: true });
  const capture = beginCapture(fixture.stream, fixture.callbacks);
  t.mock.timers.tick(100);
  capture.stop("manual");
  fixture.recorder.onerror();
  fixture.recorder.finish();
  assert.equal(fixture.stops, 1);
  assert.equal(fixture.events.errors.length, 1);
  assert.equal(fixture.events.saved.length, 0);
});
test("the limit stops once at 30 seconds and cancels progress updates", (t) => {
  const fixture = setup(t);
  beginCapture(fixture.stream, fixture.callbacks);
  t.mock.timers.tick(30000);
  assert.deepEqual(fixture.events.saving, [["limit", 30000]]);
  fixture.recorder.finish();
  const count = fixture.events.progress.length;
  t.mock.timers.tick(60000);
  assert.equal(fixture.events.progress.length, count);
  assert.equal(fixture.events.saved.length, 1);
  assert.equal(fixture.stops, 1);
});
test("empty output reports failure without publishing a take", (t) => {
  const fixture = setup(t);
  const capture = beginCapture(fixture.stream, fixture.callbacks);
  t.mock.timers.tick(100);
  capture.stop("manual");
  fixture.recorder.finish(true);
  assert.equal(fixture.events.errors.length, 1);
  assert.equal(fixture.events.saved.length, 0);
  assert.equal(fixture.stops, 1);
});

test("recorder construction failure releases the stream", (t) => {
  const fixture = setup(t, { constructFails: true });
  assert.throws(() => beginCapture(fixture.stream, fixture.callbacks), /construction failed/);
  assert.equal(fixture.stops, 1);
});
test("a recorder error cancels timers and ignores late stop output", (t) => {
  const fixture = setup(t);
  const capture = beginCapture(fixture.stream, fixture.callbacks);
  t.mock.timers.tick(100);
  fixture.recorder.onerror();
  fixture.recorder.finish();
  capture.stop("manual");
  t.mock.timers.tick(60000);
  assert.equal(fixture.stops, 1);
  assert.equal(fixture.events.errors.length, 1);
  assert.equal(fixture.events.saved.length, 0);
  assert.deepEqual(fixture.events.progress, [0]);
});
