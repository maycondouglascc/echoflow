import { type APIRequestContext, expect, test } from "@playwright/test";
import { admin, audioUrl, ensureAccount, login, password } from "./helpers/auth";

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
  await page.goto("/auth/callback?code=invalid&next=https://example.com");
  await expect(page).toHaveURL(/\/login\?error=callback/);
  await login(page, "redirect", "/home");
  await page.context().clearCookies();
  await page.goto("/login?next=//example.com");
  await page.getByLabel("Email address").fill("redirect@example.test");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Unable to sign in" })).toBeVisible();
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
      const response = await request.get("http://127.0.0.1:56324/api/v1/messages");
      const inbox = await response.json();
      const message = inbox.messages.find(
        (m: { ID: string; Subject: string; To: { Address: string }[] }) =>
          m.To.some((to) => to.Address === email) && m.Subject.toLowerCase().includes(subject),
      );
      id = message?.ID ?? "";
      return Boolean(id);
    })
    .toBe(true);
  const message = await (await request.get(`http://127.0.0.1:56324/api/v1/message/${id}`)).json();
  const match = String(message.HTML).match(/href="([^"]*\/auth\/v1\/verify[^"]*)"/);
  if (!match) throw new Error("Local confirmation link missing.");
  const link = match[1].replaceAll("&amp;", "&");
  if (new URL(link).origin !== "http://127.0.0.1:56321")
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

test("email confirmation and recovery complete through the local inbox and PKCE", async ({
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
