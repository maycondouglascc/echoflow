# EchoFlow Constitution

## Core principles

### I. Build in small, reviewable slices
Every feature starts from a clear user outcome and observable acceptance criteria. Prefer one independently verifiable user journey at a time. Use Spec Kit in proportion to the change; do not generate specifications for the entire product in advance.

### II. Prove behavior with independent evidence
Specs describe intent. Code review, automated checks, and appropriate manual checks provide evidence. Add regression checks with behavior changes. Do not treat agreement between agents or a completed Spec Kit checklist as proof that a feature works.

### III. Protect user data and credentials
Enforce authentication and ownership in server code and Supabase policies. Keep provider and service-role credentials server-side. Verify access boundaries with distinct users and realistic database/storage paths before shipping data features.

### IV. Preserve reviewability and traceability
Keep each change scoped to an accepted spec or a concise maintenance goal. Use short-lived branches, isolated worktrees for concurrent writers, and coherent commits. Link acceptance criteria, checks, commits, pull requests, and released code where practical.

### V. Keep the system simple and reproducible
Use the pinned stack and lockfile. Introduce dependencies, abstractions, and external services only when a concrete feature needs them. Keep development and CI deterministic with synthetic data and bounded provider usage.

## Development constraints

- Project-wide instructions live in AGENTS.md. Product intent and accepted architecture live in docs/. Feature intent lives in specs/.
- Required CI checks must run against pull requests and the current base branch. A change to CI or another guardrail must preserve or improve its ability to reject invalid changes.
- Test the failure and recovery paths when a change can expose data, lose work, alter persistent data, or incur provider costs.
- Real device checks remain necessary for browser audio, microphone permissions, and interruptions.
- Database changes must be versioned and safely applicable. Destructive production changes require explicit authorization and a recovery plan.

## Governance

This constitution guides agent work and review. The project owner controls product intent and may amend these principles. Record material amendments in a reviewed pull request and update affected agent instructions, specs, tests, and workflow gates.

**Version**: 1.0.0 | **Ratified**: 2026-09-24 | **Last Amended**: 2026-09-24
