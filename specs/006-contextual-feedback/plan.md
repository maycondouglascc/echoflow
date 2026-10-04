# Implementation Plan: Contextual feedback

Date: 2026-10-04. Branch: codex/contextual-feedback. Spec: spec.md.

## Summary
Add a floating Feedback entry point in the authenticated layout. A native accessible dialog sends a suggestion with optional redacted viewport screenshot and bounded recent routes/actions. Persist through a Next.js authenticated POST and private Supabase table/bucket using the caller's RLS client.

## Technical context
TypeScript/React 19/Next 16; existing Supabase SSR cookies/Postgres/Storage; native Node unit tests, Playwright and pgTAP. Add pinned html-to-image only for user-triggered screenshot rendering (dynamic import). No provider calls, continuous replay, admin panel or privileged client keys.

## Constitution check
PASS: scoped slice, deterministic regression tests, distinct-account ownership checks, existing stack, versioned non-destructive migration. One writer in existing checkout. Auth, RLS and new dependency receive focused checks; no CI changes.

## Design and phases
1. Contracts and fixtures: strict shared metadata/PNG limits, allowlisted paths and actions, 20 events/5 minutes, 2 MiB PNG/1920×1440, viewport bounds.
2. Storage: app_feedback immutable owned records; private feedback-screenshots bucket; own-folder read/insert/delete, no update. screenshot_path binds owner and feedback ID. Store SHA-256 request digest for idempotency; existing identical request returns success, differing payload returns conflict. Authenticated POST rejects foreign Origin, reads bounded multipart body, validates before upload, cleans uploaded object if insertion fails.
3. UI: FeedbackWidget mounted with account key in authenticated layout. History stays in refs, never persistent storage. Explicit data-feedback-action controls only. Opening freezes page/context then dynamically captures sanitized viewport; previews/removal, retry and success states; preserve failed drafts. Native dialog focus/Escape, responsive existing styling.
4. Evidence: pure limits/history/PNG tests, pgTAP anon/A/B, local browser flows and API failure/idempotency/ownership tests. Run lint/typecheck/build/unit and feature tests. Apply only new migration to authorized Supabase project after local checks; verify existing live authenticated UI without test submissions to remote.

## Files
src/lib/feedback.ts (contract/history), feedback-capture.ts (capture), feedback-store.ts (persistence); src/app/api/feedback/route.ts; src/components/FeedbackWidget.tsx and styles/feedback.css; authenticated layout, ModalDialog focus selectors, practice action attributes, privacy page; database types; supabase/migrations/202610040001_contextual_feedback.sql; tests/feedback.test.mjs, tests/e2e/feedback.spec.ts, supabase/tests/feedback.sql; docs architecture/product.

## Operational limits
Screenshot is best-effort DOM rendering, not OS/browser chrome. Preview permits removal; failures allow text-only submission. Existing Supabase admin tools are the team inbox. No automated retention or new public launch is implied. Screenshot/context local until explicit send; route/action buffer discarded on logout/account change/unmount.
