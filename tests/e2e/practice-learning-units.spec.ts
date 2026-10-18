import { expect, test } from "@playwright/test";
import { login, voiceComparisonScenario } from "./helpers/auth";
import { installMediaMocks } from "./helpers/media";

test("unreviewed tokens replay as labelled full-phrase context", async ({ page }) => {
  await page.addInitScript(installMediaMocks);
  await login(page, `learning-context-${crypto.randomUUID()}`);

  const phrase = voiceComparisonScenario.phrases[0];
  const variant = phrase.audioVariants[0];
  const word = page.locator('[data-word-index="4"] button');
  await expect(word).toHaveAttribute(
    "aria-label",
    `Replay In context: ${phrase.text} in ${voiceComparisonScenario.audioModels[0].voiceName}`,
  );
  await word.click();
  await expect(page.getByRole("status")).toContainText(`In context: ${phrase.text}`);
  await expect.poll(() => page.evaluate(() => window.__echoTest.wordReplayStarts.length)).toBe(1);
  expect(await page.evaluate(() => window.__echoTest.wordReplayStarts[0])).toMatchObject({
    source: await page.evaluate((src) => new URL(src, document.baseURI).href, variant.src),
    startMs: 0,
  });
});
