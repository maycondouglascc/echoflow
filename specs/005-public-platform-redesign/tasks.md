# Tasks: Plataforma pública e redesign EchoFlow

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md).

**Tests**: Obrigatórios por AGENTS.md para cada mudança de comportamento; CI não usa APIs pagas. T001–T035 concluídas e verificadas localmente; T036/T037 permanecem abertas por dependerem de dispositivos, configuração/autorização externa e aprovação de publicação.

**Organization**: Setup compartilhado, fundação e fases por jornada. Cada tarefa usa caminho concreto; executar em ordem dentro de cada fase salvo dependência explicitada. `[P]` não é usado porque auth, schema, Storage e rotas compartilham estado/arquivos e devem integrar sequencialmente.

## Phase 1: Setup

**Purpose**: Preparar ambiente reprodutível e revisão da versão atual.

- [X] T001 Confirmar tag `backup/pre-public-platform-20260929` em `94cce8b`, manter branch/worktree isolada e registrar checksum dos 13 arquivos de áudio (dez ativos, três baselines) em `specs/005-public-platform-redesign/quickstart.md`.
- [X] T002 Adicionar dependências Supabase SSR/JS compatíveis com stack pinada em `package.json` e `package-lock.json`, e revisar alteração de lockfile.
- [X] T003 Inicializar configuração local isolada em `supabase/config.toml` e exemplo sem segredos em `.env.example`; documentar portas e envs em `README.md`.
- [X] T004 Definir comandos de testes determinísticos e gate de CI sem provider pago em `package.json` e `.github/workflows/ci.yml`, preservando lint/typecheck/build existentes.

**Checkpoint**: ambiente reproduzível sem projeto remoto ou credencial de produção.

## Phase 2: Foundational

**Purpose**: Banco, políticas, áudio privado e sessão necessários para todas as histórias.

- [X] T005 Criar migration aditiva com `playlists`, `phrases`, `audio_variants`, `playlist_completions`, constraints, grants mínimos e RLS em `supabase/migrations/202609290001_public_platform.sql` conforme `data-model.md`.
- [X] T006 Criar bucket `phrase-audio` privado e políticas de leitura/escrita apropriadas em `supabase/migrations/202609290002_private_phrase_audio.sql`, sem URL pública ou service role no navegador.
- [X] T007 Criar seed determinística para playlist, cinco frases, dez variantes e baselines arquivados em `supabase/seed.sql`, derivando textos, IDs, paths, checksums e timings de `src/lib/fixtures/voice-comparison.json`.
- [X] T008 Mover os dez binários ativos e três baselines de `public/fixtures/audio/` para `assets/reference-audio/`, preservando bytes e metadados; criar importador local idempotente em `scripts/import-reference-audio.ts` com dry-run, SHA-256, falha sem sobrescrita e nenhuma chamada a TTS. Confirmar que antigos caminhos HTTP públicos deixam de servir áudio.
- [X] T009 Escrever testes pgTAP com anon, A e B para grants/RLS de catálogo, conclusão e Storage em `supabase/tests/public_platform_rls.test.sql`; provar bloqueio cruzado sem depender de service role.
- [X] T010 Implementar clientes SSR/browser e verificação de usuário no servidor em `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts` e renovação de cookies em `src/proxy.ts`/`src/lib/supabase/proxy.ts`.
- [X] T011 Implementar consultas server-only ao catálogo publicado em `src/lib/catalog.ts` e endpoint `src/app/api/reference-audio/[variantId]/route.ts` que valida sessão/publicação em cada pedido, transmite áudio do bucket privado com `Cache-Control: private, no-store`, suporta `200`/`206`/`416` e nega visitante, variante arquivada e objeto ausente sem expor URL assinada.
- [X] T012 Testar políticas de banco/Storage com anon em `supabase/tests/public_platform_rls.test.sql` e criar check offline de paridade de cinco frases/dez variantes/word timings entre fixture e seed em `tests/python/test_catalog_seed.py`; checks HTTP ficam em T013/T018 e T019.

**Checkpoint**: dados reprodutíveis, áudio privado, leitura protegida e isolamento demonstrado com duas identidades.

## Phase 3: User Story 1 — Conta e acesso (P1) 🎯 Primeiro incremento

**Goal**: Visitor se cadastra e acessa prática, com negação em rotas diretas sem sessão.

**Independent Test**: Abrir landing anônima, criar conta por email, confirmar, entrar, acessar frase, sair e confirmar negação; exercitar Google em ambiente de teste configurado.

