import { audioRange } from "@/lib/audio-range";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
export async function GET(
  request: Request,
  { params }: { params: Promise<{ variantId: string }> },
) {
  try {
    const client = await createClient();
    const { data: auth, error } = await client.auth.getUser();
    if (error || !auth.user) return new Response(null, { status: 401, headers: privateHeaders });
    const { variantId } = await params;
    if (!/^[a-f0-9-]{36}$/.test(variantId))
      return new Response(null, { status: 404, headers: privateHeaders });
    const variant = await client
      .from("audio_variants")
      .select("storage_path,format")
      .eq("id", variantId)
      .maybeSingle();
    if (variant.error) return new Response(null, { status: 503, headers: privateHeaders });
    if (!variant.data) return new Response(null, { status: 404, headers: privateHeaders });
    const file = await client.storage.from("phrase-audio").download(variant.data.storage_path);
    if (file.error || !file.data)
      return new Response(null, { status: 503, headers: privateHeaders });
    const bytes = new Uint8Array(await file.data.arrayBuffer());
    const range = audioRange(request.headers.get("Range"), bytes.length);
    if (!range)
      return new Response(null, {
        status: 416,
        headers: { ...privateHeaders, "Content-Range": `bytes */${bytes.length}` },
      });
    const headers: Record<string, string> = {
      ...privateHeaders,
      "Accept-Ranges": "bytes",
      "Content-Type": variant.data.format === "mp3" ? "audio/mpeg" : "audio/wav",
      "Content-Length": String(range.end - range.start + 1),
    };
    if (range.status === 206)
      headers["Content-Range"] = `bytes ${range.start}-${range.end}/${bytes.length}`;
    return new Response(bytes.slice(range.start, range.end + 1), { status: range.status, headers });
  } catch {
    return new Response(null, { status: 503, headers: privateHeaders });
  }
}
