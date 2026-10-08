import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { login } from "./helpers/auth";
import { installMediaMocks } from "./helpers/media";

type SoundEvent = {
  kind: "cue" | "cancel" | "media" | "microphone";
  frequency?: number;
  activeCues: number;
};
declare global {
  interface Window {
    __soundTest: {
      events: SoundEvent[];
      scheduledDurations: number[];
      activeCues: number;
      finishTones(): void;
      finishReference(): void;
      blockAutoplay(): void;
    };
  }
}

// Observe real cue-player oscillator calls. Scheduled ends stay pending until
// the fixture advances them, allowing a fast new action to interrupt the 160ms tone.
function installSoundMocks() {
  const Original = window.AudioContext;
  const tones: Array<{ active: boolean; onended: (() => void) | null }> = [];
  const sources: Array<{ onended: (() => void) | null }> = [];
  let autoplayBlocked = false;
  const state = {
    events: [] as SoundEvent[],
    scheduledDurations: [] as number[],
    get activeCues() {
      return tones.filter((tone) => tone.active).length;
    },
    finishTones() {
      for (const tone of tones) {
        tone.active = false;
        tone.onended?.();
      }
    },
    finishReference() {
      sources.at(-1)?.onended?.();
    },
    blockAutoplay() {
      autoplayBlocked = true;
    },
  };
  class CueContext extends Original {
    state: AudioContextState = "running";
    get currentTime() {
      return 10;
    }
    get destination() {
      return {} as AudioDestinationNode;
    }
    async resume() {
      if (autoplayBlocked) {
        this.state = "suspended";
        throw new Error("autoplay blocked fixture");
      }
    }
    async decodeAudioData() {
      return { duration: 3 } as AudioBuffer;
    }
    createGain() {
      return {
        gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} },
        connect() {},
        disconnect() {},
      } as unknown as GainNode;
    }
    createOscillator() {
      const tone = {
        active: false,
        onended: null as (() => void) | null,
        type: "sine",
        frequency: { value: 0 },
        connect() {},
        disconnect() {},
        start() {
          tone.active = true;
          state.events.push({
            kind: "cue",
            frequency: tone.frequency.value,
            activeCues: state.activeCues,
          });
        },
        stop(when?: number) {
          if (when !== undefined) {
            state.scheduledDurations.push(when - 10);
            return;
          }
          tone.active = false;
          state.events.push({ kind: "cancel", activeCues: state.activeCues });
        },
      };
      tones.push(tone);
      return tone as unknown as OscillatorNode;
    }
    createBufferSource() {
      const source = {
        onended: null as (() => void) | null,
        connect() {},
        disconnect() {},
        stop() {},
        start() {
          state.events.push({ kind: "media", activeCues: state.activeCues });
        },
      };
      sources.push(source);
      return source as unknown as AudioBufferSourceNode;
    }
  }
  Object.defineProperty(window, "AudioContext", { configurable: true, value: CueContext });
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    state.events.push({ kind: "media", activeCues: state.activeCues });
    return play.call(this);
  };
  const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    state.events.push({ kind: "microphone", activeCues: state.activeCues });
    return getUserMedia(constraints);
  };
  window.__soundTest = state;
}

async function open(page: Page, label: string) {
  await login(page, `sounds-${label}-${randomUUID()}`);
  await page.getByText("Optional feedback", { exact: true }).click();
}
async function finishListen(page: Page) {
  await page.getByRole("button", { name: "Listen to reference", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__echoTest.currentAudioTimeMs()))
    .not.toBeNull();
  await page.evaluate(() => window.__echoTest.finishCurrentAudio());
  await expect(page.getByRole("button", { name: "Record", exact: true })).toBeEnabled();
}
async function savedTake(page: Page) {
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await page.getByRole("button", { name: "Stop recording", exact: true }).click();
  await expect(page.getByRole("button", { name: "My recording", exact: true })).toBeEnabled();
}
async function cueFrequencies(page: Page) {
  return page.evaluate(() =>
    window.__soundTest.events
      .filter((event) => event.kind === "cue")
      .map((event) => event.frequency),
  );
}
async function assertNoContamination(page: Page) {
  const starts = await page.evaluate(() =>
    window.__soundTest.events.filter(
      (event) => event.kind === "media" || event.kind === "microphone",
    ),
  );
  expect(starts.length).toBeGreaterThan(0);
  expect(starts.every((event) => event.activeCues === 0)).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(installMediaMocks);
  await page.addInitScript(installSoundMocks);
});

