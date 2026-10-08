import "server-only";
import { createClient } from "@supabase/supabase-js";
import { ExportError } from "./notion-feedback-core.ts";
import { feedbackQueue } from "./notion-feedback-queue-core.ts";
import type { Database } from "./supabase/database.types";

export function createFeedbackQueue(url: string, key: string) {
  if (!url || !key) throw new ExportError("missing_configuration");
  const destination = new URL(url);
  if (
    destination.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(destination.hostname)
  )
    throw new ExportError("invalid_supabase_url");
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
    },
  });
  return feedbackQueue(client);
}
