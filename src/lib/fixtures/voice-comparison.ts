import source from "./voice-comparison.json";

export type AudioFormat = "wav" | "mp3";
export type AudioResponseFormat = "pcm" | "mp3";

export interface AudioModelFixture {
  readonly id: string;
  readonly provider: string;
  readonly vendor: string;
  readonly displayName: string;
  readonly voiceId: string;
  readonly voiceName: string;
  readonly selectable: boolean;
  readonly archived: boolean;
  readonly responseFormat: AudioResponseFormat | null;
  readonly responseMimeType: string | null;
  readonly outputFormat: AudioFormat;
  readonly outputMimeType: string;
  readonly sampleRateHz: number;
  readonly channels: number;
  readonly sampleFormat: string;
}

export interface AudioProvenance {
  readonly kind: "user-import" | "openrouter-api" | "archived-local-baseline";
  readonly sourceFilename: string | null;
  readonly generationId: string | null;
  readonly generatedAt: string | null;
  readonly engineVersion?: string;
  readonly voice?: string;
}

export interface AudioVariantFixture {
  readonly id: string;
  readonly modelId: string;
  readonly voiceId: string;
  readonly src: string;
  readonly format: AudioFormat;
  readonly contentType: string;
  readonly sampleRateHz: number;
  readonly channels: number;
  readonly sampleFormat: string;
  readonly sizeBytes?: number;
  readonly durationMs?: number;
  readonly sha256: string;
  readonly provenance: AudioProvenance;
}

export interface PhraseFixture {
  readonly id: string;
  readonly category: string;
  readonly order: number;
  readonly text: string;
  readonly audioVariants: readonly AudioVariantFixture[];
}

export interface ScenarioFixture {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly audioModels: readonly AudioModelFixture[];
  readonly phrases: readonly PhraseFixture[];
}

const fixture = source as ScenarioFixture;

export const voiceComparisonScenario: ScenarioFixture = Object.freeze({
  ...fixture,
  audioModels: Object.freeze(fixture.audioModels.map((model) => Object.freeze(model))),
  phrases: Object.freeze(
    fixture.phrases.map((phrase) =>
      Object.freeze({
        ...phrase,
        audioVariants: Object.freeze(
          phrase.audioVariants.map((variant) =>
            Object.freeze({
              ...variant,
              provenance: Object.freeze(variant.provenance),
            }),
          ),
        ),
      }),
    ),
  ),
});
