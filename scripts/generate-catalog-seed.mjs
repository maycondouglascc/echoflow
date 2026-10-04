import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixture = JSON.parse(readFileSync('src/lib/fixtures/voice-comparison.json', 'utf8'));
const uuid = (value) => { const h = createHash('sha256').update(value).digest('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; };
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${quote(JSON.stringify(value))}::jsonb`;
const playlistId = uuid(fixture.id);
const lines = ['-- Generated from the versioned fixture; run npm run catalog:seed to regenerate.'];
lines.push(`insert into public.playlists (id,slug,title,description,sort_order,published) values (${quote(playlistId)},${quote(fixture.id)},${quote(fixture.title)},${quote(fixture.description)},1,true);`);
const checksums = [];
for (const phrase of fixture.phrases) {
  const phraseId = uuid(phrase.id);
  lines.push(`insert into public.phrases (id,slug,playlist_id,category,text,sort_order,published) values (${quote(phraseId)},${quote(phrase.id)},${quote(playlistId)},${quote(phrase.category)},${quote(phrase.text)},${phrase.order},true);`);
  for (const variant of phrase.audioVariants) {
    const model = fixture.audioModels.find((m) => m.id === variant.modelId);
    const storagePath = variant.src.replace('/fixtures/audio/', '');
    const path = resolve('assets/reference-audio', storagePath);
    const bytes = readFileSync(path);
    const sha = createHash('sha256').update(bytes).digest('hex');
    if (sha !== variant.sha256) throw new Error(`Checksum mismatch: ${storagePath}`);
    checksums.push({path: storagePath, sha256: sha, active: model.selectable});
    const { src, wordTimings, provenance, ...metadata } = variant;
    lines.push(`insert into public.audio_variants (id,slug,phrase_id,model_id,voice_id,voice_label,format,storage_path,sha256,provenance,word_timings,model_metadata,audio_metadata,active) values (${quote(uuid(variant.id))},${quote(variant.id)},${quote(phraseId)},${quote(model.id)},${quote(model.voiceId)},${quote(model.voiceName)},${quote(variant.format)},${quote(storagePath)},${quote(sha)},${json(provenance)},${json(wordTimings ?? [])},${json(model)},${json(metadata)},${model.selectable});`);
  }
}
writeFileSync('supabase/seed.sql', `${lines.join('\n')}\n`);
writeFileSync('assets/reference-audio/checksums.json', `${JSON.stringify(checksums,null,2)}\n`);
