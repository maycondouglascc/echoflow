import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";

test("capture implemented Figma states at desktop and mobile widths", async ({ page }) => {
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `/tmp/echoflow-landing-${width}.png`, fullPage: true });
    await page.getByRole("button", { name: "Practice now" }).click();
    await page.screenshot({ path: `/tmp/echoflow-signup-${width}.png`, fullPage: true });
    await page.keyboard.press("Escape");
    await login(page, "visual", "/home");
    await page.screenshot({ path: `/tmp/echoflow-catalog-${width}.png`, fullPage: true });
    await page.getByRole("link", { name: "Voice Comparison", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Voice Comparison" })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `/tmp/echoflow-practice-${width}.png`, fullPage: true });
    await page.context().clearCookies();
  }
});
