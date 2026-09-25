import source from "./introducing-yourself.json";

export interface PhraseFixture {
  readonly id: string;
  readonly order: number;
  readonly text: string;
  readonly referenceAudio: string;
}

export interface ScenarioFixture {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly phrases: readonly PhraseFixture[];
}

export const introducingYourselfScenario: ScenarioFixture = Object.freeze({
  ...source,
  phrases: Object.freeze(source.phrases.map((phrase) => Object.freeze(phrase))),
});
