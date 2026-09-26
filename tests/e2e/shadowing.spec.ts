import { expect, type Page, test } from "@playwright/test";
import { voiceComparisonScenario } from "../../src/lib/fixtures/voice-comparison";

const recordingMarker = "echoflow-test-audio-marker-not-a-personal-recording";
const phraseTexts = [
  "Hi, my name is Alex. It's nice to meet you.",
  "I'm originally from Recife, but I've been living here for a few years.",
  "I work as a software engineer at a tech company downtown.",
  "Could we get a table for two, please?",
  "I have about five years of experience in software development.",
];

interface EchoTestController {
  audioStarts: string[];
  wordReplayStarts: Array<{ source: string; startMs: number }>;
  currentAudioTimeMs: () => number | null;
  getUserMediaCalls: number;
  tracksStopped: number;
  finishCurrentAudio: () => void;
  failCurrentAudio: () => void;
  denyNextMicrophone: () => void;
  setRecorderUnavailable: () => void;
  failNextRecorderStart: () => void;
  setMicrophoneUnavailable: () => void;
  setNextRecordingEmpty: () => void;
  setAudioTime: (milliseconds: number) => void;
  pauseCurrentAudio: () => void;
  resumeCurrentAudio: () => void;
  failNextReference: () => void;
  failNextRecordingPlayback: () => void;
}

declare global {
  interface Window {
    __echoTest: EchoTestController;
  }
}

