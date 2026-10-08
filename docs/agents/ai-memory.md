# Local agent memory

EchoFlow uses [ai-memory](https://github.com/akitaonrails/ai-memory) v2.6.1.
This is developer tooling; it adds no application dependency or provider calls.

## Installed on this workstation

- Binary: `~/.local/bin/ai-memory`; official hook bundle: `~/.local/bin/hooks/`.
- Local service: `systemctl --user status ai-memory.service`.
- Endpoint: `http://127.0.0.1:49374/mcp`; only loopback is bound.
- Config, wiki, SQLite and hook spool: `~/.local/share/ai-memory/`.
- Codex MCP: project `.codex/config.toml`; lifecycle hooks: `~/.codex/hooks.json`.
- Project scope: `.ai-memory.toml`, workspace `default`, project `echoflow`.
- Managed skills: `.agents/skills/ai-memory-*` and `.claude/skills/ai-memory-*`.

LLM and embedding providers are disabled. Search uses the local full-text index.
No API credentials or prior session transcripts were imported. Memory starts empty
and captures future sessions. The service is enabled for subsequent user logins.

Restart Codex or reopen this project to load the new MCP server. The Codex CLI
will show **Hooks need review**; review and trust the ai-memory hooks to activate
automatic capture. Desktop hook support must be checked in a fresh session;
installation checks cannot prove that the desktop delivers every lifecycle event.
The existing chat cannot load new MCP tools midway through its session.

Codex uses user-level hook registration. Capture runs in allowlist mode: only
repositories with `.ai-memory.toml` opt in. The marker excludes environment files,
PEM files, generated directories, AWS credentials and repo-owned ADRs. These
controls use the native hook binary. They are not a guarantee that secrets quoted
inside prompts or indirect shell output cannot be captured; keep credentials out
of prompts and command output under the existing project rules.

For project memory tools, pass `workspace="default"` and `project="echoflow"`
together. Repository docs/specs remain authoritative; recalled memory is history.

## Verify and maintain

```bash
python3 scripts/check-ai-memory.py
ai-memory status
systemctl --user restart ai-memory.service
ai-memory install-instructions --target AGENTS.md --compact --skills-agent both
```

The verification script checks scope from the root and a subdirectory, capture
allowlisting, excluded file reads, ordinary source capture, and an MCP handshake.
It stores no observations and makes no provider calls.

Claude Code has the shared routing skills and project guidance available. To wire
its lifecycle capture and MCP in this checkout as well:

```bash
ai-memory install-mcp --client claude-code --apply
ai-memory install-hooks --agent claude-code --scope project --capture-mode allowlist --apply
```

## Recreate the native installation

Follow the upstream [native installation guide](https://github.com/akitaonrails/ai-memory/blob/v2.6.1/docs/install.md#running-ai-memory-without-docker).
Download the platform release archive and matching `.sha256`, verify the checksum,
and install the binary plus sibling `hooks/` under `~/.local/bin/`.
Run `ai-memory init`. In its generated config, set `embedding_provider = "none"`
and leave `llm_provider` unset. Keep the default loopback bind.

Create `~/.config/systemd/user/ai-memory.service`:

```ini
[Unit]
Description=ai-memory local MCP server
After=network.target

[Service]
Type=simple
ExecStart=%h/.local/bin/ai-memory --data-dir %h/.local/share/ai-memory serve --transport http
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
UMask=0077

[Install]
WantedBy=default.target
```

Then run:

```bash
systemctl --user daemon-reload
systemctl --user enable --now ai-memory.service
ai-memory install-mcp --client codex --config-file .codex/config.toml --apply
ai-memory install-hooks --agent codex --capture-mode allowlist --apply
python3 scripts/check-ai-memory.py
```

To stop collection, stop the service and uninstall wiring with
`ai-memory uninstall --apply` after reviewing its dry run. This preserves history;
review upstream purge/reset commands separately before deleting stored data.
