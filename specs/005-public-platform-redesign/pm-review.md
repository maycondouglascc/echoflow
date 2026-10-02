# Revisão PM — plataforma pública e redesign

**Status:** implementação local validada; T036/T037 permanecem gates de publicação. Operações remotas não autorizadas.

## Decisões

| ID | Escolha | Fonte e justificativa | Alternativa rejeitada | Impacto | Responsável |
|---|---|---|---|---|---|
| D01 | Feature nova 005 em `codex/public-platform-plan`, com trabalho na worktree isolada | AGENTS.md e diretórios 001–004; preserva revisão e checkout funcional | Misturar planejamento à branch funcional | Artefatos isolados | PM |
| D02 | Preservar cinco frases, duas variantes e gravação em memória | Specs 002–004 aceitas; não inferir progresso/gravação persistidos apenas por haver banco | Migrar todo o roadmap de docs/EchoFlow.md | Escopo menor e sem migração de dados pessoais | PM |
| D03 | Landing pública; catálogo e prática exigem conta; Supabase Auth e banco serão planejados | Pedido explícito do usuário e constituição | Manter acesso anônimo atual | Requer auth, RLS, testes com dois usuários | Usuário |
| D04 | Cadastro por email e Google; confirmar email em produção | Figma 69:1150 e padrões de Auth | Somente email | Requer configuração Google e callback | PM, a partir de design |
| D05 | Beta gratuito sem cobrança nesta entrega | Pedido explícito e Figma | Implantar pagamentos | Nenhum fluxo de pagamento | Usuário |
| D06 | Supabase CLI 2.118.0 instalada nesta sessão em `/home/maycon/.local/bin/supabase` | Verificação inicial sem CLI no PATH/npm global; coordenador usou script oficial de instalação em 2026-09-29 | Repetir instalação no projeto | CLI disponível sem alterar código/lockfile | Coordenador |
| D07 | Selo "Completed" persistido por conta após completar a playlist | Resposta explícita do usuário em 2026-09-29 | Selo temporário/ausente | Requer progresso, RLS e teste entre contas | Usuário |
| D08 | "Alice" e "Mode 1" são placeholders; preservar vozes/modo atuais | Resposta explícita do usuário e specs 002–004 | Inventar nova voz/modo | Evita conflito de catálogo | Usuário |
| D09 | Áudio em bucket privado transmitido por endpoint que verifica sessão a cada pedido | Cadastro obrigatório supersede bucket público em docs/IMPLEMENTATION_PLAN.md L288/L403/L509; URL assinada permitiria acesso anônimo durante validade | URLs públicas ou assinadas | Exige migração de binários, policy Storage e teste de URL direta | PM, a partir do pedido do usuário |
| D10 | Logout encerra sessão do dispositivo atual; bytes já baixados não são revogados | Fluxo comum de auth web e limites do navegador; evita prometer revogação retroativa ou logout global não solicitado | Logout global ou apagar buffer remoto | Critério de teste cobre novas requisições pós-saída | PM |

## Revisões

