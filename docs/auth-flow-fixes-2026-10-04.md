# Authentication diagnosis and scoped fixes — 2026-10-04

Intent: restore account access and fix regressions in the existing feature 005 authentication flows.
This is a scoped bug fix against its accepted auth/access specification, not a new authentication product.

Observed: the provided account exists in the remote project, is confirmed, and is neither banned nor
soft-deleted. Both local and published password attempts fail. Public Vercel configuration matches
local configuration. Recovery email arrives, but its callback fails. The existing PKCE email link
requires a verifier cookie in the browser that requested the email; a different browser cannot exchange it.
The initial password failure itself cannot be attributed to a password mismatch without its provider
response; no password was requested or changed administratively.

Acceptance and plan:

- Use server-side Supabase verifyOtp with a one-time token hash for signup/recovery emails, independent
  of initiating-browser cookies. Keep PKCE code exchange for OAuth and previously sent links.
- Strictly restrict token types and internal destinations; remove token-bearing URL after verification,
  reject invalid/reused links, and mark every callback response no-store/no-referrer. No service key.
- Preserve confirmation, caller sessions, protected routes and RLS. No arbitrary account confirmation,
  password replacement, data deletion, provider enabling or security weakening.
- Distinguish invalid credentials, unconfirmed email, throttling, unavailable service and delivery failure.
  Keep duplicate signup/recovery replies neutral; reject unsupported action modes.
- Clear obsolete form outcomes when switching between login, recovery and Google/email attempts.
- Regression checks: real action calls with deterministic provider responses; local email inbox tests
  for confirmation, recovery in another browser, new password login, token reuse/invalid types,
  direct destinations, logout, tampered/revoked sessions and form outcomes. No production test accounts.
- Deploy callback support before updating the two remote email templates. Send a fresh recovery email
  to the user afterward; user chooses/submits their own new password.

External limits: Google OAuth is disabled until credentials are configured. Default hosted SMTP is
restricted; general public delivery needs custom SMTP. Local browser tests cannot prove delivery
for arbitrary production addresses or physical-device behavior.

Evidence and final rollout results will be appended after verification.

## Verification

- Reproduced in local Chromium: recovery requested in one browser and opened in another redirected to
  `/login?error=callback`; switching to recovery retained the previous login error. Both regression
  tests passed after the callback/template and form fixes.
- `npm run lint`, `npm run typecheck`, `npm run test:unit`: passed (eight test files, including real
  action/callback seams with deterministic provider fixtures).
- Production build passed using `npm run build -- --webpack` in isolated `.next-remote`; Turbopack's
  internal compilation socket was denied by the host environment. No build/typecheck gate removed.
- Local production server 4185 and isolated Supabase 56321–56324: 24/24 Chromium tests passed,
  including signup/recovery in separate browsers, token reuse, password change and login, session
  refresh, logout, tampered/revoked sessions, internal redirects and desktop/mobile auth modals.
- Focused auth review: only signup/recovery OTP types accepted, server verifies tokens using the public
  caller client, ambiguous inputs fail, tokens do not reach redirect destinations, no-referrer/no-store
  on every callback, current session verified before password update. Confirmation/RLS remain required.
- Remote Google is disabled and default SMTP remains restricted; no credentials or auth protections changed.
