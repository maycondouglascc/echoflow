# EchoFlow

Project-wide coding instructions are in AGENTS.md. Read that file at the start of every session, then consult the relevant documents in docs/ and the active feature specification under specs/.

This repository uses GitHub Spec Kit. Claude Code has the Spec Kit skills installed under .claude/skills. Invoke them as /speckit-specify, /speckit-clarify, /speckit-plan, /speckit-tasks, /speckit-analyze, /speckit-implement, and /speckit-converge. Use the full cycle in proportion to the risk and size of the change.

Product summary: EchoFlow is a web application for English speaking practice through listening and repetition. The current implementation status and accepted product decisions are documented in docs/EchoFlow.md, docs/IMPLEMENTATION_PLAN.md, and docs/system_architecture.md.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues; use the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default labels `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: read root `CONTEXT.md` and relevant ADRs under `docs/adr/`. See `docs/agents/domain.md`.
