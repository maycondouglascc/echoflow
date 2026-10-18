import assert from "node:assert/strict";
import test from "node:test";

const { createPracticeHistoryQueue } = await import("../src/lib/practice-history-client.ts");
const uid = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  pid = "dddddddd-dddd-4ddd-addd-dddddddddddd";
const input = (i) => ({
  eventId: `${String(i).padStart(8, "0")}-1111-4111-a111-111111111111`,
  phraseId: pid,
  expectedUserId: uid,
});
const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
function fixture(save) {
  let n = 0;
  const timers = new Map(),
    calls = [];
  const queue = createPracticeHistoryQueue({
    accountId: uid,
    initialCounts: { [pid]: 2 },
    save: async (v) => {
      calls.push(v);
      return save(v, calls.length);
    },
    schedule: (fn, ms) => {
      const id = ++n;
      timers.set(id, { fn, ms });
      return id;
    },
    cancel: (id) => timers.delete(id),
  });
  return {
    queue,
    calls,
    timers,
    runDelay(ms) {
      const pair = [...timers].find(([, v]) => v.ms === ms);
      assert.ok(pair, `timer ${ms}`);
      timers.delete(pair[0]);
      pair[1].fn();
    },
  };
}
test("distinct pending is separate from canonical; reversed committed replies cannot regress or double count", async () => {
  const resolves = [];
  const f = fixture((v) => new Promise((r) => resolves.push({ v, r })));
  f.queue.record(input(1));
  f.queue.record(input(2));
  assert.equal(f.queue.getSnapshot().counts[pid], 2);
  assert.equal(f.queue.getSnapshot().unsaved[pid], 2);
  resolves[1].r({ ok: true, ...resolves[1].v, count: 4, duplicate: false });
  await tick();
  assert.equal(f.queue.getSnapshot().counts[pid], 4);
  assert.equal(f.queue.getSnapshot().unsaved[pid], 1);
  resolves[0].r({ ok: true, ...resolves[0].v, count: 3, duplicate: false });
  await tick();
  assert.equal(f.queue.getSnapshot().counts[pid], 4);
  assert.equal(f.queue.getSnapshot().unsaved[pid] ?? 0, 0);
  assert.equal(f.queue.record(input(1)), false);
});
test("transient errors retry same IDs with1s2s4s delays and stop automatically after3 retries", async () => {
  const f = fixture(() => ({ ok: false, reason: "temporarily_unavailable", retryable: true }));
  f.queue.record(input(1));
  await tick();
  for (const ms of [1000, 2000, 4000]) {
    f.runDelay(ms);
    await tick();
  }
  assert.equal(f.calls.length, 4);
  assert.equal(f.timers.size, 0);
  assert.equal(f.queue.getSnapshot().unsaved[pid], 1);
  assert.ok(f.calls.every((v) => v.eventId === input(1).eventId));
  f.queue.retry();
  await tick();
  assert.equal(f.calls.length, 5);
});
test("bounded volatile backlog does not dispatch21st event, disposal blocks late replies and timers", async () => {
  const r = [];
  const f = fixture((v) => new Promise((resolve) => r.push({ v, resolve })));
  for (let i = 1; i <= 20; i++) assert.equal(f.queue.record(input(i)), true);
  assert.equal(f.queue.record(input(21)), false);
  assert.equal(f.calls.length, 20);
  assert.equal(f.queue.getSnapshot().backlogFull, true);
  f.queue.dispose();
  r[0].resolve({ ok: true, ...r[0].v, count: 100, duplicate: false });
  await tick();
  assert.equal(f.queue.getSnapshot().counts[pid], 2);
  assert.equal(f.timers.size, 0);
  assert.equal(f.queue.record(input(22)), false);
});
test("wrong account/slug rejected; permanent identity failure cannot be retried under another owner", async () => {
  const f = fixture(() => ({ ok: false, reason: "identity_changed", retryable: false }));
  assert.equal(
    f.queue.record({ ...input(1), expectedUserId: "bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb" }),
    false,
  );
  assert.equal(f.queue.record({ ...input(1), phraseId: "slug" }), false);
  f.queue.record(input(2));
  await tick();
  f.queue.retry();
  await tick();
  assert.equal(f.calls.length, 1);
  assert.equal(f.queue.getSnapshot().error, "identity_changed");
});
test("timeout then duplicate success saves once; pending is not summed to canonical", async () => {
  const f = fixture((v, n) =>
    n === 1 ? new Promise(() => {}) : { ok: true, ...v, count: 3, duplicate: true },
  );
  f.queue.record(input(1));
  f.runDelay(10000);
  await tick();
  f.runDelay(1000);
  await tick();
  assert.equal(f.queue.getSnapshot().counts[pid], 3);
  assert.equal(f.queue.getSnapshot().unsaved[pid] ?? 0, 0);
  assert.equal(f.calls.length, 2);
});
