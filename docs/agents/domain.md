# Domain Docs

## Before exploring

- Read root `CONTEXT.md`, or `CONTEXT-MAP.md` if present.
- Read relevant decisions under `docs/adr/`; in a multi-context repo, also check `src/<context>/docs/adr/`.
- If these files do not exist, proceed silently. Create them lazily when a term or decision is resolved.

## Layout

This repo uses a single root context: `CONTEXT.md` and `docs/adr/`.

## Vocabulary

Use terms as defined in `CONTEXT.md`. When a needed concept is missing, note it for domain modeling. Surface conflicts with relevant ADRs rather than overriding them silently.
