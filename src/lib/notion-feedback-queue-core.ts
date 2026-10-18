import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExportJob, ExportQueue } from "./notion-feedback-core.ts";
import { ExportError } from "./notion-feedback-core.ts";
import type { Database } from "./supabase/database.types.ts";

export function feedbackQueue(client: SupabaseClient<Database>) {
  function checked(result: { error: unknown; data: unknown }) {
    if (result.error) throw new ExportError("queue_unavailable");
    return result.data;
  }
  const queue: ExportQueue & { claim(): Promise<ExportJob | null> } = {
    async claim() {
      return checked(await client.rpc("claim_notion_feedback")) as ExportJob | null;
    },
    async start(job) {
      if (
        checked(
          await client.rpc("start_notion_feedback", {
            p_id: job.feedback_id,
            p_token: job.lease_token,
          }),
        ) !== true
      )
        throw new ExportError("lease_lost");
    },
    async finish(job, page, error, delay = 60, reset = false) {
      if (
        checked(
          await client.rpc("finish_notion_feedback", {
            p_id: job.feedback_id,
            p_token: job.lease_token,
            p_page: page,
            p_error: error ?? null,
            p_delay: delay,
            p_reset: reset,
          }),
        ) !== true
      )
        throw new ExportError("lease_lost");
    },
    async screenshot(path) {
      const result = await client.storage.from("feedback-screenshots").download(path);
      if (result.error || !result.data) throw new ExportError("screenshot_unavailable");
      return result.data;
    },
  };
  return queue;
}