function installMediaMocks() {
  const state: {
    audioStarts: string[];
    wordReplayStarts: Array<{ source: string; startMs: number }>;
    currentAudio: HTMLMediaElement | null;
    getUserMediaCalls: number;
    tracksStopped: number;
    denyMicrophone: boolean;
    recorderUnavailable: boolean;
    failRecorderStart: boolean;
    microphoneUnavailable: boolean;
    nextRecordingEmpty: boolean;
    failReference: boolean;
    failRecordingPlayback: boolean;
    marker: string;
    activeRecorder: { stop: () => void } | null;
  } = {
    audioStarts: [],
    wordReplayStarts: [],
    currentAudio: null,
    getUserMediaCalls: 0,
    tracksStopped: 0,
    denyMicrophone: false,
    recorderUnavailable: false,
    failRecorderStart: false,
    microphoneUnavailable: false,
    nextRecordingEmpty: false,
    failReference: false,
    failRecordingPlayback: false,
    marker: "echoflow-test-audio-marker-not-a-personal-recording",
    activeRecorder: null,
  };

  const mockedAudioSources = new WeakMap<HTMLMediaElement, string>();
  const mockedAudioTimes = new WeakMap<HTMLMediaElement, number>();
  const mockedAudioPaused = new WeakMap<HTMLMediaElement, boolean>();

  Object.defineProperty(window, "__echoTest", {
    configurable: true,
    value: {
      get audioStarts() {
        return state.audioStarts;
      },
      get wordReplayStarts() {
        return state.wordReplayStarts;
      },
      currentAudioTimeMs() {
        return state.currentAudio ? state.currentAudio.currentTime * 1000 : null;
      },
      get getUserMediaCalls() {
        return state.getUserMediaCalls;
      },
      get tracksStopped() {
        return state.tracksStopped;
      },
      finishCurrentAudio() {
        if (!state.currentAudio) throw new Error("No audio is currently playing");
        const audio = state.currentAudio;
        state.currentAudio = null;
        mockedAudioPaused.set(audio, true);
        audio.dispatchEvent(new Event("ended"));
      },
      failCurrentAudio() {
        if (!state.currentAudio) throw new Error("No audio is currently playing");
        const audio = state.currentAudio;
        state.currentAudio = null;
        mockedAudioPaused.set(audio, true);
        audio.dispatchEvent(new Event("error"));
      },
      denyNextMicrophone() {
        state.denyMicrophone = true;
      },
      setRecorderUnavailable() {
        state.recorderUnavailable = true;
        Object.defineProperty(window, "MediaRecorder", { configurable: true, value: undefined });
      },
      failNextRecorderStart() {
        state.failRecorderStart = true;
      },
      setMicrophoneUnavailable() {
        state.microphoneUnavailable = true;
        Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
      },
      setNextRecordingEmpty() {
        state.nextRecordingEmpty = true;
      },
      setAudioTime(milliseconds: number) {
        if (!state.currentAudio) throw new Error("No audio is currently loaded");
        state.currentAudio.currentTime = milliseconds / 1000;
        state.currentAudio.dispatchEvent(new Event("seeked"));
        state.currentAudio.dispatchEvent(new Event("timeupdate"));
      },
      pauseCurrentAudio() {
        if (!state.currentAudio) throw new Error("No audio is currently loaded");
        state.currentAudio.pause();
      },
      resumeCurrentAudio() {
        if (!state.currentAudio) throw new Error("No audio is currently loaded");
        mockedAudioPaused.set(state.currentAudio, false);
        state.currentAudio.dispatchEvent(new Event("play"));
        state.currentAudio.dispatchEvent(new Event("playing"));
      },
      failNextReference() {
        state.failReference = true;
      },
      failNextRecordingPlayback() {
        state.failRecordingPlayback = true;
      },
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, "src", {
    configurable: true,
    get(this: HTMLMediaElement) {
      const source = mockedAudioSources.get(this) ?? this.getAttribute("src");
      return source ? new URL(source, document.baseURI).href : "";
    },
    set(this: HTMLMediaElement, source: string) {
      mockedAudioSources.set(this, new URL(source, document.baseURI).href);
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
    configurable: true,
    get(this: HTMLMediaElement) {
      return mockedAudioTimes.get(this) ?? 0;
    },
    set(this: HTMLMediaElement, seconds: number) {
      mockedAudioTimes.set(this, seconds);
    },
  });
  Object.defineProperty(HTMLMediaElement.prototype, "paused", {
    configurable: true,
    get(this: HTMLMediaElement) {
      return mockedAudioPaused.get(this) ?? true;
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: function (this: HTMLMediaElement) {
      const source = this.src;
      state.audioStarts.push(source);
      state.currentAudio = this;

      if (source.includes("/fixtures/audio/") && state.failReference) {
        state.failReference = false;
        state.currentAudio = null;
        return Promise.reject(new DOMException("Fixture playback failed", "NotSupportedError"));
      }
      if (source.startsWith("blob:") && state.failRecordingPlayback) {
        state.failRecordingPlayback = false;
        state.currentAudio = null;
        return Promise.reject(new DOMException("Recording playback failed", "NotSupportedError"));
      }
      if (this.dataset.testid === "reference-word-audio") {
        state.wordReplayStarts.push({ source, startMs: this.currentTime * 1000 });
      } else {
        mockedAudioTimes.set(this, 0);
      }
      mockedAudioPaused.set(this, false);
      this.dispatchEvent(new Event("play"));
      this.dispatchEvent(new Event("playing"));
      if (source.startsWith("blob:")) return Promise.resolve();
      return fetch(source).then((response) => {
        if (!response.ok) throw new Error(`Reference fixture returned ${response.status}`);
      });
    },
  });

  Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: function (this: HTMLMediaElement) {
      mockedAudioPaused.set(this, true);
      this.dispatchEvent(new Event("pause"));
    },
  });
  Object.defineProperty(HTMLMediaElement.prototype, "load", {
    configurable: true,
    value() {},
  });

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      async getUserMedia() {
        state.getUserMediaCalls += 1;
        if (state.microphoneUnavailable) throw new DOMException("No microphone", "NotFoundError");
        if (state.denyMicrophone) {
          state.denyMicrophone = false;
          throw new DOMException("Permission denied", "NotAllowedError");
        }
        return {
          getTracks() {
            return [
              {
                stop() {
                  state.tracksStopped += 1;
                },
              },
            ];
          },
        };
      },
    },
  });

  class FakeMediaRecorder extends EventTarget {
    state: "inactive" | "recording" = "inactive";
    mimeType = "audio/webm";
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onstop: ((event: Event) => void) | null = null;

    constructor(_stream: unknown, _options?: { mimeType?: string }) {
      super();
      if (state.recorderUnavailable)
        throw new DOMException("Recording unavailable", "NotSupportedError");
    }

    static isTypeSupported() {
      return true;
    }

    start() {
      if (state.failRecorderStart) {
        state.failRecorderStart = false;
        throw new DOMException("Recorder could not start", "NotSupportedError");
      }
      this.state = "recording";
      state.activeRecorder = this;
    }

    stop() {
      if (this.state !== "recording") return;
      this.state = "inactive";
      state.activeRecorder = null;
      const empty = state.nextRecordingEmpty;
      state.nextRecordingEmpty = false;
      const blob = empty ? new Blob([]) : new Blob([state.marker], { type: this.mimeType });
      window.setTimeout(() => {
        const dataEvent = new Event("dataavailable");
        Object.defineProperty(dataEvent, "data", { value: blob });
        this.ondataavailable?.(dataEvent as BlobEvent);
        this.dispatchEvent(dataEvent);
        const stopEvent = new Event("stop");
        this.onstop?.(stopEvent);
        this.dispatchEvent(stopEvent);
      }, 0);
    }
  }

  Object.defineProperty(window, "MediaRecorder", {
    configurable: true,
    value: FakeMediaRecorder,
  });
}

