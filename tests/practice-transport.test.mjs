import assert from "node:assert/strict";
import test from "node:test";
import { createPracticeTransport } from "../src/lib/practice-transport.ts";

function setup(t, { failStart = false, suspended = false } = {}) {
  const nodes = [],
    gains = [];
  let closes = 0;
  const context = {
    currentTime: 10,
    state: suspended ? "suspended" : "running",
    destination: {},
    resume: async () => {},
    close: async () => {
      closes++;
      context.state = "closed";
    },
    decodeAudioData: async () => ({ duration: 3 }),
    createGain: () => {
      const g = { gain: { value: 0 }, connect() {}, disconnect() {} };
      gains.push(g);
      return g;
    },
    createBufferSource: () => {
      const node = {
        connect() {},
        disconnect() {},
        stop() {
          node.stopped = true;
        },
        start(time) {
          if (failStart && nodes.length === 2) throw new Error("start failed");
          node.time = time;
        },
      };
      nodes.push(node);
      return node;
    },
  };
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(2),
  }));
  return {
    transport: createPracticeTransport(() => context),
    context,
    nodes,
    gains,
    get closes() {
      return closes;
    },
  };
}
test("dual sources share clock and retain expected offset, independent ends, bounded gains", async (t) => {
  const f = setup(t);
  const ends = [];
  const prepared = await f.transport.prepare("ref", "take");
  f.transport.start(prepared, 250, { onEnded: (source) => ends.push(source), onError() {} });
  assert.ok(Math.abs(f.nodes[0].time - f.nodes[1].time - 0.25) < 1e-10);
  f.transport.setVolumes(1, 1);
  assert.deepEqual(
    f.gains.map((gain) => gain.gain.value),
    [0.5, 0.5],
  );
  f.nodes[1].onended();
  assert.deepEqual(ends, ["take"]);
  f.context.currentTime = 10.6;
  assert.ok(Math.abs(f.transport.referenceTimeMs() - 250) < 1e-8);
  f.nodes[0].onended();
  assert.deepEqual(ends, ["take", "reference"]);
  assert.equal(f.transport.referenceTimeMs(), null);
  f.transport.cancel();
  f.transport.cancel();
  assert.equal(f.closes, 1);
});
test("second source failure stops first and releases context", async (t) => {
  const f = setup(t, { failStart: true });
  const prepared = await f.transport.prepare("ref", "take");
  assert.throws(
    () => f.transport.start(prepared, 0, { onEnded() {}, onError() {} }),
    /start failed/,
  );
  assert.equal(f.nodes[0].stopped, true);
  assert.equal(f.closes, 1);
});
test("cancel during pending decode discards result without any source start", async (t) => {
  const f = setup(t);
  let resolve;
  f.context.decodeAudioData = () =>
    new Promise((done) => {
      resolve = done;
    });
  const preparing = f.transport.prepare("ref");
  await new Promise((done) => setImmediate(done));
  f.transport.cancel();
  resolve({ duration: 3 });
  await assert.rejects(preparing, /cancelled/);
  assert.equal(f.nodes.length, 0);
  assert.equal(f.closes, 1);
});
test("blocked audio resume fails closed; context interruption cancels both", async (t) => {
  const blocked = setup(t, { suspended: true });
  await assert.rejects(blocked.transport.prepare("ref"), /unavailable/);
  assert.equal(blocked.closes, 1);
  const f = setup(t);
  let errors = 0;
  const prepared = await f.transport.prepare("ref", "take");
  f.transport.start(prepared, 0, {
    onEnded() {
      assert.fail("late end");
    },
    onError() {
      errors++;
    },
  });
  f.context.state = "suspended";
  f.context.onstatechange();
  assert.equal(errors, 1);
  assert.equal(
    f.nodes.every((node) => node.stopped),
    true,
  );
  assert.equal(
    f.nodes.every((node) => node.onended === null),
    true,
  );
});
