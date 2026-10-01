# Guia de execução e evidência local

Implementação executada na worktree `/home/maycon/Documents/code/echoflow/.worktrees/public-platform-005`,
branch `codex/public-platform-plan`. Não apontar CLI/testes/importador para projeto remoto.
O banco recriado nesta sessão contém exclusivamente fixtures e contas sintéticas dessa worktree.

## Pré-requisitos

Node/npm da versão do package.json, Docker compatível, Supabase CLI (2.118.0 já instalado), fixtures sintéticas, credenciais locais de teste. Configurar `.env.local` sem comitar segredos. Para Google real, configurar projeto de teste, redirect allowlist e segredo privado. O teste local de email usa a inbox do Supabase local.

## Preparar e verificar localmente

1. Na worktree, `npm ci`, `npx supabase start`; se precisar recriar fixtures, `npx supabase db reset --local` (apaga apenas dados sintéticos deste stack). Não usar `--linked`. Projeto `public-platform-005`: API56321/DB56322/Studio56323/inbox56324; não parar outros projetos Docker.
2. `node scripts/setup-local-test.mjs` gera `.env.local` ignorado sem imprimir credenciais; `npm run audio:import` verifica/importa os 13 objetos privados idempotentemente. `--dry-run` não faz requests. `node scripts/generate-database-types.mjs` regenera tipos locais.
3. Executar `npm run test:db`, verificando grants/RLS como anon, usuário A e B, inclusive catálogo, conclusão e política de Storage.
4. Executar `npm run lint`, `npm run typecheck`, `npm run build` e `npm run test:e2e`.
5. Conferir cinco frases e dez variantes; comparar checksums dos objetos privados aos arquivos de origem e confirmar que nenhuma URL pública antiga nem o endpoint de áudio libera bytes sem login.

## Jornadas observáveis

1. Em janela sem sessão, abrir `/`, acionar Practice now e cadastro; verificar email e Google. Tentar `/home`, `/scenarios/voice-comparison`, `/scenarios/introducing-yourself`, prática e `GET /api/reference-audio/[variantId]` diretamente, inclusive após logout/expiração; nenhum conteúdo ou byte de áudio deve vazar.
2. Com conta A, abrir playlist, trocar entre as duas vozes aceitas, reproduzir, gravar, comparar e avançar pelas cinco frases. O selo Completed aparece após conclusão, sobrevive a reload/login. Falha simulada de persistência oferece retry sem duplicar linha.
3. Com conta B, ver a mesma playlist sem Completed; tentar ler/gravar conclusão de A por API/banco com token B e confirmar negação. Verificar ausência de gravações em tabelas/Storage e que voz volta ao padrão ao recarregar.
4. Buscar termo presente e ausente, limpar busca, alternar estado sem seleção/selecionado. Testar 375 px e 1440 px, teclado, leitor de tela e movimento reduzido. Comparar com [inventário Figma](contracts/figma-inventory.md) e registrar diferenças.
5. Simular auth indisponível, áudio ausente, callback OAuth inválido e `next` externo; exigir falha recuperável sem acesso indevido.

## Backup e rollback

Tag anotada `backup/pre-public-platform-20260929`, commit resolvido
`94cce8b55d8e894d31d85c4eaa3f4773a818f25b`; planejamento em `248a407`.
O checkout funcional original não foi modificado pelo desenvolvimento desta feature.
Checksums dos **13** arquivos originais estão em
[`assets/reference-audio/checksums.json`](../../assets/reference-audio/checksums.json);
seed/importador/teste offline verificam os hashes byte a byte. Nenhum TTS foi chamado.

Antes de operação remota autorizada: snapshot de banco/Storage, export das configurações Auth e
inventário de objetos com hashes; confirmar restauração em ambiente de teste. Migrations são
aditivas, sem remover tabelas existentes. Rollback do aplicativo deve usar manutenção ou última
versão autenticada, **nunca republicar o protótipo com áudio anônimo**. Preservar banco/conclusões
e bucket privado; não executar DROP/down migration automático. Recuperação local da versão antiga
usa uma branch/worktree nova a partir da tag, preservando alterações atuais. Restaurar arquivos
de áudio pela tag/hashes, não regenerar via provider. Nenhum backup remoto, push ou deploy ocorreu.

## Evidência de implementação

