# PM review — 008 practice feedback

**Status**: Ready for a separate authorized implementation session; requirements-quality review complete. Application implementation not executed. Owner requested analysis/plans, not code changes. Optional paid word pilot and real-device feasibility gates remain future execution constraints.

## Decisions

| ID | Decision / actor | Source and reason | Rejected alternative / impact |
| --- | --- | --- | --- |
| D01 | Persist listening history per account — USER | Explicit answer 2026-10-08 to coordinator optional question | Session-only rejected; add tables/RPC/RLS A/B/anon/idempotency; no persisted take/text |
| D02 | Exclusively local transcription, fallback without text — USER | Explicit answer 2026-10-08 | Cloud branch excluded; supported local processing proved before invoking, no pronunciation claim |
| D03 | Full finished reference counts across voices — PM | Existing media completion semantics; Heard separate Completed | Click/preload/word/partial/take counts rejected; deliberate event semantics and retries |
| D04 | Solo first reuses existing action — PM | hook719–727/801, UI lacks control | New recorder/player rejected; old zero-button test replaced by actual positive/negative regression |
| D05 | Overlap optional, sequential default — USER request + PM default | FeedbackF04 explicitly asks capture/reference and simultaneous rhythm; docs earlier excluded overlap | Explicit scoped supersession proposed; mic only capture, measured timing and no digital reference mix into take |
| D06 | Scheduled offset replay preserves leading mic silence — PM | Rhythm objective + capture starts before reference; real startup precision unproven | Blind two play promises/absolute50ms despite offset rejected; error measured relative expected offset |
| D07 | Diagnose clip cause before words generation — PM | Current alignment+seek/end clock checks do not prove phonetics | Global padding/all-word paid regeneration rejected; reviewed contextual fallback and individual unit gates |
| D08 | Available viewport rather than literal clipping — PM | Current48px shell margin/mobile stacked620px; reachability required | Two stacked100vh/global overflowhidden rejected; mobile drawer and shortheight/zoom fallback |
| D09 | Opt-in cues, drop busy, visible+assistive — PM | Preserve mic/media quality and user control | Startup/queued sounds rejected; three short cues only and no take contamination |
| D10 | Minimal append events+aggregate transaction — PM | Account history user choice; retries/concurrent tabs | Count from client/overwrite increment rejected; atomic duplicate insert, fixed-scope RPC/review, maxsafe serialization |

## Spec Kit execution record

Loaded actual pm-speckit and installed Specify/Clarify/Plan/Checklist/Tasks SKILL.md, templates, constitution/docs/current code. No `.specify/extensions.yml`: no hooks to execute. Specify resolved spec template through common.sh, created only008 and feature.json metadata. Clarify executed check-prerequisites --json --paths-only; owner questions handled by root, all genuine answers incorporated, no invented interview. Coverage taxonomy clear except technical feasibility intentionally covered research tasks.

Plan executed inspected setup-plan.sh --json, filled template and generated research/data/contracts/quickstart. Checklist executed check-prerequisites --json --template checklist-template; custom20 reviewer-owned items initially blank, builtin Specify/Clarify16 self-reviewed. Tasks executed inspected setup-tasks.sh --json, generated40 unique unchecked tasks,8[P] within declared disjoint waves; labels/paths checked. Analyze delegated read-only coordinator using actual installed skill, final report pending below. No implement/converge invoked in this session. Grill-me forwarding read and real grilling review performed by independent UI/product agent under PM autonomy (frontier challenges answered with evidence; zero fictitious user responses).

Branch created `codex/practice-feedback-plan` from dirty `codex/ai-memory`, no stash/reset/commit; prior owner modifications preserved. Only new008 docs and local feature resolution metadata written. No paid API, production migration, app source edits, push or deployment.

## Reviews and evidence

- Product/grilling reviewer `ui_research`: original spec acfb05d6… challenged compare completion, universal unit approval vs benchmark, local/remote promise, audible timing and focused navigation. All corrected. Second spec70e1cbbcb377f28d5cf2da6b3292f78802ef56813ac42593a9e947f6b6416a37 and classification22e0d82e90e27feed0c9a4997d7ba1e882fe8c98f69e21b5addf93a55e039ee7 approved without high findings; editorial persistence/cloud remnants fixed first.
- Custom checklist: reviewer explicitly approved CHK001–013/015–018 on above spec and initial plan914713cc… /dataa94270f6… /contractfd74cb6b… /quickstart95d3039d…. CHK014 found sr-only status insufficient for visible cues: corrected contract+T032, re-review pending. CHK019/020 await tasks/execution final.
- Technical reviewer `audio_research`: no critical/high in first artifacts; M1 JSON-bigint safe cap/rollback, M2 estimated recording offset/start latency, M3 browser/system offline ASR locality proof corrected; final re-review pending. Coordinator requested confirmed count separate from Unsaved badge, corrected contract/T026/028.
- Analyze final snapshot/report will be recorded below; PM fixes happen outside read-only analyze and new hashes invalidate earlier changed-input approval.

## Pending / hypotheses

Execution gates, not missing intent: word symptom cause/listener quality, local recognizer support/model/recorder coexistence, actual device sync/bleed/interruption, future schema/RLS and code checks. Owners B/D/A/H respectively, resolved by task probes+quickstart evidence before corresponding release. Paid isolated assets optional only after causal need/budget approval; cloud ASR excluded. User history is self-reported practice metadata, not server listening attestation. Unconfirmed history queue volatile; unsaved-loss-on-exit disclosed. No app validation executed because this is documentation planning; checklist/review does not prove functionality.

