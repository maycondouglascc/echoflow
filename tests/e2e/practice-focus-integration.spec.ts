import { expect, type Locator, type Page, test } from "@playwright/test";
import { login } from "./helpers/auth";
import { installMediaMocks } from "./helpers/media";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(installMediaMocks);
});

async function listenAndRecord(page: Page) {
  await page.getByRole("button", { name: "Listen to reference", exact: true }).click();
  await expect(page.locator(".practice-feedback [role=status]")).toContainText("Playing reference");
  await page.evaluate(() => window.__echoTest.finishCurrentAudio());
  await expect(page.getByRole("button", { name: "Record", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop recording", exact: true })).toBeVisible();
}

async function saveTake(page: Page) {
  await listenAndRecord(page);
  await page.getByRole("button", { name: "Stop recording", exact: true }).click();
  await expect(page.getByRole("button", { name: "My recording", exact: true })).toBeEnabled();
}

async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    (page.viewportSize()?.width ?? 0) + 1,
  );
}

async function keyboardReach(page: Page, target: Locator) {
  // Begin at a real application control, then use native sequential navigation.
  await page.getByRole("button", { name: "Listen to reference", exact: true }).focus();
  for (let step = 0; step < 100; step++) {
    if (await target.evaluate((node) => node === document.activeElement)) {
      const box = await target.boundingBox();
      expect(box).not.toBeNull();
      expect(box?.y).toBeGreaterThanOrEqual(-1);
      expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
        (page.viewportSize()?.height ?? 0) + 1,
      );
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error("Practice control is not reachable through keyboard navigation");
}

for (const viewport of [
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
]) {
  test(`real desktop practice fits ${viewport.width}×${viewport.height} before and after a take`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await login(page, `focus-geometry-${viewport.width}`);
    await expect(page.locator(".practice-panel")).toBeVisible();
    const assertGeometry = async () => {
      const geometry = await page.evaluate(() => {
        const panel = document.querySelector(".practice-panel");
        const sidebar = document.querySelector(".practice-sidebar");
        const list = document.querySelector(".phrase-list");
        if (!panel || !sidebar || !list) throw new Error("Missing actual practice panels");
        return {
          documentHeight: document.documentElement.scrollHeight,
          panel: {
            top: panel.getBoundingClientRect().top,
            bottom: panel.getBoundingClientRect().bottom,
          },
          sidebarHeight: sidebar.getBoundingClientRect().height,
          listOverflow: getComputedStyle(list).overflowY,
          otherScrollers: [panel, sidebar].filter(
            (node) =>
              /auto|scroll/.test(getComputedStyle(node).overflowY) &&
              node.scrollHeight > node.clientHeight + 1,
          ).length,
        };
      });
      expect(geometry.documentHeight).toBeLessThanOrEqual(viewport.height + 1);
      expect(geometry.sidebarHeight).toBeCloseTo(viewport.height - 48, 0);
      expect(geometry.listOverflow).toMatch(/auto|scroll/);
      expect(geometry.otherScrollers).toBe(0);
      for (const name of [
        "Listen to reference",
        "Record with reference",
        "My recording",
        "Compare",
        "Next phrase",
        (await page.getByRole("button", { name: "Record again", exact: true }).count())
          ? "Record again"
          : "Record",
      ]) {
        const box = await page.getByRole("button", { name, exact: true }).boundingBox();
        expect(box, name).not.toBeNull();
        expect(box?.y, name).toBeGreaterThanOrEqual(geometry.panel.top - 1);
        expect((box?.y ?? 0) + (box?.height ?? 0), name).toBeLessThanOrEqual(
          geometry.panel.bottom + 1,
        );
      }
      await noHorizontalOverflow(page);
    };
    await assertGeometry();
    await saveTake(page);
    await assertGeometry();
    await page.screenshot({ path: testInfo.outputPath("desktop-practice.png") });
  });
}

test("collapse preserves selected phrase, take and microphone capture and restores last list focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page, "focus-retention");
  const selected = page.getByRole("button", { name: /^Choose phrase 2:/ });
  await selected.click();
  await saveTake(page);
  await selected.focus();
  await page.getByRole("button", { name: "Collapse practice sidebar", exact: true }).click();
  const restore = page.getByRole("button", { name: "Show practice phrases", exact: true });
  await expect(restore).toBeFocused();
  await expect(page.locator("#practice-sidebar")).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("button", { name: "My recording", exact: true })).toBeEnabled();
  const alternate = page.locator(".practice-collapsed-bar");
  await expect(alternate.getByRole("link", { name: "Playlists", exact: true })).toHaveAttribute(
    "href",
    "/home",
  );
  await expect(
    alternate.getByRole("link", { name: "Privacy", exact: true }).first(),
  ).toHaveAttribute("href", "/privacy");
  await expect(alternate.getByRole("button", { name: "Log out", exact: true })).toBeVisible();
  await restore.press("Enter");
  await expect(selected).toBeFocused();
  await expect(selected).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Record again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop recording", exact: true })).toBeVisible();
  const stopped = await page.evaluate(() => window.__echoTest.tracksStopped);
  await page.getByRole("button", { name: "Collapse practice sidebar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop recording", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__echoTest.tracksStopped)).toBe(stopped);
  await restore.press("Enter");
  await expect(selected).toBeFocused();
  await page.getByRole("button", { name: "Stop recording", exact: true }).click();
  await expect(page.getByRole("button", { name: "My recording", exact: true })).toBeEnabled();
});

// 512×384 is the CSS viewport of 1024×768 at 200% page zoom. This checks
// responsive reachability; browser/device optical zoom is a separate device check.
for (const viewport of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 512, height: 384 },
]) {
  test(`narrow practice ${viewport.width}×${viewport.height} exposes drawer and reachable Stop`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await login(page, `focus-narrow-${viewport.width}`);
    const show = page.getByRole("button", { name: "Show practice phrases", exact: true });
    await expect(show).toBeVisible();
    await show.press("Enter");
    await expect(
      page.getByRole("button", { name: "Close practice phrases", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^Choose phrase 2:/ }).focus();
    await page.keyboard.press("Escape");
    await expect(show).toBeFocused();
    await noHorizontalOverflow(page);
    await saveTake(page);
    for (const name of ["My recording", "Compare", "Record with reference", "Next phrase"]) {
      await keyboardReach(page, page.getByRole("button", { name, exact: true }));
    }
    await page.getByRole("button", { name: "Record again", exact: true }).click();
    const stop = page.getByRole("button", { name: "Stop recording", exact: true });
    await expect(stop).toBeVisible();
    await keyboardReach(page, stop);
    await page.screenshot({ path: testInfo.outputPath("narrow-recording-stop.png") });
    await stop.press("Enter");
    await expect(page.getByRole("button", { name: "My recording", exact: true })).toBeEnabled();
    await noHorizontalOverflow(page);
  });
}