- CLI fixado em devDependency 2.118.0; Supabase SSR0.12.7/JS2.117.2; `npm audit` sem vulnerabilidades.
- Três migrations aplicadas desde banco vazio; seed de cinco frases, dez variantes ativas e três arquivadas.
- `npm run test:db`: **34 checks / 2 arquivos, PASS**: anon, A/B, grants, RLS, Storage, cues inválidos/null, idempotência e métricas agregadas sem PII.
- `npm run test:audio-generator`: **12 testes PASS**, incluindo hashes/seed/paridade e ausência dos caminhos públicos antigos.
- Auth/áudio: **10 E2E PASS** na rodada focal: confirmação/recuperação reais na inbox local/PKCE, login/logout, destino interno, conta revogada, cookie SDK adulterado, Google não configurado recuperável, Range e objeto ausente.
- Testes de modal em 1440/375: trap de foco, Escape e retorno ao botão, reduced-motion e ausência de scroll horizontal.
- Selo A/B: todas as cinco comparações exigidas, erro de save com retry, reload/nova entrada, uma linha apenas, nenhuma gravação enviada ao Storage.
- `npm run lint`: PASS sem erros/avisos após limpeza final de especificidade CSS (48 arquivos).
- `npm run typecheck` e `npm run build`: PASS na versão final.
- `npm run test:e2e`: **42 testes PASS (1.6m)**; após ajustes finais de estilos, quatro checks visuais/teclado/responsividade repetidos e PASS.
- Hooks before/after implement: `.specify/extensions.yml` ausente; nenhum hook a executar.
- Commits locais: `394684b` (infraestrutura/RLS) e `5d7aa58` (auth, cutover privado, redesign e testes).

Evidência visual temporária: `/tmp/echoflow-{landing,signup,catalog,practice}-{1440,375}.png`;
captura reproduzível por `tests/e2e/visual-evidence.spec.ts`, contas sintéticas sem PII real.
Comparação e diferenças no inventário Figma. Capturas não equivalem a validação de dispositivo.

## Correção de autenticação sobre a landing (2026-10-01)

`AuthModal` substitui `SignupModal`: Login, Sign up e Practice now abrem o formulário
sobre a landing, sem mudar a URL. Trocas de modo e recuperação permanecem no modal;
Escape/fechamento restauram foco ao botão de origem. Rotas diretas de autenticação
continuam disponíveis para redirecionamentos protegidos e callbacks.
Lint, typecheck e build: PASS. Nove testes de landing/modal (1440/375 px e login real)
e oito testes de regressão de autenticação: PASS em rodadas focadas. Evidência visual
local: `/tmp/echoflow-login-modal.png`. Nenhum deploy ou configuração remota foi alterado.

## Gates ainda não atendidos

T036: dispositivos reais, entrega email/Google/domínio remotos. T037: termos/privacidade aprovados,
teto de gasto, limites/alertas e tráfego de abuso em ambiente autorizado; autorização específica de
publicação. Contadores locais já implementados/testados, mas eventos de acesso são indicativos
(incluem renders/prefetch e podem ser inflados pelo RPC de uma conta), não auditoria de pessoas.

Google OAuth real, entrega de email, domínio, configuração remota Supabase, texto legal aprovado, limites de abuso, observabilidade, teto de gasto aprovado, políticas remotas e browser em dispositivo com permissão de microfone/reprodução/interrupções exigem validação separada antes de lançamento. Definir métricas de cadastro confirmado → acessos à prática → primeira conclusão por conta sem guardar áudio pessoal. Nenhum desses itens é provado por build ou mocks. Chamadas pagas a provedores de voz não fazem parte desta validação ordinária. Publicação/deploy e operações em produção requerem autorização posterior.

Estratégia de medição proposta: contadores diários agregados de cadastros confirmados (fonte Auth), acessos autenticados à rota de prática (eventos, sem deduplicação de pessoas) e primeiras conclusões por conta (novas linhas em `playlist_completions`). Não comparar os três como funil de usuários únicos. Eventos analíticos não incluem email, ID pessoal, transcrição ou áudio; usar somente agregados diários. Metas de adoção exigem baseline pós-lançamento. Antes de publicar, testar em ambiente de teste que os três sinais são coletados e que limites de solicitações de autenticação/email e áudio respondem ao tráfego de abuso dentro do teto aprovado; configuração remota só após autorização específica.
