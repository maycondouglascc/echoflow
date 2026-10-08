import {
  historyFailure,
  type PracticeHistoryFailure,
  type PracticeListenInput,
  type PracticeListenResult,
  parsePracticeListenInput,
} from "./practice-history-core.ts";

export interface PracticeHistorySnapshot {
  readonly counts: Readonly<Record<string, number>>;
  readonly unsaved: Readonly<Record<string, number>>;
  readonly backlogFull: boolean;
  readonly error: PracticeHistoryFailure | null;
}
interface Pending {
  readonly input: PracticeListenInput;
  retries: number;
  inFlight: boolean;
  retryable: boolean;
  token: number;
  timer?: ReturnType<typeof setTimeout>;
}
interface Options {
  readonly accountId: string;
  readonly initialCounts: Readonly<Record<string, number>>;
  readonly available?: boolean;
  readonly save: (input: PracticeListenInput) => Promise<PracticeListenResult>;
  readonly schedule?: typeof setTimeout;
  readonly cancel?: typeof clearTimeout;
}
/** Volatile account-bound queue. It never stores or receives recording bytes/text. */
export function createPracticeHistoryQueue(options: Options) {
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  const pending = new Map<string, Pending>();
  const seen = new Set<string>();
  const listeners = new Set<() => void>();
  let active = true;
  let snapshot: PracticeHistorySnapshot = {
    counts: { ...options.initialCounts },
    unsaved: {},
    backlogFull: false,
    error: options.available === false ? "temporarily_unavailable" : null,
  };
  const publish = (counts = snapshot.counts, error = snapshot.error) => {
    const unsaved: Record<string, number> = {};
    for (const item of pending.values())
      unsaved[item.input.phraseId] = (unsaved[item.input.phraseId] ?? 0) + 1;
    snapshot = { counts, unsaved, backlogFull: pending.size >= 20, error };
    for (const listener of listeners) listener();
  };
  const send = async (item: Pending) => {
    if (!active || item.inFlight || !item.retryable) return;
    item.inFlight = true;
    const token = ++item.token;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<PracticeListenResult>((resolve) => {
      timeout = schedule(() => resolve(historyFailure("temporarily_unavailable")), 10_000);
      item.timer = timeout;
    });
    let result: PracticeListenResult;
    try {
      result = await Promise.race([options.save(item.input), timedOut]);
    } catch {
      result = historyFailure("temporarily_unavailable");
    } finally {
      if (timeout !== undefined) cancel(timeout);
    }
    if (!active || token !== item.token) return;
    item.timer = undefined;
    item.inFlight = false;
    if (
      result.ok &&
      result.eventId === item.input.eventId &&
      result.phraseId === item.input.phraseId &&
      Number.isSafeInteger(result.count) &&
      result.count >= 0
    ) {
      pending.delete(item.input.eventId);
      publish(
        {
          ...snapshot.counts,
          [item.input.phraseId]: Math.max(snapshot.counts[item.input.phraseId] ?? 0, result.count),
        },
        null,
      );
      return;
    }
    const failure = result.ok ? historyFailure("temporarily_unavailable") : result;
    if (failure.ok) return;
    item.retryable = failure.retryable;
    publish(snapshot.counts, failure.reason);
    if (item.retryable && item.retries < 3) {
      const delay = [1000, 2000, 4000][item.retries++];
      item.timer = schedule(() => {
        item.timer = undefined;
        void send(item);
      }, delay);
    }
  };
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    record(value: PracticeListenInput) {
      const input = parsePracticeListenInput(value);
      if (
        !active ||
        !input ||
        input.expectedUserId !== options.accountId ||
        seen.has(input.eventId)
      )
        return false;
      if (pending.size >= 20) {
        publish();
        return false;
      }
      seen.add(input.eventId);
      const item: Pending = { input, retries: 0, inFlight: false, retryable: true, token: 0 };
      pending.set(input.eventId, item);
      publish();
      void send(item);
      return true;
    },
    retry() {
      if (!active) return;
      for (const item of pending.values()) {
        if (item.inFlight || !item.retryable) continue;
        if (item.timer !== undefined) cancel(item.timer);
        item.timer = undefined;
        item.retries = 0;
        void send(item);
      }
    },
    activate() {
      active = true;
    },
    dispose() {
      active = false;
      for (const item of pending.values()) {
        if (item.timer !== undefined) cancel(item.timer);
        item.timer = undefined;
        item.inFlight = false;
        item.token++;
      }
    },
  };
}