- [X] T013 [US1] Escrever testes de fluxo email/Google, callback inválido, logout, sessão expirada, `next` externo, acesso direto às duas URLs legadas e endpoint de áudio sem sessão em `tests/e2e/auth-access.spec.ts` com identidades sintéticas.
- [X] T014 [US1] Implementar formulário e estados de cadastro/entrada/recuperação em `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/login/page.tsx` e `src/components/AuthForm.tsx`.
- [X] T015 [US1] Implementar ações de autenticação e callback PKCE com redirecionamento interno permitido em `src/app/(auth)/actions.ts` e `src/app/auth/callback/route.ts`.
- [X] T016 [US1] Proteger renderização e operações das rotas de prática em `src/app/(app)/layout.tsx`, `src/app/(app)/home/page.tsx`, `src/app/(app)/scenarios/[id]/page.tsx` e `src/app/(app)/practice/[phraseId]/page.tsx`; migrar/proteger as rotas legadas `src/app/scenarios/voice-comparison/page.tsx` e `src/app/scenarios/introducing-yourself/page.tsx` sem servir fixture pública; impedir cache público.
- [X] T017 [US1] Configurar e documentar confirmação de email, URLs permitidas e Google OAuth para ambientes de teste em `supabase/config.toml` e `README.md`, sem comitar segredos nem provisionar produção automaticamente.
- [X] T018 [US1] Verificar que login/logout/callback/rotas diretas passam em `tests/e2e/auth-access.spec.ts` e que falhas recuperam sem conceder acesso.

**Checkpoint**: acesso público à landing e acesso autenticado a conteúdo; Google real ainda requer smoke externo explícito.

## Phase 4: User Story 2 — Catálogo, áudio e conclusão (P2)

**Goal**: Conta vê a playlist atual, pratica com as duas vozes e tem conclusão persistida exclusivamente para si.

**Independent Test**: A conclui cinco frases com gravação+comparação; Completed persiste após login. B lê mesmo catálogo, sem selo, e não consulta/altera conclusão de A; gravações nunca aparecem em Storage.

- [X] T019 [US2] Escrever regressão de cinco frases/dez variantes, escolha de voz, alinhamento/replay com seeking e respostas Range `206`/`416` no endpoint autenticado, áudio ausente e comparação sequencial em `tests/e2e/shadowing.spec.ts` e `tests/e2e/shadowing-real-audio.spec.ts`.
- [X] T020 [US2] Adaptar `src/components/useShadowingPractice.ts` e `src/components/ShadowingPractice.tsx` para catálogo/endpoint autenticado, mantendo escolha de voz e gravação em memória; registrar localmente quais frases foram comparadas na sessão.
- [X] T021 [US2] Escrever teste de conclusão idempotente, retry de falha e persistência após nova entrada com contas A/B em `tests/e2e/playlist-completion.spec.ts`.
- [X] T022 [US2] Implementar leitura/mutação de conclusão derivando `user_id` da sessão em `src/app/(app)/actions.ts` e `src/lib/catalog.ts`, sem aceitar proprietário arbitrário; a ação do cliente só é disponibilizada após cinco comparações na sessão.
- [X] T023 [US2] Exibir estado Completed derivado do banco e erro recuperável de gravação do selo em `src/app/(app)/home/page.tsx` e `src/components/ShadowingPractice.tsx`.
- [X] T024 [US2] Verificar ausência de gravações pessoais persistidas e de URLs públicas/assinadas na resposta do catálogo em `supabase/tests/public_platform_rls.test.sql` e `tests/e2e/playlist-completion.spec.ts`.

**Checkpoint**: catálogo/áudio protegidos, prática existente preservada, conclusão por conta demonstrada.

## Phase 5: User Story 3 — Redesign (P3)

**Goal**: Landing e área logada seguem frames Figma, com navegação/estados acessíveis e sem placeholders.

**Independent Test**: Comparação visual 1440/375 px, modal, filtro, estados da playlist, teclado/reduced motion e jornada landing → cadastro → prática.

