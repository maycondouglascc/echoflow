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
    .select(
      "id,slug,title,description,playlist_completions(playlist_id),phrases(id,slug,text,category,sort_order,audio_variants(id,phrase_id,model_metadata,audio_metadata,word_timings,provenance))",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (playlist.error) throw new Error("The playlist could not be loaded. Please try again.");
  if (!playlist.data) return null;
  const phrases = playlist.data.phrases.sort((a, b) => a.sort_order - b.sort_order);
  if (!phrases.length) throw new Error("This playlist has no available phrases.");
  const variants = phrases.flatMap((p) => p.audio_variants);
  const audioModels = [
    ...new Map(
      variants.map((v) => {
        const model = v.model_metadata as unknown as AudioModelFixture;
        return [model.id, model] as const;
      }),
    ).values(),
  ].sort((a, b) => a.id.localeCompare(b.id));
  return {
    playlistId: playlist.data.id,
    completed: playlist.data.playlist_completions.length > 0,
    scenario: {
      id: playlist.data.slug,
      title: playlist.data.title,
      description: playlist.data.description,
      audioModels,
      phrases: phrases.map((p) => ({
        id: p.slug,
        text: p.text,
        category: p.category,
        order: p.sort_order,
        audioVariants: variants
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
