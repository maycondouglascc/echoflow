# Behavior-preserving quality optimizations

Base: PR #9, d8caf860. User authorized implementation and a new PR on 2026-10-02.

Acceptance: preserve reference/replay timing, capture cancellation and cleanup, local-only
recordings, per-user completion, auth/RLS enforcement, and all visible layouts. Reject malformed
catalog metadata at the server catalog seam rather than asserting that JSON is typed.

Plan/tasks:
- [X] Delete unused adapters, forwarding helpers and unused recording/replay fields.
- [X] Give capture resources one lifecycle owner; centralize practice state/ref transitions.
- [X] Require word replay bounds in the phase model; resolve reference bytes explicitly.
- [X] Decode JSON catalog metadata once and use each phrase's nested variants directly.
- [X] Separate feature styles with responsive rules, preserving selectors and cascade order.
- [X] Add focused capture/catalog regressions and run existing browser/ownership gates.
- [X] Run lint, typecheck, build, tooling and deterministic tests; review diff.

No provider requests, deployment, remote database mutation or schema changes are included.

Validation environment: separate managed worktree, production frontend 4191, task-local
Supabase `echoflow-quality-20261002` on API 57321/DB 57322/inbox 57324. Configuration
and generated local credentials are ignored/outside Git; no shared or remote stack is used.
CI adds only `npm run test:unit`; all existing gates remain unchanged. Test helpers accept
explicit local port selection while rejecting remote hosts and mismatched API ports.

Final verification: lint PASS, typecheck PASS, standard Turbopack `npm run build` PASS,
17 Node tests PASS (capture lifecycle, malformed/valid catalog metadata, existing speech and
preview checks), 12 Python tests PASS, 34 pgTAP RLS/Storage checks PASS. All 75 browser tests PASS against the production build (3.6 minutes), including real local
audio clocks/replay, permission/capture failures, navigation, completion ownership and layout.
Desktop landing and mobile practice screenshots were inspected. No real-device or remote-provider claim is made.

The practice hook shrinks from 979 to 810 lines; capture ownership is 106 lines. Global CSS
shrinks from 1168 to 178 lines; the largest feature sheet is 417 lines. No dependency lock,
migration, RLS policy, production setting or existing test assertion changed.

PR target: `codex/public-platform-plan` (PR #9), so review contains only these optimizations.
Commands: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:unit`,
`npm run test:audio-generator`, `supabase test db --workdir /tmp/echoflow-quality-stack`,
`PLAYWRIGHT_BASE_URL=http://127.0.0.1:4191 npm run test:e2e`, `git diff --check`.
