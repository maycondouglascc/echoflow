import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";
import { installMediaMocks } from "./helpers/media";

declare global {
  interface Window {
    __pairedTest: { starts: number[]; stopped: number; finish(index: number): void };
  }
}
// Control source ends independently rather than treating two play promises as
// acoustic synchronization evidence. Device marker testing remains separate.
function installPairedMocks() {
  const Original = window.AudioContext;
  const sources: Array<{ onended: (() => void) | null }> = [];
  const state = {
    starts: [] as number[],
    stopped: 0,
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
      return { duration: 3 } as AudioBuffer;
    }
    createGain() {
      return { gain: { value: 0 }, connect() {}, disconnect() {} } as unknown as GainNode;
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
  await page.getByRole("button", { name: "Both together", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("together");
  expect(await page.evaluate(() => window.__pairedTest.starts)).toEqual([10.1, 10.1]);
  await page.evaluate(() => window.__pairedTest.finish(0));
  await expect(page.getByRole("status")).toContainText("together");
  await page.evaluate(() => window.__pairedTest.finish(1));
  await expect(page.getByRole("status")).toContainText("Comparison complete");
  await page.getByRole("button", { name: "Both together", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("together");
  await page.getByRole("button", { name: "Stop playback", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Stopped");
  await page.evaluate(() => window.__pairedTest.finish(3));
  await expect(page.getByRole("status")).toContainText("Stopped");
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
