import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { admin, ensureAccount, localUrl, login, password } from "./helpers/auth";

const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4175";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==",
  "base64",
);
function metadata(id = randomUUID()) {
  return {
    id,
    message: "Please improve the workplace playlist search.",
    pagePath: "/home",
    capturedAt: new Date().toISOString(),
    viewport: { width: 375, height: 800 },
    navigation: [],
  };
}
const modal = (page: import("@playwright/test").Page) =>
  page.getByRole("dialog", { name: "Help improve EchoFlow" });

test("floating Feedback sends reviewed screenshot and sanitized recent actions", async ({
  page,
}) => {
  const duplicateKeys: string[] = [];
  page.on("console", (event) => {
    if (event.text().includes("Encountered two children with the same key"))
      duplicateKeys.push(event.text());
  });
  await login(page, "feedback-submit", "/home");
  await page.getByRole("link", { name: "Voice Comparison", exact: true }).click();
  await page.getByRole("button", { name: /Choose phrase 2:/ }).click();
  await page.getByRole("radio", { name: "Harper", exact: true }).check();
  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await expect(modal(page).getByLabel("Your suggestion")).toBeFocused();
  await expect(modal(page).getByRole("img", { name: /Screenshot of the page/ })).toBeVisible({
    timeout: 15000,
  });
  await expect(modal(page).locator(".feedback-history")).toContainText("select phrase");
  await expect(modal(page).locator(".feedback-history")).toContainText("select voice");
  await page.screenshot({ path: "/tmp/echoflow-feedback-desktop.png" });
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/feedback") && r.request().method() === "POST",
  );
  await modal(page)
    .getByLabel("Your suggestion")
    .fill("Please make the next phrase button easier to find.");
  await modal(page).getByRole("button", { name: "Send feedback", exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(201);
  const { id } = await result.json();
  const { data, error } = await admin.from("app_feedback").select("*").eq("id", id).single();
  expect(error).toBeNull();
  expect(data.screenshot_path).toMatch(/\.png$/);
  expect(data.navigation.length).toBeGreaterThan(2);
  await expect(page.getByRole("heading", { name: "Thanks for your feedback!" })).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("button", { name: "Feedback", exact: true })).toBeFocused();
  expect(duplicateKeys).toEqual([]);
});

