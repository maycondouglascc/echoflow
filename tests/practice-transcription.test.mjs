import assert from "node:assert/strict";
import test from "node:test";
import {
  createLocalRecognitionAdapter,
  probeLocalRecognition,
} from "../src/lib/practice-transcription.ts";

const evidence = {
  localProcessingVerified: true,
  offlineVerified: true,
  recorderCoexistenceVerified: true,
  reference: "device-test-fixture",
};
function fixture() {
  let handlers,
    starts = 0,
    stops = 0;
  const provider = {
    evidence,
    probe: async () => "ready",
    start: (options) => {
      starts++;
      handlers = options;
      return {
        stop() {
          stops++;
        },
      };
    },
  };
  return {
    provider,
    get handlers() {
      return handlers;
    },
    get starts() {
      return starts;
    },
    get stops() {
      return stops;
    },
  };
}
test("no default recognizer and no incomplete evidence can start recognition", async () => {
  assert.equal(await probeLocalRecognition(), "unsupported");
  const f = fixture();
  f.provider.evidence = { ...evidence, offlineVerified: false };
  assert.equal(await probeLocalRecognition(f.provider), "unsupported");
  const adapter = createLocalRecognitionAdapter(f.provider);
  const unavailable = [];
  await adapter.startLocalRecognition({
    attemptId: "a",
    lang: "en",
    optedIn: true,
    mode: "repeat",
    onInterim() {},
    onFinal() {},
    onUnavailable: (reason) => unavailable.push(reason),
    onError() {},
  });
  assert.equal(f.starts, 0);
  assert.deepEqual(unavailable, ["unsupported"]);
});
test("attempt scoped results, finals replace interim, stop is idempotent and late callbacks ignored", async () => {
  const f = fixture();
  const adapter = createLocalRecognitionAdapter(f.provider);
  const results = [];
  const options = {
    attemptId: "a",
    lang: "en",
    optedIn: true,
    mode: "repeat",
    onInterim: (text) => results.push(["interim", text]),
    onFinal: (text) => results.push(["final", text]),
    onUnavailable() {},
    onError() {},
  };
  await adapter.startLocalRecognition(options);
  f.handlers.onInterim("hel");
  f.handlers.onFinal("hello");
  adapter.stop();
  adapter.stop();
  f.handlers.onInterim("late");
  assert.deepEqual(results, [
    ["interim", "hel"],
    ["final", "hello"],
  ]);
  assert.equal(f.stops, 1);
});
test("opt-out, with-reference and missing model stay unavailable without provider start", async () => {
  const f = fixture();
  const adapter = createLocalRecognitionAdapter(f.provider);
  const reasons = [];
  const options = {
    attemptId: "a",
    lang: "en",
    optedIn: false,
    mode: "repeat",
    onInterim() {},
    onFinal() {},
    onUnavailable: (reason) => reasons.push(reason),
    onError() {},
  };
  await adapter.startLocalRecognition(options);
  await adapter.startLocalRecognition({ ...options, optedIn: true, mode: "with-reference" });
  f.provider.probe = async () => "needs-model";
  await adapter.startLocalRecognition({ ...options, optedIn: true });
  assert.equal(f.starts, 0);
  assert.deepEqual(reasons, ["opted-out", "with-reference", "needs-model"]);
});
test("stale asynchronous probe cannot start a replaced attempt; errors stop recognition only", async () => {
  const f = fixture();
  let resolveProbe;
  f.provider.probe = () =>
    new Promise((resolve) => {
      resolveProbe = resolve;
    });
  const adapter = createLocalRecognitionAdapter(f.provider);
  const errors = [];
  const options = {
    attemptId: "a",
    lang: "en",
    optedIn: true,
    mode: "repeat",
    onInterim() {},
    onFinal() {},
    onUnavailable() {},
    onError: () => errors.push("error"),
  };
  const pending = adapter.startLocalRecognition(options);
  adapter.stop();
  resolveProbe("ready");
  await pending;
  assert.equal(f.starts, 0);
  f.provider.probe = async () => "ready";
  await adapter.startLocalRecognition(options);
  f.handlers.onError();
  f.handlers.onFinal("late");
  assert.deepEqual(errors, ["error"]);
  assert.equal(f.stops, 1);
});
