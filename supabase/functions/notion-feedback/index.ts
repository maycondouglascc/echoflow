import { createClient } from "@supabase/supabase-js";
import { exportFeedback, FeedbackNotionClient } from "../../../src/lib/notion-feedback-core.ts";
import { feedbackHandler } from "../../../src/lib/notion-feedback-handler.ts";
import { feedbackQueue } from "../../../src/lib/notion-feedback-queue-core.ts";
import type { Database } from "../../../src/lib/supabase/database.types.ts";

const runtime = (
  globalThis as unknown as {
    Deno: {
      env: { get(name: string): string | undefined };
      serve(handler: (request: Request) => Promise<Response>): void;
    };
  }
).Deno;
const env = (name: string) => runtime.env.get(name) ?? "";
runtime.serve(
  feedbackHandler(env("NOTION_FEEDBACK_INVOKE_SECRET"), async () => {
    // A bounded invocation; the durable queue survives runtime termination.
    const client = createClient<Database>(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
      },
    });
    const queue = feedbackQueue(client);
    const notion = new FeedbackNotionClient(
      env("NOTION_FEEDBACK_TOKEN"),
      env("NOTION_FEEDBACK_DATA_SOURCE_ID"),
    );
    const started = Date.now();
    let processed = 0;
    let deferred = 0;
    // Worst-case 70s per item; starting new work only within first 40s keeps
    // execution below the free runtime's 150s limit, even with a cold schema check.
    await notion.check();
    while (processed < 3 && Date.now() - started < 40000) {
      const job = await queue.claim();
      if (!job) break;
      const result = await exportFeedback(job, queue, notion);
      processed++;
      if (!result.delivered) deferred++;
    }
    return { processed, deferred };
  }),
);
