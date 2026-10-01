import { expect, test } from "@playwright/test";
import { ensureAccount, password } from "./helpers/auth";

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

for (const width of [1440, 375]) {
  for (const label of ["Login", "Sign up", "Practice now"]) {
    test(`${label} opens authentication over the landing at ${width}px without navigating away`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.getByRole("button", { name: label, exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(page).toHaveURL(/\/$/);
      await expect(page.locator(".landing")).toBeVisible();
      await expect(
        dialog.getByRole("heading", {
          name: label === "Login" ? "Welcome back" : "Create your account",
        }),
      ).toBeVisible();
      await dialog
        .getByRole("button", { name: label === "Login" ? "Sign up" : "Log in", exact: true })
        .click();
      await expect(
        dialog.getByRole("heading", {
          name: label === "Login" ? "Create your account" : "Welcome back",
        }),
      ).toBeVisible();
      await expect(page).toHaveURL(/\/$/);
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(page.getByRole("button", { name: label, exact: true })).toBeFocused();
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(dialog.getByRole("button", { name: "Continue with Google" })).toBeFocused();
      await expect(
        dialog.getByRole("heading", {
          name: label === "Login" ? "Welcome back" : "Create your account",
        }),
      ).toBeVisible();
    });
  }
}

test("email login submits from the landing modal and reaches the protected catalog", async ({
  page,
}) => {
  const account = await ensureAccount("modal-login");
  await page.goto("/");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Forgot password?" }).click();
  await expect(dialog.getByRole("heading", { name: "Recover your account" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await dialog.getByRole("button", { name: "Back to login" }).click();
  await dialog.getByLabel("Email address").fill(account.email);
  await dialog.getByLabel("Password", { exact: true }).fill(password);
  await dialog.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { name: "Available playlists" })).toBeVisible();
});
