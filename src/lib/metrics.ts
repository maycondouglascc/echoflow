import "server-only";
import type { createClient } from "@/lib/supabase/server";
// Event count, not unique people. No identifiers or request contents enter analytics.
export async function recordPracticeAccess(client: Awaited<ReturnType<typeof createClient>>) {
  const { error } = await client.rpc("record_practice_access");
  if (error) console.warn("Practice access metric unavailable.");
}
