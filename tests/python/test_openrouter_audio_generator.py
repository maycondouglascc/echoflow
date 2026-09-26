from __future__ import annotations

import contextlib
import hashlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import wave

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_PATH = ROOT / "scripts/generate-openrouter-audio.py"
SPEC = importlib.util.spec_from_file_location("openrouter_audio_generator", SCRIPT_PATH)
generator = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(generator)


class FakeHeaders(dict):
    def get_content_type(self) -> str:
        return self["Content-Type"].split(";", maxsplit=1)[0]

    def get(self, key: str, default: str | None = None) -> str | None:
        return super().get(key, default)


class FakeResponse:
    def __init__(self, payload: bytes, content_type: str, generation_id: str = "generation-test"):
        self.payload = payload
        self.status = 200
        self.headers = FakeHeaders(
            {"Content-Type": content_type, "X-Generation-Id": generation_id}
        )

    def __enter__(self) -> FakeResponse:
        return self

    def __exit__(self, *_: object) -> None:
        return None

    def read(self) -> bytes:
        return self.payload


def valid_mp3_frames(count: int = 2) -> bytes:
    header = b"\xff\xfb\x90\x64"
    frame_size = 144 * 128_000 // 44_100
    frame = header + bytes(frame_size - len(header))
    return frame * count


class AudioGeneratorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.catalog = generator.load_catalog()
        self.jobs = generator.validate_catalog(self.catalog)

    def test_catalog_identifies_five_phrases_ten_assets_and_archived_baseline(self) -> None:
        self.assertEqual(len(self.catalog["phrases"]), 5)
        self.assertEqual(len(self.jobs), 10)
        self.assertEqual(
            [(model["id"], model["voiceId"]) for model in self.catalog["audioModels"] if model["selectable"]],
            [
                ("google/gemini-3.8-flash-tts", "Puck"),
                ("microsoft/mai-voice-2", "en-US-Harper:MAI-Voice-2"),
            ],
        )
        self.assertEqual(
            [phrase["category"] for phrase in self.catalog["phrases"]],
            [
                "Introducing Yourself",
                "Introducing Yourself",
                "Introducing Yourself",
                "At a Restaurant",
                "Job Interview Basics",
            ],
        )
        archived = [
            variant
            for phrase in self.catalog["phrases"]
            for variant in phrase["audioVariants"]
            if not next(model for model in self.catalog["audioModels"] if model["id"] == variant["modelId"])["selectable"]
        ]
        self.assertEqual(len(archived), 3)
        for variant in archived:
            path = generator.resolve_asset_path(ROOT, variant)
            self.assertTrue(path.is_file(), path)
            self.assertEqual(
                hashlib.sha256(path.read_bytes()).hexdigest(), variant["sha256"]
            )
            with wave.open(str(path), "rb") as audio:
                self.assertEqual(audio.getframerate(), 22_050)
                self.assertEqual(audio.getnchannels(), 1)
                self.assertEqual(audio.getsampwidth(), 2)

        for job in self.jobs:
            path = generator.resolve_asset_path(ROOT, job["variant"])
            self.assertTrue(path.is_file(), path)
            self.assertEqual(path.stat().st_size, job["variant"]["sizeBytes"])
            self.assertEqual(
                hashlib.sha256(path.read_bytes()).hexdigest(), job["variant"]["sha256"]
            )
            if job["variant"]["format"] == "wav":
                with wave.open(str(path), "rb") as audio:
                    self.assertEqual(audio.getframerate(), 24_000)
                    self.assertEqual(audio.getnchannels(), 1)
                    self.assertEqual(audio.getsampwidth(), 2)
            else:
                generator.validate_mp3(path.read_bytes())

    def test_preview_lists_ten_jobs_without_reading_a_key_or_calling_network(self) -> None:
        output = io.StringIO()
        with (
            contextlib.redirect_stdout(output),
            patch.object(generator.urllib.request, "urlopen", side_effect=AssertionError("network")),
        ):
            jobs = generator.preview(self.catalog)
        self.assertEqual(len(jobs), 10)
        self.assertIn("10 phrase/model/voice tasks.", output.getvalue())
        self.assertIn("google/gemini-3.8-flash-tts", output.getvalue())
        self.assertIn("microsoft/mai-voice-2", output.getvalue())

    def test_google_pcm_is_wrapped_as_mono_24_khz_signed_16_bit_wav(self) -> None:
        google = next(model for model in self.catalog["audioModels"] if model["vendor"] == "Google")
        audio_bytes = generator.pcm_to_wav(b"\x01\x00\x02\x00", google)
        with wave.open(io.BytesIO(audio_bytes), "rb") as audio:
            self.assertEqual(audio.getnchannels(), 1)
            self.assertEqual(audio.getsampwidth(), 2)
            self.assertEqual(audio.getframerate(), 24_000)
            self.assertEqual(audio.readframes(2), b"\x01\x00\x02\x00")

    def test_request_uses_canonical_model_phrase_voice_and_response_format(self) -> None:
        job = self.jobs[0]
        captured: dict[str, object] = {}

        def opener(request: object, timeout: int) -> FakeResponse:
            captured["request"] = request
            captured["timeout"] = timeout
            return FakeResponse(b"\x00\x00", "audio/pcm", "generation-123")

        payload, generation_id = generator.request_audio(job, "test-secret", opener)
        request = captured["request"]
        body = json.loads(request.data.decode("utf-8"))
        self.assertEqual(body["model"], "google/gemini-3.8-flash-tts")
        self.assertEqual(body["input"], job["phrase"]["text"])
        self.assertEqual(body["voice"], "Puck")
        self.assertEqual(body["response_format"], "pcm")
        self.assertEqual(request.get_header("Authorization"), "Bearer test-secret")
        self.assertEqual(captured["timeout"], 120)
        self.assertEqual(generation_id, "generation-123")
        self.assertTrue(payload.startswith(b"RIFF"))

    def test_request_rejects_unexpected_content_type(self) -> None:
        job = self.jobs[0]

        def opener(_request: object, timeout: int) -> FakeResponse:
            return FakeResponse(b"not audio", "application/json")

        with self.assertRaisesRegex(RuntimeError, "unexpected audio content type"):
            generator.request_audio(job, "test-secret", opener)

    def test_request_rejects_malformed_mp3_with_expected_content_type(self) -> None:
        job = next(item for item in self.jobs if item["model"]["responseFormat"] == "mp3")

        def opener(_request: object, timeout: int) -> FakeResponse:
            return FakeResponse(b"not an MP3 stream", "audio/mpeg")

        with self.assertRaisesRegex(ValueError, "malformed MP3"):
            generator.request_audio(job, "test-secret", opener)

    def test_request_accepts_complete_mp3_frames(self) -> None:
        job = next(item for item in self.jobs if item["model"]["responseFormat"] == "mp3")

        def opener(_request: object, timeout: int) -> FakeResponse:
            return FakeResponse(valid_mp3_frames(), "audio/mpeg")

        payload, _generation_id = generator.request_audio(job, "test-secret", opener)
        self.assertEqual(payload, valid_mp3_frames())

    def test_generation_requires_key_before_network_or_file_changes(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            catalog_path = root / "src/lib/fixtures/voice-comparison.json"
            catalog_path.parent.mkdir(parents=True)
            catalog_path.write_text(json.dumps(self.catalog), encoding="utf-8")
            with patch.object(generator.urllib.request, "urlopen", side_effect=AssertionError("network")):
                with self.assertRaisesRegex(ValueError, "private OpenRouter API key"):
                    generator.generate_batch(catalog_path, root, "")

    def test_batch_writes_atomically_and_records_generation_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            catalog_path = root / "src/lib/fixtures/voice-comparison.json"
            catalog_path.parent.mkdir(parents=True)
            catalog_path.write_text(json.dumps(self.catalog), encoding="utf-8")
            jobs = generator.validate_catalog(self.catalog)
            for job in jobs[1:]:
                path = generator.resolve_asset_path(root, job["variant"])
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(b"existing sample")

            requests: list[dict[str, object]] = []

            def opener(request: object, timeout: int) -> FakeResponse:
                requests.append(json.loads(request.data.decode("utf-8")))
                return FakeResponse(b"\x00\x00", "audio/pcm", "generation-456")

            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                generated, skipped = generator.generate_batch(
                    catalog_path, root, "test-secret", opener=opener
                )
            self.assertEqual((generated, skipped), (1, 9))
            self.assertEqual(len(requests), 1)
            self.assertEqual(requests[0]["model"], "google/gemini-3.8-flash-tts")

            updated = json.loads(catalog_path.read_text(encoding="utf-8"))
            variant = updated["phrases"][0]["audioVariants"][0]
            asset = generator.resolve_asset_path(root, variant)
            self.assertTrue(asset.is_file())
            with wave.open(str(asset), "rb") as audio:
                self.assertEqual(audio.getframerate(), 24_000)
            self.assertEqual(variant["provenance"]["kind"], "openrouter-api")
            self.assertEqual(variant["provenance"]["generationId"], "generation-456")
            self.assertTrue(variant["provenance"]["generatedAt"].endswith("Z"))
            self.assertEqual(variant["sha256"], hashlib.sha256(asset.read_bytes()).hexdigest())
            self.assertNotIn("test-secret", output.getvalue())

    def test_batch_recovers_catalog_metadata_after_interrupted_commit(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            catalog_path = root / "src/lib/fixtures/voice-comparison.json"
            catalog_path.parent.mkdir(parents=True)
            catalog_path.write_text(json.dumps(self.catalog), encoding="utf-8")
            jobs = generator.validate_catalog(self.catalog)
            for job in jobs[1:]:
                path = generator.resolve_asset_path(root, job["variant"])
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(b"existing sample")

            def opener(_request: object, timeout: int) -> FakeResponse:
                return FakeResponse(b"\x00\x00", "audio/pcm", "generation-recovered")

            with patch.object(generator, "atomic_write_catalog", side_effect=OSError("interrupted")):
                with self.assertRaisesRegex(OSError, "interrupted"):
                    generator.generate_batch(catalog_path, root, "test-secret", opener=opener)

            pending_path = generator.pending_generation_path(catalog_path)
            self.assertTrue(pending_path.is_file())
            generated_asset = generator.resolve_asset_path(root, jobs[0]["variant"])
            self.assertTrue(generated_asset.is_file())

            output = io.StringIO()
            with (
                contextlib.redirect_stdout(output),
                patch.object(generator.urllib.request, "urlopen", side_effect=AssertionError("network")),
            ):
                generated, skipped = generator.generate_batch(catalog_path, root, "test-secret")
            self.assertIn("Recovered metadata", output.getvalue())

            self.assertEqual((generated, skipped), (0, len(jobs)))
            self.assertFalse(pending_path.exists())
            updated = json.loads(catalog_path.read_text(encoding="utf-8"))
            variant = updated["phrases"][0]["audioVariants"][0]
            self.assertEqual(variant["provenance"]["generationId"], "generation-recovered")
            self.assertEqual(
                variant["sha256"], hashlib.sha256(generated_asset.read_bytes()).hexdigest()
            )

    def test_existing_audio_is_protected_without_force(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "sample.mp3"
            path.write_bytes(b"original")

            self.assertFalse(generator.atomic_write(path, b"replacement", force=False))
            self.assertEqual(path.read_bytes(), b"original")

            self.assertTrue(generator.atomic_write(path, b"replacement", force=True))
            self.assertEqual(path.read_bytes(), b"replacement")


if __name__ == "__main__":
    unittest.main()

