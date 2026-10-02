import { expect, test } from "@playwright/test";

test("reopening login resets recovery and clears a revealed password", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Login", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Password", { exact: true }).fill("fixture-password-only");
  await dialog.getByRole("button", { name: "Show password" }).click();
  await page.keyboard.press("Escape");
  await trigger.click();
  await expect(dialog.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(dialog.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  await dialog.getByRole("button", { name: "Forgot password?" }).click();
  await page.keyboard.press("Escape");
  await trigger.click();
  await expect(dialog.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("desktop hero retains its composition across viewport sizes", async ({ page }) => {
  await page.goto("/");
  let compositionHeight: number | undefined;
  for (const width of [960, 1024, 1200, 1440, 1543, 1864]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    const hero = await page.locator(".hero").boundingBox();
    expect(hero?.width).toBe(894);
    compositionHeight ??= hero?.height;
    expect(hero?.height).toBe(compositionHeight);
    expect(
      await page.locator(".hero-copy > h1").evaluate((el) => getComputedStyle(el).fontSize),
    ).toBe("72px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});

test("short mobile viewports keep the modal close and submit controls reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 556 });
  await page.goto("/");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const close = dialog.getByRole("button", { name: "Close signup" });
  await expect(close).toBeInViewport();
  const closeBounds = await close.boundingBox();
  expect(closeBounds?.y).toBeGreaterThanOrEqual(8);
  expect((closeBounds?.y ?? 0) + (closeBounds?.height ?? 0)).toBeLessThanOrEqual(556);
  await dialog.getByRole("button", { name: "Continue", exact: true }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("button", { name: "Continue", exact: true })).toBeInViewport();
  await close.click();
  await expect(dialog).not.toBeVisible();
});

test("pointer mode changes animate only compositor properties and can be interrupted", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Log in", exact: true }).click();
  const frames = await dialog.locator(".auth-view").evaluate((element) =>
    element.getAnimations().map((animation) => ({
      duration: animation.effect?.getTiming().duration,
      frames: (animation.effect as KeyframeEffect).getKeyframes(),
    })),
  );
  expect(frames).toHaveLength(1);
  expect(frames[0].duration).toBe(180);
  expect(Object.keys(frames[0].frames[0]).sort()).toEqual(
    ["composite", "computedOffset", "easing", "offset", "opacity", "transform"].sort(),
  );
  await dialog
    .getByRole("button", { name: "Forgot password?" })
    .evaluate((button) =>
      button.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })),
    );
  await expect(dialog.getByRole("heading", { name: "Recover your account" })).toBeVisible();
  await dialog
    .getByRole("button", { name: "Back to login" })
    .evaluate((button) =>
      button.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 })),
    );
  await expect(dialog.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

for (const width of [320, 375, 760, 959]) {
  test(`mobile composition and balanced auth copy at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const copy = await page.locator(".hero-copy").boundingBox();
    const how = await page.locator(".how-panel").boundingBox();
    expect(how?.y).toBeGreaterThan((copy?.y ?? 0) + (copy?.height ?? 0));
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".auth-description")).toHaveCSS("text-wrap-style", "balance");
    await expect(dialog.locator(".auth-description .nowrap")).toHaveText("It’s free!");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

for (const route of ["/", "/login", "/signup"]) {
  test(`password visibility preserves the value and default mask on ${route}`, async ({ page }) => {
    await page.goto(route);
    if (route === "/") await page.getByRole("button", { name: "Sign up", exact: true }).click();
    const form = route === "/" ? page.getByRole("dialog") : page.locator(".auth-form");
    const password = form.getByLabel("Password", { exact: true });
    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveAttribute("placeholder", "••••••••");
    await password.fill("fixture-password-only");
    await form.getByRole("button", { name: "Show password", exact: true }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue("fixture-password-only");
    await expect(form.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await form.getByRole("button", { name: "Hide password" }).press("Enter");
    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveValue("fixture-password-only");
  });
}

test("modal motion is restrained, reduced-motion friendly and immediate by keyboard", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Sign up", exact: true });
  await trigger.focus();
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAttribute("data-instant", "true");
  await expect(dialog).toHaveCSS("transition-duration", "0s, 0s");
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await trigger.click();
  await expect(dialog).toHaveCSS("transform", "none");
  await dialog.getByRole("button", { name: "Log in", exact: true }).click();
  await dialog.getByRole("button", { name: "Forgot password?" }).click();
  await expect(dialog.getByRole("heading", { name: "Recover your account" })).toBeVisible();
  await expect(dialog.locator(".auth-view")).toHaveCSS("transform", "none");
  await dialog.getByRole("button", { name: "Back to login" }).click();
  await dialog.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.press("Enter");
  await expect(dialog).toHaveCSS("transition-duration", "0s, 0s");
});
