import "server-only";
import type {
  AudioModelFixture,
  AudioProvenance,
  AudioVariantFixture,
  ScenarioFixture,
  WordTiming,
} from "@/lib/fixtures/voice-comparison";
import { requireUser } from "@/lib/supabase/server";

export interface PlaylistSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  completed: boolean;
}

export async function getPlaylists(): Promise<PlaylistSummary[]> {
  const { client } = await requireUser();
  const [playlists, completions] = await Promise.all([
    client.from("playlists").select("id,slug,title,description").order("sort_order"),
    client.from("playlist_completions").select("playlist_id"),
  ]);
  if (playlists.error || completions.error)
    throw new Error("The playlists could not be loaded. Please try again.");
  return (playlists.data ?? []).map((p) => ({
    ...p,
    completed: (completions.data ?? []).some((c) => c.playlist_id === p.id),
  }));
}

export async function getScenario(
  slug: string,
): Promise<{ playlistId: string; scenario: ScenarioFixture; completed: boolean } | null> {
  const { client } = await requireUser(`/scenarios/${slug}`);
  const playlist = await client
    .from("playlists")
    .select("id,slug,title,description")
    .eq("slug", slug)
    .maybeSingle();
  if (playlist.error) throw new Error("The playlist could not be loaded. Please try again.");
  if (!playlist.data) return null;
  const phrases = await client
    .from("phrases")
    .select("id,slug,text,category,sort_order")
    .eq("playlist_id", playlist.data.id)
    .order("sort_order");
  if (phrases.error || !phrases.data?.length)
    throw new Error("This playlist has no available phrases.");
  const variants = await client
    .from("audio_variants")
    .select("id,phrase_id,model_metadata,audio_metadata,word_timings,provenance")
    .in(
      "phrase_id",
      phrases.data.map((p) => p.id),
    );
  if (variants.error) throw new Error("Reference voices could not be loaded. Please try again.");
  const audioModels = [
    ...new Map(
      (variants.data ?? []).map((v) => {
        const model = v.model_metadata as unknown as AudioModelFixture;
        return [model.id, model] as const;
      }),
    ).values(),
  ].sort((a, b) => a.id.localeCompare(b.id));
  const completion = await client
    .from("playlist_completions")
    .select("playlist_id")
    .eq("playlist_id", playlist.data.id)
    .maybeSingle();
  if (completion.error) throw new Error("Completion status could not be loaded.");
  return {
    playlistId: playlist.data.id,
    completed: Boolean(completion.data),
    scenario: {
      id: playlist.data.slug,
      title: playlist.data.title,
      description: playlist.data.description,
      audioModels,
      phrases: phrases.data.map((p) => ({
        id: p.slug,
        text: p.text,
        category: p.category,
        order: p.sort_order,
        audioVariants: (variants.data ?? [])
          .filter((v) => v.phrase_id === p.id)
          .map((v) => ({
            ...(v.audio_metadata as unknown as Omit<
              AudioVariantFixture,
              "src" | "wordTimings" | "provenance"
            >),
            src: `/api/reference-audio/${v.id}`,
            wordTimings: v.word_timings as unknown as readonly WordTiming[],
            provenance: v.provenance as unknown as AudioProvenance,
          })),
      })),
    },
  };
}
