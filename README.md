# EchoFlow

Practice English speaking through listening and repetition. The initial product plan uses short audio phrases, shadowing practice, optional recording, and progress tracking.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 3
- shadcn/ui for components when product features need them
- Biome for formatting and linting, with Next.js and React rules
- Supabase for authentication, Postgres, and Storage when those features are implemented
- ElevenLabs for curated speech audio; OpenAI transcription is a later phase
- Vercel hosts the production frontend

Dependency versions are recorded in package.json and package-lock.json. The Node.js version is pinned in .nvmrc.

## Local setup

1. Install Node.js 24.19.0 and npm 11.
2. Install the locked dependencies with npm ci.
3. Run `cp .env.example .env.local` and fill only the values required by the feature you are working on.
4. Start the development server with npm run dev.

Useful checks:

- npm run lint
- npm run typecheck
- npm run test:unit
- npm run build

Automated behavior tests are added with the first feature that introduces behavior and become required CI checks.

## Supabase remote preview (authorized project only)

The CLI-linked project is `echoflow` (`hllsxshahgvdqhzxdmef`). See
[feature quickstart](specs/005-public-platform-redesign/quickstart.md) for provisioning evidence.
With the CLI authenticated, run `node scripts/configure-remote-preview.mjs --confirm-project=hllsxshahgvdqhzxdmef`,
then `node scripts/preview-remote.mjs --build` and `node scripts/preview-remote.mjs`.
Open `http://127.0.0.1:4177`. This uses a production bundle in `.next-remote`, separate
from `.next` and local tests; rebuild this profile after source changes.
Only the public anon key is written to ignored `.env.remote.local` (mode 600).
The local `.env.local`, Supabase stack and browser tests on port 4175 remain separate.
Do not run ordinary tests or the local audio importer against the remote project.
Register with an organization team-member email and confirm the emailed link;
public email delivery needs custom SMTP and Google login needs its OAuth credentials.
This is a local frontend with remote Supabase, not a published deployment.

## Production deployment

