import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";
import { installMediaMocks } from "./helpers/media";

declare global {
  interface Window {
    __referenceBufferSize: number;
    __routeAnimations: Array<{ frames: ComputedKeyframe[]; duration: number | string }>;
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(installMediaMocks);
});

test("first authenticated entry explains permission, releases the stream and does not record", async ({
  page,
}) => {
  await login(page, "mic-onboarding", "/home", { microphoneOnboarding: true });
  await expect(page.getByRole("dialog", { name: "Let’s hear your voice" })).toBeVisible();
  expect(await page.evaluate(() => window.__echoTest.getUserMediaCalls)).toBe(0);
  await page.getByRole("button", { name: "Enable microphone", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__echoTest.getUserMediaCalls)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__echoTest.tracksStopped)).toBe(1);
  expect(await page.evaluate(() => window.__echoTest.recorderStarts)).toBe(0);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".microphone-onboarding")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Available playlists" })).toBeVisible();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await page.evaluate(() => window.__echoTest.getUserMediaCalls)).toBe(0);
});

test("denied onboarding is nonblocking and can be retried", async ({ page }) => {
  await page.addInitScript(() => window.__echoTest.denyNextMicrophone());
  await login(page, "mic-denied", "/home", { microphoneOnboarding: true });
  await page.getByRole("button", { name: "Enable microphone", exact: true }).click();
  await expect(page.getByText("You can still listen.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Voice Comparison", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Enable microphone", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__echoTest.getUserMediaCalls)).toBe(2);
  await expect.poll(() => page.evaluate(() => window.__echoTest.tracksStopped)).toBe(1);
});

test("Speak ignores initial silence and pauses, then stops after speech ends", async ({ page }) => {
  await page.clock.install();
  await login(page, "silence");
  await page.getByRole("button", { name: "Listen to reference" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__echoTest.currentAudioTimeMs()))
    .not.toBeNull();
  await page.evaluate(() => window.__echoTest.finishCurrentAudio());
  await page.clock.runFor(300);
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await page.clock.runFor(5000);
  await expect(page.getByRole("button", { name: "Stop recording" })).toBeVisible();
  await page.evaluate(() => window.__echoTest.setMicrophoneLevel(0.1));
  await page.clock.runFor(300);
  await page.evaluate(() => window.__echoTest.setMicrophoneLevel(0));
  await page.clock.runFor(1000);
  await expect(page.getByRole("button", { name: "Stop recording" })).toBeVisible();
  await page.evaluate(() => window.__echoTest.setMicrophoneLevel(0.1));
  await page.clock.runFor(300);
  await page.evaluate(() => window.__echoTest.setMicrophoneLevel(0));
  await page.clock.runFor(1600);
  await expect(page.getByRole("button", { name: "Record again", exact: true })).toBeEnabled();
  await expect.poll(() => page.evaluate(() => window.__echoTest.tracksStopped)).toBe(1);
});

test("reference bytes are fetched once per buffered voice, not again on each play", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/reference-audio/")) requests.push(request.url());
  });
  await login(page, "reference-buffer");
  await expect
    .poll(() =>
      page
        .getByTestId("reference-word-audio")
        .evaluate((element) => (element as HTMLAudioElement).src),
    )
    .toMatch(/^blob:/);
  for (let n = 0; n < 2; n++) {
    await page.getByRole("button", { name: "Listen to reference" }).click();
    await expect
      .poll(() => page.evaluate(() => window.__echoTest.currentAudioTimeMs()))
      .not.toBeNull();
    await page.evaluate(() => window.__echoTest.finishCurrentAudio());
    await expect(page.getByRole("button", { name: "Record", exact: true })).toBeEnabled();
  }
  const first = requests[0];
  expect(requests.filter((path) => path === first)).toHaveLength(1);
  await page.getByRole("radio", { name: "Harper", exact: true }).check();
  await expect
    .poll(() =>
      page
        .getByTestId("reference-word-audio")
        .evaluate((element) => (element as HTMLAudioElement).src),
    )
    .toMatch(/^blob:/);
  await page.getByRole("radio", { name: "Puck", exact: true }).check();
  await expect
    .poll(() =>
      page
        .getByTestId("reference-word-audio")
        .evaluate((element) => (element as HTMLAudioElement).src),
    )
    .toMatch(/^blob:/);
  expect(requests.filter((path) => path === first)).toHaveLength(1);
});