## Final Analyze coverage (coordinator read-only)

| Requirement | Tasks | Planned evidence |
| --- | --- | --- |
| FR001 | T005/006 | solo/no-take/no-reference/no-highlight e2e |
| FR002 | T007/009/010/011 | transport offset/gains/both-ended/cancel + device output |
| FR003 | T008/009/010 | mic-only, permission/error and prior take |
| FR004 | T008/009/036/039 | cleanup/manual30s/plainVAD/late callbacks |
| FR005 | T012/013/015/016 | causal failing lexical fixtures and individual listeners/fallback |
| FR006 | T013–016 (+017/018 conditional) | natural contiguous chunks, voice/checksum/private assets |
| FR007 | T023–029 | durable event matrix/idempotency/conflict/concurrency/unsaved/A/B |
| FR008 | T019/021/022 | viewport/list scroll/mobile/short/zoom |
| FR009 | T020/021/022/029 | focus/restore/state/account/navigation |
| FR010 | T030–032 | cue busyzero/dedup/visual/mute |
| FR011 | T033–037 | verifiedlocal/interimfinal/unavailable/browser-systemnetwork |
| FR012 | T008/034/036 | no transcript-only stop, VADmanual30s |
| FR013 | T018/023–029/035–039 | RLSA/Banon/directDML, no take-text persistence/upload/screenshots |
| FR014 | T005/007/008/010–016/018/019/022–024/026/029/030/032–039 | regression and device gates, deterministic no paid APIs |
| FR015 | T001/002/017/018/033/038/039 | cloudexcluded, finite paidpilot/remote separately authorized |
| SC001 | T005/006/008 | solo and prior-take scenarios |
| SC002 | T007/010/011 | deterministic/device expected-offset error |
| SC003 | T012/013/015/016 | all exposed isolated units individually approved |
| SC004 | T023–029 | persisted exact counts/access/concurrency |
| SC005 | T019–022/029 | geometry/keyboard/mobile/focus |
| SC006 | T030–032 | zero busy cue starts/visual equivalents |
| SC007 | T033–037 | local failclosed/no hidden upload/no text-only stop |

Analyze result:22/22FR+SC covered,40tasks, zero unlinked implementation tasks; setup/final governance crosscutFR014/015. No constitutional conflict/CRITICAL/HIGH/material duplication. A1 MEDIUM quota ledger query needed index(user_id,created_at): added data-model+T023; coordinator final recheck verified final hashes and closed A1. Technical reviewer re-read offset lines24/142/plan20 and withdrew stale HIGH as resolved without file change; final technical opinion no open CRITICAL/HIGH/MEDIUM in inspected topics. Coordinator final reviewer explicitly approved/revalidated all20 custom items, including visible cue014 and final owner/coverage019/020, and delegated PM marker update on final hashes. All20 now marked requirements-quality reviewed, zero code tasks completed.

### Final input content hashes

| Artifact | SHA-256 |
| --- | --- |
| spec.md | 70e1cbbcb377f28d5cf2da6b3292f78802ef56813ac42593a9e947f6b6416a37 |
| plan.md | 914713cc01cecc181d8c4c0d94de1e254b66b3759c7d39fb9e3726e269c4da76 |
| tasks.md | a2a7a0135dc80c09eb96162490ec3f150a326027cdbcae468d9efabe26824ced |
| data-model.md | 828b174f412da5ce7f7ef640a6f8152c27cea9f5e6b47e97dd1315fe4339db7f |
| contracts/practice.md | 4c35d7d0cd73aee81f0978b1bac1861d67512b528648e7256f6bf59cd4e49a4f |
| quickstart.md | 7c0fa9513abc6f8f787e154aae743bf40b96708569a1faacab1d43d1181d3b19 |
| classification.md | 5d05c5d0b39ca52f0b363a7e95b16bacea9532f3018c8577379098fc2cf9aa92 |
| execution.md | dc3dddd3db8a1769d2b8c91a8a4fe3ed7ad5adf45519e739e2cd8a1e4d004e47 |
| research.md | 1401296f1670e6a9ca1064953a738e872985f1847e4d00fed452d1b3f15592aa |

Next is a separate explicitly authorized implementation session invoking speckit-implement after reviewer-owned checklist gate, not this planning task. Future converge only after code implemented. Real-device, phonetic-listening, SQL and app gates cannot be marked completed by documentation approval.

Final recheck by coordinator: zero critical/high/medium open, zero material gaps,22/22coverage100%,40unstarted tasks. Built-in checklist16/16; custom20/20 under explicit reviewer ownership. Technical and product reviews final scopes covered; no application/device/provider validation claimed. Ready status excludes optional paid pilot authorization and future device/schema/code evidence gates.

Documentation verification actually executed: Spec Kit check-prerequisites --json --require-tasks --include-tasks resolves008 and lists research/data/contracts/quickstart/tasks. PM format script found40 unique IDsT001–040, all unchecked with explicit paths,8[P]. Coordinator read-only link/format script found zero broken relative Markdown links and no checked implementation task. No lint/typecheck/build/application tests executed because only planning docs and feature metadata changed.
