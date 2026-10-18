import assert from "node:assert/strict";
import test from "node:test";
import {
  createPracticeTransport,
  createTransportForCurrentRequest,
} from "../src/lib/practice-transport.ts";

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
        start(...args) {
          const [time] = args;
          if (failStart && nodes.length === 2) throw new Error("start failed");
          node.time = time;
          node.arguments = args;
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
  f.transport.setVolumes(0.8, 0.6);
  f.transport.start(prepared, 250, { onEnded: (source) => ends.push(source), onError() {} });
  assert.ok(Math.abs(f.nodes[0].time - f.nodes[1].time - 0.25) < 1e-10);
  assert.deepEqual(
    f.gains.map((gain) => gain.gain.value),
    [0.8 / 1.4, 0.6 / 1.4],
  );
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
test("volume controls retain defaults and clamp the combined output before start", async (t) => {
  const f = setup(t);
  const prepared = await f.transport.prepare("ref", "take");
  f.transport.start(prepared, 0, { onEnded() {}, onError() {} });
  assert.deepEqual(
    f.gains.map((gain) => gain.gain.value),
    [0.5, 0.5],
  );
  f.transport.setVolumes(2, 0.5);
  assert.deepEqual(
    f.gains.map((gain) => gain.gain.value),
    [1 / 1.5, 0.5 / 1.5],
  );
});
test("reviewed replay uses exact source range without padding into neighboring markers", async (t) => {
  const f = setup(t);
  const prepared = await f.transport.prepare("reference");
  const syntheticMarkers = [700, 800, 1_300, 1_400];
  const startMs = syntheticMarkers[1];
  const endMs = syntheticMarkers[2];
  f.transport.startRange(prepared.reference, startMs, endMs - startMs, {
    onEnded() {},
    onError() {},
  });

  assert.deepEqual(f.nodes[0].arguments, [10.1, 0.8, 0.5]);
  f.context.currentTime = 10.35;
  assert.ok(Math.abs(f.transport.referenceTimeMs() - 1_050) < 1e-8);
  f.context.currentTime = 10.7;
  assert.equal(f.transport.referenceTimeMs(), 1_300);
});
test("a deferred stale replay cannot replace the active transport that Stop owns", async (t) => {
  const slot = { current: null };
  const active = setup(t);
  const prepared = await active.transport.prepare("take-B-reference");
  active.transport.start(prepared, 0, { onEnded() {}, onError() {} });
  slot.current = active.transport;

  let resolveSource;
  const sourceA = new Promise((resolve) => {
    resolveSource = resolve;
  });
  let requestSequence = 1;
  let staleTransportCreations = 0;
  const deferredReplayA = (async () => {
    await sourceA;
    const transport = createTransportForCurrentRequest(
      slot,
      () => {
        staleTransportCreations++;
        return setup(t).transport;
      },
      () => requestSequence === 1,
    );
    if (transport) await transport.prepare("replay-A");
  })();

  requestSequence = 2;
  resolveSource("replay-A");
  await deferredReplayA;
  assert.equal(staleTransportCreations, 0);
  assert.equal(slot.current, active.transport);

  slot.current.cancel();
  assert.equal(
    active.nodes.every((node) => node.stopped),
    true,
  );
  assert.equal(active.closes, 1);
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
