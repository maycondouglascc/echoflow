import { expect, test } from "@playwright/test";

for (const width of [1440, 375]) {
  test(`landing and signup modal work at ${width}px with keyboard and reduced motion`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "English shadowing made easy" })).toBeVisible();
    await expect(page.getByText("Free during beta - $0")).toBeVisible();
    await expect(page.getByText(/Mobbin|No account|Local prototype/i)).toHaveCount(0);
    await page.getByRole("button", { name: "Practice now" }).click();
    const modal = page.getByRole("dialog", { name: "Create your account" });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("button", { name: "Continue with Google" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(modal.getByRole("button", { name: "Close signup" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Practice now" })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
