import { expect, test } from "@playwright/test";
import { admin, ensureAccount, login } from "./helpers/auth";
import { installMediaMocks } from "./helpers/media";

test("all five comparisons persist once for A, survive login, and do not complete B", async ({
  page,
}) => {
  const a = await ensureAccount("completion-a");
  await admin.from("playlist_completions").delete().eq("user_id", a.id);
  await page.addInitScript(installMediaMocks);
  await login(page, "completion-a");
  const finish = async () => page.evaluate(() => window.__echoTest.finishCurrentAudio());
  let rejectSave = true;
  await page.route("**/scenarios/voice-comparison", async (route) => {
    if (rejectSave && route.request().method() === "POST") {
      rejectSave = false;
      await route.abort();
    } else await route.continue();
  });
  for (let index = 0; index < 5; index++) {
    await page.getByRole("button", { name: "Listen to reference" }).click();
    await expect(page.locator("p[role=status]").first()).toContainText("Playing reference");
    await finish();
    await page.getByRole("button", { name: "Record", exact: true }).click();
    await page.getByRole("button", { name: "Stop recording" }).click();
    await page.getByRole("button", { name: "Compare", exact: true }).click();
    await expect(page.locator("p[role=status]").first()).toContainText("Playing reference");
    await finish();
    await expect(page.locator("p[role=status]").first()).toContainText("Playing your recording");
    await finish();
    if (index < 4) {
      await expect(page.getByText("Completed", { exact: true })).toHaveCount(0);
      await page.getByRole("button", { name: "Next phrase" }).click();
    }
  }
  await expect(page.getByText("Completion could not be saved.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Try saving again" }).click();
  await expect(page.getByText("✓ Completed", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("✓ Completed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record again", exact: true })).toHaveCount(0);
  const rows = await admin.from("playlist_completions").select("user_id").eq("user_id", a.id);
  expect(rows.data).toHaveLength(1);
  const objects = await admin.storage.from("phrase-audio").list("openrouter");
  expect(objects.data).toHaveLength(10);
  await page.context().clearCookies();
  await login(page, "completion-a", "/home");
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await page.context().clearCookies();
  await login(page, "completion-b", "/home");
  await expect(page.getByText("Completed", { exact: true })).toHaveCount(0);
});
