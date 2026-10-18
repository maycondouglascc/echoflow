import { type APIRequestContext, expect, test } from "@playwright/test";
import {
  admin,
  audioUrl,
  ensureAccount,
  localInbox,
  localUrl,
  login,
  password,
} from "./helpers/auth";

test("anonymous direct routes, old audio URLs and forged cookies disclose no phrase or audio", async ({
  page,
  request,
  context,
}) => {
  await context.addCookies([
    { name: "sb-forged-auth-token", value: "fake", domain: "127.0.0.1", path: "/" },
  ]);
  for (const route of [
    "/home",
    "/scenarios/voice-comparison",
    "/scenarios/introducing-yourself",
    "/practice/introducing-yourself-01",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByText("Hi, my name is Alex. It's nice to meet you.", { exact: true }),
    ).toHaveCount(0);
  }
  const result = await request.get(
    audioUrl("introducing-yourself-01--google-gemini-3-8-flash-tts--puck"),
  );
  expect(result.status()).toBe(401);
  expect((await result.body()).length).toBe(0);
  expect((await request.get("/fixtures/audio/introducing-yourself-01.wav")).status()).toBe(404);
});

test("email login returns to protected destination; logout blocks new requests", async ({
  page,
}) => {
  await login(page, "auth", "/home");
  await expect(page.getByRole("heading", { name: "Available playlists" })).toBeVisible();
  await page.goto("/signup");
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/scenarios/voice-comparison");
  await expect(page).toHaveURL(/\/login/);
});

