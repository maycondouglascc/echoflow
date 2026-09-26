import { expect, test } from "@playwright/test";
import { voiceComparisonScenario } from "../../src/lib/fixtures/voice-comparison";

test("uses the decoded reference audio clock for both selectable voices", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Open scenario" }).click();
  await expect(page.getByRole("heading", { name: "Voice Comparison" })).toBeVisible();

  const phrase = voiceComparisonScenario.phrases[0];
  const audio = page.getByTestId("practice-audio");
  const listen = page.getByRole("button", { name: "Listen to reference" });
  const highlightAt = async (wordIndex: number, startMs: number, endMs: number) => {
    await page.waitForFunction(
      ({ start, end }) => {
        const element = document.querySelector<HTMLAudioElement>('[data-testid="practice-audio"]');
        const time = (element?.currentTime ?? 0) * 1000;
        return time >= start + 20 && time < end;
      },
      { start: startMs, end: endMs },
    );
    await expect(page.locator(`[data-word-index="${wordIndex}"]`)).toHaveAttribute(
      "data-highlighted",
      "true",
    );
  };

  for (const voiceName of ["Puck", "Harper"]) {
    const model = voiceComparisonScenario.audioModels.find(
      (candidate) => candidate.voiceName === voiceName,
    );
    const variant = phrase.audioVariants.find((candidate) => candidate.modelId === model?.id);
    const cue = variant?.wordTimings?.[4];
    expect(cue, `${voiceName} word timing`).toBeDefined();

    if (voiceName !== "Puck") {
      await expect(page.getByRole("status")).toContainText("You can record now");
      await page.getByRole("radio", { name: voiceName, exact: true }).check();
    }

    await listen.click();
    await expect(page.getByRole("status")).toContainText("Playing reference");
    await expect
      .poll(() => audio.evaluate((element) => (element as HTMLAudioElement).currentTime))
      .toBeGreaterThan(0);
    await highlightAt(4, cue?.startMs ?? 0, cue?.endMs ?? 0);
    await expect
      .poll(() => audio.evaluate((element) => (element as HTMLAudioElement).ended), {
        timeout: 5_000,
      })
      .toBe(true);
    await expect(page.locator('[data-highlighted="true"]')).toHaveCount(0);
  }
});

test("replays one aligned word from the decoded selected voice", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Open scenario" }).click();
  await expect(page.getByRole("heading", { name: "Voice Comparison" })).toBeVisible();

  const phrase = voiceComparisonScenario.phrases[0];
  const wordAudio = page.getByTestId("reference-word-audio");
  const word = page.locator('[data-word-index="4"] button');

  for (const voiceName of ["Puck", "Harper"]) {
    const model = voiceComparisonScenario.audioModels.find(
      (candidate) => candidate.voiceName === voiceName,
    );
    const variant = phrase.audioVariants.find((candidate) => candidate.modelId === model?.id);
    const cue = variant?.wordTimings?.[4];
    expect(cue, `${voiceName} word timing`).toBeDefined();
    if (voiceName !== "Puck")
      await page.getByRole("radio", { name: voiceName, exact: true }).check();

    await page.waitForFunction((src) => {
      const element = document.querySelector<HTMLAudioElement>(
        '[data-testid="reference-word-audio"]',
      );
      return (
        element?.readyState !== undefined &&
        element.readyState >= HTMLMediaElement.HAVE_METADATA &&
        element.currentSrc === new URL(src, document.baseURI).href
      );
    }, variant?.src ?? "");

    await word.click();
    await expect(page.getByRole("status")).toContainText("Replaying word");
    await expect
      .poll(() => wordAudio.evaluate((element) => !(element as HTMLAudioElement).paused))
      .toBe(true);
    await expect
      .poll(() => wordAudio.evaluate((element) => (element as HTMLAudioElement).currentTime * 1000))
      .toBeGreaterThanOrEqual((cue?.startMs ?? 0) - 20);
    await expect
      .poll(() => wordAudio.evaluate((element) => (element as HTMLAudioElement).paused), {
        timeout: 4_000,
      })
      .toBe(true);

    const finalTimeMs = await wordAudio.evaluate(
      (element) => (element as HTMLAudioElement).currentTime * 1000,
    );
    expect(finalTimeMs).toBeGreaterThanOrEqual((cue?.endMs ?? 0) - 25);
    expect(finalTimeMs).toBeLessThanOrEqual((cue?.endMs ?? 0) + 50);
    expect(await wordAudio.evaluate((element) => (element as HTMLAudioElement).currentSrc)).toBe(
      await page.evaluate((src) => new URL(src, document.baseURI).href, variant?.src ?? ""),
    );
    await expect(page.getByRole("status")).toContainText("Word replay finished");
  }
});
