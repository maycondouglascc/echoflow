#!/usr/bin/env python3
"""Verify local ai-memory routing/privacy without storing events or calling providers."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import tomllib
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BINARY = shutil.which("ai-memory") or str(Path.home() / ".local/bin/ai-memory")


def check(payload):
    result = subprocess.run(
        [BINARY, "hook", "--event", "pre-tool-use", "--agent", "codex",
         "--server-url", "http://127.0.0.1:49374", "--check-capture"],
        input=json.dumps(payload), text=True, capture_output=True, check=True,
    )
    return json.loads(result.stdout)


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


marker = tomllib.loads((ROOT / ".ai-memory.toml").read_text())
config = tomllib.loads((ROOT / ".codex/config.toml").read_text())
require(config["mcp_servers"]["ai-memory"]["url"] == "http://127.0.0.1:49374/mcp",
        "MCP must point to the local service")
for directory in [ROOT, ROOT / "src/lib"]:
    report = check({"cwd": str(directory)})
    require(report["admits_capture"], "EchoFlow capture must be enabled")
    require(report["scope"]["workspace"] == marker["workspace"] and
            report["scope"]["project"] == marker["project"], "Scope drift")
with tempfile.TemporaryDirectory() as directory:
    require(not check({"cwd": directory})["admits_capture"],
            "Unmarked directories must not capture events")
for path in [".env.local", "src/.env.test", "key.pem", "docs/adr/example.md"]:
    report = check({"cwd": str(ROOT), "tool_name": "Read",
                    "tool_input": {"file_path": path}})
    require(report["disposition"] == "drop", f"Capture must exclude {path}")
report = check({"cwd": str(ROOT), "tool_name": "Read",
                "tool_input": {"file_path": "src/app/page.tsx"}})
require(report["disposition"] == "keep", "Ordinary source reads must remain enabled")
request = urllib.request.Request(
    config["mcp_servers"]["ai-memory"]["url"],
    data=json.dumps({"jsonrpc": "2.0", "id": 1, "method": "initialize",
                     "params": {"protocolVersion": "2025-03-26", "capabilities": {},
                                "clientInfo": {"name": "echoflow-setup-check", "version": "1"}}}).encode(),
    headers={"Content-Type": "application/json", "Accept": "application/json, text/event-stream"},
)
with urllib.request.urlopen(request, timeout=10) as response:
    initialized = json.load(response)
require("result" in initialized and "serverInfo" in initialized["result"],
        "MCP initialize failed")
print("PASS: stable scope, capture allowlist, exclusions, source capture, MCP initialize")
