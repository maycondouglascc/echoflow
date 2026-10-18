import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

const hook = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only")
      return { url: "data:text/javascript,export{}", shortCircuit: true };
    return next(specifier, context);
  },
});
const { savePracticeListen } = await import("../src/lib/practice-history.ts");
hook.deregister();
const eventId = "11111111-1111-4111-a111-111111111111";
const phraseId = "dddddddd-dddd-4ddd-addd-dddddddddddd";
const userId = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const input = { eventId, phraseId, expectedUserId: userId };
function fixture(result) {
  const calls = [];
  return {
    calls,
    client: {
      async rpc(name, args) {
        calls.push({ name, args });
        return result;
      },
    },
  };
}
test("session UID required; stale owner and invalid payload never call RPC", async () => {
  const f = fixture({});
  for (const [uid, value, reason] of [
    [null, input, "unauthenticated"],
    ["bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb", input, "identity_changed"],
    [userId, { ...input, count: 99 }, "not_available"],
    [userId, { ...input, phraseId: "phrase-slug" }, "not_available"],
  ])
    assert.equal((await savePracticeListen(f.client, uid, value)).reason, reason);
  assert.equal(f.calls.length, 0);
});
test("strict RPC serializes no blob,text,count; returns safe canonical count", async () => {
  const f = fixture({ data: { ok: true, count: 3, duplicate: false }, error: null });
  assert.deepEqual(await savePracticeListen(f.client, userId, input), {
    ok: true,
    eventId,
    phraseId,
    count: 3,
    duplicate: false,
  });
  assert.deepEqual(f.calls, [
    {
      name: "record_phrase_listen",
      args: { p_event_id: eventId, p_phrase_id: phraseId, p_expected_user_id: userId },
    },
  ]);
});
test("duplicates preserve identity and safe number boundaries", async () => {
  for (const count of [0, Number.MAX_SAFE_INTEGER]) {
    const f = fixture({ data: { ok: true, count, duplicate: true }, error: null });
    assert.equal((await savePracticeListen(f.client, userId, input)).count, count);
  }
  for (const count of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "3"]) {
    const f = fixture({ data: { ok: true, count, duplicate: false }, error: null });
    assert.equal(
      (await savePracticeListen(f.client, userId, input)).reason,
      "temporarily_unavailable",
    );
  }
});
test("retry policy maps only transient failures and rate limit", async () => {
  for (const reason of [
    "identity_changed",
    "not_available",
    "conflict",
    "rate_limited",
    "limit_reached",
    "unauthenticated",
  ]) {
    const f = fixture({ data: { ok: false, reason }, error: null });
    const r = await savePracticeListen(f.client, userId, input);
    assert.equal(r.reason, reason);
    assert.equal(r.retryable, reason === "rate_limited");
  }
  assert.equal(
    (
      await savePracticeListen(
        fixture({ data: null, error: { message: "private" } }).client,
        userId,
        input,
      )
    ).reason,
    "temporarily_unavailable",
  );
  assert.equal(
    (
      await savePracticeListen(
        {
          rpc() {
            throw Error("private");
          },
        },
        userId,
        input,
      )
    ).reason,
    "temporarily_unavailable",
  );
});

test("owned initial history read maps only requested database IDs and degrades nonblocking", async () => {
  const { loadPracticeHistory } = await import("../src/lib/practice-history.ts");
  const calls = [];
  const client = {
    from(name) {
      calls.push(name);
      return {
        select(columns) {
          calls.push(columns);
          return {
            eq(key, value) {
              calls.push([key, value]);
              return {
                async in(key, ids) {
                  calls.push([key, ids]);
                  return { data: [{ phrase_id: phraseId, count: 9 }], error: null };
                },
              };
            },
          };
        },
      };
    },
  };
  assert.deepEqual(await loadPracticeHistory(client, userId, [phraseId]), {
    accountId: userId,
    counts: { [phraseId]: 9 },
    available: true,
  });
  assert.deepEqual(calls, [
    "phrase_listen_counts",
    "phrase_id,count",
    ["user_id", userId],
    ["phrase_id", [phraseId]],
  ]);
  assert.deepEqual(
    await loadPracticeHistory(
      {
        from() {
          throw Error("private service detail");
        },
      },
      userId,
      [phraseId],
    ),
    { accountId: userId, counts: {}, available: false },
  );
});
