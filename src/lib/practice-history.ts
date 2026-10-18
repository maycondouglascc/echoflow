import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decodePracticeListenResult,
  historyFailure,
  type PracticeHistoryInitial,
  type PracticeListenResult,
  parsePracticeListenInput,
} from "./practice-history-core.ts";
import type { Database } from "./supabase/database.types";

export async function savePracticeListen(
  client: SupabaseClient<Database>,
  userId: string | null,
  value: unknown,
): Promise<PracticeListenResult> {
  if (!userId) return historyFailure("unauthenticated");
  const input = parsePracticeListenInput(value);
  if (!input) return historyFailure("not_available");
  if (input.expectedUserId !== userId.toLowerCase()) return historyFailure("identity_changed");
  try {
    const { data, error } = await client.rpc("record_phrase_listen", {
      p_event_id: input.eventId,
      p_phrase_id: input.phraseId,
      p_expected_user_id: userId,
    });
    return error
      ? historyFailure("temporarily_unavailable")
      : decodePracticeListenResult(data, input);
  } catch {
    return historyFailure("temporarily_unavailable");
  }
}

export async function loadPracticeHistory(
  client: SupabaseClient<Database>,
  accountId: string,
  phraseIds: readonly string[],
): Promise<PracticeHistoryInitial> {
  try {
    if (phraseIds.length === 0) return { accountId, counts: {}, available: true };
    const { data, error } = await client
      .from("phrase_listen_counts")
      .select("phrase_id,count")
      .eq("user_id", accountId)
      .in("phrase_id", [...phraseIds]);
    if (error) return { accountId, counts: {}, available: false };
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      if (!Number.isSafeInteger(row.count) || row.count < 0)
        return { accountId, counts: {}, available: false };
      counts[row.phrase_id] = row.count;
    }
    return { accountId, counts, available: true };
  } catch {
    return { accountId, counts: {}, available: false };
  }
}
