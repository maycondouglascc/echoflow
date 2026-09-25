#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"

python3 "${SCRIPT_DIR}/generate-reference-audio.py" \
  --output-dir "${REPO_ROOT}/public/fixtures/audio"
