import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedbackMetadata } from "./feedback";
import type { Database } from "./supabase/database.types";

export async function saveFeedback(
  client: SupabaseClient<Database>,
  userId: string,
  metadata: FeedbackMetadata,
  screenshot: Uint8Array | null,
): Promise<{ status: number; id?: string }> {
  const digest = createHash("sha256")
    .update(JSON.stringify(metadata))
    .update(screenshot ?? new Uint8Array())
    .digest("hex");
  const existing = async () =>
    client.from("app_feedback").select("request_sha256").eq("id", metadata.id).maybeSingle();
  const previous = await existing();
  if (previous.error) return { status: 503 };
  if (previous.data)
    return { status: previous.data.request_sha256 === digest ? 200 : 409, id: metadata.id };
  const bucket = client.storage.from("feedback-screenshots");
  const path = screenshot ? `${userId}/${metadata.id}.png` : null;
  let createdUpload = false;
  if (path && screenshot) {
    const uploaded = await bucket.upload(path, screenshot, {
      contentType: "image/png",
      upsert: false,
    });
    if (uploaded.error) {
      const repeated = await existing();
      if (repeated.data)
        return { status: repeated.data.request_sha256 === digest ? 200 : 409, id: metadata.id };
      // A lost upload response or concurrent retry can leave the same owned image.
      // Compare bytes before linking it; never upsert or reuse a different image.
      const stored = await bucket.download(path);
      if (stored.error || !stored.data) return { status: 503 };
      const storedHash = createHash("sha256")
        .update(new Uint8Array(await stored.data.arrayBuffer()))
        .digest("hex");
      const imageHash = createHash("sha256").update(screenshot).digest("hex");
      if (storedHash !== imageHash) return { status: 409 };
    } else createdUpload = true;
  }
  let failed = false;
  try {
    const saved = await client.from("app_feedback").insert({
      id: metadata.id,
      user_id: userId,
      message: metadata.message,
      page_path: metadata.pagePath,
      captured_at: metadata.capturedAt,
      viewport: metadata.viewport,
      navigation: metadata.navigation,
      screenshot_path: path,
      request_sha256: digest,
    });
    failed = Boolean(saved.error);
  } catch {
    failed = true;
  }
  if (failed) {
    // Storage's policy prevents deletion if a concurrent successful row linked it.
    if (path && createdUpload) await bucket.remove([path]);
    const repeated = await existing();
    return repeated.data
      ? { status: repeated.data.request_sha256 === digest ? 200 : 409, id: metadata.id }
      : { status: 503 };
  }
  return { status: 201, id: metadata.id };
}
