# EchoFlow agent instructions

Read this file first, then read the relevant product specification, feature specification, and architecture notes before changing behavior. README.md is the setup guide. The active product and architecture documents are under docs/.

## Spec Kit workflow

Use Spec Kit for behavior changes and features. Codex invokes its installed skills as $speckit-specify, $speckit-clarify, $speckit-plan, $speckit-checklist, $speckit-tasks, $speckit-analyze, $speckit-implement, and $speckit-converge. Claude Code has the same skills and invokes them as /speckit-specify, /speckit-clarify, /speckit-plan, /speckit-checklist, /speckit-tasks, /speckit-analyze, /speckit-implement, and /speckit-converge.

For a feature, specify the user outcome and measurable acceptance criteria, resolve material ambiguity, plan the technical work, generate tasks, analyze the artifacts, implement in small slices, and converge against the accepted specification. Use the full workflow proportionally: documentation-only changes and narrowly scoped fixes do not need a full feature spec. Do not retroactively specify the entire product.

Treat specs as intent and history, not proof that the code works. For each behavior change, add an automated check that would detect its important regressions. Keep external-service and device-only checks explicit. Never weaken or remove a quality gate merely to make a change pass.

## Project constraints

- Preserve the product and technical decisions in the accepted specifications and docs. If authoritative documents conflict, identify the conflict and resolve it before implementing the affected behavior.
- Keep provider credentials server-side. Never put service-role, ElevenLabs, or OpenAI secrets in client code, NEXT_PUBLIC variables, commits, logs, or screenshots.
- Enforce user ownership on the server and with Supabase RLS. Test access as separate users; service-role-only checks do not prove user isolation.
- Prefer server components. Use client components only for browser APIs, state, or event handling that requires them.
- Keep changes small and avoid abstractions until repeated behavior justifies them.
- Do not connect ordinary CI or feature work to paid provider APIs. Use deterministic fixtures and explicit budgets for provider smoke checks.
- Ask before destructive production data changes, external publishing, deployment, or actions that incur material cost.

## Git and verification

- The shared remote currently uses master. Create short feature branches using the codex/ prefix. Keep each worktree to one writer; use a separate worktree for concurrent writing and isolate ports, database/schema, storage, and other mutable resources too.
- Spec directories use their own sequential feature IDs and do not have to match Git branch names.
- Make each commit one coherent, reviewable change. Include the test that proves the behavior with its implementation. Keep unrelated changes in separate commits. Do not push, merge, or deploy without explicit instruction.
- Before completing a code change, run the applicable commands and report their results:
  - npm run lint
  - npm run typecheck
  - npm run build
  - feature tests as they are introduced
- CI is the integration gate. Do not edit CI checks to hide a failure; changes to CI, permissions, dependency locks, migrations, auth, or RLS need focused review.

## Codex Cloud and parallel work

Use Codex Cloud for bounded work that benefits from a fresh, reproducible environment, background execution, or independent review. Keep its network allowlist limited to the package and services required by the task. Do not pass production credentials into an agent environment. Use local work on real devices for microphone permission, recording, playback, and browser interruption behavior.
