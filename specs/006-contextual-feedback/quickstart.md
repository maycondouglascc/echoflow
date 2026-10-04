# Validation

Use existing local Supabase stack on 56321–56324; user-facing app retains authorized remote .env.local. Test server uses separate port 4185 and process-only local environment, no provider keys. Apply additive migration only (no reset). Synthetic A/B users test table and real private Storage. Fixture screenshots deterministic; real DOM capture checked in Chromium and live UI.

Commands: npm run lint; npm run typecheck; npm run build; npm run test:unit; local pgTAP feedback.sql; PLAYWRIGHT_BASE_URL=http://127.0.0.1:4185 npm run test:e2e -- tests/e2e/feedback.spec.ts.

Manual: /home and practice -> Feedback; screenshot preview excludes dialog/form inputs/media; history shows sanitized pages/actions; remove attachments, cancel sends nothing, failure retains draft, success/focus recovery; 375px keyboard. Team reads app_feedback and linked private bucket through Supabase administrative tools.

Evidence will be appended after implementation. Rollback: disable widget/API then remove unused new policies/table/bucket only with separate destructive-data authorization; this feature does not modify existing catalog/audio/completions.

## Evidence — 2026-10-04

- npm run lint: passed, no warnings; npm run typecheck: passed; npm run build: passed (isolated .next-remote output, local Supabase environment, no provider keys).
- npm run test:unit: all six test files passed, including validation and persistence/cleanup/checksum recovery. Audio generator: 16 passed.
- PostgreSQL pgTAP feedback.sql: 18/18 passed with anon and authenticated A/B, rollback fixtures. Screenshot private, ownership, impersonation, immutable rows, path binding, safe navigation and server timestamp checked. Real Storage A/B/anon/public endpoint checked in Chromium tests.
- Production local server 127.0.0.1:4185 against isolated local Supabase 56321–56324: 12/12 Playwright tests passed (six feedback, six existing privacy/microphone). Context resets on account exit. Snapshot capture pixel tests preserve fixed/nested scrolled geometry and exclude private/input/textarea/contenteditable/video regions. Cancellation sends nothing; failed submission retains draft; retry/removal/idempotency tested.
- Live authenticated localhost:3000/home: floating Feedback and actual local screenshot preview verified via user browser, without submitting a test suggestion to the remote project.
- Screenshot examples: /tmp/echoflow-feedback-desktop.png, /tmp/echoflow-feedback-mobile.png, /tmp/echoflow-feedback-capture-preview.png.
- Focused review: caller-authenticated route (no service role), trusted configured origin (no Host-derived origin), strict body/PNG/metadata, immutable owned table, private owner-folder bucket, linked-image deletion forbidden, lazy pinned dependency with no transitive packages. No CI/auth/completion/audio behavior weakened.
- Remote project hllsxshahgvdqhzxdmef still has migrations 202609290001–003 and no app_feedback table. Automatic approval review rejected applying the new persistent remote migration because the feature request did not explicitly authorize remote deployment/shared-environment mutation. No remote change was executed. The tested migration is ready; explicit user approval is required to enable submitted feedback in the current remote-backed app.
- Existing dependency audit advisories remain in the Tailwind/PostCSS dependency chain; no audit/CI gate was removed or changed. This feature does not claim CI success or deployment.
