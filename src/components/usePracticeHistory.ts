"use client";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { recordPracticeListen } from "@/app/(app)/practice-history-actions";
import { createPracticeHistoryQueue } from "@/lib/practice-history-client";
import type { PracticeHistoryInitial } from "@/lib/practice-history-core";

export function usePracticeHistory(initial: PracticeHistoryInitial) {
  const queue = useMemo(
    () =>
      createPracticeHistoryQueue({
        accountId: initial.accountId,
        initialCounts: initial.counts,
        available: initial.available,
        save: recordPracticeListen,
      }),
    [initial.accountId, initial.counts, initial.available],
  );
  const snapshot = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  useEffect(() => {
    queue.activate();
    return () => queue.dispose();
  }, [queue]);
  const record = useCallback(
    (databasePhraseId: string, eventId = crypto.randomUUID()) =>
      queue.record({ eventId, phraseId: databasePhraseId, expectedUserId: initial.accountId }),
    [queue, initial.accountId],
  );
  return { ...snapshot, record, retry: queue.retry };
}
