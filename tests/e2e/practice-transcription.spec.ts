import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import type { LivePracticeTranscriptProps } from "../../src/components/LivePracticeTranscript";

// Playwright's JSX transform targets its component runner, not React SSR.
// Compile the actual product component with React's runtime for this DOM fixture.
const compiled = ts.transpileModule(
  readFileSync(join(__dirname, "../../src/components/LivePracticeTranscript.tsx"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText;
const componentExports = {} as {
  LivePracticeTranscript: (props: LivePracticeTranscriptProps) => import("react").ReactNode;
};
new Function("require", "exports", compiled)(createRequire(__filename), componentExports);
const { LivePracticeTranscript } = componentExports;
const captureCompiled = ts.transpileModule(
  readFileSync(join(__dirname, "../../src/lib/feedback-capture.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;

// Component fixture: no Supabase/recognizer/device claim; production wiring is tested separately.
test("unsupported local transcription remains visibly unavailable offline and never downloads", async ({
  page,
  context,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await context.setOffline(true);
  await page.setContent(
    renderToStaticMarkup(
      createElement(LivePracticeTranscript, {
        availability: "unsupported",
        enabled: false,
        onEnabledChange() {},
        interimText: "",
        finalText: "",
      }),
    ),
  );
  await expect(page.getByLabel("Live transcription (English)")).toBeDisabled();
  await expect(page.getByText(/Local transcription is unavailable/)).toBeVisible();
  await expect(page.getByText(/not a pronunciation score/)).toBeVisible();
  expect(requests).toEqual([]);
});

test("private transcript distinguishes provisional/final words and never substitutes reference text", async ({
  page,
}) => {
  await page.setContent(
    renderToStaticMarkup(
      createElement(LivePracticeTranscript, {
        availability: "ready",
        enabled: true,
        onEnabledChange() {},
        interimText: "maybe a pear",
        finalText: "I ate",
      }),
    ),
  );
  await expect(page.getByText("I ate", { exact: true })).toBeVisible();
  await expect(page.getByText("maybe a pear", { exact: true })).toBeVisible();
  await expect(page.getByText("Provisional", { exact: true })).toBeVisible();
  const privateRoot = page.locator("[data-feedback-private]");
  await expect(privateRoot).toContainText("I ate");
  await expect(privateRoot).toContainText("maybe a pear");
  await page.evaluate(() => {
    const publicText = document.createElement("p");
    publicText.textContent = "Public screenshot fixture";
    document.body.appendChild(publicText);
  });
  // Run the actual capture walker; stub only PNG encoding to inspect its staged screenshot DOM.
  const shareable = await page.evaluate(async (source) => {
    let staged = "";
    const exports = {} as { captureFeedbackViewport: () => Promise<Blob> };
    const require = (name: string) => {
      if (name === "./feedback") return { MAX_SCREENSHOT_BYTES: 5000000 };
      if (name === "html-to-image")
        return {
          toBlob: async (stage: HTMLElement) => {
            staged = stage.innerHTML;
            return new Blob(["screenshot fixture"]);
          },
        };
      throw new Error("Unexpected screenshot dependency");
    };
    new Function("require", "exports", source)(require, exports);
    await exports.captureFeedbackViewport();
    return staged;
  }, captureCompiled);
  expect(shareable).toContain("Public screenshot fixture");
  expect(shareable).not.toContain("I ate");
  expect(shareable).not.toContain("maybe a pear");
});

test("missing model and recognizer failure explain ordinary recording fallback without install action", async ({
  page,
}) => {
  await page.setContent(
    renderToStaticMarkup(
      createElement(LivePracticeTranscript, {
        availability: "needs-model",
        enabled: false,
        onEnabledChange() {},
        interimText: "secret stale result",
        finalText: "secret final result",
        error: true,
      }),
    ),
  );
  await expect(page.getByText(/No model is downloaded automatically/)).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Recording and manual Stop still work");
  await expect(page.getByText("secret stale result")).toHaveCount(0);
  await expect(page.getByText("secret final result")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /install|download/i })).toHaveCount(0);
});
