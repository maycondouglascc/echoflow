# Implementation Plan: Notion feedback
**Branch**: codex/notion-feedback | **Date**: 2026-10-04 | **Spec**: spec.md

## Summary
Isolated Node 24 worker drains a Supabase outbox into Notion. App feedback writes remain unchanged; additive trigger creates jobs transactionally, migration backfills existing feedback. No service-role in Next routes. Hermes triage is set only at page creation.

## Technical Context
TypeScript, existing Supabase client, native fetch/FormData, no dependency changes. Existing Next frontend and authenticated RLS unchanged. Notion API pinned 2026-03-11. Worker polls every 60 seconds, one job at a time, 10-second request timeouts, 400ms request spacing. Production execution uses a bounded Supabase Edge Function invoked by pg_net on outbox insertion, plus pg_cron every minute only when jobs are due. Never ordinary CI or desktop automation. Node CLI remains for bounded maintenance, with optional systemd alternative.

## Constitution Check
Small scoped feature; automated deterministic contracts and real local SQL access tests; secrets isolated in worker-only environment. No provider calls during tests. Remote migration/worker installation and Hermes access remain explicit gates.

## Architecture decisions
- SQL outbox + trigger/backfill; service-role-only claim/start/finish RPCs with 10-minute lease and fencing token. RLS denies all ordinary users.
- Claim returns immutable feedback. Retry grows to one hour; error code only. Completed jobs retained for observation.
- Query remote Feedback ID before creation. Duplicate matches stop. Persist creation_started before POST. Unknown create outcome permits query-only recovery; never automatically create again. Confirmed HTTP 400/401/403/404/409/413/422/429 rejects reset marker. Other write errors remain uncertain. Operator checks archived pages and modified IDs before manual reset.
- Upload private PNG directly; require uploaded state; do not use signed/public source URLs. Orphan unattached uploads expire. Page properties contain full text/context split into safe <=2000 UTF-16-unit chunks. No updates to already-existing pages.
- Database created in connected workspace; existing IDs recorded in contracts. Token and approved server required for activation. External setup via interactive bash wizard; use systemd service example with Restart=on-failure.

## Project Structure
src/lib/notion-feedback.ts, src/lib/notion-feedback-queue.ts; scripts/notion-feedback-worker.ts and setup-notion-feedback.sh; ops/notion-feedback.service; supabase/migrations/202610040002_notion_feedback.sql; tests/notion-feedback.test.mjs; supabase/tests/notion_feedback.sql.

## Phases
Contracts/test fixtures, additive queue/access tests, export/worker, Notion views/guide, user privacy explanation/setup, mandatory checks/convergence. No new public endpoint.

## Activation adaptation — 2026-10-04
User authorized migration, export and continuous processing. Use existing EchoFlow Supabase hosting; no external server was identified or needed. Portable shared core with server-only Next/Node wrappers avoids duplicating payload/recovery logic. Edge invocation authenticated by random worker-only bearer secret stored in Vault/Edge secrets; anon/user JWT never invokes export. Requests cannot choose destination or records. Process at most 3 records per invocation and stop starting work after 40s, within documented free-runtime wall limit. pg_net failures never reject feedback; cron recovers due/expired jobs. Empty queues make no network invocation. Cron remains independently enabled after desktop closes.
Sources: https://supabase.com/docs/guides/functions/schedule-functions ; https://supabase.com/docs/guides/functions/limits . Credentials are uploaded only to authorized project; no paid provider requests.