test("cancel sends nothing; failure retains draft; retry can omit both attachments", async ({
  page,
}) => {
  await login(page, "feedback-retry", "/home");
  let requests = 0;
  await page.route("**/api/feedback", (route) => {
    requests++;
    return route.fulfill({ status: 503, json: { error: "fixture" } });
  });
  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await modal(page).getByLabel("Your suggestion").fill("Please improve the search feedback.");
  await page.keyboard.press("Escape");
  expect(requests).toBe(0);
  await expect(page.getByRole("button", { name: "Feedback", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await modal(page).getByLabel("Include screenshot").uncheck();
  await modal(page).getByLabel("Include recent navigation").uncheck();
  const text = "Please improve the playlist filtering.";
  await modal(page).getByLabel("Your suggestion").fill(text);
  await modal(page).getByRole("button", { name: "Send feedback", exact: true }).click();
  await expect(modal(page).getByRole("alert")).toContainText("draft is still here");
  await expect(modal(page).getByLabel("Your suggestion")).toHaveValue(text);
  await page.unroute("**/api/feedback");
  const response = page.waitForResponse((r) => r.url().endsWith("/api/feedback"));
  await modal(page).getByRole("button", { name: "Send feedback", exact: true }).click();
  const { id } = await (await response).json();
  const { data } = await admin.from("app_feedback").select("*").eq("id", id).single();
  expect(data.screenshot_path).toBeNull();
  expect(data.navigation).toEqual([]);
  expect(data.message).toBe(text);
});

test("real viewport capture redacts inputs/private media and preserves scrolled fixed/nested geometry", async ({
  page,
}) => {
  await login(page, "feedback-capture", "/home");
  await page.evaluate(() => {
    document.body.style.minHeight = "2000px";
    window.scrollTo(0, 700);
    const fixture = document.createElement("div");
    fixture.id = "capture-fixture";
    fixture.style.cssText =
      "position:fixed;left:10px;top:10px;width:300px;height:300px;z-index:100;background:white";
    fixture.innerHTML =
      '<div data-feedback-private style="position:absolute;left:0;top:0;width:40px;height:40px;background:rgb(255,0,255)">secret</div><input value="secret value" style="position:absolute;left:0;top:50px;width:40px;height:40px;background:rgb(255,0,255)"><div style="position:absolute;left:0;top:100px;width:40px;height:40px;background:rgb(0,255,0)"></div><div id="nested-capture" style="position:absolute;left:0;top:150px;width:40px;height:40px;overflow:auto"><div style="height:80px;background:red"></div><div style="height:80px;background:rgb(0,0,255)"></div></div>';
    fixture.insertAdjacentHTML(
      "beforeend",
      '<textarea style="position:absolute;left:50px;top:0;width:40px;height:40px;background:rgb(255,0,255)">secret text</textarea><video style="position:absolute;left:100px;top:0;width:40px;height:40px;background:rgb(255,0,255)"></video><div contenteditable style="position:absolute;left:150px;top:0;width:40px;height:40px;background:rgb(255,0,255)">secret edit</div>',
    );
    document.body.appendChild(fixture);
    const nested = document.getElementById("nested-capture");
    if (!nested) throw new Error("Fixture missing");
    nested.scrollTop = 80;
  });
  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  const image = modal(page).getByRole("img", { name: /Screenshot of the page/ });
  await expect(image).toBeVisible({ timeout: 15000 });
  const captured = await image.evaluate(async (element) => {
    const img = element as HTMLImageElement;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0);
    const color = (x: number, y: number) =>
      Array.from(ctx.getImageData(x, y, 1, 1).data).slice(0, 3);
    return {
      width: canvas.width,
      height: canvas.height,
      private: color(30, 30),
      textarea: color(80, 30),
      media: color(130, 30),
      editable: color(180, 30),
      input: color(30, 80),
      fixed: color(30, 130),
      nested: color(30, 180),
    };
  });
  await image.screenshot({ path: "/tmp/echoflow-feedback-capture-preview.png" });
  expect(captured.width).toBe(1280);
  expect(captured.height).toBe(720);
  expect(captured.private).toEqual([255, 255, 255]);
  expect(captured.input).toEqual([255, 255, 255]);
  expect(captured.textarea).toEqual([255, 255, 255]);
  expect(captured.media).toEqual([255, 255, 255]);
  expect(captured.editable).toEqual([255, 255, 255]);
  expect(captured.fixed).toEqual([0, 255, 0]);
  expect(captured.nested).toEqual([0, 0, 255]);
  await image.screenshot({ path: "/tmp/echoflow-feedback-capture-preview.png" });
});

test("mobile keyboard focus is contained and screenshot failure allows text-only", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 556 });
  await login(page, "feedback-mobile", "/home");
  // Deterministic browser renderer failure, no provider or remote call.
  await page.addStyleTag({ content: ".feedback-trigger {z-index:100}" });
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.toBlob = () => {
      throw new Error("fixture unavailable");
    };
  });
  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await expect(modal(page).getByText("Screenshot unavailable.", { exact: false })).toBeVisible({
    timeout: 15000,
  });
  await expect(modal(page).getByLabel("Your suggestion")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(modal(page).getByRole("button", { name: "Close feedback" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(modal(page).getByLabel("Your suggestion")).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await modal(page)
    .getByLabel("Your suggestion")
    .fill("Please improve the mobile playlist layout.");
  await modal(page)
    .getByRole("button", { name: "Send feedback", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/echoflow-feedback-mobile.png" });
  await modal(page).getByRole("button", { name: "Send feedback", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Thanks for your feedback!" })).toBeVisible();
});

test("API enforces authentication/origin/validation and identical retry with real private Storage isolation", async ({
  page,
  request,
}) => {
  const value = metadata();
  const send = (data: typeof value, headers = { Origin: origin }, image = true) =>
    page.request.post("/api/feedback", {
      headers,
      multipart: {
        metadata: JSON.stringify(data),
        ...(image ? { screenshot: { name: "page.png", mimeType: "image/png", buffer: png } } : {}),
      },
    });
  expect(
    (
      await request.post("/api/feedback", {
        headers: { Origin: origin },
        multipart: { metadata: JSON.stringify(value) },
      })
    ).status(),
  ).toBe(401);
  await login(page, "feedback-api", "/home");
  expect((await send(value, { Origin: "https://foreign.example" })).status()).toBe(403);
  expect((await send({ ...value, pagePath: "/home?token=private" })).status()).toBe(400);
  expect(
    (
      await page.request.post("/api/feedback", {
        headers: { Origin: origin },
        multipart: {
          metadata: JSON.stringify(value),
          screenshot: { name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not PNG") },
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/feedback", {
        headers: { Origin: origin },
        multipart: {
          metadata: JSON.stringify(value),
          screenshot: {
            name: "big.png",
            mimeType: "image/png",
            buffer: Buffer.alloc(2 * 1024 * 1024 + 65536),
          },
        },
      })
    ).status(),
  ).toBe(413);
  expect((await send(value)).status()).toBe(201);
  expect((await send(value)).status()).toBe(200);
  expect(
    (await send({ ...value, message: "A different suggestion using the same id." })).status(),
  ).toBe(409);
  const { data } = await admin.from("app_feedback").select("*").eq("id", value.id).single();
  const a = await ensureAccount("feedback-api"),
    b = await ensureAccount("feedback-other");
  const client = async (email: string) => {
    const c = createClient(localUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", {
      auth: { persistSession: false },
    });
    const result = await c.auth.signInWithPassword({ email, password });
    expect(result.error).toBeNull();
    return c;
  };
  const A = await client(a.email),
    B = await client(b.email);
  expect(
    (await A.storage.from("feedback-screenshots").download(data.screenshot_path)).error,
  ).toBeNull();
  expect(
    (await B.storage.from("feedback-screenshots").download(data.screenshot_path)).error,
  ).not.toBeNull();
  expect((await B.from("app_feedback").select("*").eq("id", value.id)).data).toEqual([]);
  expect(
    (
      await B.storage
        .from("feedback-screenshots")
        .upload(data.screenshot_path, png, { contentType: "image/png" })
    ).error,
  ).not.toBeNull();
  await B.storage.from("feedback-screenshots").remove([data.screenshot_path]);
  expect(
    (await A.storage.from("feedback-screenshots").download(data.screenshot_path)).error,
  ).toBeNull();
});

test("account exit discards previous routes and actions", async ({ page }) => {
  await login(page, "feedback-reset-a", "/scenarios/voice-comparison");
  await page.getByRole("button", { name: /Choose phrase 2:/ }).click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await login(page, "feedback-reset-b", "/home");
  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  const history = modal(page).locator(".feedback-history");
  await expect(history).toContainText("/home");
  await expect(history).not.toContainText("select phrase");
  await expect(history).not.toContainText("voice-comparison");
  await page.keyboard.press("Escape");
});
