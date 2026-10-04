import assert from "node:assert/strict";
import test from "node:test";
import { parseFeedback, recentEvents, validatePng, validPath } from "../src/lib/feedback.ts";

const now = Date.parse("2026-10-04T12:00:00Z");
const base = {
  id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  message: "Please improve the playlist search.",
  pagePath: "/home",
  capturedAt: new Date(now).toISOString(),
  viewport: { width: 1440, height: 900 },
  navigation: [],
};
test("paths exclude queries, tokens and non-app routes", () => {
  for (const path of [
    "/home?token=x",
    "/home#x",
    "https://example.com/home",
    "/login",
    "/scenarios/a/b",
  ])
    assert.equal(validPath(path), false);
  assert.equal(validPath("/scenarios/team-meetings"), true);
});
test("history prunes expired events and retains only last 20", () => {
  const events = Array.from({ length: 25 }, (_, i) => ({
    path: "/home",
    action: "page",
    at: new Date(now - i * 1000).toISOString(),
  })).reverse();
  events.unshift({ path: "/home", action: "page", at: new Date(now - 300001).toISOString() });
  assert.equal(recentEvents(events, now).length, 20);
  assert.equal(recentEvents(events, now)[0].at, events[6].at);
});
test("metadata rejects extra/private content, invalid times and sizes", () => {
  assert.deepEqual(parseFeedback(base, now), base);
  for (const changed of [
    { ...base, message: "tiny" },
    { ...base, message: "x".repeat(5001) },
    { ...base, pagePath: "/home?secret=x" },
    { ...base, password: "secret" },
    { ...base, viewport: { width: 0, height: 2 } },
    { ...base, navigation: [{ path: "/home", action: "typed", at: base.capturedAt }] },
    {
      ...base,
      navigation: [{ path: "/home", action: "page", at: base.capturedAt, value: "secret" }],
    },
    {
      ...base,
      navigation: [{ path: "/home", action: "page", at: new Date(now - 300001).toISOString() }],
    },
    { ...base, capturedAt: new Date(now + 60001).toISOString() },
  ])
    assert.throws(() => parseFeedback(changed, now));
});
test("PNG rejects forged signatures, excessive dimensions and truncation", () => {
  const png = new Uint8Array(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==",
      "base64",
    ),
  );
  const view = new DataView(png.buffer);

  assert.doesNotThrow(() => validatePng(png, "image/png"));
  assert.throws(() => validatePng(png, "image/jpeg"));
  view.setUint32(16, 9999);
  assert.throws(() => validatePng(png, "image/png"));
  assert.throws(() => validatePng(new Uint8Array(10), "image/png"));
});
