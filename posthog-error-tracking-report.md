# PostHog error tracking

> ⚠️ **Needs your attention**
> - In the Vercel project `echoflow`, add `POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`, and `NEXT_PUBLIC_POSTHOG_HOST` for the Production environment; also add the runtime values `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` so the deployed browser bundle initializes.
> - Ensure Vercel System Environment Variables are available to the build, then trigger a fresh production deployment through the connected Git deployment path so release metadata is available to the uploader.
> - After deployment, verify a new symbol set and a captured exception in PostHog Error Tracking.

## What you still need to do

1. In Vercel project `echoflow`, add the existing personal API key as the `POSTHOG_API_KEY` secret for Production (and Preview if preview builds should upload). The local project already has the credential; do not commit it.
2. In Vercel Project Settings → Environment Variables, add `POSTHOG_PROJECT_ID` with value `672616` and `NEXT_PUBLIC_POSTHOG_HOST` with the configured PostHog host for the same environments. Add `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` with the configured public project token for the deployed browser runtime. Keep System Environment Variables enabled for the build.
3. Deploy production from the connected Git/Vercel path and trigger a fresh deployment. The repository has no deploy workflow to edit; if deployment remains manual, ensure the Vercel build receives Git metadata or configure reliable release name and version values before relying on symbol matching.
4. Run the production build as `npm run build`. With the three uploader values present where the build runs—`POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`, and `NEXT_PUBLIC_POSTHOG_HOST`—the build succeeds and uploads its source maps. Start production with `npm run start`.
5. Trigger any error and inspect [PostHog Error Tracking](https://us.posthog.com/project/672616/error_tracking). Check uploaded symbol sets at [Error Tracking configuration](https://us.posthog.com/project/672616/error_tracking/configuration).

## What is active now

- Uncaught browser errors and unhandled promise rejections are captured by `posthog-js` through `capture_exceptions: true` in `instrumentation-client.ts`. The same initializer retains the normal PostHog analytics, autocapture, page-view, session-recording, and delivery behavior.
- The application now has PostHog initialized: `instrumentation-client.ts` reads `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST`, while Next.js loads the local environment configuration.
- Source-map upload is wired through `next.config.ts` using `@posthog/nextjs-config`. The wiring also updated `package.json` and `package-lock.json`. Every production `npm run build` uploads matching source maps and removes them after upload once the required build-time values are present.
- No release-linking step was wired. Local runs, tests, and pull-request builds remain unchanged and do not receive a release ID.

## Verification

After the next production deployment, trigger an error and look at [Error Tracking](https://us.posthog.com/project/672616/error_tracking). Uploaded symbol sets appear at [Error Tracking configuration](https://us.posthog.com/project/672616/error_tracking/configuration). The source-map build wiring is in `next.config.ts`; the package dependency is recorded in `package.json` and `package-lock.json`.
