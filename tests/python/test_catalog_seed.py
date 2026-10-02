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
        self.assertEqual(len(checksums), 13)
        self.assertEqual(sum(item['active'] for item in checksums), 10)
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
