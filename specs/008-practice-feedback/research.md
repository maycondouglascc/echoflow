# Research: practice feedback

Fontes locais atuais: AGENTS.md, constituição, docs/EchoFlow.md, docs/system_architecture.md, specs/001–005, docs/content/README.md e os trechos citados abaixo. Pesquisas agentes somente leitura, sem audio listening/device trial/API paga. Técnicas externas verificadas pelo pesquisador áudio em fontes primárias em 2026-10-08; isso confirma contratos documentados, não support de dispositivos reais.

## R1 — Solo é uma exposição UI

**Decision**: Reutilizar `actions.playRecording`, evitar outro recorder/player.
**Evidence**: `useShadowingPractice.ts:719–727,801` já expõe ação; `ShadowingPractice.tsx:185–250` só apresenta Listen/Speak/Compare; `practice-refinement.spec.ts:121` espera zero botões solo.
**Rationale**: Menor slice; substituir essa expectativa antiga por prova positiva e negativa sem take, não removê-la sem cobertura.
**Alternatives**: Novo player rejeitado por duplicação/lifecycle.

## R2 — Causa do corte indeterminada

**Decision**: Diagnóstico antes de gerar palavras. Distinguir dados de alinhamento, áudio original, seek impreciso, parada RAF e races.
**Evidence**: `catalog-metadata.ts:67–77` valida ordem, não fonética; hook `408–449,649–674` usa mesma fonte/seek/end polling. Teste real `shadowing-real-audio.spec.ts:97–105` prova clock ±50ms, não conteúdo. Catálogo usa alinhamento faster-whisper local cached.
**Rationale**: Padding global pode misturar vizinhos; TTS individual perde coarticulação e acrescenta custo sem provar causa.
**Alternatives**: Gerar tudo rejeitado. Separar `wordTimings` (highlight) e `replayUnits` (conteúdo revisado). Contextual groups em fonte natural; isolados via asset somente se necessário e aprovado.

## R3 — Transporte com relógio comum

**Decision**: Decode buffers e agendar sources de mix no mesmo `AudioContext.currentTime`; capture-session continua owner único de MediaRecorder/tracks. UI/hook owner integra estado capture e playback simultâneos.
**Evidence**: atual phase union playing/recording exclusivo; startRecording só ready. [Web Audio start](https://webaudio.github.io/web-audio-api/#dom-audiobuffersourcenode-start) especifica agendamento num tempo absoluto.
**Rationale**: Duas promises `audio.play()` não provam sincronismo audível. Preserve offsets reais do speak-along, sem time-stretch automático. Ganhos default 0.5/0.5 e controles limitados evitam clipping.
**Alternatives**: Remover disabled rejeitado; transportar mic+reference juntos para recorder rejeitado (gravação deve ser mic somente).

## R4 — Reconhecimento não prova pronúncia

**Decision**: Spike local opt-in/capability fail-closed. Registrar interim/final, sem score. Se não houver capacidade local suportada, manter unavailable e entregar restante; cloud está excluído pela decisão do usuário.
**Evidence**: privacidade atual diz sem upload/transcrição; [Web Speech](https://webaudio.github.io/web-speech-api/#dom-speechrecognition-processlocally) distingue processing local/remote e disponibilidade. `speech-end.ts` RMS local 0.02, voz 200ms, silêncio 1500ms; `capture-session.ts` limite30s.
**Rationale**: API browser não implica local. Não enviar áudio/texto para feedback/screenshots: novo transcript private e excluir capture staging/context.
**Alternatives**: Cloud rejeitado pela decisão humana; expected phrase como fake result rejeitado. Phrase-match não basta para stop; auto-assisted termination separado posterior.

## R5 — História da conta

**Decision**: Count full reference completed, across voices por phraseId, incl. compare/speak-along. Run token/dedup; zero count word/chunk/take/preload/rejected/interrupted. IDs globais únicos por evento, ownership conta/phrase, transação counters sem lost update.
**Evidence**: prática só persiste playlist completion, não per-phrase; dono escolheu explicitamente histórico salvo por conta em 2026-10-08, supersedendo apenas esse limite de metadata.
**Alternatives**: Somente sessão rejeitado pelo usuário. Store eventos mínimos mais agregado evita duplicação de retries; sem audio/transcript nesta persistência.

## R6 — Layout

**Decision**: Desktop shell `100dvh` com fallback `100vh`, descontar margens48px; children min-height0, list scroll only. Sidebar drawer mobile; foco acessível e saída shortheight/zoom documentada.
**Evidence**: CSS atual mobile empilha painel620px; sidebar tem account/navigation. Literal painéis100vh empilhados não atende reachability.
**Alternatives**: Overflow hidden global rejeitado: esconde controles/modais. Styling scoped practice, catálogo/landing fora do slice.

## R7 — Cues

**Decision**: Opt-in página, readiness antes captura plain Speak somente, saved-take após teardown, completion após confirmação persistida; nunca durante playback/capture, dedup+drop (não queue).
**Rationale**: Capturar cue contaminaria take; fun não exige gamificação/new tracking. Visual status e mute; audio errors não viram erros de prática.
**Alternatives**: Som por palavra/clique e startup autoplay rejeitados por distração e bloqueios.

## R8 — Real device required

[Media Capture echoCancellation](https://w3c.github.io/mediacapture-main/#dom-mediatrackconstraintset-echocancellation) descreve constraints/settings; não garante remoção da referência no take. Devices headphones/speaker/Bluetooth precisam trial, inclusive latency e recognizer coexistence com MediaRecorder. Fakes só provam lifecycle/event contracts.
