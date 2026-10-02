import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { decodeModel, decodeVariant } from "../src/lib/catalog-metadata.ts";

const fixture = JSON.parse(
  readFileSync(new URL("../src/lib/fixtures/voice-comparison.json", import.meta.url)),
);

test("all versioned model and variant metadata round-trip through the catalog seam", () => {
  for (const model of fixture.audioModels) assert.deepEqual(decodeModel(model), model);
  for (const phrase of fixture.phrases)
    for (const variant of phrase.audioVariants) {
      const { src, wordTimings, provenance, ...metadata } = variant;
      assert.deepEqual(decodeVariant(metadata, wordTimings ?? [], provenance, src), {
        ...variant,
        wordTimings: wordTimings ?? [],
      });
    }
});
test("malformed model shapes fail before reaching practice", () => {
  for (const value of [
    null,
    [],
    {},
    { ...fixture.audioModels[0], selectable: "true" },
    { ...fixture.audioModels[0], voiceName: null },
  ])
    assert.throws(() => decodeModel(value), /invalid audio metadata/);
});
test("malformed audio, provenance and overlapping cues fail explicitly", () => {
  const variant = fixture.phrases[0].audioVariants.find((v) => v.wordTimings?.length);
  const decode = (v, cues = variant.wordTimings, provenance = variant.provenance) =>
    decodeVariant(v, cues, provenance, "/api/reference-audio/test");
  assert.throws(() => decode({ ...variant, format: "aac" }));
  assert.throws(() => decode({ ...variant, sampleRateHz: null }));
  assert.throws(() => decode(variant, null));
  assert.throws(() => decode(variant, [{ word: "one", startMs: 10, endMs: 10 }]));
  assert.throws(() =>
    decode(variant, [
      { word: "one", startMs: 0, endMs: 20 },
      { word: "two", startMs: 10, endMs: 30 },
    ]),
  );
  assert.throws(() => decode(variant, [], { ...variant.provenance, kind: "unknown" }));
});
