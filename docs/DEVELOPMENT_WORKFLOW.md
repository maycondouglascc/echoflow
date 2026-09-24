# AI-led development workflow

## Sources of truth

- AGENTS.md defines instructions shared across coding agents.
- docs/EchoFlow.md defines current product intent.
- docs/system_architecture.md records the planned architecture and integrations still pending; update it as decisions are accepted.
- A feature's specs/<id>-<name>/spec.md defines the accepted behavior for that change. Keep a spec as historical context after merge and update the current product/contract document when the lasting behavior changes.
- docs/adr/ records significant technical decisions and alternatives when the decision should outlive one feature.
- CI workflows and branch rules enforce machine-checkable requirements. Prompts and checklists guide agents, but do not replace those gates.

Resolve contradictions between normative documents before implementing the affected behavior. A completed Spec Kit checklist or convergence report is not a substitute for running checks against the implementation.

## Change sizes

- Small copy, visual, and maintenance changes use a concise goal and the checks relevant to their diff.
- A bug report includes a reproducible failure and a regression check.
- A user-facing feature uses Spec Kit: specify, clarify when needed, plan, tasks, analyze, implement in small slices, and converge.
- Authentication, authorization, user data, database migrations, paid provider calls, and production operations receive a failure-mode review and an independent review of the diff and evidence.

Write acceptance criteria so they can be checked from observable behavior. Include negative cases and recovery paths where failure could lose data, expose another user's data, or charge a provider. Use a small vertical slice before specifying follow-on features.

## Branches, worktrees, and commits

The configured remote's default branch is currently master. Keep changes on short-lived codex/<feature> branches and integrate through pull requests after required checks pass. A spec directory's sequential identifier and a Git branch name are independent.

Use the existing checkout when there is one writer. Give each concurrent writer a separate worktree and branch. A worktree separates files and Git index state; it does not isolate database rows, credentials, ports, queues, storage, or cloud resources. Give each environment separate mutable state and use synthetic data.

A commit represents one coherent, reviewable change. Keep implementation and its regression check together. Keep independent changes in separate commits. Preserve meaningful commits during integration; use squash only when a pull request is genuinely one logical unit. Never push, merge, or deploy without explicit instruction.

## Verification and integration

Every behavior change should carry automated checks appropriate to its risk. Start with unit or state-machine tests, then add integration tests for authentication, persistence, and ownership boundaries, and browser-level coverage for important user journeys. Test real microphone and audio behavior on supported devices because mocks cannot establish that browser media APIs work on hardware.

The required CI currently runs lint, TypeScript, and a production build. Add the test command to CI with the first automated test suite. A passing build does not prove behavior or data isolation. Run the checks on the combined change against the latest base branch before merge.

Do not weaken or skip a failing check to make a pull request green. Changes to a gate, permissions, or the dependency lockfile need review focused on the integrity of that control.

## GitHub repository settings

After the first CI run publishes its status, protect master with a required pull request, require the quality check, require the branch to be current with master, and block force pushes and deletion. Limit bypass permissions to maintainers. Enable a merge queue only if parallel pull requests cause integration conflicts and the repository plan supports it.

These settings are applied in GitHub repository administration; a workflow file alone cannot enforce branch protection. Until those repository settings are enabled, the CI workflow is a check but not a server-enforced merge gate.

## Codex Cloud

Use cloud tasks for bounded work that needs background execution, a clean checkout, independent verification, or parallel attempts. Reuse a pinned environment setup and the package lockfile. Keep internet access to required package sources and services. Do not expose production secrets; use synthetic fixtures for ordinary builds and tests. Validate microphone, playback, and interruption behavior on real devices locally.
