import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";
import { installMediaMocks } from "./helpers/media";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(installMediaMocks);
});

test("privacy is public, factual and asks for no microphone access", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { name: "Privacy & microphone" })).toBeVisible();
  await expect(page.getByText(/Recordings stay in page memory/)).toBeVisible();
  await expect(page.getByText(/still needs approval before public launch/)).toBeVisible();
  expect(await page.evaluate(() => window.__echoTest.getUserMediaCalls)).toBe(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "Back to playlists" }).first().click();
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("microphone modal uses auth structure, traps focus and Escape dismisses without permission", async ({
  page,
}) => {
  await login(page, "mic-modal", "/home", { microphoneOnboarding: true });
  const modal = page.getByRole("dialog", { name: "Let’s hear your voice" });
  await expect(modal).toBeVisible();
  await expect(modal).toHaveClass("signup-dialog");
  await expect(modal.locator('img[src*="kitten"]')).toBeVisible();
  const enable = modal.getByRole("button", { name: "Enable microphone", exact: true });
  await enable.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(modal.getByRole("button", { name: "Close microphone setup" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(enable).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  expect(await page.evaluate(() => window.__echoTest.getUserMediaCalls)).toBe(0);
  await expect(page.getByRole("link", { name: "Voice Comparison", exact: true })).toBeFocused();
  await page.getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Privacy & microphone" })).toBeVisible();
});

test("dismissing pending permission releases a late stream without reopening or recording", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () =>
        new Promise<MediaStream>((resolve) => {
          Object.defineProperty(window, "__resolvePermission", {
            value: async () => resolve(await getMedia({ audio: true })),
          });
        }),
    });
  });
  await login(page, "mic-pending", "/home", { microphoneOnboarding: true });
  await page.getByRole("button", { name: "Enable microphone", exact: true }).click();
  await expect(page.getByRole("button", { name: "Waiting for permission…" })).toBeDisabled();
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await page.evaluate(() =>
    (window as unknown as { __resolvePermission: () => Promise<void> }).__resolvePermission(),
  );
  await expect.poll(() => page.evaluate(() => window.__echoTest.tracksStopped)).toBe(1);
  expect(await page.evaluate(() => window.__echoTest.recorderStarts)).toBe(0);
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

for (const [width, height] of [
  [1440, 900],
  [972, 900],
  [375, 556],
]) {
  test(`microphone and privacy fit ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await login(page, `mic-visual-${width}`, "/home", { microphoneOnboarding: true });
    const modal = page.getByRole("dialog", { name: "Let’s hear your voice" });
    await expect(modal).toBeVisible();
    await modal.getByRole("button", { name: "Close microphone setup" }).focus();
    const box = await modal.getByRole("button", { name: "Close microphone setup" }).boundingBox();
    expect(box?.y).toBeGreaterThanOrEqual(0);
    await modal
      .getByRole("button", { name: "Enable microphone", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: `/tmp/echoflow-microphone-modal-${width}.png` });
    await modal.getByRole("link", { name: "Privacy & microphone" }).click();
    await expect(page.getByRole("heading", { name: "Privacy & microphone" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(await page.evaluate(() => window.__echoTest.getUserMediaCalls)).toBe(0);
    await page.screenshot({ path: `/tmp/echoflow-privacy-${width}.png`, fullPage: true });
  });
}
