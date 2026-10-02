import { expect, test } from "@playwright/test";
import { admin, audioUrl, login } from "./helpers/auth";

test("authenticated audio supports full bytes, seeking and protected failures", async ({
  page,
}) => {
  await login(page, "audio");
  const url = audioUrl("introducing-yourself-01--google-gemini-3-8-flash-tts--puck");
  const full = await page.request.get(url);
  expect(full.status()).toBe(200);
  expect(full.headers()["cache-control"]).toContain("no-store");
  const bytes = await full.body();
  expect(bytes.length).toBe(117164);
  const partial = await page.request.get(url, { headers: { Range: "bytes=4-19" } });
  expect(partial.status()).toBe(206);
  expect(await partial.body()).toEqual(bytes.subarray(4, 20));
  expect((await page.request.get(url, { headers: { Range: "bytes=999999999-" } })).status()).toBe(
    416,
  );
  expect((await page.request.get(audioUrl("archived-missing"))).status()).toBe(404);
  const archived = await admin
    .from("audio_variants")
    .select("id")
    .eq("active", false)
    .limit(1)
    .single();
  expect((await page.request.get(`/api/reference-audio/${archived.data?.id}`)).status()).toBe(404);
  await page.context().clearCookies();
  expect((await page.request.get(url, { headers: { Range: "bytes=4-19" } })).status()).toBe(401);
});

test("a missing private object fails without leaking a storage URL", async ({ page }) => {
  await login(page, "missing-audio");
  const original = await admin
    .from("audio_variants")
    .select("*")
    .eq("active", true)
    .limit(1)
    .single();
  if (!original.data) throw new Error("Seed reference missing");
  const path = original.data.storage_path;
  try {
    await admin
      .from("audio_variants")
      .update({ storage_path: "missing-test-object.wav" })
      .eq("id", original.data.id);
    const response = await page.request.get(`/api/reference-audio/${original.data.id}`);
    expect(response.status()).toBe(503);
    expect((await response.body()).length).toBe(0);
    expect(response.headers()["cache-control"]).toContain("no-store");
  } finally {
    await admin.from("audio_variants").update({ storage_path: path }).eq("id", original.data.id);
  }
});
