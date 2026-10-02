import type {
  AudioModelFixture,
  AudioProvenance,
  AudioVariantFixture,
  WordTiming,
} from "./fixtures/voice-comparison";

function invalid(): never {
  throw new Error("The catalog contains invalid audio metadata.");
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  return typeof value === "string" ? value : invalid();
}
function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : invalid();
}
function boolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : invalid();
}
function nullableText(value: unknown): string | null {
  return value === null ? null : text(value);
}
function format(value: unknown): "wav" | "mp3" {
  return value === "wav" || value === "mp3" ? value : invalid();
}
export function decodeModel(value: unknown): AudioModelFixture {
  const m = object(value);
  const responseFormat = m.responseFormat;
  if (responseFormat !== null && responseFormat !== "pcm" && responseFormat !== "mp3")
    return invalid();
  return {
    id: text(m.id),
    provider: text(m.provider),
    vendor: text(m.vendor),
    displayName: text(m.displayName),
    voiceId: text(m.voiceId),
    voiceName: text(m.voiceName),
    selectable: boolean(m.selectable),
    archived: boolean(m.archived),
    responseFormat,
    responseMimeType: nullableText(m.responseMimeType),
    outputFormat: format(m.outputFormat),
    outputMimeType: text(m.outputMimeType),
    sampleRateHz: number(m.sampleRateHz),
    channels: number(m.channels),
    sampleFormat: text(m.sampleFormat),
  };
}
function decodeProvenance(value: unknown): AudioProvenance {
  const p = object(value);
  const kind = p.kind;
  if (kind !== "user-import" && kind !== "openrouter-api" && kind !== "archived-local-baseline")
    return invalid();
  return {
    kind,
    sourceFilename: nullableText(p.sourceFilename),
    generationId: nullableText(p.generationId),
    generatedAt: nullableText(p.generatedAt),
    ...(p.engineVersion === undefined ? {} : { engineVersion: text(p.engineVersion) }),
    ...(p.voice === undefined ? {} : { voice: text(p.voice) }),
  };
}
function decodeTimings(value: unknown): readonly WordTiming[] {
  if (!Array.isArray(value)) return invalid();
  let previousEnd = 0;
  return value.map((item) => {
    const cue = object(item);
    const startMs = number(cue.startMs),
      endMs = number(cue.endMs);
    if (startMs < previousEnd || endMs <= startMs) return invalid();
    previousEnd = endMs;
    return { word: text(cue.word), startMs, endMs };
  });
}
export function decodeVariant(
  metadata: unknown,
  timings: unknown,
  provenance: unknown,
  src: string,
): AudioVariantFixture {
  const v = object(metadata);
  return {
    id: text(v.id),
    modelId: text(v.modelId),
    voiceId: text(v.voiceId),
    src,
    format: format(v.format),
    contentType: text(v.contentType),
    sampleRateHz: number(v.sampleRateHz),
    channels: number(v.channels),
    sampleFormat: text(v.sampleFormat),
    sha256: text(v.sha256),
    ...(v.sizeBytes === undefined ? {} : { sizeBytes: number(v.sizeBytes) }),
    ...(v.durationMs === undefined ? {} : { durationMs: number(v.durationMs) }),
    wordTimings: decodeTimings(timings),
    provenance: decodeProvenance(provenance),
  };
}
