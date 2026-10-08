# Validation guide — practice feedback 008

Implementation was authorized and resumed on 2026-10-08. Ensure checkout dependencies/runtime match README/package.json. Use one dedicated worktree per writer and a local Supabase stack/schema per backend writer; no production credentials. This execution uses integration frontend4185/API58321/DB58322/inbox58324; the default e2e frontend4175 is for a separate single-checkout run. each concurrent worktree gets a distinct agreed port and test identity. Never run provider generation as CI/test setup.

## Automated gates

Run from the integrated checkout:

```sh
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:e2e
npm run test:db
npm run test:audio-generator
```

Python gate mandatory when generator/content importer changes; db gate mandatory for history and any learning-unit schema. Follow README/scripts/setup-local-test.mjs for local-only setup. Newly introduced tests live at exact paths in tasks.md. Fake audio/transcripts and SQL fixtures deterministic; no paid APIs or remote Supabase. Do not remove old gates: replace obsolete zero-solo-button assertion with meaningful new positive/negative assertions.

| Scenario | Expected evidence | Requirements |
| --- | --- | --- |
| Solo take / no take / denied replacement | Only take source, disabled without valid take, prior take unchanged | FR001/004/013 |
| Sequential and simultaneous compare; permission→speak-along; one-source failure | Timeline/source assertions, no leaked source, completed marker after both only, reference events dedup | FR002–004/007 |
| Word PCM marker boundaries + real listener review | Red fixture before causal fix; zero adjacent word per exposed isolated unit, context group intact, voice/checksum match | FR005/006 |
| History full-reference matrix, dup/retry/concurrency/logout/offline | RPC idempotency, counts survive visit, two tabs no lost updates, unsaved explicit, A late event denied B | FR007/013 |
| SQL userA/userB/anon/direct writes | Authenticated A owns onlyA, B onlyB; anon denied; definer auth/publication/expected ID enforced | FR007/013 |
| Desktop sizes/mobile/200% keyboard focus | panel geometry/scroll measurements, screenshot artifacts, restored focus, account/Privacy/Playlists accessible | FR008/009 |
| Sound opt-in/drop/dedup/blocked playback | No cue source during capture/media, visible equivalent/mute | FR010 |
| ASR local support/offline/errors | fixture interim/final scoped; zero mic/text network, screenshot exclusions; no transcript-only stop | FR011/012/013 |

## Device and perceptual release checks

Desktop Chrome/Safari and real iOS Safari/Android Chrome, each with headphones and speaker, plus Bluetooth on at least one device per mobile OS. Record version, hardware, permission state, language-model availability, and whether local recognition coexists safely with MediaRecorder. Include denied permission, revoked mic/device removed, initial silence, quiet/noisy environment, interruption/background/phone call, rapid switching/navigation/unmount, and short/long takes. Fake mic/Playwright do not replace these.

For simultaneous comparison, play synthetic reference/take with onset markers and use a physical/loopback capture that records output; compare observed onset offset minus expected recorded offset with synthetic impulse markers (natural leading speech silence is not scheduler error) over10 starts. Store per-device offset-error distribution and worst observed error; release requires≤50ms worst measured offset error or documenting that tested profile unsupported with sequential fallback; runtime fallback relies on observable errors, not inferred hardware capability from user-agent. Include leading recording silence/reference offset, unequal durations, independent volume/clipping. `audio.play()` timestamp is not audible onset proof. For speak-along headphones verify no digital reference in microphone fixture; speakers may acoustically bleed, explain rather than promise perfect isolation.

For word content, use stratified diagnosis samples from all playlists/voices and every exposed isolated unit: two independent listeners identify full word and absence of adjacent lexical speech, review disagreement→withhold until resolved. Timing-only passing tests do not certify phonetic boundaries. Contextual group annotations reviewed for contiguous natural linking; no purported generated isolated linking.

Local recognition must fail closed when capability/locality not demonstrated. Test offline with installed English model where supported and observe browser/system network, not only app requests: supported local flag+installed model+offline successful recognition are minimum locality evidence; page.route is app-upload regression only, not proof of built-in browser service locality. Model install uses its explicit allowed asset-download path with no audio. If unsupported, unavailable UI plus plain recording is accepted. Transcript provisional/final inaccuracies recorded; do not issue pronunciation-score or future stop claims.

