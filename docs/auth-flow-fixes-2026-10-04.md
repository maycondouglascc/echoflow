# Authentication diagnosis and scoped fixes — 2026-10-04

Intent: restore account access and fix regressions in the existing feature 005 authentication flows.
This is a scoped bug fix against its accepted auth/access specification.

The reported account exists, is confirmed, and is neither banned nor soft-deleted. Public Vercel
configuration matches local configuration. Password attempts fail in both environments; no password
was requested or changed administratively. A recovery email arrived but its callback failed.
A local regression reproduces the same callback error when the email opens in a different browser:
the previous PKCE link depended on a verifier cookie belonging to the initiating browser.

## Final implementation

- Signup/recovery requests use a server-only, non-persisting Supabase client with implicit email flow.
  Supabase verifies its default one-time email link. Its returned fragment reaches `/auth/complete`,
  where the client immediately removes it from the visible URL and submits the transient session
  credentials to a same-origin server action. The SSR SDK verifies them against Supabase before
  persisting session cookies; only confirmed accounts continue. No provider/service-role key.
- Recovery continues to `/login?mode=reset`; the user chooses their password. Signup honors only
  allowlisted internal destinations. OAuth and previously sent links retain the PKCE callback.
  `/auth/callback` also accepts strictly validated signup/recovery token hashes for custom templates.
- The verification response and auth routes are private/no-store and no-referrer. Tokens are not
  reflected in error messages, persisted in local storage or passed to final destinations. Invalid,
  expired/reused links and forged session credentials fail with a new-email instruction.
- Invalid credentials, unconfirmed email, throttling, unavailable service and delivery failures have
  distinct safe messages. Duplicate signup/recovery replies stay neutral. Unknown action modes fail.
- Login/recovery and Google/email attempts clear obsolete outcomes. Confirmation copy no longer asks
  the user to keep the initiating browser.
- Local/preview callback allowlist additions retain existing entries and target only the new
  `/auth/complete` route on the already used localhost/127.0.0.1 ports 3000 and 4177.

The hosted free project rejected custom email-template changes with its default mail provider.
No template change was applied. The final implementation therefore supports the provider's existing
emails without a plan upgrade, new credential or schema change. Local tests use those same defaults.
Google remains disabled until OAuth credentials are configured; default hosted SMTP is restricted,
so unrestricted public signup/recovery delivery still needs custom SMTP.

## Verification

- Before fix, local Chromium reproduced `/login?error=callback` for recovery in another browser and
  a stale login error after switching to recovery. Both are covered by regression tests.
- `npm run lint`, `npm run typecheck`, `npm run test:unit`: passed (eight test files, including actual
  action/callback calls with deterministic provider responses).
- Isolated `.next-remote` production build passed with `npm run build -- --webpack`; the host denied
  Turbopack's internal compilation socket. Vercel's earlier build ran Turbopack successfully. No gate weakened.
- Browser evidence against the final default-email implementation and production rollout follows below.
- Focused auth review: SDK verifies credentials before cookie persistence, confirmed-user check,
  strict email flow/token inputs, safeNext restrictions, secret-free errors, no-referrer/no-store,
  account isolation/session verification retained, and no administrative account/password changes.

Final default-email tests: 24/24 Chromium auth/modal tests passed on the isolated production server.
Additional real-route check passed for forged email-link credentials, fragment removal and auth-route
no-store/no-referrer headers. Production build, lint/typecheck and eight unit test files passed.
