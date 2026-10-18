export interface PracticeListenInput {
  readonly eventId: string;
  readonly phraseId: string;
  readonly expectedUserId: string;
}
export type PracticeHistoryFailure =
  | "unauthenticated"
  | "not_available"
  | "identity_changed"
  | "conflict"
  | "rate_limited"
  | "temporarily_unavailable"
  | "limit_reached";
export type PracticeListenResult =
  | {
      readonly ok: true;
      readonly eventId: string;
      readonly phraseId: string;
      readonly count: number;
      readonly duplicate: boolean;
    }
  | { readonly ok: false; readonly reason: PracticeHistoryFailure; readonly retryable: boolean };
export interface PracticeHistoryInitial {
  readonly accountId: string;
  /** Database phrase UUIDs, never display slugs. */
  readonly counts: Readonly<Record<string, number>>;
  readonly available?: boolean;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parsePracticeListenInput(value: unknown): PracticeListenInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).length !== 3 ||
    !["eventId", "phraseId", "expectedUserId"].every(
      (key) => typeof input[key] === "string" && UUID.test(input[key] as string),
    )
  )
    return null;
  return {
    eventId: (input.eventId as string).toLowerCase(),
    phraseId: (input.phraseId as string).toLowerCase(),
    expectedUserId: (input.expectedUserId as string).toLowerCase(),
  };
}
export function historyFailure(reason: PracticeHistoryFailure): PracticeListenResult {
  return {
    ok: false,
    reason,
    retryable: reason === "temporarily_unavailable" || reason === "rate_limited",
  };
}
export function decodePracticeListenResult(
  data: unknown,
  input: PracticeListenInput,
): PracticeListenResult {
  if (!data || typeof data !== "object") return historyFailure("temporarily_unavailable");
  const result = data as Record<string, unknown>;
  if (
    result.ok === true &&
    typeof result.count === "number" &&
    Number.isSafeInteger(result.count) &&
    result.count >= 0 &&
    typeof result.duplicate === "boolean"
  )
    return {
      ok: true,
      eventId: input.eventId,
      phraseId: input.phraseId,
      count: result.count,
      duplicate: result.duplicate,
    };
  const reasons: readonly string[] = [
    "unauthenticated",
    "not_available",
    "identity_changed",
    "conflict",
    "rate_limited",
    "limit_reached",
  ];
  return result.ok === false && typeof result.reason === "string" && reasons.includes(result.reason)
    ? historyFailure(result.reason as PracticeHistoryFailure)
    : historyFailure("temporarily_unavailable");
}