test("sounds default off; opt-in readiness and saved cues have visual equivalents and deduplicate", async ({
  page,
}) => {
  await open(page, "opt-in");
  await expect(page.getByLabel("Sound cues", { exact: true })).not.toBeChecked();
  await finishListen(page);
  expect(await cueFrequencies(page)).toEqual([]);
  await page.getByLabel("Sound cues", { exact: true }).check();
  await expect(page.getByText("Sound cues on", { exact: true })).toBeVisible();
  expect(await cueFrequencies(page)).toEqual([]); // no delayed cue for the disabled event
  await finishListen(page);
  await expect.poll(() => cueFrequencies(page)).toEqual([440]);
  await expect(page.locator(".practice-cue-status")).toContainText(/record|ready/i);
  await page.getByTestId("practice-audio").dispatchEvent("ended");
  expect(await cueFrequencies(page)).toEqual([440]);
  await savedTake(page);
  await expect.poll(() => cueFrequencies(page)).toEqual([440, 660]);
  await expect(page.locator(".practice-cue-status")).toContainText(/saved/i);
  await assertNoContamination(page);
  const durations = await page.evaluate(() => window.__soundTest.scheduledDurations);
  expect(durations.every((duration) => duration > 0 && duration <= 0.25)).toBe(true);
  await page.getByLabel("Sound cues", { exact: true }).uncheck();
  await expect.poll(() => page.evaluate(() => window.__soundTest.activeCues)).toBe(0);
  await expect(page.getByText("Sound cues off", { exact: true })).toBeVisible();
});

for (const next of ["Listen to reference", "My recording", "Compare"] as const) {
  test(`an unfinished saved cue stops before ${next} starts`, async ({ page }) => {
    await open(page, `interrupt-${next.replaceAll(" ", "-")}`);
    await page.getByLabel("Sound cues", { exact: true }).check();
    await finishListen(page);
    await savedTake(page);
    await expect.poll(() => page.evaluate(() => window.__soundTest.activeCues)).toBe(1);
    await page.getByRole("button", { name: next, exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => window.__soundTest.events.at(-1)?.kind))
      .toBe("media");
    await assertNoContamination(page);
  });
}

test("reference completion during speak-along is silent and does not queue readiness after capture", async ({
  page,
}) => {
  await open(page, "busy");
  await page.getByLabel("Sound cues", { exact: true }).check();
  await page.getByRole("button", { name: "Record with reference", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop recording", exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__soundTest.events.filter((event) => event.kind === "media").length,
      ),
    )
    .toBe(1);
  await page.evaluate(() => window.__soundTest.finishReference());
  expect(await cueFrequencies(page)).toEqual([]);
  await expect(page.getByRole("button", { name: "Stop recording", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Stop recording", exact: true }).click();
  await expect.poll(() => cueFrequencies(page)).toEqual([660]);
  await page.evaluate(() => window.__soundTest.finishTones());
  await page.getByLabel("Sound cues", { exact: true }).uncheck();
  await page.getByLabel("Sound cues", { exact: true }).check();
  expect(await cueFrequencies(page)).toEqual([660]);
  await assertNoContamination(page);
});

test("blocked autoplay preserves visible readiness and ordinary recording", async ({ page }) => {
  await open(page, "blocked");
  await page.evaluate(() => window.__soundTest.blockAutoplay());
  await page.getByLabel("Sound cues", { exact: true }).check();
  await finishListen(page);
  expect(await cueFrequencies(page)).toEqual([]);
  await expect(page.locator(".practice-cue-status")).toContainText(/record|ready/i);
  await savedTake(page);
  expect(await cueFrequencies(page)).toEqual([]);
  await expect(page.locator(".practice-cue-status")).toContainText(/saved/i);
  await assertNoContamination(page);
});

test("natural playlist completion has one completion cue and a visible completion message", async ({
  page,
}) => {
  await open(page, "completion");
  await page.getByLabel("Sound cues", { exact: true }).check();
  for (let index = 0; index < 5; index++) {
    await finishListen(page);
    await savedTake(page);
    await page.getByRole("button", { name: "Compare", exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => window.__echoTest.currentAudioTimeMs()))
      .not.toBeNull();
    await page.evaluate(() => window.__echoTest.finishCurrentAudio());
    await expect
      .poll(() => page.evaluate(() => window.__echoTest.currentAudioTimeMs()))
      .not.toBeNull();
    await page.evaluate(() => window.__echoTest.finishCurrentAudio());
    await expect(page.getByRole("button", { name: "Compare", exact: true })).toBeEnabled();
    if (index < 4) await page.getByRole("button", { name: "Next phrase", exact: true }).click();
  }
  await expect(page.locator(".completion-badge")).toContainText("Completed");
  await expect(page.locator(".practice-cue-status")).toContainText("Playlist completed");
  await expect
    .poll(async () => (await cueFrequencies(page)).filter((frequency) => frequency === 880).length)
    .toBe(1);
  await page.getByTestId("practice-audio").dispatchEvent("ended");
  await page.getByLabel("Sound cues", { exact: true }).uncheck();
  await page.getByLabel("Sound cues", { exact: true }).check();
  expect((await cueFrequencies(page)).filter((frequency) => frequency === 880)).toHaveLength(1);
  await finishListen(page);
  await expect(page.locator(".practice-cue-status")).toContainText("Ready to record");
  await savedTake(page);
  await expect(page.locator(".practice-cue-status")).toContainText("Recording saved");
  expect((await cueFrequencies(page)).filter((frequency) => frequency === 880)).toHaveLength(1);
  await assertNoContamination(page);
});
