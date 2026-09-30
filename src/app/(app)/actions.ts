"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
export async function completePlaylist(playlistId: string): Promise<{ ok: boolean }> {
  const { client, user } = await requireUser();
  if (!/^[a-f0-9-]{36}$/.test(playlistId)) return { ok: false };
  const playlist = await client.from("playlists").select("id").eq("id", playlistId).maybeSingle();
  if (playlist.error || !playlist.data) return { ok: false };
  const { error } = await client
    .from("playlist_completions")
    .upsert(
      { user_id: user.id, playlist_id: playlistId },
      { onConflict: "user_id,playlist_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false };
  revalidatePath("/home");
  return { ok: true };
}