Production: [EchoFlow](https://echoflow-delta.vercel.app), deployed on 2026-10-04.
The Vercel project is `echoflow` and uses Node 24.x with the authorized remote Supabase project.
Production environment variables are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
and `NEXT_PUBLIC_SITE_URL=https://echoflow-delta.vercel.app`. Supabase Auth uses the same site URL
and allows the exact `https://echoflow-delta.vercel.app/auth/callback` redirect.

The release includes the five workplace playlists with Puck/Harper and contextual Feedback.
Migration `202610040001` enables the private feedback table and screenshot bucket.
`.vercelignore` excludes local environment files, worktrees, generated output and source audio.
Provider/service-role secrets are not part of the frontend deployment.

The initial release was deployed from `codex/contextual-feedback` at application commit
`a98a4fa`. The 2026-10-04 Notion disclosure update is deployed as
`dpl_47tQQp7pLVu9LXZVynDhCy5RE8eu` from the tested local working tree.
The new playlist/feedback and Notion changes still need integration into remote `master`;
the connected Git repository can replace this manual deployment on future production-branch pushes.
Preview environment variables are not configured. Public email delivery still needs custom SMTP,
and Google login needs its OAuth configuration; existing confirmed email/password accounts can log in.
Deployment and remote migration evidence: [Feedback quickstart](specs/006-contextual-feedback/quickstart.md).

Authentication fixes were deployed from `codex/auth-flow-fixes` at `41f9c3d`. Signup and recovery
use default one-time Supabase emails and a verified session handoff at `/auth/complete`, including
links opened in another browser. The new route is also allowed on development port 3000 and remote
preview port 4177. [Diagnosis and validation](docs/auth-flow-fixes-2026-10-04.md).

## PostHog analytics and error tracking

Configure `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` in the local
environment and each deployed runtime. Optional source-map upload at build time requires
`POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`, and `NEXT_PUBLIC_POSTHOG_HOST`. Keep the API key
server-side and out of source control. Event scope, privacy controls, and the tracked events
are documented in [docs/posthog.md](docs/posthog.md).

## AI development workflow

Project-wide agent instructions are in AGENTS.md. Feature specifications live under specs/ and are created with the installed GitHub Spec Kit skills. Use a short codex/ branch for each change; use a separate Git worktree when multiple agents need to write in parallel.

Codex uses the installed skills as $speckit-specify, $speckit-clarify, $speckit-plan, $speckit-tasks, $speckit-analyze, $speckit-implement, and $speckit-converge. Claude Code has the corresponding /speckit-* skills. Spec Kit CLI version 0.16.5 initialized the project. To install that CLI locally, use uv tool install specify-cli==0.16.5.

## Documentation

Feedback export to Notion is **active in production** as of 2026-10-04.
The [feedback inbox](https://app.notion.com/p/e953e342cbd54be3a253d8f7289258ee) includes
Hermes triage fields, screenshots and views. Eight existing feedbacks were exported and verified.
A Supabase Edge Function handles new-feedback dispatch; pg_cron checks pending work every minute.
The durable queue and retry schedule recover failures without requiring a running desktop.
Server secrets are held in Edge secrets and Vault, never in the frontend environment.
Run `bash scripts/setup-notion-feedback.sh` to configure credentials silently, then
`node --env-file=.env.notion-worker.local scripts/activate-notion-feedback.mjs --confirm-project hllsxshahgvdqhzxdmef`
only with authorization for the target project. Never share tokens in chat.
The [activation/validation guide](specs/007-notion-feedback/quickstart.md) records evidence
and the outstanding independent Hermes access check. Unknown create results require
reconciliation before creating another record.

- Product: docs/EchoFlow.md
- Implementation plan: docs/IMPLEMENTATION_PLAN.md
- Architecture: docs/system_architecture.md
- Development workflow: docs/DEVELOPMENT_WORKFLOW.md
# Public platform — isolated development

The public landing requires no session. Playlists, phrases and reference audio require a confirmed
Supabase user. Personal recordings remain in browser memory; no audio is uploaded.

Use Node/npm pinned in `package.json` and Docker. Run `npm ci`, then `npx supabase start` in this
checkout. Project `public-platform-005` uses API **56321**, database **56322**, Studio **56323** and
local email inbox **56324**; do not reuse another project's stack or `--linked`.

Run `node scripts/setup-local-test.mjs` to create an ignored, local-only `.env.local`, then
`npm run audio:import`. The script refuses nonlocal destinations, verifies all 13 original
checksums and never overwrites a mismatched object. `--dry-run` verifies files without requests.
`npm run catalog:seed` regenerates seed SQL from the existing fixtures without calling providers.

Verification: `npm run test:db`, `npm run test:audio-generator`, `npm run lint`,
`npm run typecheck`, `npm run build`, `npm run test:e2e`. Browser tests use port **4175**.
The local setup helper uses that origin for callbacks; for normal development set
`NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000`. Supabase URL and anon key are public identifiers
subject to RLS. Service role is maintenance-only and is never read by application code.

Email confirmation is enabled locally; inspect the test inbox to open confirmation/recovery links
through the server-verified one-time email links. OAuth uses PKCE. Google is deliberately disabled until a test
OAuth client is provided. Configure its secret server-side, enable the provider, and allow only
the exact `/auth/callback` origins in both Google and Supabase. Production SMTP, redirect origins,
legal content, spend/abuse limits, device checks and deployment need separate approval.

For concurrent local test work, use a separate Supabase project and port set. Set
`ECHOFLOW_TEST_API_PORT` and `ECHOFLOW_TEST_INBOX_PORT` in the ignored local environment,
then run browser tests with `PLAYWRIGHT_BASE_URL` pointing at that checkout's frontend.
The test helper still requires `127.0.0.1` and the exact selected API port; defaults remain
56321/56324. Do not point these checks at remote Supabase or another writer's stack.

## Agent memory

Local ai-memory setup, capture scope, verification and restart instructions:
[docs/agents/ai-memory.md](docs/agents/ai-memory.md).

## Practice feedback (008) development

Implementation and independent checks are recorded in
[feature quickstart](specs/008-practice-feedback/quickstart.md). Solo replay, optional
speak-along/paired comparison, focus mode, account listening history and optional
cues are scoped by that feature. Apply the additive history migration only to the
selected local test stack; production migration/publishing require separate instruction.
Recordings stay local; live transcription defaults unavailable pending verified
on-device support. Word replay uses reviewed units or labelled whole-phrase context.

Worktrees under `/tmp/echoflow-008` use dedicated ports; their Supabase config must
not replace the source checkout's config. Dependency symlinks are unsupported by
Turbopack's worktree filesystem boundary; `npm run build -- --webpack` validates the
same application without changing dependencies or quality gates. Normal source
checkout verification retains `npm run build`. Physical device/listener checks remain
explicit release gates; deterministic mocks do not certify audio quality or locality.