async function openPractice(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Open scenario" }).click();
  await expect(page.getByRole("heading", { name: "Voice Comparison" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Practice phrases" })).toBeVisible();
}

async function finishCurrentAudio(page: Page) {
  await page.evaluate(() => window.__echoTest.finishCurrentAudio());
}

async function prepareRecording(page: Page) {
  await page.getByRole("button", { name: "Listen to reference" }).click();
  await expect(page.getByRole("status")).toContainText("reference", { timeout: 2_000 });
  await finishCurrentAudio(page);
  const record = page.getByRole("button", { name: "Record", exact: true });
  await expect(record).toBeEnabled({ timeout: 2_000 });
  return record;
}

async function startRecording(page: Page) {
  const record = await prepareRecording(page);
  await record.click();
  await expect(page.getByRole("status")).toContainText("Recording your voice", { timeout: 2_000 });
}

async function stopRecording(page: Page) {
  await page.waitForTimeout(10);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.getByRole("button", { name: "Play your recording" })).toBeEnabled();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(installMediaMocks);
});

test("opens the scenario with five ordered phrases and bounded navigation", async ({ page }) => {
  await openPractice(page);
  for (const [index, phrase] of phraseTexts.entries())
    await expect(
      page.getByRole("button", { name: `Choose phrase ${index + 1}: ${phrase}`, exact: true }),
    ).toBeVisible();
  await expect(page.getByText("Phrase 1 of 5")).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous phrase" })).toBeDisabled();
  await page.getByRole("button", { name: "Next phrase" }).click();
  await expect(page.getByText("Phrase 2 of 5")).toBeVisible();
  await page.getByRole("button", { name: "Next phrase" }).click();
  await expect(page.getByText("Phrase 3 of 5")).toBeVisible();
  await expect(page.getByText("At a Restaurant", { exact: true })).toBeVisible();
  await expect(page.getByText("Job Interview Basics", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next phrase" }).click();
  await expect(page.getByText("Phrase 4 of 5")).toBeVisible();
  await page.getByRole("button", { name: "Next phrase" }).click();
  await expect(page.getByText("Phrase 5 of 5")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next phrase" })).toBeDisabled();
  await page.getByRole("button", { name: "Previous phrase" }).click();
  await expect(page.getByText("Phrase 4 of 5")).toBeVisible();
});

test("plays and replays the selected reference and requests the microphone only on click", async ({
  page,
}) => {
  await openPractice(page);
  const record = page.getByRole("button", { name: "Record", exact: true });
  await expect(record).toBeDisabled();
  await page.getByRole("button", { name: "Listen to reference" }).click();
  await expect(page.getByRole("status")).toContainText("Playing reference");
  await finishCurrentAudio(page);
  await page.waitForTimeout(100);
  await expect(record).toBeDisabled();
  await expect.poll(() => page.evaluate(() => window.__echoTest.getUserMediaCalls)).toBe(0);
  await expect(record).toBeEnabled({ timeout: 2_000 });

  await page.getByRole("button", { name: "Listen to reference" }).click();
  await finishCurrentAudio(page);
  await expect(record).toBeEnabled({ timeout: 2_000 });
  await expect.poll(() => page.evaluate(() => window.__echoTest.audioStarts.length)).toBe(2);
  await expect.poll(() => page.evaluate(() => window.__echoTest.getUserMediaCalls)).toBe(0);
  await record.click();
  await expect(page.getByRole("status")).toContainText("Recording your voice");
  await expect.poll(() => page.evaluate(() => window.__echoTest.getUserMediaCalls)).toBe(1);
  await stopRecording(page);
});

test("recovers from microphone denial without reloading the page", async ({ page }) => {
  await openPractice(page);
  const record = await prepareRecording(page);
  await page.evaluate(() => window.__echoTest.denyNextMicrophone());
  await record.click();
  await expect(page.locator("p[role=alert]")).toContainText("Microphone permission was denied");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Listen to reference" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Next phrase" })).toBeEnabled();
  await page.getByRole("button", { name: "Next phrase" }).click();
  await page.getByRole("button", { name: "Previous phrase" }).click();
  await prepareRecording(page);
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Recording your voice");
  await stopRecording(page);
});

test("releases the microphone and recovers when MediaRecorder fails to start", async ({ page }) => {
  await openPractice(page);
  const record = await prepareRecording(page);
  await page.evaluate(() => window.__echoTest.failNextRecorderStart());
  await record.click();
  await expect(page.locator("p[role=alert]")).toContainText("Microphone access failed");
  await expect.poll(() => page.evaluate(() => window.__echoTest.tracksStopped)).toBe(1);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("status")).toContainText("Recording your voice");
  await stopRecording(page);
});

