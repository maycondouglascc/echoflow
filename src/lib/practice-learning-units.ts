/** Replay annotations are independent from wordTimings used for highlighting. */
export interface LearningReference {
  readonly phraseId: string;
  readonly text: string;
  readonly voiceId: string;
  readonly sha256: string;
  readonly src: string;
  readonly durationMs: number;
}
export interface LearningReview {
  readonly reviewerId: string;
  readonly complete: boolean;
  readonly noAdjacentLexicalSpeech: boolean;
}
export interface LearningUnit {
  readonly id: string;
  readonly phraseId: string;
  readonly voiceId: string;
  readonly referenceSha256: string;
  readonly kind: "isolated-word" | "contextual-word" | "linking-chunk";
  readonly tokenStart: number;
  readonly tokenEnd: number;
  readonly text: string;
  readonly source:
    | { readonly kind: "reference-range"; readonly startMs: number; readonly endMs: number }
    | {
        readonly kind: "private-asset";
        readonly src: string;
        readonly sha256: string;
        readonly durationMs: number;
      };
  readonly reviews: readonly LearningReview[];
}
export interface LearningReplay {
  readonly kind: LearningUnit["kind"] | "whole-phrase";
  readonly label: string;
  readonly src: string;
  readonly sha256: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly unitId: string | null;
}
const digest = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const tokens = (text: string) => text.trim().split(/\s+/).filter(Boolean);

/** Unreviewed, malformed or stale metadata is withheld rather than replayed. */
export function decodeLearningUnit(
  value: unknown,
  reference: LearningReference,
): LearningUnit | null {
  if (!record(value) || !positive(reference.durationMs) || !digest(reference.sha256)) return null;
  const words = tokens(reference.text);
  if (
    typeof value.id !== "string" ||
    !/^[a-zA-Z0-9_-]+$/.test(value.id) ||
    value.phraseId !== reference.phraseId ||
    value.voiceId !== reference.voiceId ||
    value.referenceSha256 !== reference.sha256 ||
    !Number.isInteger(value.tokenStart) ||
    !Number.isInteger(value.tokenEnd)
  )
    return null;
  const start = value.tokenStart as number,
    end = value.tokenEnd as number;
  if (
    start < 0 ||
    end < start ||
    end >= words.length ||
    value.text !== words.slice(start, end + 1).join(" ")
  )
    return null;
  const kind = value.kind;
  if (kind !== "isolated-word" && kind !== "contextual-word" && kind !== "linking-chunk")
    return null;
  if ((kind === "isolated-word" && start !== end) || (kind === "linking-chunk" && start === end))
    return null;
  if (!Array.isArray(value.reviews) || value.reviews.length < 2) return null;
  const reviewers = new Set<string>();
  const reviews: LearningReview[] = [];
  for (const review of value.reviews) {
    if (
      !record(review) ||
      typeof review.reviewerId !== "string" ||
      !review.reviewerId.trim() ||
      reviewers.has(review.reviewerId.trim()) ||
      review.complete !== true ||
      review.noAdjacentLexicalSpeech !== true
    )
      return null;
    reviewers.add(review.reviewerId.trim());
    reviews.push({
      reviewerId: review.reviewerId.trim(),
      complete: true,
      noAdjacentLexicalSpeech: true,
    });
  }
  const source = value.source;
  if (!record(source)) return null;
  let decodedSource: LearningUnit["source"];
  if (source.kind === "reference-range") {
    if (
      kind === "isolated-word" ||
      typeof source.startMs !== "number" ||
      !Number.isFinite(source.startMs) ||
      source.startMs < 0 ||
      !positive(source.endMs) ||
      source.startMs >= source.endMs ||
      source.endMs > reference.durationMs
    )
      return null;
    decodedSource = { kind: source.kind, startMs: source.startMs, endMs: source.endMs };
  } else if (source.kind === "private-asset") {
    if (
      kind !== "isolated-word" ||
      source.src !== `/api/practice-audio/${value.id}` ||
      !digest(source.sha256) ||
      !positive(source.durationMs)
    )
      return null;
    decodedSource = {
      kind: source.kind,
      src: source.src,
      sha256: source.sha256,
      durationMs: source.durationMs,
    };
  } else return null;
  return {
    id: value.id,
    phraseId: reference.phraseId,
    voiceId: reference.voiceId,
    referenceSha256: reference.sha256,
    kind,
    tokenStart: start,
    tokenEnd: end,
    text: value.text as string,
    source: decodedSource,
    reviews,
  };
}

/** No listener-approved unit means explicitly labelled whole-phrase context. */
export function learningReplayForWord(
  reference: LearningReference,
  candidates: readonly unknown[],
  wordIndex: number,
): LearningReplay | null {
  if (
    !Number.isInteger(wordIndex) ||
    wordIndex < 0 ||
    wordIndex >= tokens(reference.text).length ||
    !positive(reference.durationMs) ||
    !digest(reference.sha256)
  )
    return null;
  const units = candidates
    .map((value) => decodeLearningUnit(value, reference))
    .filter(
      (unit): unit is LearningUnit =>
        unit !== null && unit.tokenStart <= wordIndex && unit.tokenEnd >= wordIndex,
    );
  units.sort(
    (a, b) =>
      Number(b.kind === "isolated-word") - Number(a.kind === "isolated-word") ||
      a.tokenEnd - a.tokenStart - (b.tokenEnd - b.tokenStart),
  );
  const unit = units[0];
  if (!unit)
    return {
      kind: "whole-phrase",
      label: `In context: ${reference.text}`,
      src: reference.src,
      sha256: reference.sha256,
      startMs: 0,
      endMs: reference.durationMs,
      unitId: null,
    };
  const isolated = unit.source.kind === "private-asset";
  return {
    kind: unit.kind,
    label: `${isolated ? "Isolated word" : "In context"}: ${unit.text}`,
    src: unit.source.kind === "private-asset" ? unit.source.src : reference.src,
    sha256: unit.source.kind === "private-asset" ? unit.source.sha256 : reference.sha256,
    startMs: unit.source.kind === "private-asset" ? 0 : unit.source.startMs,
    endMs: unit.source.kind === "private-asset" ? unit.source.durationMs : unit.source.endMs,
    unitId: unit.id,
  };
}
