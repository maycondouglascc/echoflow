export type CaptureMode = "repeat" | "with-reference";
export type ComparisonMode = "sequential" | "simultaneous";
export type PracticePlaybackMode =
  | "reference"
  | "solo"
  | "sequential"
  | "simultaneous"
  | "word"
  | "chunk"
  | "speak-along";
export interface PlaybackRunIdentity {
  readonly runId: string;
  readonly phraseId: string;
  readonly variantId: string;
  readonly accountGeneration: string;
  readonly mode: PracticePlaybackMode;
}
export interface FullReferenceEvent {
  readonly kind: "full-reference-complete";
  readonly eventId: string;
  readonly run: Readonly<PlaybackRunIdentity>;
}
export interface PracticeAttemptIdentity {
  readonly attemptId: string;
  readonly phraseId: string;
  readonly voiceId: string;
  readonly mode: CaptureMode;
}

// Completion state belongs to the media owner, never to a presentation component.
// Reference listening and finishing a comparison are independently deduplicated.
export function trackPlaybackCompletion(identity: PlaybackRunIdentity) {
  const run = Object.freeze({ ...identity });
  let active = true;
  let referenceEnded = false;
  let takeEnded = false;
  let comparisonEmitted = false;
  const comparison = run.mode === "sequential" || run.mode === "simultaneous";
  const fullReference = comparison || run.mode === "reference" || run.mode === "speak-along";
  return {
    run,
    cancel() {
      active = false;
    },
    ended(source: "reference" | "take") {
      if (!active) return { referenceComplete: false, comparisonComplete: false };
      const referenceComplete = source === "reference" && fullReference && !referenceEnded;
      if (source === "reference") referenceEnded = true;
      else takeEnded = true;
      const comparisonComplete = comparison && referenceEnded && takeEnded && !comparisonEmitted;
      if (comparisonComplete) comparisonEmitted = true;
      return { referenceComplete, comparisonComplete };
    },
  };
}