test("stops manually, replays the clip, and retains completed clips while navigating", async ({
  page,
}) => {
  await openPractice(page);
  await startRecording(page);
  await page.waitForTimeout(250);
  await stopRecording(page);
  await page.getByRole("button", { name: "Play your recording" }).click();
  await expect.poll(() => page.evaluate(() => window.__echoTest.audioStarts.length)).toBe(2);
  await finishCurrentAudio(page);

  await page.getByRole("button", { name: "Next phrase" }).click();
  await page.getByRole("button", { name: "Previous phrase" }).click();
  await expect(page.getByRole("button", { name: "Play your recording" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Compare" })).toBeEnabled();
});

test("automatically stops a recording at 30 seconds", async ({ page }) => {
  await page.clock.install();
  await openPractice(page);
  await page.getByRole("button", { name: "Listen to reference" }).click();
  await finishCurrentAudio(page);
  await page.clock.runFor(300);
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Recording your voice");
  await page.clock.runFor(30_000);
  await page.clock.runFor(1);
  await expect(page.getByRole("status")).toContainText("Recording saved", { timeout: 2_000 });
  await expect(page.getByRole("button", { name: "Play your recording" })).toBeEnabled();
  await expect.poll(() => page.evaluate(() => window.__echoTest.tracksStopped)).toBe(1);
});

test("shows only the original voice names without synthesis metadata", async ({ page }) => {
  await openPractice(page);
  const voiceChoices = page.locator("fieldset").filter({
    has: page.getByText("Reference voice", { exact: true }),
  });
  await expect(page.getByRole("radio", { name: "Puck", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Harper", exact: true })).toBeVisible();
  await expect(voiceChoices).not.toContainText(
    /OpenRouter|Google|Microsoft|Gemini|MAI-Voice|google\/|microsoft\/|\.wav|\.mp3/i,
  );
});

test("requires complete word timings for each selectable audio variant", () => {
  for (const phrase of voiceComparisonScenario.phrases) {
    const expectedWords = phrase.text.split(/\s+/);
    for (const model of voiceComparisonScenario.audioModels.filter((item) => item.selectable)) {
      const variant = phrase.audioVariants.find(
        (item) => item.modelId === model.id && item.voiceId === model.voiceId,
      );
      expect(
        variant?.wordTimings?.map((cue) => cue.word),
        variant?.id,
      ).toEqual(expectedWords);
      let previousEnd = 0;
      for (const cue of variant?.wordTimings ?? []) {
        expect(cue.startMs).toBeGreaterThanOrEqual(previousEnd);
        expect(cue.endMs).toBeGreaterThan(cue.startMs);
        expect(cue.endMs).toBeLessThanOrEqual(variant?.durationMs ?? 0);
        previousEnd = cue.endMs;
      }
    }
  }
});

test("replays the selected word from each voice and stops at its cue", async ({ page }) => {
  await openPractice(page);
  const phrase = voiceComparisonScenario.phrases[0];
  const word = page.locator('[data-word-index="4"] button');

  for (const voiceName of ["Puck", "Harper"]) {
    const model = voiceComparisonScenario.audioModels.find(
      (candidate) => candidate.voiceName === voiceName,
    );
    const variant = phrase.audioVariants.find((candidate) => candidate.modelId === model?.id);
    const cue = variant?.wordTimings?.[4];
    expect(cue, `${voiceName} word cue`).toBeDefined();

    if (voiceName !== "Puck")
      await page.getByRole("radio", { name: voiceName, exact: true }).check();
    const replayCount = await page.evaluate(() => window.__echoTest.wordReplayStarts.length);
    await expect(page.getByTestId("reference-word-audio")).toHaveAttribute(
      "src",
      variant?.src ?? "",
    );
    await expect(word).toHaveAttribute("aria-label", `Replay word: ${cue?.word} in ${voiceName}`);
    if (voiceName === "Puck") {
      await word.click();
    } else {
      await word.focus();
      await page.keyboard.press("Enter");
    }
    await expect(page.getByRole("status")).toContainText("Replaying word");
    await expect
      .poll(() => page.evaluate(() => window.__echoTest.wordReplayStarts.length))
      .toBe(replayCount + 1);

    const replay = await page.evaluate(() => window.__echoTest.wordReplayStarts.at(-1));
    const expectedSource = await page.evaluate(
      (source) => new URL(source, document.baseURI).href,
      variant?.src ?? "",
    );
    expect(replay).toEqual({ source: expectedSource, startMs: cue?.startMs });

    await page.evaluate(
      (milliseconds) => window.__echoTest.setAudioTime(milliseconds),
      (cue?.endMs ?? 0) + 1,
    );
    await expect(page.getByRole("status")).toContainText("Word replay finished");
    await expect
      .poll(() =>
        page
          .getByTestId("reference-word-audio")
          .evaluate((audio) => (audio as HTMLAudioElement).paused),
      )
      .toBe(true);
    await expect(page.locator('[data-highlighted="true"]')).toHaveCount(0);
  }
});

test("rapid word selection leaves only the latest cue playing", async ({ page }) => {
  await openPractice(page);
  const phrase = voiceComparisonScenario.phrases[0];
  const puck = voiceComparisonScenario.audioModels.find((model) => model.voiceName === "Puck");
  const variant = phrase.audioVariants.find((item) => item.modelId === puck?.id);
  const firstCue = variant?.wordTimings?.[1];
  const latestCue = variant?.wordTimings?.[6];
  expect(firstCue).toBeDefined();
  expect(latestCue).toBeDefined();

  await page.locator('[data-word-index="1"] button').click();
  await page.locator('[data-word-index="6"] button').click();
  await expect.poll(() => page.evaluate(() => window.__echoTest.wordReplayStarts.length)).toBe(2);
  await expect(page.locator('[data-word-index="6"]')).toHaveAttribute("data-highlighted", "true");

  const latestReplay = await page.evaluate(() => window.__echoTest.wordReplayStarts.at(-1));
  expect(latestReplay?.startMs).toBe(latestCue?.startMs);
  await page.evaluate(
    (milliseconds) => window.__echoTest.setAudioTime(milliseconds),
    (latestCue?.endMs ?? 0) + 1,
  );
  await expect(page.getByRole("status")).toContainText("Word replay finished");
  await expect(page.getByTestId("reference-word-audio")).toHaveJSProperty("paused", true);
});

test("replays the selected Puck word during comparison reference playback", async ({ page }) => {
  await openPractice(page);
  const phrase = voiceComparisonScenario.phrases[0];
  const puck = voiceComparisonScenario.audioModels.find((model) => model.voiceName === "Puck");
  const variant = phrase.audioVariants.find((item) => item.modelId === puck?.id);
  const cue = variant?.wordTimings?.[4];
  expect(cue).toBeDefined();

  await startRecording(page);
  await stopRecording(page);
  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page.getByRole("status")).toContainText("Playing reference");
  const replayCount = await page.evaluate(() => window.__echoTest.wordReplayStarts.length);
  await page.locator('[data-word-index="4"] button').click();
  await expect(page.getByRole("status")).toContainText("Replaying word");
  await expect
    .poll(() => page.evaluate(() => window.__echoTest.wordReplayStarts.length))
    .toBe(replayCount + 1);

  const replay = await page.evaluate(() => window.__echoTest.wordReplayStarts.at(-1));
  const expectedSource = await page.evaluate(
    (source) => new URL(source, document.baseURI).href,
    variant?.src ?? "",
  );
  expect(replay).toEqual({ source: expectedSource, startMs: cue?.startMs });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__echoTest.audioStarts.filter((source) => source.startsWith("blob:")).length,
      ),
    )
    .toBe(0);
  await page.evaluate(
    (milliseconds) => window.__echoTest.setAudioTime(milliseconds),
    (cue?.endMs ?? 0) + 1,
  );
  await expect(page.getByRole("status")).toContainText("Word replay finished");
});

test("word selection interrupts playback and stays unavailable during capture", async ({
  page,
}) => {
  await openPractice(page);
  const word = page.locator('[data-word-index="4"] button');
  const phrase = voiceComparisonScenario.phrases[0];
  const cue = phrase.audioVariants[0].wordTimings?.[4];
  const harperModel = voiceComparisonScenario.audioModels.find(
    (model) => model.voiceName === "Harper",
  );
  const harperVariant = phrase.audioVariants.find((variant) => variant.modelId === harperModel?.id);
  const comparisonCue = harperVariant?.wordTimings?.[4];
  expect(cue).toBeDefined();
  expect(comparisonCue).toBeDefined();

  await page.getByRole("button", { name: "Listen to reference" }).click();
  await expect(page.getByRole("status")).toContainText("Playing reference");
  await word.click();
  await expect(page.getByRole("status")).toContainText("Replaying word");
  await page.evaluate(
    (milliseconds) => window.__echoTest.setAudioTime(milliseconds),
    (cue?.endMs ?? 0) + 1,
  );
  await expect(page.getByRole("status")).toContainText("Word replay finished");

  await startRecording(page);
  await stopRecording(page);
  await page.getByRole("radio", { name: "Harper", exact: true }).check();
  await page.getByRole("button", { name: "Listen to reference" }).click();
  await expect(page.getByRole("status")).toContainText("Playing reference");
  await page.evaluate(() => window.__echoTest.finishCurrentAudio());
  await expect(page.getByRole("status")).toContainText("You can record now");
  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page.getByRole("status")).toContainText("Playing reference");
  await page.evaluate(() => window.__echoTest.finishCurrentAudio());
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__echoTest.audioStarts.filter((source) => source.startsWith("blob:")).length,
      ),
    )
    .toBe(1);
  const replayCount = await page.evaluate(() => window.__echoTest.wordReplayStarts.length);
  await word.click();
  await expect(page.getByRole("status")).toContainText("Replaying word");
  await expect
    .poll(() => page.evaluate(() => window.__echoTest.wordReplayStarts.length))
    .toBe(replayCount + 1);
  const comparisonReplay = await page.evaluate(() => window.__echoTest.wordReplayStarts.at(-1));
  const expectedComparisonSource = await page.evaluate(
    (source) => new URL(source, document.baseURI).href,
    harperVariant?.src ?? "",
  );
  expect(comparisonReplay).toEqual({
    source: expectedComparisonSource,
    startMs: comparisonCue?.startMs,
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__echoTest.audioStarts.filter((source) => source.startsWith("blob:")).length,
      ),
    )
    .toBe(1);
  await page.evaluate(
    (milliseconds) => window.__echoTest.setAudioTime(milliseconds),
    (comparisonCue?.endMs ?? 0) + 1,
  );
  await expect(page.getByRole("status")).toContainText("Word replay finished");
  const captureRecord = page.getByRole("button", { name: "Record again", exact: true });
  await expect(captureRecord).toBeEnabled();
  await captureRecord.click();
  await expect(page.getByRole("status")).toContainText("Recording your voice");
  await expect(word).toHaveCount(0);
  const blockedReplayCount = await page.evaluate(() => window.__echoTest.wordReplayStarts.length);
  await page.evaluate(() => {
    (document.querySelector('[data-word-index="4"]') as HTMLElement).click();
  });
  expect(await page.evaluate(() => window.__echoTest.wordReplayStarts.length)).toBe(
    blockedReplayCount,
  );
  await stopRecording(page);
});

