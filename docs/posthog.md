# PostHog analytics and error tracking

PostHog is initialized in `instrumentation-client.ts` when both public browser variables are
present:

- `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`
- `NEXT_PUBLIC_POSTHOG_HOST` (for example, `https://us.i.posthog.com`)

Manual product events cover playlist opens, phrase and voice selection, reference playback,
recording starts, comparison starts, and feedback submission. The feedback form sends its text
to PostHog only when the person selects the optional checkbox. Screenshots and recent navigation
are never attached to the PostHog feedback event. User identity uses the opaque account ID; email
addresses are not passed to PostHog.

Automatic click capture, page views, page leave events, and session replay are disabled. The SDK
captures uncaught browser errors, while the application error boundaries capture their errors
explicitly. PostHog events can still include standard browser metadata and the current page.

## Source maps

The Next.js PostHog plugin uploads source maps only when all build-time values are configured:

- `POSTHOG_API_KEY` — private PostHog personal API key; never expose it as a `NEXT_PUBLIC_` value
  or commit it.
- `POSTHOG_PROJECT_ID`
- `NEXT_PUBLIC_POSTHOG_HOST`

The upload removes source maps after upload. Without these values, the app builds without enabling
the uploader. Configure the private API key only in the local build environment or the hosting
provider's build environment. A new build and a captured exception are needed to verify symbolication.
