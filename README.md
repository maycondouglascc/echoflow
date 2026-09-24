# EchoFlow

Practice English speaking through listening and repetition. The initial product plan uses short audio phrases, shadowing practice, optional recording, and progress tracking.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 3
- shadcn/ui for components when product features need them
- Biome for formatting and linting, with Next.js and React rules
- Supabase for authentication, Postgres, and Storage when those features are implemented
- ElevenLabs for curated speech audio; OpenAI transcription is a later phase
- Vercel is the planned hosting provider

Dependency versions are recorded in package.json and package-lock.json. The Node.js version is pinned in .nvmrc.

## Local setup

1. Install Node.js 24.19.0 and npm 11.
2. Install the locked dependencies with npm ci.
3. Run `cp .env.example .env.local` and fill only the values required by the feature you are working on.
4. Start the development server with npm run dev.

Useful checks:

- npm run lint
- npm run typecheck
- npm run build

Automated behavior tests are added with the first feature that introduces behavior and become required CI checks.

## AI development workflow

Project-wide agent instructions are in AGENTS.md. Feature specifications live under specs/ and are created with the installed GitHub Spec Kit skills. Use a short codex/ branch for each change; use a separate Git worktree when multiple agents need to write in parallel.

Codex uses the installed skills as $speckit-specify, $speckit-clarify, $speckit-plan, $speckit-tasks, $speckit-analyze, $speckit-implement, and $speckit-converge. Claude Code has the corresponding /speckit-* skills. Spec Kit CLI version 0.16.5 initialized the project. To install that CLI locally, use uv tool install specify-cli==0.16.5.

## Documentation

- Product: docs/EchoFlow.md
- Implementation plan: docs/IMPLEMENTATION_PLAN.md
- Architecture: docs/system_architecture.md
- Development workflow: docs/DEVELOPMENT_WORKFLOW.md
