import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";
import { installMediaMocks } from "./helpers/media";

declare global {
  interface Window {
    __pairedTest: {
      starts: number[];
      stopped: number;
      gains: number[];
      finish(index: number): void;
      failNextDecode(): void;
    };
  }
}
// Control source ends independently rather than treating two play promises as
// acoustic synchronization evidence. Device marker testing remains separate.
function installPairedMocks() {
  const Original = window.AudioContext;
  const sources: Array<{ onended: (() => void) | null }> = [];
  const gainNodes: Array<{ gain: { value: number } }> = [];
  const state = {
    starts: [] as number[],
    stopped: 0,
    gains: [] as number[],
    failDecode: false,
    failNextDecode() {
      state.failDecode = true;
    },
    finish(index: number) {
      sources[index]?.onended?.();
    },
  };
  class PairedContext extends Original {
    get currentTime() {
      return 10;
    }
    get destination() {
      return {} as AudioDestinationNode;
    }
    async decodeAudioData() {
      if (state.failDecode) {
        state.failDecode = false;
        throw new Error("decode failed");
      }
      return { duration: 3 } as AudioBuffer;
    }
    createGain() {
      const node = { gain: { value: 0 }, connect() {}, disconnect() {} };
      gainNodes.push(node);
      state.gains.push(node.gain.value);
      return node as unknown as GainNode;
    }
    createBufferSource() {
      const source = {
        onended: null as (() => void) | null,
        connect() {},
        disconnect() {},
        start(when: number) {
          state.starts.push(when);
        },
        stop() {
          state.stopped++;
        },
      };
      sources.push(source);
      return source as unknown as AudioBufferSourceNode;
    }
  }
  Object.defineProperty(window, "AudioContext", { configurable: true, value: PairedContext });
  window.__pairedTest = state;
  Object.defineProperty(window.__pairedTest, "gains", {
    get: () => gainNodes.map((node) => node.gain.value),
  });
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(installMediaMocks);
  await page.addInitScript(installPairedMocks);
});
async function recordTake(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Listen to reference" }).click();
  await expect(page.getByRole("status")).toContainText("Playing reference");
  await page.evaluate(() => window.__echoTest.finishCurrentAudio());
  await expect(page.getByRole("button", { name: "Record", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop recording" })).toBeVisible();
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByRole("button", { name: "My recording", exact: true })).toBeEnabled();
}
test("paired playback shares a clock, waits for both ends and Stop cancels outstanding source", async ({
  page,
}) => {
  await login(page, "paired-end");
  await recordTake(page);
  await page.getByRole("radio", { name: "Both together", exact: true }).check();
  await expect(page.getByLabel("Reference volume")).toHaveValue("0.5");
  await expect(page.getByLabel("My recording volume")).toHaveValue("0.5");
  await page.getByLabel("Reference volume").focus();
  await page.getByLabel("Reference volume").press("ArrowRight");
  await expect(page.getByLabel("Reference volume")).toHaveValue("0.55");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("together");
  expect(await page.evaluate(() => window.__pairedTest.starts)).toEqual([10.1, 10.1]);
  expect(await page.evaluate(() => window.__pairedTest.gains)).toEqual([0.55 / 1.05, 0.5 / 1.05]);
  await page.evaluate(() => window.__pairedTest.finish(0));
  await expect(page.locator(".practice-listen-history")).toContainText("Heard · 2");
  await expect(page.getByRole("status")).toContainText("together");
  await page.evaluate(() => window.__pairedTest.finish(1));
  await expect(page.getByRole("status")).toContainText("Comparison complete");
  await expect(page.locator(".practice-listen-history")).toContainText("Heard · 2");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("together");
  await page.getByRole("button", { name: "Stop playback", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Stopped");
  await page.evaluate(() => window.__pairedTest.finish(3));
  await expect(page.getByRole("status")).toContainText("Stopped");
});

test("synchronized preparation failure keeps the take and falls back to sequential mode", async ({
  page,
}) => {
  await login(page, "paired-fallback");
  await recordTake(page);
  await page.getByRole("radio", { name: "Both together", exact: true }).check();
  await page.evaluate(() => window.__pairedTest.failNextDecode());
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(page.locator("p[role=alert]")).toContainText("use sequential Compare");
  await expect(page.getByRole("radio", { name: "Sequential", exact: true })).toBeChecked();
  await expect(page.getByRole("button", { name: "My recording", exact: true })).toBeEnabled();
});
test("recording with reference disables silence stop and preserves take for solo replay", async ({
  page,
}) => {
  await page.clock.install();
  await login(page, "speak-along");
  await page.getByRole("button", { name: "Record with reference", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop recording" })).toBeVisible();
  await page.evaluate(() => window.__echoTest.setMicrophoneLevel(0.1));
  await page.clock.runFor(300);
  await page.evaluate(() => window.__echoTest.setMicrophoneLevel(0));
  await page.clock.runFor(2500);
  await expect(page.getByRole("button", { name: "Stop recording" })).toBeVisible();
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByRole("button", { name: "My recording", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => window.__echoTest.tracksStopped)).toBe(1);
  await page.getByRole("button", { name: "My recording", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Playing your recording");
  await expect(page.locator('[data-highlighted="true"]')).toHaveCount(0);
});

test("a rejected solo take replay keeps Record again ready", async ({ page }) => {
  await login(page, "solo-replay-rejection");
  await recordTake(page);
  await page.evaluate(() => window.__echoTest.failNextRecordingPlayback());
  await page.getByRole("button", { name: "My recording", exact: true }).click();
  await expect(page.locator("p[role=alert]")).toContainText("could not be played");
  await expect(page.getByRole("button", { name: "Record again", exact: true })).toBeEnabled();
});