test("Compare is actionable without a take and practice has no redundant footer", async ({
  page,
}) => {
  await login(page, "refinement");
  await expect(page.getByRole("button", { name: "Compare", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.locator("p[role=alert]")).toContainText("Speak");
  await expect(page.getByRole("button", { name: "Play your recording" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Previous phrase" })).toHaveCount(0);
  await expect(page.getByText("Phrase 1 of 5", { exact: true })).toHaveCount(0);
});

test("a voice change preserves the take and recording readiness", async ({ page }) => {
  await login(page, "refinement-voice");
  await page.getByRole("button", { name: "Listen to reference" }).click();
  await expect(page.getByRole("status")).toContainText("Playing reference");
  await page.evaluate(() => window.__echoTest.finishCurrentAudio());
  await expect(page.getByRole("button", { name: "Record", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop recording" })).toBeVisible();
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByRole("button", { name: "Record again", exact: true })).toBeEnabled();
  await page.getByRole("radio", { name: "Harper", exact: true }).check();
  await expect(page.getByRole("button", { name: "Record again", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Record again", exact: true })).toHaveText("Speak");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Playing reference");
  await page.evaluate(() => window.__echoTest.finishCurrentAudio());
  await expect
    .poll(() => page.evaluate(() => window.__echoTest.audioStarts.at(-1)?.startsWith("blob:")))
    .toBe(true);
});

test("reference buffer is bounded and released on leaving practice", async ({ page }) => {
  await page.addInitScript(() => {
    const urls = new Set<string>();
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      urls.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      urls.delete(url);
      revoke(url);
    };
    Object.defineProperty(window, "__referenceBufferSize", { get: () => urls.size });
  });
  await login(page, "bounded-buffer");
  for (let phrase = 1; phrase <= 5; phrase++) {
    if (phrase > 1) await page.getByRole("button", { name: "Next phrase" }).click();
    for (const voice of ["Puck", "Harper"]) {
      await page.getByRole("radio", { name: voice, exact: true }).check();
      await expect
        .poll(() =>
          page
            .getByTestId("reference-word-audio")
            .evaluate((element) => (element as HTMLAudioElement).src),
        )
        .toMatch(/^blob:/);
      await expect
        .poll(() => page.evaluate(() => window.__referenceBufferSize))
        .toBeLessThanOrEqual(4);
    }
  }
  await page.getByRole("link", { name: "Playlists", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Available playlists" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__referenceBufferSize)).toBe(0);
});

test("page transitions are short, reduced-motion friendly and immediate by keyboard", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__routeAnimations = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const result = animate.apply(this, args);
      if (this.classList.contains("page-transition") && result.effect instanceof KeyframeEffect)
        window.__routeAnimations.push({
          frames: result.effect.getKeyframes(),
          duration: Number(result.effect.getTiming().duration),
        });
      return result;
    };
  });
  await login(page, "route-motion", "/home");
  await page.evaluate(() => {
    window.__routeAnimations = [];
  });
  await page.getByRole("link", { name: "Voice Comparison", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Voice Comparison", exact: true })).toBeVisible();
  const pointer = await page.evaluate(() => window.__routeAnimations);
  expect(pointer).toHaveLength(1);
  expect(pointer[0].duration).toBe(180);
  expect(pointer[0].frames[0].transform).toBe("translateY(4px)");
  await page.evaluate(() => {
    window.__routeAnimations = [];
  });
  await page.getByRole("link", { name: "Playlists", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/home$/);
  expect(await page.evaluate(() => window.__routeAnimations)).toHaveLength(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("link", { name: "Voice Comparison", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Voice Comparison", exact: true })).toBeVisible();
  const reduced = await page.evaluate(() => window.__routeAnimations);
  expect(reduced).toHaveLength(1);
  expect(reduced[0].duration).toBe(120);
  expect(reduced[0].frames.every((frame) => !frame.transform)).toBe(true);
});
