import { MAX_BODY_BYTES, parseFeedback, validatePng } from "@/lib/feedback";
import { saveFeedback } from "@/lib/feedback-store";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
function response(status: number, id?: string) {
  return Response.json(
    status < 300
      ? { id }
      : {
          error:
            status === 401
              ? "Please log in again."
              : "Feedback could not be sent. Please try again.",
        },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}
async function boundedBody(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Blob(chunks as BlobPart[]);
}
export async function POST(request: Request) {
  let siteOrigin: string;
  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (!site) return response(503);
    siteOrigin = new URL(site).origin;
  } catch {
    return response(503);
  }
  if (request.headers.get("origin") !== siteOrigin) return response(403);
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return response(401);
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
      return response(400);
    const body = await boundedBody(request);
    if (!body) return response(413);
    let metadata: ReturnType<typeof parseFeedback>,
      bytes: Uint8Array | null = null;
    try {
      const form = await new Response(body, {
        headers: { "Content-Type": request.headers.get("content-type") ?? "" },
      }).formData();
      if (
        [...form.keys()].some((k) => !["metadata", "screenshot"].includes(k)) ||
        form.getAll("metadata").length !== 1 ||
        form.getAll("screenshot").length > 1
      )
        return response(400);
      const text = form.get("metadata");
      if (typeof text !== "string" || text.length > 16384) return response(400);
      metadata = parseFeedback(JSON.parse(text));
      const file = form.get("screenshot");
      if (file !== null) {
        if (!(file instanceof File)) return response(400);
        bytes = new Uint8Array(await file.arrayBuffer());
        validatePng(bytes, file.type);
      }
    } catch {
      return response(400);
    }
    const result = await saveFeedback(client, data.user.id, metadata, bytes);
    return response(result.status, result.id);
  } catch {
    return response(503);
  }
}