test("signup is neutral, login failure recovers and invalid callbacks cannot redirect externally", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.getByLabel("Email address").fill(`signup-${Date.now()}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Request received");
  await expect(page.getByRole("heading", { name: "Check your email", exact: true })).toBeVisible();
  await expect(
    page.getByText("Confirm your email address before signing in to EchoFlow."),
  ).toBeVisible();
  await page.goto("/auth/callback?code=invalid&next=https://example.com");
  await expect(page).toHaveURL(/\/login\?error=callback/);
  await login(page, "redirect", "/home");
  await page.context().clearCookies();
  await page.goto("/login?next=//example.com");
  await page.getByLabel("Email address").fill("redirect@example.test");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Email or password is incorrect" }),
  ).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test("unconfigured Google flow shows a recoverable error", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Google sign-in is unavailable" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeEnabled();
});

test("direct access preserves the requested internal destination after login", async ({ page }) => {
  const account = await ensureAccount("direct");
  await page.goto("/scenarios/voice-comparison");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email address").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/scenarios\/voice-comparison$/);
});

test("a tampered SDK session cookie cannot authorize catalog or audio", async ({
  page,
  context,
}) => {
  await login(page, "tampered");
  const cookies = await context.cookies();
  const session = cookies.find(
    (cookie) => cookie.name.includes("auth-token") && !cookie.name.includes("verifier"),
  );
  if (!session) throw new Error("Expected SDK session cookie in local test.");
  await context.clearCookies();
  await context.addCookies([
    {
      ...session,
      value: `base64-${Buffer.from(JSON.stringify({ access_token: "invalid.signed.token", refresh_token: "invalid" })).toString("base64url")}`,
    },
  ]);
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login/);
  expect(
    (
      await page.request.get(audioUrl("introducing-yourself-01--google-gemini-3-8-flash-tts--puck"))
    ).status(),
  ).toBe(401);
});

async function localEmailLink(request: APIRequestContext, email: string, subject: string) {
  let id = "";
  await expect
    .poll(async () => {
      const response = await request.get(`${localInbox}/api/v1/messages`);
      const inbox = await response.json();
      const message = inbox.messages.find(
        (m: { ID: string; Subject: string; To: { Address: string }[] }) =>
          m.To.some((to) => to.Address === email) && m.Subject.toLowerCase().includes(subject),
      );
      id = message?.ID ?? "";
      return Boolean(id);
    })
    .toBe(true);
  const message = await (await request.get(`${localInbox}/api/v1/message/${id}`)).json();
  const match = String(message.HTML).match(/href="([^"]*\/auth\/(?:v1\/verify|callback)[^"]*)"/);
  if (!match) throw new Error("Local confirmation link missing.");
  const link = match[1].replaceAll("&amp;", "&");
  if (
    ![
      new URL(localUrl).origin,
      process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4175",
    ].includes(new URL(link).origin)
  )
    throw new Error("Refusing nonlocal auth link.");
  return link;
}

test("a revoked account session cannot make new protected requests", async ({ page }) => {
  const label = `revoked-${Date.now()}`;
  const account = await ensureAccount(label);
  await login(page, label);
  await admin.auth.admin.deleteUser(account.id);
  expect(
    (
      await page.request.get(audioUrl("introducing-yourself-01--google-gemini-3-8-flash-tts--puck"))
    ).status(),
  ).toBe(401);
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login/);
});

test("email confirmation and recovery complete through the local inbox", async ({
  page,
  request,
}) => {
  const email = `confirmed-${Date.now()}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Request received");
  await page.goto(await localEmailLink(request, email, "confirm"));
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("dialog", { name: "Let’s hear your voice" })).toBeVisible();
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send recovery email" }).click();
  await expect(page.getByRole("status")).toContainText("instructions");
  await page.goto(await localEmailLink(request, email, "reset"));
  await expect(page).toHaveURL(/\/login\?mode=reset$/);
  await page.getByLabel("Password", { exact: true }).fill(`${password}new`);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(`${password}new`);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test("switching between login and recovery clears the previous outcome", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("missing-auth-flow@example.test");
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password-123!");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.locator(".auth-form").getByRole("alert")).toContainText(
    "Email or password is incorrect",
  );
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await expect(page.locator(".auth-form").getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Send recovery email" }).click();
  await expect(page.getByRole("status")).toContainText("instructions");
  await page.getByRole("button", { name: "Back to login" }).click();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("email recovery completes when the email opens in another browser session", async ({
  page,
  browser,
  request,
}) => {
  const account = await ensureAccount(`cross-browser-${Date.now()}`);
  await page.goto("/login");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.getByLabel("Email address").fill(account.email);
  await page.getByRole("button", { name: "Send recovery email" }).click();
  await expect(page.getByRole("status")).toContainText("instructions");
  const link = await localEmailLink(request, account.email, "reset");
  const otherContext = await browser.newContext();
  try {
    const otherPage = await otherContext.newPage();
    await otherPage.goto(link);
    await expect(otherPage).toHaveURL(/\/login\?mode=reset$/);
    await expect(otherPage.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
    await otherPage.getByLabel("Password", { exact: true }).fill(`${password}-recovered`);
    await otherPage.getByRole("button", { name: "Save password" }).click();
    await expect(otherPage).toHaveURL(/\/home$/);
    await otherPage.getByRole("button", { name: "Not now", exact: true }).click();
    await otherPage.getByRole("button", { name: "Log out" }).click();
    await otherPage.goto(link);
    await expect(otherPage).toHaveURL(/\/auth\/complete$/);
    await expect(otherPage.locator(".auth-form").getByRole("alert")).toContainText(
      "invalid or expired",
    );
    await page.goto("/login");
    await page.getByLabel("Email address").fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill(`${password}-recovered`);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
  } finally {
    await otherContext.close();
  }
});

test("signup confirmation works in another browser and rejects reused links", async ({
  page,
  browser,
  request,
}) => {
  const email = `cross-signup-${Date.now()}@example.test`;
  await page.goto("/signup?next=/scenarios/voice-comparison");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your email", exact: true })).toBeVisible();
  const link = await localEmailLink(request, email, "confirm");
  const other = await browser.newContext();
  try {
    const nextPage = await other.newPage();
    await nextPage.goto(link);
    await expect(nextPage).toHaveURL(/\/scenarios\/voice-comparison$/);
    await nextPage.getByRole("button", { name: "Not now", exact: true }).click();
    await nextPage.getByRole("button", { name: "Log out" }).click();
    await nextPage.goto(link);
    await expect(nextPage).toHaveURL(/\/auth\/complete$/);
    await expect(nextPage.locator(".auth-form").getByRole("alert")).toContainText(
      "invalid or expired",
    );
  } finally {
    await other.close();
  }
});

test("refresh persists renewed session cookies on protected navigation", async ({
  page,
  context,
}) => {
  await login(page, "refresh-auth", "/home");
  const cookies = await context.cookies();
  const session = cookies.find(
    (c) => c.name.includes("auth-token") && !c.name.includes("verifier"),
  );
  if (!session?.value.startsWith("base64-")) throw new Error("Expected synthetic session cookie.");
  const value = JSON.parse(Buffer.from(session.value.slice(7), "base64url").toString());
  value.expires_at = 1;
  await context.addCookies([
    { ...session, value: `base64-${Buffer.from(JSON.stringify(value)).toString("base64url")}` },
  ]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Available playlists" })).toBeVisible();
  const renewed = (await context.cookies()).find((c) => c.name === session.name);
  const oldCookie = `base64-${Buffer.from(JSON.stringify(value)).toString("base64url")}`;
  expect(Boolean(renewed && renewed.value !== oldCookie)).toBe(true);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/home$/);
});

test("forged email-link credentials are removed from the URL and cannot authorize a user", async ({
  page,
}) => {
  const response = await page.goto(
    "/auth/complete#access_token=a.b.c&refresh_token=not-a-session&type=recovery",
  );
  expect(response?.headers()["cache-control"]).toContain("no-store");
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  await expect(page.locator(".auth-form").getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/complete$/);
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login/);
});