- PM, especificação inicial e leitura de constituição, docs/EchoFlow.md, docs/system_architecture.md, specs 002–004; `.specify/extensions.yml` ausente, sem hooks.
- Revisor de produto, leitura de `spec.md` na versão inicial de 2026-09-29: achados altos sobre busca com playlist única e texto legal placeholder; médios sobre teste de isolamento, inventário visual e rótulos; baixos sobre numeração e confirmação de email. Resolvidos na spec: busca em catálogo publicado com zero resultado, gate legal pré-publicação, teste mais preciso, sequência de IDs e confirmação de email em produção. Completed e placeholders foram resolvidos pelo usuário e integrados; versões posteriores receberam revisão por hash.
- Clarify em 2026-09-29: usuário escolheu persistir Completed por conta e confirmou Alice/Mode 1 como placeholders. Integrado a `spec.md`, `data-model.md`, contratos e tasks. Email duplicado recebeu resposta neutra após revisão de produto.
- Revisor técnico: achado alto na versão anterior de `data-model.md`/`contracts/platform.md` sobre alegar prova server-side de prática mantida só no navegador. Corrigido: UI só solicita conclusão após cinco comparações; servidor garante identidade, playlist válida e isolamento, sem certificar áudio físico. Revisão técnica posterior considerou viáveis as escolhas e exigiu proteção das rotas legadas, aplicada em T016/T013.
- Revisor da checklist customizada: `checklists/requirements-quality.md` SHA-256 `b737ff30ed1fc3ec71a7fd8dfaab59d1539ad12c590152bde639093f05a1adc3`; 23/23 itens aprovados e revalidados sobre `spec.md` `f09e7173074e3ba8f256589c074f76e02cdeb09c6a4088467fa0d98064e5423c`, `plan.md` `d18df5e4aa28ba6958801385c145a5033cc47c0a56e0e1ab27df8dfac192636b`, `contracts/platform.md` `d50da3cb06cb3f621705a96b57f4ad51fe3e8e56891b3210c2ee0ccf805ad11f`, `tasks.md` `601c787d0a0eb589632eb563af18a99b7b47c7acca6bd94081876b83b5b85147` e `quickstart.md` `59d34841eab9f2d0a3673f18afa06d5bb6ab4feb89aef0c15f224b01ef108e6a`. Revisor delegou explicitamente ao PM marcar `[x]`; marcas representam qualidade documental, não execução. CHK005/015 não atestam paridade visual ou estados móveis construídos.
- Analyze independente final: os mesmos hashes de `spec.md`, `plan.md`, `tasks.md`, `contracts/platform.md` e `quickstart.md`; constituição `98bc361a6d5b294bdbf19abce53d37cda64f903fc05f8e656664cbf16cd2cb3a`. Cobertura FR-001–FR-014 e SC-001–SC-009: 23/23 mapeados a tarefas e validação (100%); 37 tasks, 0 sem vínculo, 0 achados críticos/altos/médios, 0 conflito constitucional. Rodadas anteriores identificaram rotas legadas públicas, T012 prematuro, checksums incompletos, Range indefinido e métrica de primeiro acesso impossível sem deduplicação; todos corrigidos e reanalisados nas versões finais. Parecer não prova funcionamento do app.
- Auto-revisão PM: URL assinada, mesmo curta, permitiria acesso sem sessão a qualquer portador. Replanejado endpoint autenticado com bucket privado e sem cache público; revisor técnico e checklist reavaliaram os hashes finais. T019 exige replay/seek em arquivo real e resposta `200`/`206`/`416`.
- Revisão crítica Grillme por revisor de produto, somente leitura: árvore de decisões partiu de acesso público com cadastro, preservação da prática, redesign Figma e gates de lançamento. Achados médios: logout não revoga bytes já baixados e plataforma gratuita precisa de teto/limites de custo/abuso; corrigidos em spec/contrato/plano/quickstart/T037. Achados baixos: busca em uma playlist é fidelidade visual com utilidade a medir após mais conteúdo; Completed é estado pessoal declarado pela UI, não prova auditada de aprendizagem. Invalidação do plano: acesso anônimo a áudio/Storage, falha RLS A/B, regressão de replay/Range ou falha real de OAuth/email/microfone impedem publicação. Não houve entrevista fictícia; duas decisões humanas foram respondidas diretamente pelo usuário, e teto de gasto fica para pré-publicação.

## Pendências e hipóteses

| Item | Consequência | Responsável | Condição |
|---|---|---|---|
| Links das quatro skills | Gate da fase futura de design detalhado; links recebidos, skills não instaladas nesta fase | Implementador | Instalar/ler as quatro skills fornecidas antes do redesign |
| Conteúdo legal | Cadastro público não deve usar texto Mobbin | Responsável pelo produto | Termos/privacidade do EchoFlow aprovados e publicados antes de lançar |
| Projeto Supabase remoto, domínio e Google OAuth | Integração e lançamento dependem de configuração externa; planejamento usa ambiente local sintético | Responsável pela implementação/operação | Provisionar ambientes e segredos sem custo material não autorizado |
| Docs legados de bucket público | Orientações duráveis ficam conflitantes até aceite/implementação | Implementador | Atualizar docs/system_architecture.md e docs/IMPLEMENTATION_PLAN.md em tarefa própria, registrando supersessão |
| Teto de gasto da plataforma gratuita | Publicação sem limite aceito pode gerar custos por cadastro/email/egress; não bloqueia implementação local | Responsável pelo produto/operação | Definir teto e limites antes de publicar; T037 |

## Evidências externas para o plano

## Revisão independente da implementação (T035)

Revisor separado read-only, diff contra planejamento `248a407` e arquivos novos:

- P1 CLI global na CI: corrigido helper para `npx --no-install supabase`, dependency pinada.
- P2 destino perdido no layout: Proxy sobrescreve header interno com rota atual e layout usa allowlist;
  E2E acesso direto → login → mesma rota passou.
- P2 auth pages de usuário existente: redirect server-side, preservada exceção recovery/reset; E2E passou.
- P2 cues sem campos aceitos por NULL SQL: corrigido `IS DISTINCT FROM`, testes de campos vazios/null/overlap e banco recriado; pgTAP passou.
- Complementos: SDK cookie adulterado, conta revogada, confirmação/recovery via inbox local,
  catálogo não publicado, deleção proibida, idempotência e métricas cobertos.
- Revisão complementar confirmou banco aplicado, privilégios negados anon/auth dos counters,
  RPC anon negado, funções internas revogadas, `search_path=''` e nenhum PII persistido.
  Nenhum novo achado bloqueante; não encontrou service role na aplicação, upload pessoal,
  bucket público ou enfraquecimento dos gates. Lockfile auditado sem vulnerabilidades.

Risco residual: usuários autenticados podem inflar contagem de acessos via RPC; telemetria é
indicativa, não auditoria confiável. Abuso/limites, Google real, SMTP/domínio e dispositivos
continuam gates externos. CI foi preparada, mas execução GitHub só é comprovada após push autorizado.

- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [migrations](https://supabase.com/docs/guides/local-development/database-migrations), [testes de banco](https://supabase.com/docs/guides/local-development/testing/overview) e [Next 16 Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy), consultados em 2026-09-29.
