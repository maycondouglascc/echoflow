import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { registerHooks } from "node:module";
import test from "node:test";

const hook = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only")
      return { url: "data:text/javascript,export {}", shortCircuit: true };
    return next(specifier, context);
  },
});
const { saveFeedback } = await import("../src/lib/feedback-store.ts");
hook.deregister();
const metadata = {
  id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  message: "Improve this app please.",
  pagePath: "/home",
  capturedAt: "2026-10-04T12:00:00.000Z",
  viewport: { width: 375, height: 556 },
  navigation: [],
};
const bytes = new Uint8Array([1, 2, 3]);
function fixture({
  uploadError = false,
  insertError = false,
  existing = null,
  existingBytes = null,
  insertThrows = false,
} = {}) {
  const calls = { upload: [], remove: [], insert: [] };
  const client = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                async maybeSingle() {
                  return { data: existing, error: null };
                },
              };
            },
          };
        },
        async insert(value) {
          calls.insert.push(value);
          if (insertThrows) throw new Error("fixture insert interruption");
          return { error: insertError ? "fixture" : null };
        },
      };
    },
    storage: {
      from() {
        return {
          async upload(...args) {
            calls.upload.push(args);
            return { error: uploadError ? "fixture" : null };
          },
          async download() {
            return {
              data: existingBytes ? new Blob([existingBytes]) : null,
              error: existingBytes ? null : "fixture",
            };
          },
          async remove(paths) {
            calls.remove.push(paths);
            return { error: null };
          },
        };
      },
    },
  };
  return { client, calls };
}
test("failed insertion cleans exactly the newly uploaded object", async () => {
  const { client, calls } = fixture({ insertError: true });
  assert.equal((await saveFeedback(client, "owner", metadata, bytes)).status, 503);
  assert.deepEqual(calls.remove, [[`owner/${metadata.id}.png`]]);
  assert.equal(calls.upload[0][2].upsert, false);
});
test("failed upload does not insert feedback or delete an existing object", async () => {
  const { client, calls } = fixture({ uploadError: true });
  assert.equal((await saveFeedback(client, "owner", metadata, bytes)).status, 503);
  assert.equal(calls.insert.length, 0);
  assert.equal(calls.remove.length, 0);
});
test("identical retry returns existing success without writes; changed body conflicts", async () => {
  const digest = createHash("sha256").update(JSON.stringify(metadata)).update(bytes).digest("hex");
  const { client, calls } = fixture({ existing: { request_sha256: digest } });
  assert.equal((await saveFeedback(client, "owner", metadata, bytes)).status, 200);
  assert.equal(
    (await saveFeedback(client, "owner", { ...metadata, message: "A changed suggestion." }, bytes))
      .status,
    409,
  );
  assert.equal(calls.upload.length, 0);
  assert.equal(calls.insert.length, 0);
  assert.equal(calls.remove.length, 0);
});
test("text-only suggestion persists explicit absent screenshot", async () => {
  const { client, calls } = fixture();
  assert.equal((await saveFeedback(client, "owner", metadata, null)).status, 201);
  assert.equal(calls.insert[0].screenshot_path, null);
  assert.equal(calls.upload.length, 0);
});

test("upload response loss resumes an identical owned image without overwriting it", async () => {
  const { client, calls } = fixture({ uploadError: true, existingBytes: bytes });
  assert.equal((await saveFeedback(client, "owner", metadata, bytes)).status, 201);
  assert.equal(calls.insert.length, 1);
  assert.equal(calls.remove.length, 0);
});
test("a different existing image conflicts and is never removed or overwritten", async () => {
  const { client, calls } = fixture({ uploadError: true, existingBytes: new Uint8Array([9]) });
  assert.equal((await saveFeedback(client, "owner", metadata, bytes)).status, 409);
  assert.equal(calls.insert.length, 0);
  assert.equal(calls.remove.length, 0);
});
test("insert exceptions still clean a successfully created upload", async () => {
  const { client, calls } = fixture({ insertThrows: true });
  assert.equal((await saveFeedback(client, "owner", metadata, bytes)).status, 503);
  assert.equal(calls.remove.length, 1);
});
