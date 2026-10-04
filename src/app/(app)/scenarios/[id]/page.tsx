import { notFound } from "next/navigation";
import { after } from "next/server";
import { AccountControl } from "@/components/AccountControl";
import { ShadowingPractice } from "@/components/ShadowingPractice";
import { getScenario } from "@/lib/catalog";
import { requireUser } from "@/lib/supabase/server";
export default async function ScenarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getScenario(id);
  if (!result) notFound();
  const { client } = await requireUser(`/scenarios/${id}`);
  after(async () => {
    // Aggregate event only; no identifiers or request contents enter analytics.
    const { error } = await client.rpc("record_practice_access");
    if (error) console.warn("Practice access metric unavailable.");
  });
  return (
    <main className="logged-page">
      <ShadowingPractice
        scenario={result.scenario}
        playlistId={result.playlistId}
        completed={result.completed}
        account={<AccountControl />}
      />
    </main>
  );
}
