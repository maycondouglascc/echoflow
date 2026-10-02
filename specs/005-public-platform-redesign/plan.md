# Implementation Plan: Plataforma pública e redesign EchoFlow

**Branch**: `codex/public-platform-plan` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-public-platform-redesign/spec.md`.

## Summary

Evoluir o protótipo Next.js 16 para landing pública e área de prática autenticada. Supabase Auth gerencia email/senha e Google; Postgres guarda catálogo compartilhado e conclusão de playlist por usuário, com RLS e checagens de sessão no servidor. Manter arquivos e comportamentos de áudio existentes, inclusive gravação pessoal só em memória. Redesenhar as duas superfícies após instalar/ler as quatro skills fornecidas e extrair inventário visual dos frames Figma. Entregar em fatias verificáveis, sem conectar CI a serviços pagos.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Node 24.19–24.x, npm 11; Next.js 16.3.6, React 19.2.8.

**Primary Dependencies**: `@supabase/supabase-js`, `@supabase/ssr` a adicionar na implementação; Motion 13.4.4, Tailwind 3.4.19 já presentes. Supabase CLI 2.118.0 disponível globalmente.

**Storage**: Supabase Postgres para playlists, frases, variantes/alinhamentos e conclusão; referências de áudio em bucket privado Supabase Storage, migradas dos dez arquivos versionados e transmitidas por endpoint autenticado. Gravações pessoais não são persistidas.

**Testing**: Playwright existente para jornadas; pgTAP via `supabase test db` para grants/RLS com duas identidades; testes de integração de auth/catálogo e checks de fixture determinísticos. `npm run lint`, `npm run typecheck`, `npm run build`, suíte e testes reais em dispositivo antes de publicação.

**Target Platform**: Next.js App Router em servidor web compatível; navegador desktop/móvel com MediaRecorder e áudio, Supabase local durante desenvolvimento.

**Project Type**: Aplicação web com componentes de servidor predominantes.

**Performance Goals**: Ações principais utilizáveis em 375 px e 1440 px sem rolagem horizontal; manter reprodução local sem chamada paga em tempo de prática. Medir tempos reais de carregamento antes de fixar orçamento numérico de produção.

**Constraints**: Conteúdo protegido no servidor e RLS; email confirmado em produção; Google OAuth configurado externamente; sem gravação no banco/Storage; sem API paga no CI; sem publicação nesta fase. Termos/privacidade aprovados são gate de lançamento, nunca placeholder do Figma.

**Scale/Scope**: Uma playlist publicada (Voice Comparison), cinco frases, dez variantes ativas e baseline arquivado. Sem importação de vídeo, histórico detalhado, pagamentos ou expansão automática para 40 frases.

## Constitution Check

*GATE antes da pesquisa e reavaliado após o design: passa para planejamento; implementação requer revisão de segurança e evidências.*

| Princípio | Resposta do plano |
|---|---|
| Fatias pequenas | Setup, auth, catálogo/conclusão e redesign em etapas com checkpoints independentes. |
| Evidência independente | Regressão Playwright, RLS pgTAP com dois usuários, falhas/recuperação e checks físicos de áudio. |
| Dados e credenciais | Chaves privadas só no servidor; RLS + grants explícitos; nenhum áudio pessoal persistido. |
| Revisabilidade | Branch/worktree isolada, backup `backup/pre-public-platform-20260929` em `94cce8b`; migrations versionadas e commits coerentes só na implementação. |
| Simplicidade/reprodutibilidade | Reutilizar stack/fixtures, Supabase local e seed determinística; nenhuma chamada paga ordinária. |

Nenhuma exceção à constituição. O fluxo público e o armazenamento de conclusão introduzem risco de exposição/alteração de dados, portanto devem receber revisão técnica focada antes de publicação.

## Phase 0: Research

Decisões e alternativas estão em [research.md](research.md). Fontes oficiais verificadas em 2026-09-29. Questões humanas de selo e placeholders foram resolvidas na spec; não restam `NEEDS CLARIFICATION` técnicos.

## Phase 1: Design & Contracts

- [data-model.md](data-model.md) define catálogo e conclusão, chaves e estados.
- [contracts/platform.md](contracts/platform.md) define rotas, autorização, mutações e estados da UI.
- [quickstart.md](quickstart.md) define validação local e checks externos/device-only; é guia de validação futura, não execução nesta fase.
- Inventário dos frames Figma em [contracts/figma-inventory.md](contracts/figma-inventory.md); ajustar detalhes na execução após leitura das quatro skills fornecidas.

## Project Structure

### Documentation (this feature)

```text
specs/005-public-platform-redesign/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/platform.md
├── contracts/figma-inventory.md
├── quickstart.md
├── checklists/requirements.md
├── checklists/requirements-quality.md
├── tasks.md
└── pm-review.md
```

### Source Code (repository root, future implementation)

```text
src/app/page.tsx                         # landing pública
src/app/(auth)/login/page.tsx
src/app/(auth)/signup/page.tsx
src/app/auth/callback/route.ts
src/app/(app)/home/page.tsx               # playlists/estado selecionado
src/app/(app)/scenarios/[id]/page.tsx    # conteúdo protegido
src/app/(app)/practice/[phraseId]/page.tsx
src/app/(app)/actions.ts                  # mutações protegidas
src/components/ShadowingPractice.tsx     # adaptar sem perder fluxo
src/lib/supabase/{server,client,proxy}.ts
src/lib/catalog.ts
src/proxy.ts
src/app/api/reference-audio/[variantId]/route.ts
assets/reference-audio/                  # fontes versionadas fora de public/
supabase/config.toml
supabase/migrations/*.sql
supabase/seed.sql
supabase/tests/*.test.sql
tests/e2e/*.spec.ts
```

**Structure Decision**: Manter projeto Next único; separar rotas públicas e protegidas em grupos do App Router. `proxy.ts` auxilia refresh de sessão, enquanto cada leitura/mutação protegida valida usuário no servidor. Não introduzir backend separado.

## Execution Slices and Rollback

1. Preparar ambiente local e migration/seed; importar referências a bucket privado; testar RLS e catálogo/áudio com duas identidades.
2. Entregar acesso por email/Google e proteção server-side; validar saída, expiração, links diretos e redirecionamento seguro.
3. Ligar catálogo e conclusão por usuário ao fluxo existente; validar as cinco frases/dez variantes e que gravações não persistem.
4. Instalar/ler as quatro skills de design fornecidas, reconciliar inventário Figma e construir landing/área logada com regressões de UI e acessibilidade.
5. Revisão independente da diff sensível, checks completos e dispositivos reais. Antes de publicar, validar texto legal aprovado, configurações de domínio/OAuth/email, limites de abuso/observabilidade, teto de gasto aprovado, migração/backup e plano de rollback. Publicação, deploy e migrations remotas exigem autorização separada.

Rollback de aplicação: apontar novamente para `backup/pre-public-platform-20260929` ou commit funcional correspondente após avaliar compatibilidade de schema; rollback de dados é restaurar backup remoto verificado, sem `db reset --linked` em produção. Migrations iniciais devem ser aditivas para que a versão anterior continue executável. Não há dados pessoais locais atuais a migrar.

## Post-design Constitution Check

### Modal/privacy follow-up

T046 testes de acceptance → T047 dialog compartilhado e onboarding sem timer → T048 página
server pública e links → T049 gates/evidência. Reutilizar Nunito e tokens #0087da/#1a1e26/white,
largura 400px/padding40 (24 mobile), mascote original `/design/kitten.png` como apoio ao título.
Mesma superfície, backdrop e scroll interno; privacy em leitura contínua, não cards repetitivos.
Análise: pedido novo autoriza página factual sem resolver aprovação jurídica T037; não muda
Auth/RLS/schema ou gravação. Primeiro modal imediato, browser prompt após CTA é decisão explícita
de leitura/consentimento. Skill motion: ocasião rara, propósito de explicação/state indication;
usar CSS existente 250ms/120 reduced/teclado imediato, sem dependência nova.

## Follow-up performance/practice plan (2026-10-02)

1. Regressões antes de correções: Compare acionável, voice readiness, onboarding, silêncio.
2. React.cache deduplica getUser por render/request (não entre contas); Proxy verifica claims
   para refresh, leituras e mutações preservam getUser remoto. Consulta PostgREST aninhada
   reúne playlist/frases/variantes/conclusão sob o mesmo RLS em uma chamada. Suspense envolve
   gate autenticado com skeleton sem conteúdo protegido; loading e feedback de navegação.
3. Etapa de confirmação destacada; onboarding automático de microfone após gate, tracks
   imediatamente liberadas, sem gravação. Consentimento/retry factual, por conta/aba.
4. Detector RMS temporal local, silêncio só após fala, cleanup em todas as saídas/falhas.
   Preservar take/readiness ao trocar voz; remover anotações visuais redundantes mantendo a11y.
5. Referências pré-carregadas atual/próxima, fetch deduplicado e blobs limitados em memória;
   sem Storage público/cache HTTP ou service role, cleanup/abort no unmount.
6. Prévia remota em build de produção isolado, sem recompilar rotas durante navegação;
   build/testes locais não devem sobrescrever bundle remoto. Medir antes/depois e documentar
   limites de rede externa; testes de auth/RLS/Range e suíte inteira local permanecem gate.

Análise de consistência: nova solicitação supersede microfone-on-Speak, visibilidade de
feedback e footer; não altera critérios de Completed nem privacidade de áudio pessoal.
Sem schema/dependência/CI novo. Streaming entrega apenas shell antes da autorização.

Passa em nível documental: contratos distinguem catálogo compartilhado de conclusão privada, testes RLS cobrem usuários separados, e quickstart explicita hardware e serviços externos. A execução ainda deve produzir evidência; o parecer documental não substitui testes.
