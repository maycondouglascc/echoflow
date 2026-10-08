// Node 24 strip-types runtime; importing via URL preserves TypeScript noEmit setup.
import { setTimeout as pause } from "node:timers/promises";

const {
  FeedbackNotionClient,
  exportFeedback,
  ExportError,
}: typeof import("../src/lib/notion-feedback") = await import(
  new URL("../src/lib/notion-feedback.ts", import.meta.url).href
);
const { createFeedbackQueue }: typeof import("../src/lib/notion-feedback-queue") = await import(
  new URL("../src/lib/notion-feedback-queue.ts", import.meta.url).href
);
const flags = process.argv.slice(2);
if (flags.some((flag) => !["--check", "--once"].includes(flag))) {
  console.error("Usage: notion-feedback-worker.ts [--check | --once]");
  process.exit(1);
}
try {
  const notion = new FeedbackNotionClient(
    process.env.NOTION_FEEDBACK_TOKEN ?? "",
    process.env.NOTION_FEEDBACK_DATA_SOURCE_ID ?? "",
  );
  const queue = createFeedbackQueue(
    process.env.ECHOFLOW_FEEDBACK_SUPABASE_URL ?? "",
    process.env.ECHOFLOW_FEEDBACK_SERVICE_ROLE_KEY ?? "",
  );
  await notion.check();
  if (flags.includes("--check")) {
    console.log("Notion feedback schema validated (read-only; no export performed).");
  } else {
    let stopped = false;
    process.on("SIGTERM", () => {
      stopped = true;
    });
    process.on("SIGINT", () => {
      stopped = true;
    });
    let processed = 0;
    let failed = 0;
    while (!stopped) {
      const job = await queue.claim();
      if (!job) {
        if (flags.includes("--once")) break;
        // One-second increments allow prompt shutdown, with a 60s polling cycle.
        for (let second = 0; second < 60 && !stopped; second++) await pause(1000);
        continue;
      }
      const result = await exportFeedback(job, queue, notion);
      processed++;
      if (!result.delivered) {
        failed++;
        console.error(`Feedback export deferred: ${result.error}`);
      }
      if (flags.includes("--once") && processed >= 10) break;
    }
    console.log(JSON.stringify({ processed, deferred: failed }));
    if (flags.includes("--once") && failed) process.exitCode = 1;
  }
} catch (error) {
  console.error(
    error instanceof ExportError && error instanceof Error ? error.message : "worker_unavailable",
  );
  process.exitCode = 1;
}