test("recovers when an aligned word cannot be played", async ({ page }) => {
  await openPractice(page);
  await page.evaluate(() => window.__echoTest.failNextReference());
  await page.locator('[data-word-index="4"] button').click();
  await expect(page.locator("main p[role='alert']")).toContainText("word could not be replayed");
  await expect(page.locator('[data-highlighted="true"]')).toHaveCount(0);
});

test("keeps transcript geometry stable across reference highlight changes", async ({ page }) => {
  await openPractice(page);
  await page.evaluate(() => document.fonts.ready);
  const phrase = voiceComparisonScenario.phrases[0];
  const puck = voiceComparisonScenario.audioModels.find((model) => model.voiceName === "Puck");
  const variant = phrase.audioVariants.find((item) => item.modelId === puck?.id);
  const targetIndices = [1, 2, 3, 4, 5];

  const words = page.locator("[data-word-index]");
  const bounds = async () =>
    words.evaluateAll((items) =>
      items.map((item) => {
        const rect = item.getBoundingClientRect();
        return [rect.x, rect.y + window.scrollY, rect.width, rect.height].map(
          (value) => Math.round(value * 100) / 100,
        );
      }),
    );
  const initialBounds = await bounds();

  await page.getByRole("button", { name: "Listen to reference" }).click();
  await expect(words.nth(0)).toHaveAttribute("data-highlighted", "true");
  const highlight = page.getByTestId("word-highlight-indicator");
  await expect(highlight).toBeVisible();

  for (const targetIndex of targetIndices) {
    const cue = variant?.wordTimings?.[targetIndex];
    expect(cue).toBeDefined();
    await page.evaluate(
      (milliseconds) => window.__echoTest.setAudioTime(milliseconds),
      cue ? (cue.startMs + cue.endMs) / 2 : 0,
    );
    await expect(words.nth(targetIndex)).toHaveAttribute("data-highlighted", "true");
    await page.waitForTimeout(200);

    const target = await words.nth(targetIndex).boundingBox();
    const settled = await highlight.boundingBox();
    expect(target).not.toBeNull();
    expect(settled).not.toBeNull();
    expect(settled ? settled.x + settled.width / 2 : 0).toBeCloseTo(
      target ? target.x + target.width / 2 : 0,
      0,
    );
    expect(await bounds()).toEqual(initialBounds);
  }
});

