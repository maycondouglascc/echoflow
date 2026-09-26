#!/usr/bin/env python3
"""Preview or generate the curated EchoFlow OpenRouter TTS batch."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import tempfile
import urllib.error
import urllib.request
import wave
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = REPO_ROOT / "src/lib/fixtures/voice-comparison.json"
TTS_URL = "https://openrouter.ai/api/v1/audio/speech"
ACTIVE_EXPECTED = 10
MPEG1_LAYER3_BITRATES = (
    0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0
)
MPEG2_LAYER3_BITRATES = (0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0)
SAMPLE_RATES = (44_100, 48_000, 32_000)


def load_catalog(path: Path = CATALOG_PATH) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_catalog(catalog: dict[str, Any]) -> list[dict[str, Any]]:
    models = {model["id"]: model for model in catalog["audioModels"]}
    active_models = [model for model in catalog["audioModels"] if model["selectable"]]
    if len(active_models) != 2:
        raise ValueError("The comparison catalog must have exactly two selectable models.")

    jobs: list[dict[str, Any]] = []
    for phrase in catalog["phrases"]:
        seen: set[str] = set()
        for variant in phrase["audioVariants"]:
            model = models.get(variant["modelId"])
            if model is None:
                raise ValueError("An audio variant refers to an unknown model.")
            if not model["selectable"]:
                continue
            if variant["voiceId"] != model["voiceId"]:
                raise ValueError("An active audio variant has a mismatched voice ID.")
            if model["id"] in seen:
                raise ValueError("A phrase has duplicate variants for one model.")
            if variant["format"] != model["outputFormat"]:
                raise ValueError("An audio variant format does not match its model.")
            seen.add(model["id"])
            jobs.append({"phrase": phrase, "model": model, "variant": variant})
        if seen != {model["id"] for model in active_models}:
            raise ValueError("Every phrase must have one variant for each selectable model.")

    if len(jobs) != ACTIVE_EXPECTED:
        raise ValueError(f"The batch must contain exactly {ACTIVE_EXPECTED} active variants.")
    return jobs


def resolve_asset_path(repo_root: Path, variant: dict[str, Any]) -> Path:
    source = variant["src"]
    prefix = "/fixtures/audio/"
    if not source.startswith(prefix):
        raise ValueError("Audio output paths must stay under /fixtures/audio.")
    asset_root = (repo_root / "public/fixtures/audio").resolve()
    output = (asset_root / source[len(prefix) :]).resolve()
    if asset_root not in output.parents:
        raise ValueError("Audio output path escapes the fixture directory.")
    return output


def preview(catalog: dict[str, Any], repo_root: Path = REPO_ROOT) -> list[dict[str, Any]]:
    jobs = validate_catalog(catalog)
    print("Preview only: no API key is read and no network request is made.")
    for job in jobs:
        phrase = job["phrase"]
        model = job["model"]
        variant = job["variant"]
        path = resolve_asset_path(repo_root, variant)
        state = "exists; protected" if path.exists() else "will be created"
        print(
            f"{phrase['id']} | {model['id']} | {model['voiceId']} | "
            f"{model['responseFormat']} -> {model['outputFormat']} | {state} | {path}"
        )
    print(f"{len(jobs)} phrase/model/voice tasks.")
    return jobs


def pcm_to_wav(payload: bytes, model: dict[str, Any]) -> bytes:
    if model["sampleFormat"] != "s16le":
        raise ValueError("PCM conversion requires signed 16-bit little-endian samples.")
    channels = int(model["channels"])
    sample_width = 2
    if not payload or len(payload) % (channels * sample_width) != 0:
        raise ValueError("OpenRouter returned empty or incomplete PCM audio.")
    output = BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setnchannels(channels)
        wav.setsampwidth(sample_width)
        wav.setframerate(int(model["sampleRateHz"]))
        wav.writeframes(payload)
    return output.getvalue()


def validate_mp3(payload: bytes) -> None:
    """Reject empty, truncated, or non-MPEG Layer III response bodies."""
    offset = 0
    if payload.startswith(b"ID3"):
        if len(payload) < 10:
            raise ValueError("OpenRouter returned a truncated MP3 metadata header.")
        size_bytes = payload[6:10]
        if any(byte & 0x80 for byte in size_bytes):
            raise ValueError("OpenRouter returned an invalid MP3 metadata header.")
        tag_size = sum(byte << shift for byte, shift in zip(size_bytes, (21, 14, 7, 0)))
        offset = 10 + tag_size
        if offset > len(payload):
            raise ValueError("OpenRouter returned truncated MP3 metadata.")

    frames = 0

    while offset < len(payload):
        if payload[offset : offset + 3] == b"TAG" and len(payload) - offset == 128:
            offset = len(payload)
            break
        if len(payload) - offset < 4:
            raise ValueError("OpenRouter returned a truncated MP3 frame header.")

        header = int.from_bytes(payload[offset : offset + 4], "big")
        version = (header >> 19) & 0b11
        layer = (header >> 17) & 0b11
        bitrate_index = (header >> 12) & 0b1111
        sample_rate_index = (header >> 10) & 0b11
        padding = (header >> 9) & 1
        if (
            ((header >> 21) & 0x7FF) != 0x7FF
            or version == 0b01
            or layer != 0b01
            or bitrate_index in (0, 0b1111)
            or sample_rate_index == 0b11
        ):
            raise ValueError("OpenRouter returned malformed MP3 audio.")

        bitrates = MPEG1_LAYER3_BITRATES if version == 0b11 else MPEG2_LAYER3_BITRATES
        sample_rate = SAMPLE_RATES[sample_rate_index]
        if version == 0b10:
            sample_rate //= 2
        elif version == 0b00:
            sample_rate //= 4
        coefficient = 144 if version == 0b11 else 72
        frame_size = coefficient * bitrates[bitrate_index] * 1000 // sample_rate + padding
        if frame_size < 4 or offset + frame_size > len(payload):
            raise ValueError("OpenRouter returned a truncated MP3 frame.")
        offset += frame_size
        frames += 1

    if frames == 0 or offset != len(payload):
        raise ValueError("OpenRouter returned malformed MP3 audio.")


def request_audio(
    job: dict[str, Any],
    api_key: str,
    opener: Any = None,
) -> tuple[bytes, str | None]:
    model = job["model"]
    body = json.dumps(
        {
            "model": model["id"],
            "input": job["phrase"]["text"],
            "voice": model["voiceId"],
            "response_format": model["responseFormat"],
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        TTS_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://echoflow.local",
            "X-Title": "EchoFlow audio catalog",
        },
        method="POST",
    )
    open_request = opener or urllib.request.urlopen
    try:
        with open_request(request, timeout=120) as response:
            status = getattr(response, "status", 200)
            if status < 200 or status >= 300:
                raise RuntimeError(f"OpenRouter returned HTTP {status}.")
            content_type = response.headers.get_content_type().lower()
            if content_type != model["responseMimeType"]:
                raise RuntimeError("OpenRouter returned an unexpected audio content type.")
            payload = response.read()
            generation_id = response.headers.get("X-Generation-Id")
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"OpenRouter returned HTTP {error.code}.") from None
    except urllib.error.URLError:
        raise RuntimeError("OpenRouter request failed because of a network error.") from None

    if not payload:
        raise RuntimeError("OpenRouter returned an empty audio response.")
    if model["responseFormat"] == "pcm":
        payload = pcm_to_wav(payload, model)
    elif model["responseFormat"] == "mp3":
        validate_mp3(payload)
    else:
        raise ValueError("The audio catalog contains an unsupported response format.")
    if not payload:
        raise RuntimeError("Audio conversion produced an empty file.")
    return payload, generation_id


def atomic_write(path: Path, payload: bytes, force: bool) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as temporary:
            temporary.write(payload)
            temporary.flush()
            os.fsync(temporary.fileno())
        os.chmod(temporary_path, 0o644)
        if force:
            os.replace(temporary_path, path)
            return True
        try:
            os.link(temporary_path, path)
        except FileExistsError:
            return False
        return True
    finally:
        temporary_path.unlink(missing_ok=True)


def atomic_write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as temporary:
            json.dump(value, temporary, indent=2, ensure_ascii=False)
            temporary.write("\n")
            temporary.flush()
            os.fsync(temporary.fileno())
        os.replace(temporary_path, path)
    finally:
        temporary_path.unlink(missing_ok=True)


def atomic_write_catalog(path: Path, catalog: dict[str, Any]) -> None:
    atomic_write_json(path, catalog)


def pending_generation_path(catalog_path: Path) -> Path:
    return catalog_path.with_name(f".{catalog_path.stem}.pending.json")


def recover_pending_generation(catalog_path: Path, repo_root: Path) -> bool:
    pending_path = pending_generation_path(catalog_path)
    if not pending_path.exists():
        return False

    pending = json.loads(pending_path.read_text(encoding="utf-8"))
    variant_id = pending["variantId"]
    catalog = load_catalog(catalog_path)
    variant = next(
        (
            candidate
            for phrase in catalog["phrases"]
            for candidate in phrase["audioVariants"]
            if candidate["id"] == variant_id
        ),
        None,
    )
    if variant is None:
        raise ValueError("Pending audio metadata refers to an unknown catalog variant.")

    asset_path = resolve_asset_path(repo_root, variant)
    if (
        not asset_path.is_file()
        or hashlib.sha256(asset_path.read_bytes()).hexdigest() != pending["sha256"]
    ):
        pending_path.unlink(missing_ok=True)
        return False

    variant["sha256"] = pending["sha256"]
    variant["sizeBytes"] = pending["sizeBytes"]
    variant.pop("durationMs", None)
    variant["provenance"] = pending["provenance"]
    atomic_write_catalog(catalog_path, catalog)
    pending_path.unlink(missing_ok=True)
    return True


def generate_batch(
    catalog_path: Path,
    repo_root: Path,
    api_key: str,
    force: bool = False,
    opener: Any = None,
) -> tuple[int, int]:
    if not api_key:
        raise ValueError("Set the private OpenRouter API key before using --execute.")
    if recover_pending_generation(catalog_path, repo_root):
        print("Recovered metadata for an interrupted audio write.")
    catalog = load_catalog(catalog_path)
    jobs = validate_catalog(catalog)
    generated = 0
    skipped = 0

    for job in jobs:
        path = resolve_asset_path(repo_root, job["variant"])
        if path.exists() and not force:
            skipped += 1
            print(f"Skipped existing asset: {path}")
            continue

        payload, generation_id = request_audio(job, api_key, opener)
        checksum = hashlib.sha256(payload).hexdigest()
        now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        provenance = {
            "kind": "openrouter-api",
            "sourceFilename": None,
            "generationId": generation_id,
            "generatedAt": now,
        }
        pending_path = pending_generation_path(catalog_path)
        atomic_write_json(
            pending_path,
            {
                "variantId": job["variant"]["id"],
                "sha256": checksum,
                "sizeBytes": len(payload),
                "provenance": provenance,
            },
        )
        if not atomic_write(path, payload, force=force):
            pending_path.unlink(missing_ok=True)
            skipped += 1
            print(f"Skipped asset created by another process: {path}")
            continue

        variant = job["variant"]
        variant["sha256"] = checksum
        variant["sizeBytes"] = len(payload)
        variant.pop("durationMs", None)
        variant["provenance"] = provenance
        atomic_write_catalog(catalog_path, catalog)
        pending_path.unlink(missing_ok=True)
        generated += 1
        print(f"Generated {path} ({checksum})")

    return generated, skipped


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Send TTS requests. Without this flag the script only previews the batch.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing files; only valid together with --execute.",
    )
    args = parser.parse_args(argv)
    if args.force and not args.execute:
        parser.error("--force requires --execute.")

    try:
        catalog = load_catalog()
        if not args.execute:
            preview(catalog)
            return 0

        api_key = os.environ.get("OPENROUTER_API_KEY", "")
        generated, skipped = generate_batch(
            CATALOG_PATH, REPO_ROOT, api_key, force=args.force
        )
        print(f"Batch complete: {generated} generated, {skipped} skipped.")
        return 0
    except (OSError, ValueError, RuntimeError, KeyError, json.JSONDecodeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