- [X] T025 [US3] Instalar/ler as quatro skills fornecidas em `specs/005-public-platform-redesign/contracts/figma-inventory.md`: `anthropics/skills/frontend-design`, `vercel-labs/agent-skills/web-design-guidelines`, `vercel-labs/agent-skills/vercel-react-best-practices`, `kylezantos/design-motion-principles/design-motion-principles`; atualizar inventário Figma com tokens, medidas, assets e estados antes de codificar o redesign.
- [X] T026 [US3] Escrever testes de landing, modal, CTA e responsividade em `tests/e2e/landing-redesign.spec.ts`, incluindo ausência do placeholder Mobbin.
- [X] T027 [US3] Implementar landing e modal conforme frame 69:1150 em `src/app/page.tsx`, `src/app/globals.css` e `src/components/SignupModal.tsx`; referenciar apenas termos/política reais quando aprovados, sem publicar placeholder.
- [X] T028 [US3] Escrever testes de busca/filtro, zero resultado, seleção, selo e controles com teclado/reduced motion em `tests/e2e/logged-area-redesign.spec.ts`.
- [X] T029 [US3] Implementar área logada conforme frame 72:1683 em `src/app/(app)/home/page.tsx` e `src/components/PlaylistBrowser.tsx`; usar vozes aceitas, não Alice/Mode 1.
- [X] T030 [US3] Adaptar apresentação da prática sem alterar sua máquina de estados em `src/components/ShadowingPractice.tsx` e estilos relacionados em `src/app/globals.css`, com foco visível e movimento reduzido.
- [X] T031 [US3] Registrar comparação Figma com diferenças aceitas/corrigidas em `specs/005-public-platform-redesign/contracts/figma-inventory.md` e evidência de viewport/acessibilidade em `specs/005-public-platform-redesign/quickstart.md`.

**Checkpoint**: duas páginas redesenhadas e jornadas essenciais operáveis nos estados especificados.

## Phase 6: Polish and release readiness

- [X] T032 Atualizar decisões duráveis em `docs/system_architecture.md`, `docs/IMPLEMENTATION_PLAN.md` e `docs/EchoFlow.md`, removendo orientação legada de bucket público, leitura anônima de frases e persistência de gravação para esta feature; manter roadmap V2 identificado como futuro.
- [X] T033 Registrar configuração externa pendente e plano de backup/rollback de schema e binários em `specs/005-public-platform-redesign/quickstart.md`; não executar deploy/migration remota sem autorização.
- [X] T034 Executar `npm run lint`, `npm run typecheck`, `npm run build`, `supabase test db`, testes da feature e suíte Playwright no ambiente isolado; registrar resultados reais em `specs/005-public-platform-redesign/quickstart.md`.
- [X] T035 Fazer revisão independente focada em auth, RLS, migrations, Storage, locks e CI; registrar achados/resoluções em `specs/005-public-platform-redesign/pm-review.md` sem enfraquecer gate.
- [ ] T036 Validar reprodução/microfone/permissões/interrupções em dispositivos reais e Google/email/domínio remotos de teste; registrar evidência em `specs/005-public-platform-redesign/quickstart.md`.
- [ ] T037 Antes de publicar, obter conteúdo legal aprovado e links válidos para `src/app/page.tsx`/páginas legais; instrumentar e validar em ambiente de teste contagens agregadas de cadastros confirmados, eventos de acesso à prática e novas conclusões por conta sem PII em `src/lib/metrics.ts` e `tests/e2e/platform-metrics.spec.ts`; configurar e testar limites de autenticação/email/áudio e alertas de consumo no ambiente autorizado, registrar teto de gasto aprovado e evidência em `specs/005-public-platform-redesign/quickstart.md`, confirmar backup e solicitar autorização específica antes de qualquer operação remota.

## Dependencies & Execution Order

- Setup T001–T004 → Fundação T005–T012 → US1 T013–T018 → US2 T019–T024 → US3 T025–T031 → prontidão T032–T037.
- US2 depende de catálogo e sessão autenticada de US1. US3 depende de estados reais de auth/conclusão para evitar redesenho fictício. Cada fase tem teste independente de seu resultado, embora a entrega pública completa exija todas.
- Dentro de cada fase, escrever checks de comportamento antes de alterar o comportamento quando indicado; migrations/seed/importador antecedem leituras; nenhuma tarefa paralela foi marcada por compartilhar schema, assets ou componentes.

## Implementation Strategy

Primeiro incremento funcional: US1 com fundação, acessível em ambiente de teste e sem publicar. Depois integrar catálogo/conclusão e, por fim, redesign com as skills fornecidas. Encerrar no gate de release readiness; publicar somente por autorização posterior. Commits devem agrupar implementação e teste da mesma fatia.