test("honors reduced motion for reference word changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openPractice(page);
  const phrase = voiceComparisonScenario.phrases[0];
  const puck = voiceComparisonScenario.audioModels.find((model) => model.voiceName === "Puck");
  const variant = phrase.audioVariants.find((item) => item.modelId === puck?.id);
  const cue = variant?.wordTimings?.[1];
  expect(cue).toBeDefined();

  const words = page.locator("[data-word-index]");
  await page.getByRole("button", { name: "Listen to reference" }).click();
  await expect(words.nth(0)).toHaveAttribute("data-highlighted", "true");
  await page.evaluate(
    (milliseconds) => window.__echoTest.setAudioTime(milliseconds),
    cue ? (cue.startMs + cue.endMs) / 2 : 0,
  );
  await expect(words.nth(1)).toHaveAttribute("data-highlighted", "true");
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

  const active = await words.nth(1).boundingBox();
  const highlight = await page.getByTestId("word-highlight-indicator").boundingBox();
  expect(active).not.toBeNull();
  expect(highlight).not.toBeNull();
  expect(highlight ? highlight.x + highlight.width / 2 : 0).toBeCloseTo(
    active ? active.x + active.width / 2 : 0,
    0,
  );
});

test("highlights the reference word from media time and clears it for personal playback", async ({
  page,
}) => {
  const phrase = voiceComparisonScenario.phrases[0];
  const puck = voiceComparisonScenario.audioModels.find((model) => model.voiceName === "Puck");
  const variant = phrase.audioVariants.find((item) => item.modelId === puck?.id);
  const cues = variant?.wordTimings ?? [];
  const timeForWord = (index: number, fallbackMs: number) => {
    const cue = cues[index];
    return cue ? Math.floor((cue.startMs + cue.endMs) / 2) : fallbackMs;
  };

  await openPractice(page);
  await page.getByRole("button", { name: "Listen to reference" }).click();
  await expect(page.getByRole("status")).toContainText("Playing reference");
  const words = page.locator("[data-word-index]");
  await expect(words.nth(0)).toHaveAttribute("data-highlighted", "true");

  const highlightDelayMs = await page.evaluate(
    ({ milliseconds, wordIndex }) =>
      new Promise<number>((resolve, reject) => {
        const startedAt = performance.now();
        window.__echoTest.setAudioTime(milliseconds);
        const check = () => {
          const word = document.querySelector(
            `[data-word-index="${wordIndex}"][data-highlighted="true"]`,
          );
          if (word) {
            resolve(performance.now() - startedAt);
            return;
          }
          if (performance.now() - startedAt >= 100) {
            reject(new Error("The current word was not highlighted within 100ms"));
            return;
          }
          window.requestAnimationFrame(check);
        };
        check();
      }),
    { milliseconds: timeForWord(4, 1_140), wordIndex: 4 },
  );
  expect(highlightDelayMs).toBeLessThan(100);
  await expect(words.nth(4)).toHaveAttribute("data-highlighted", "true");
  await page.evaluate(() => window.__echoTest.pauseCurrentAudio());
  await expect(words.nth(4)).toHaveAttribute("data-highlighted", "true");
  await page.evaluate(
    (milliseconds) => window.__echoTest.setAudioTime(milliseconds),
    timeForWord(7, 1_950),
  );
  await expect(words.nth(7)).toHaveAttribute("data-highlighted", "true");
  await page.evaluate(() => window.__echoTest.resumeCurrentAudio());
  await page.evaluate(() => window.__echoTest.finishCurrentAudio());
  await expect(page.locator('[data-highlighted="true"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Listen to reference" }).click();
  await expect(words.nth(0)).toHaveAttribute("data-highlighted", "true");
  await page.getByRole("button", { name: "Next phrase" }).click();
  await expect(page.getByText("Phrase 2 of 5")).toBeVisible();
  await expect(page.locator('[data-highlighted="true"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Previous phrase" }).click();

  await startRecording(page);
  await stopRecording(page);
  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page.getByRole("status")).toContainText("Playing reference");
  await page.evaluate(
    (milliseconds) => window.__echoTest.setAudioTime(milliseconds),
    timeForWord(2, 800),
  );
  await expect(words.nth(2)).toHaveAttribute("data-highlighted", "true");
  await finishCurrentAudio(page);
  await expect(page.getByRole("status")).toContainText("Playing your recording");
  await expect(page.locator('[data-highlighted="true"]')).toHaveCount(0);
  await finishCurrentAudio(page);
});

test("uses the selected MAI voice across phrases and resets it after reload", async ({ page }) => {
  await openPractice(page);
  const google = page.getByRole("radio", { name: "Puck", exact: true });
  const mai = page.getByRole("radio", { name: "Harper", exact: true });
  const voiceChoices = page.locator("fieldset").filter({
    has: page.getByText("Reference voice", { exact: true }),
  });
  await expect(voiceChoices).not.toContainText(
    /OpenRouter|Google|Microsoft|Gemini|MAI-Voice|google\/|microsoft\/|\.wav|\.mp3/i,
  );
  await expect(google).toBeChecked();
  await mai.check();
  await expect(mai).toBeChecked();
  await expect(page.getByRole("status")).toContainText("Harper selected");
  await expect(page.getByRole("status")).not.toContainText(/Microsoft|MAI-Voice/i);
  await page.getByRole("button", { name: "Listen to reference" }).click();
  await expect(page.getByRole("status")).toContainText("Playing reference");
  expect(await page.evaluate(() => window.__echoTest.audioStarts.at(-1))).toContain(
    "/fixtures/audio/openrouter/introducing-yourself-01--microsoft-mai-voice-2--en-us-harper-mai-voice-2.mp3",
  );
  await finishCurrentAudio(page);

  await page.getByRole("button", { name: "Next phrase" }).click();
  await expect(page.getByText("Phrase 2 of 5")).toBeVisible();
  await expect(mai).toBeChecked();
  await page.getByRole("button", { name: "Listen to reference" }).click();
  expect(await page.evaluate(() => window.__echoTest.audioStarts.at(-1))).toContain(
    "/fixtures/audio/openrouter/introducing-yourself-02--microsoft-mai-voice-2--en-us-harper-mai-voice-2.mp3",
  );
  await finishCurrentAudio(page);

  await page.reload();
  await expect(page.getByRole("radio", { name: "Puck", exact: true })).toBeChecked();
});

test("compares reference first and waits for it to end before playing the recording", async ({
  page,
}) => {
  await openPractice(page);
  await startRecording(page);
  await stopRecording(page);
  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page.getByRole("status")).toContainText("Playing reference");
  await expect.poll(() => page.evaluate(() => window.__echoTest.audioStarts.length)).toBe(2);
  const referenceBeforeEnd = await page.evaluate(() => window.__echoTest.audioStarts.at(-1));
  expect(referenceBeforeEnd).toContain(
    "/fixtures/audio/openrouter/introducing-yourself-01--google-gemini-3-8-flash-tts--puck.wav",
  );
  await finishCurrentAudio(page);
  await expect.poll(() => page.evaluate(() => window.__echoTest.audioStarts.length)).toBe(3);
  const comparisonStarts = await page.evaluate(() => window.__echoTest.audioStarts.slice(-2));
  expect(comparisonStarts[0]).toContain(
    "/fixtures/audio/openrouter/introducing-yourself-01--google-gemini-3-8-flash-tts--puck.wav",
  );
  expect(comparisonStarts[1]).toMatch(/^blob:/);
  await expect(page.getByRole("status")).toContainText("Playing your recording");
  await finishCurrentAudio(page);
  await expect(page.getByRole("status")).toContainText("Comparison complete");
});

test("never sends the recording marker and loses the clip after reload", async ({ page }) => {
  const requestBodies: string[] = [];
  const requestUrls: string[] = [];
  page.on("request", (request) => {
    requestUrls.push(request.url());
    const body = request.postData();
    if (body) requestBodies.push(body);
  });
  await openPractice(page);
  const storageBeforeRecording = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    databases: (await indexedDB.databases()).length,
    caches: (await caches.keys()).length,
  }));
  const cookiesBeforeRecording = await page.context().cookies();
  await startRecording(page);
  await stopRecording(page);
  await page.getByRole("button", { name: "Compare" }).click();
  await finishCurrentAudio(page);
  await finishCurrentAudio(page);

  expect(requestBodies.join("\n")).not.toContain(recordingMarker);
  expect(requestUrls.join("\n")).not.toContain(recordingMarker);
  expect(page.url()).not.toContain(recordingMarker);
  expect(requestUrls.every((url) => new URL(url).origin === new URL(page.url()).origin)).toBe(true);
  const storage = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    databases: (await indexedDB.databases()).length,
    caches: (await caches.keys()).length,
  }));
  expect(storage).toEqual(storageBeforeRecording);
  expect(await page.context().cookies()).toEqual(cookiesBeforeRecording);

  await page.reload();
  await expect(page.getByRole("button", { name: "Play your recording" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Compare" })).toBeDisabled();
});

test("stops and discards an in-progress clip when navigating to another phrase", async ({
  page,
}) => {
  await openPractice(page);
  await startRecording(page);
  await page.getByRole("button", { name: "Next phrase" }).click();
  await expect(page.getByText("Phrase 2 of 5")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__echoTest.tracksStopped)).toBe(1);
  await expect(page.getByRole("button", { name: "Record", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Previous phrase" }).click();
  await expect(page.getByRole("button", { name: "Play your recording" })).toBeDisabled();
  await expect.poll(() => page.evaluate(() => window.__echoTest.getUserMediaCalls)).toBe(1);
});

test("recovers from a reference playback failure and handles missing browser APIs", async ({
  page,
}) => {
  await openPractice(page);
  await page.evaluate(() => window.__echoTest.failNextReference());
  await page.getByRole("button", { name: "Listen to reference" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("reference audio");
  await expect.poll(() => page.evaluate(() => window.__echoTest.getUserMediaCalls)).toBe(0);
  await page.getByRole("button", { name: "Listen to reference" }).click();
  await finishCurrentAudio(page);
  await expect(page.getByRole("button", { name: "Record", exact: true })).toBeEnabled({
    timeout: 2_000,
  });

  await page.evaluate(() => window.__echoTest.setRecorderUnavailable());
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await expect(page.locator("p[role=alert]")).toContainText("recording isn't supported");
  await expect.poll(() => page.evaluate(() => window.__echoTest.getUserMediaCalls)).toBe(0);
  await expect(page.getByRole("button", { name: "Next phrase" })).toBeEnabled();
});

test("recovers after reference playback is interrupted", async ({ page }) => {
  await openPractice(page);
  await page.getByRole("button", { name: "Listen to reference" }).click();
  await expect(page.getByRole("status")).toContainText("Playing reference");
  await expect(page.locator('[data-word-index="0"]')).toHaveAttribute("data-highlighted", "true");
  await page.evaluate(() => window.__echoTest.failCurrentAudio());
  await expect(page.locator("p[role=alert]")).toContainText("reference audio was interrupted");
  await expect(page.locator('[data-highlighted="true"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Listen to reference" }).click();
  await expect(page.getByRole("status")).toContainText("Playing reference");
  await finishCurrentAudio(page);
  await expect(page.getByRole("button", { name: "Record", exact: true })).toBeEnabled();
});

test("reports an unavailable microphone API and rejects an empty recording", async ({ page }) => {
  await openPractice(page);
  let record = await prepareRecording(page);
  await page.evaluate(() => window.__echoTest.setMicrophoneUnavailable());
  await record.click();
  await expect(page.locator("p[role=alert]")).toContainText(/microphone/i);
  await expect(page.getByRole("button", { name: "Next phrase" })).toBeEnabled();

  await page.reload();
  await page.evaluate(() => window.__echoTest.setNextRecordingEmpty());
  record = await prepareRecording(page);
  await record.click();
  await expect(page.getByRole("status")).toContainText("Recording your voice");
  await page.getByRole("button", { name: "Stop recording" }).click();
  await expect(page.locator("p[role=alert]")).toContainText(/empty/i);
  await expect(page.getByRole("button", { name: "Play your recording" })).toBeDisabled();
});

test("reports a recorded clip that the browser cannot play", async ({ page }) => {
  await openPractice(page);
  await startRecording(page);
  await stopRecording(page);
  await page.evaluate(() => window.__echoTest.failNextRecordingPlayback());
  await page.getByRole("button", { name: "Play your recording" }).click();
  await expect(page.locator("p[role=alert]")).toContainText("recording");
  await expect(page.getByRole("button", { name: "Next phrase" })).toBeEnabled();
});