## Rollout and recovery gates

Local migration review includes rollback/reconciliation count query, grant/RLS matrices and deletion behavior. Apply to production only on explicit authorization, additive objects, backup/recovery checks and monitoring; this plan does not authorize application publishing/migration. On history outage, show unsaved and retry; practice works. Disable optional synchronized/ASR/cue controls if device requirements fail while retaining sequential/manual paths. Generated word pilot and private import require approved finite unit×2-voice budget, destinations, no retries and atomic metadata; no blanket regeneration.

## Implementation evidence — 2026-10-08

Source baseline `8a283c3` was isolated from the preserved dirty checkout. Root integrated media, history, reviewed-unit metadata, layout and optional feedback. Workers froze before final integration. Maestri Planejador/QA model and quota failures were replaced with root assessment and independent local reviews; no quality gate was removed.

- Lint/typecheck and production Webpack build passed in the symlinked integration worktree. Plain Turbopack cannot resolve its external node_modules symlink; source checkout uses its real dependency directory and must also run the normal build.
- Unit suite: 92 passed, one opt-in real-database concurrency test skipped in the ordinary command. Explicit execution against `supabase_db_echoflow-008-history`: one passed using separate simultaneous transactions.
- Local SQL: six files, 121 assertions passed, including A/B/anon ownership, write revocations, duplicates, rate/overflow rollback, reconciliation and deletion. Cascade assertions target their synthetic phrase and do not assume globally empty tables.
- Audio-generator Python regression suite: 16 passed; no paid provider calls.
- Generated isolated-database history table/RPC types match the merged type blocks; unrelated existing Notion types were preserved.
- First integrated 113-case browser round: 104 passed, nine failed. It exposed mobile drawer focus timing and stale assumptions in fixtures (loading boundary, persistent counts, history POST consuming completion interception, mobile hidden sidebar title). Root fixed the behavior and narrowed fixtures without removing source/privacy assertions; final frozen rerun is recorded below when complete.

`tests/e2e/practice-focus-integration.spec.ts` exercises actual authenticated React screens, replacing a copied-HTML layout fixture. Desktop1024×768/1440×900 measurements cover controls before and after a take; mobile390×844/844×390 and CSS512×384 (200% layout equivalent) cover drawer Escape and keyboard Stop. Screenshots are emitted to Playwright test-results. This is Chromium/CSS-viewport evidence, not a real Safari/mobile device or optical-zoom claim. Expanded optional explanations and errors permit panel scrolling; narrow/short layouts use natural scrolling rather than clipping Stop.

UI review used the [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md): labels, focus, semantic buttons, overflow, private text and touch reachability. Motion review removed repeated phrase/collapse scaling; remaining new interactions use immediate state changes and a short background transition. Existing word highlight respects MotionConfig reduced-motion, covered by regression checks. Independent review identified and closed stale replay ownership, cue overlap, invisible cue status, drawer inert-focus timing and completion-status precedence.

## Outstanding release evidence

- T011: real Chrome/Safari/iOS/Android devices, headphones/speakers/Bluetooth, ten measured scheduled output runs/profile, <=50ms relative-offset requirement and interruptions. No synchronized-mode device release approval is claimed.
- T012/T016: independent listening diagnosis and two-listener review of each proposed unit. Empty approvals mean no isolated production word or linking annotation has been published. Labelled whole-phrase fallback is the delivered safe behavior. T017/T018 paid pilot/private asset schema remain conditional and unstarted.
- T033/T036/T037: real locality/offline/model/recorder evidence. No approved recognizer exists; default unavailable UI plus ordinary recording is delivered. No model download, cloud recognition or transcript-assisted stop is enabled. A future verified provider must connect attempt-scoped start/cleanup before activation.
- Source-local migration is a separate setup step: `npx --no-install supabase migration up --local` after checking the selected local project. This execution applied the migration only to the isolated integration database. No remote migration, push, merge or deployment occurred.
