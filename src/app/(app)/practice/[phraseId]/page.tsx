import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
export default async function PracticePage({ params }: { params: Promise<{ phraseId: string }> }) {
  const { phraseId } = await params;
  const { client } = await requireUser(`/practice/${phraseId}`);
  const phrase = await client
    .from("phrases")
    .select("playlist_id")
    .eq("slug", phraseId)
    .maybeSingle();
  if (!phrase.data) notFound();
  const playlist = await client
    .from("playlists")
    .select("slug")
    .eq("id", phrase.data.playlist_id)
    .maybeSingle();
  if (!playlist.data) notFound();
  redirect(`/scenarios/${playlist.data.slug}`);
}
