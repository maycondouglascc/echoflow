"use server";
import { savePracticeListen } from "@/lib/practice-history";
import { historyFailure, type PracticeListenResult } from "@/lib/practice-history-core";
import { createClient } from "@/lib/supabase/server";

export async function recordPracticeListen(input: unknown): Promise<PracticeListenResult> {
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return historyFailure("unauthenticated");
    return await savePracticeListen(client, data.user.id, input);
  } catch {
    return historyFailure("temporarily_unavailable");
  }
}
