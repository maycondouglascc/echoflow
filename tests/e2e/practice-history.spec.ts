import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  ensureAccount,
  localUrl,
  login,
  password,
  stableId,
  voiceComparisonScenario,
} from "./helpers/auth";
import { installMediaMocks } from "./helpers/media";

const practicePath = "/scenarios/voice-comparison";
const phraseId = stableId(voiceComparisonScenario.phrases[0].id);
const progress = (page: Page) => page.locator(".practice-listen-history");

async function account(page: Page, suffix: string) {
  const label = `history-${suffix}-${randomUUID()}`;
  const user = await ensureAccount(label);
  const client = createClient(localUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signedIn = await client.auth.signInWithPassword({ email: user.email, password });
  expect(signedIn.error).toBeNull();
  expect(signedIn.data.user?.id).toBe(user.id);
  await login(page, label, practicePath);
  return { client, user };
}
async function storedCount(client: SupabaseClient) {
  const result = await client
    .from("phrase_listen_counts")
    .select("count")
    .eq("phrase_id", phraseId)
    .maybeSingle();
  expect(result.error).toBeNull();
  return Number(result.data?.count ?? 0);
}
async function storedEvents(client: SupabaseClient) {
  const result = await client
    .from("phrase_listen_events")
    .select("event_id,user_id,phrase_id")
    .eq("phrase_id", phraseId);
  expect(result.error).toBeNull();
  return result.data ?? [];
}
async function finishAudio(page: Page) {
  await expect
    .poll(() => page.evaluate(() => window.__echoTest.currentAudioTimeMs()))
    .not.toBeNull();
  await page.evaluate(() => window.__echoTest.finishCurrentAudio());
}
async function fullListen(page: Page) {
  await page.getByRole("button", { name: "Listen to reference", exact: true }).click();
  await finishAudio(page);
}
async function expectCount(page: Page, count: number) {
  await expect(progress(page)).toContainText(count ? `Heard · ${count}` : "Not heard yet");
  if (count) await expect(progress(page)).not.toContainText(new RegExp(`Heard · ${count}\\d`));
  await expect(progress(page)).not.toContainText("Unsaved");
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(installMediaMocks);
});

test("only full reference ends count; duplicate ends, contextual replay and solo take never add listens", async ({
  page,
}) => {
  const { client, user } = await account(page, "completion-matrix");
  await expectCount(page, 0);
  await page.getByRole("button", { name: "Listen to reference", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__echoTest.currentAudioTimeMs()))
    .not.toBeNull();
  await page.getByRole("button", { name: "Next phrase", exact: true }).click();
  await page.getByRole("button", { name: /^Choose phrase 1:/ }).click();
  await expectCount(page, 0);
  expect(await storedCount(client)).toBe(0);

  // Current fixtures intentionally offer contextual fallback rather than unsafe isolated clips.
  await page.locator(".word-replay").first().click();
  await finishAudio(page);
  await expectCount(page, 0);
  expect(await storedEvents(client)).toHaveLength(0);

  await fullListen(page);
  await expectCount(page, 1);
  await page.getByTestId("practice-audio").dispatchEvent("ended");
  await expectCount(page, 1);
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await page.getByRole("button", { name: "Stop recording", exact: true }).click();
  await expect(page.getByRole("button", { name: "My recording", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "My recording", exact: true }).click();
  await finishAudio(page);
  await expectCount(page, 1);

  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await finishAudio(page);
  await expectCount(page, 2);
  await finishAudio(page);
  await expectCount(page, 2);
  const events = await storedEvents(client);
  expect(events).toHaveLength(2);
  expect(new Set(events.map((event) => event.event_id)).size).toBe(2);
  expect(events.every((event) => event.user_id === user.id)).toBe(true);
  // Retry the exact persisted event with the learner's session, never the service role.
  const duplicate = await client.rpc("record_phrase_listen", {
    p_event_id: events[0].event_id,
    p_phrase_id: phraseId,
    p_expected_user_id: user.id,
  });
  expect(duplicate.error).toBeNull();
  expect(duplicate.data).toMatchObject({ ok: true, duplicate: true, count: 2 });
  expect(await storedCount(client)).toBe(2);
  expect(await storedEvents(client)).toHaveLength(2);
});

test("confirmed history survives refresh and voice change while a second user cannot read it", async ({
  page,
  browser,
}) => {
  const first = await account(page, "owner-a");
  await fullListen(page);
  await expectCount(page, 1);
  await page.getByRole("radio", { name: "Harper", exact: true }).check();
  await expectCount(page, 1);
  await page.reload();
  await expectCount(page, 1);

  const secondContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const secondPage = await secondContext.newPage();
    await secondPage.addInitScript(installMediaMocks);
    const second = await account(secondPage, "owner-b");
    await expectCount(secondPage, 0);
    const foreign = await second.client
      .from("phrase_listen_counts")
      .select("count")
      .eq("user_id", first.user.id);
    expect(foreign.error).toBeNull();
    expect(foreign.data).toEqual([]);
    const foreignEvents = await second.client
      .from("phrase_listen_events")
      .select("event_id")
      .eq("user_id", first.user.id);
    expect(foreignEvents.error).toBeNull();
    expect(foreignEvents.data).toEqual([]);
    await fullListen(secondPage);
    await expectCount(secondPage, 1);
    expect(await storedCount(first.client)).toBe(1);
    expect(await storedCount(second.client)).toBe(1);
    const denied = await second.client.rpc("record_phrase_listen", {
      p_event_id: randomUUID(),
      p_phrase_id: phraseId,
      p_expected_user_id: first.user.id,
    });
    expect(denied.error).toBeNull();
    expect(denied.data).toMatchObject({ ok: false, reason: "identity_changed" });
    expect(await storedEvents(first.client)).toHaveLength(1);
    expect(await storedEvents(second.client)).toHaveLength(1);
  } finally {
    await secondContext.close();
  }
});

