import hashlib
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]

class CatalogSeedTest(unittest.TestCase):
    def test_seed_preserves_every_phrase_variant_and_timing(self):
        fixture = json.loads((ROOT / 'src/lib/fixtures/voice-comparison.json').read_text())
        seed = (ROOT / 'supabase/seed.sql').read_text()
        checksums = json.loads((ROOT / 'assets/reference-audio/checksums.json').read_text())
        self.assertEqual(len(fixture['phrases']), 5)
        self.assertEqual(len(checksums), 163)
        self.assertEqual(sum(item['active'] for item in checksums), 160)
        for phrase in fixture['phrases']:
            self.assertIn(phrase['text'].replace("'", "''"), seed)
            for variant in phrase['audioVariants']:
                self.assertIn(variant['sha256'], seed)
                for cue in variant.get('wordTimings', []):
                    self.assertIn(json.dumps(cue, separators=(',', ':')).replace("'", "''"), seed)
        for item in checksums:
            file = ROOT / 'assets/reference-audio' / item['path']
            self.assertEqual(hashlib.sha256(file.read_bytes()).hexdigest(), item['sha256'])
            self.assertFalse((ROOT / 'public/fixtures/audio' / item['path']).exists())

    def test_work_playlists_preserve_both_voices_and_aligned_canonical_phrases(self):
        catalog = json.loads((ROOT / 'docs/content/work-playlists.json').read_text())
        seed = (ROOT / 'supabase/seed.sql').read_text()
        self.assertEqual(catalog['status'], 'ready')
        self.assertEqual(len(catalog['playlists']), 5)
        phrase_ids, variant_ids = set(), set()
        for playlist in catalog['playlists']:
            self.assertEqual(len(playlist['phrases']), 15)
            self.assertEqual([p['order'] for p in playlist['phrases']], list(range(1,16)))
            self.assertIn(playlist['title'], seed)
            for phrase in playlist['phrases']:
                phrase_ids.add(phrase['id'])
                self.assertIn(phrase['text'].replace("'", "''"), seed)
                self.assertEqual({v['voiceId'] for v in phrase['audioVariants']}, {'Puck', 'en-US-Harper:MAI-Voice-2'})
                for variant in phrase['audioVariants']:
                    variant_ids.add(variant['id'])
                    path = ROOT / 'assets/reference-audio' / variant['src'].removeprefix('/fixtures/audio/')
                    self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), variant['sha256'])
                    self.assertEqual(variant['provenance']['kind'], 'openrouter-api')
                    self.assertTrue(variant['provenance']['generatedAt'])
                    cues = variant['wordTimings']
                    self.assertEqual([cue['word'] for cue in cues], phrase['text'].split())
                    previous = 0
                    for cue in cues:
                        self.assertLessEqual(previous, cue['startMs'])
                        self.assertLess(cue['startMs'], cue['endMs'])
                        self.assertLessEqual(cue['endMs'], variant['durationMs'])
                        previous = cue['endMs']
        self.assertEqual(len(phrase_ids), 75)
        self.assertEqual(len(variant_ids), 150)
