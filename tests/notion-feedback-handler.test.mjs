import assert from "node:assert/strict";
import test from "node:test";
import { feedbackHandler } from "../src/lib/notion-feedback-handler.ts";

test("unauthenticated and ordinary app callers never run privileged export", async () => {
  let calls = 0;
  const handler = feedbackHandler("server-secret", async () => {
    calls++;
  });
  for (const auth of [null, "Bearer anon-key", "Bearer user-jwt", "Bearer wrong-secret"]) {
    const headers = auth ? { authorization: auth } : {};
    assert.equal(
      (await handler(new Request("https://example.test", { method: "POST", headers }))).status,
      401,
    );
  }
  assert.equal(calls, 0);
});
test("worker secret invokes export; request-supplied settings are ignored", async () => {
  const handler = feedbackHandler("server-secret", async () => ({ processed: 3, deferred: 0 }));
  const response = await handler(
    new Request("https://example.test", {
      method: "POST",
      headers: { authorization: "Bearer server-secret" },
      body: '{"destination":"untrusted"}',
    }),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { result: { processed: 3, deferred: 0 } });
});
test("missing secret and GET fail closed; failures return no private details", async () => {
  assert.equal(
    (
      await feedbackHandler("", async () => {})(
        new Request("https://example.test", {
          method: "POST",
          headers: { authorization: "Bearer " },
        }),
      )
    ).status,
    401,
  );
  const handler = feedbackHandler("secret", async () => {
    throw new Error("private data");
  });
  assert.equal((await handler(new Request("https://example.test"))).status, 405);
  const response = await handler(
    new Request("https://example.test", {
      method: "POST",
      headers: { authorization: "Bearer secret" },
    }),
  );
  assert.equal(response.status, 503);
  assert.equal(JSON.stringify(await response.json()).includes("private data"), false);
});