test("a failed history request is Unsaved, does not block recording and retries the same event identity", async ({
  page,
}) => {
  const { client } = await account(page, "retry");
  const bodies: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"])
      bodies.push(request.postData() ?? "");
  });
  await page.route(`**${practicePath}`, async (route) => {
    const request = route.request();
    if (request.method() === "POST" && request.headers()["next-action"])
      await route.abort("internetdisconnected");
    else await route.continue();
  });
  await fullListen(page);
  await expect(progress(page)).toContainText("Unsaved");
  await expect(progress(page)).toContainText("Not heard yet");
  expect(await storedCount(client)).toBe(0);
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop recording", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Stop recording", exact: true }).click();
  await expect(page.getByRole("button", { name: "My recording", exact: true })).toBeEnabled();
  await expect(progress(page)).toContainText("Unsaved");
  await page.unroute(`**${practicePath}`);
  await page.getByRole("button", { name: "Retry history save", exact: true }).click();
  await expectCount(page, 1);
  const events = await storedEvents(client);
  expect(events).toHaveLength(1);
  expect(bodies.length).toBeGreaterThanOrEqual(2);
  expect(bodies.every((body) => body.includes(events[0].event_id))).toBe(true);
  expect(await storedCount(client)).toBe(1);
});

test("distinct completed events from concurrent tabs aggregate without losing increments", async ({
  page,
  context,
}) => {
  const { client, user } = await account(page, "tabs");
  const other = await context.newPage();
  try {
    await other.addInitScript(installMediaMocks);
    await other.addInitScript((userId) => {
      sessionStorage.setItem(`echoflow-microphone-explained:${userId}`, "yes");
    }, user.id);
    await other.goto(practicePath);
    await expectCount(other, 0);
    await Promise.all(
      [page, other].map((tab) =>
        tab.getByRole("button", { name: "Listen to reference", exact: true }).click(),
      ),
    );
    await Promise.all([page, other].map((tab) => finishAudio(tab)));
    await expect.poll(() => storedCount(client)).toBe(2);
    const events = await storedEvents(client);
    expect(events).toHaveLength(2);
    expect(new Set(events.map((event) => event.event_id)).size).toBe(2);
    await Promise.all([page.reload(), other.reload()]);
    await expectCount(page, 2);
    await expectCount(other, 2);
  } finally {
    await other.close();
  }
});
