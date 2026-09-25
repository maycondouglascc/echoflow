#!/usr/bin/env python3
"""Generate the local EchoFlow reference WAV fixtures through eSpeak NG's C API."""

from __future__ import annotations

import argparse
import ctypes
import ctypes.util
import json
import sys
import wave
from pathlib import Path
from typing import Any

RATE_WPM = 150
VOICE = b"en-us"
SEED_BASE = 20260925


def require_success(operation: str, result: int) -> None:
    if result != 0:
        raise RuntimeError(f"eSpeak NG {operation} failed with status {result}")


def generate(output_dir: Path) -> None:
    library_name = ctypes.util.find_library("espeak-ng")
    if not library_name:
        raise RuntimeError("libespeak-ng is required to regenerate reference fixtures")

    library = ctypes.CDLL(library_name)
    samples: list[bytes] = []
    callback_type = ctypes.CFUNCTYPE(
        ctypes.c_int,
        ctypes.POINTER(ctypes.c_short),
        ctypes.c_int,
        ctypes.c_void_p,
    )

    def receive_audio(buffer: Any, sample_count: int, _events: Any) -> int:
        if buffer and sample_count:
            samples.append(ctypes.string_at(buffer, sample_count * ctypes.sizeof(ctypes.c_short)))
        return 0

    callback = callback_type(receive_audio)
    library.espeak_Initialize.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_char_p, ctypes.c_int]
    library.espeak_Initialize.restype = ctypes.c_int
    library.espeak_SetSynthCallback.argtypes = [callback_type]
    library.espeak_SetSynthCallback.restype = None
    library.espeak_SetVoiceByName.argtypes = [ctypes.c_char_p]
    library.espeak_SetVoiceByName.restype = ctypes.c_int
    library.espeak_SetParameter.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_int]
    library.espeak_SetParameter.restype = ctypes.c_int
    library.espeak_Synth.argtypes = [
        ctypes.c_void_p,
        ctypes.c_size_t,
        ctypes.c_uint,
        ctypes.c_int,
        ctypes.c_uint,
        ctypes.c_uint,
        ctypes.POINTER(ctypes.c_uint),
        ctypes.c_void_p,
    ]
    library.espeak_Synth.restype = ctypes.c_int
    library.espeak_Synchronize.argtypes = []
    library.espeak_Synchronize.restype = ctypes.c_int
    library.espeak_Terminate.argtypes = []
    library.espeak_Terminate.restype = ctypes.c_int
    library.espeak_Info.argtypes = [ctypes.POINTER(ctypes.c_char_p)]
    library.espeak_Info.restype = ctypes.c_char_p
    library.espeak_ng_SetRandSeed.argtypes = [ctypes.c_long]
    library.espeak_ng_SetRandSeed.restype = ctypes.c_int

    data_path = ctypes.c_char_p()
    version_bytes = library.espeak_Info(ctypes.byref(data_path))
    version = version_bytes.decode("ascii") if version_bytes else "unknown"
    sample_rate = library.espeak_Initialize(1, 60, None, 0)  # AUDIO_OUTPUT_RETRIEVAL
    if sample_rate <= 0:
        raise RuntimeError("eSpeak NG failed to initialize its local voice data")

    library.espeak_SetSynthCallback(callback)
    try:
        require_success("voice selection", library.espeak_SetVoiceByName(VOICE))
        require_success("speech rate", library.espeak_SetParameter(1, RATE_WPM, 0))
        data_file = Path(__file__).resolve().parents[1] / "src/lib/fixtures/introducing-yourself.json"
        fixture = json.loads(data_file.read_text(encoding="utf-8"))
        output_dir.mkdir(parents=True, exist_ok=True)

        for phrase in fixture["phrases"]:
            samples.clear()
            require_success("random seed", library.espeak_ng_SetRandSeed(SEED_BASE + phrase["order"]))
            text_bytes = phrase["text"].encode("utf-8")
            text_buffer = ctypes.create_string_buffer(text_bytes)
            require_success(
                "synthesis",
                library.espeak_Synth(
                    ctypes.cast(text_buffer, ctypes.c_void_p),
                    len(text_bytes) + 1,
                    0,
                    1,  # POS_CHARACTER
                    0,
                    1,  # espeakCHARS_UTF8
                    None,
                    None,
                ),
            )
            require_success("synchronization", library.espeak_Synchronize())
            if not samples:
                raise RuntimeError(f"eSpeak NG produced no samples for {phrase['id']}")

            audio_path = output_dir / Path(phrase["referenceAudio"]).name
            pcm = b"".join(samples)
            if sys.byteorder != "little":
                pcm = b"".join(pcm[index : index + 2][::-1] for index in range(0, len(pcm), 2))
            with wave.open(str(audio_path), "wb") as output:
                output.setnchannels(1)
                output.setsampwidth(2)
                output.setframerate(sample_rate)
                output.writeframes(pcm)
            duration = len(pcm) / (sample_rate * 2)
            print(f"Generated {audio_path} ({duration:.2f}s; eSpeak NG {version}; {VOICE.decode()}; {RATE_WPM} wpm)")
    finally:
        require_success("shutdown", library.espeak_Terminate())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    default_output = Path(__file__).resolve().parents[1] / "public/fixtures/audio"
    parser.add_argument("--output-dir", type=Path, default=default_output)
    args = parser.parse_args()
    generate(args.output_dir)


if __name__ == "__main__":
    main()
