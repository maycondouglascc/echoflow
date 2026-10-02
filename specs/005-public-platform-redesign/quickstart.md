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

## Evidência de refinamento visual (T039, 2026-10-01)

- Cinco skills Emil instaladas antes dos ajustes; decisões, oportunidades rejeitadas e
  revisão de motion em [design-polish.md](design-polish.md), verdict **Approve**.
- Hero conserva largura/altura e tipografia em 960/1024/1200/1440/1543/1864 px; coluna
  em 320/375/760/959 px. Text-wrap balance e “It’s free!” indivisível removem a viúva.
- PasswordField preserva valor ao mostrar/esconder, começa mascarado, tem placeholder
  de pontos e toggle com nome acessível/aria-pressed/alvo de 44 px. Fechamento limpa o formulário.
- Motion: CSS starting-style, 250 ms na abertura; WAAPI 180 ms na troca com interrupção,
  opacity/transform apenas, curva forte compartilhada. Reduced-motion: fade 120 ms;
  teclado imediato. Modal curto tem scroll interno e close inteiro (375×556, y=16).
- `npm run lint` / `npm run typecheck`: PASS na versão final (50 arquivos de lint).
- `npm run build`: bloqueado pelo ambiente, Turbopack falha ao abrir porta interna
  com `Operation not permitted`, inclusive na tentativa escalada. Alternativa oficial
  `npm run build -- --webpack`: **PASS**, sem mudar scripts, dependências ou CI.
- `npm run test:e2e`: **61 PASS (2.2m)**; após ajuste final de especificidade CSS
  keyboard/reduced-motion, rebuild Webpack + **12 testes de polish PASS (12.4s)**.
- Capturas revisadas: `/tmp/echoflow-polish-landing-{1864,1024,375,320}.png`,
  `/tmp/echoflow-polish-final-signup-1543.png`, `/tmp/echoflow-polish-final-recovery.png`,
  `/tmp/echoflow-polish-transition-login.png` (playback .2),
  `/tmp/echoflow-polish-final-short-modal.png`. Simulação não prova dispositivo real.
- Nenhuma alteração de backend/RLS/migrations, dependência, push, deploy ou operação remota.

## Provisionamento remoto autorizado (T040, 2026-10-01)

- CLI 2.118.0 já autenticado; projeto `echoflow`, ref `hllsxshahgvdqhzxdmef`, vinculado
  ao checkout isolado. Antes da operação: zero tabelas públicas, usuários, buckets e objetos.
- Backup local ignorado e restrito: `supabase/.temp/remote-before-hllsxshahgvdqhzxdmef-RToIcV/`,
  schema público, dados public/auth/storage e configuração representável via CLI.
  O CLI não exporta integralmente segredos/configurações não representáveis; nenhum serviço
  externo foi reconfigurado. Não é um teste de restauração ou backup hospedado permanente.
- Três migrations aplicadas e seed inicial: uma playlist, cinco frases, dez variantes ativas
  e três arquivadas. Treze objetos no bucket privado `phrase-audio`, SHA-256 de cada origem
  e destino conferido; importação sem sobrescrita. Importador local continua recusando cloud.
- Auth `site_url=http://127.0.0.1:4177`; callbacks exatos em `127.0.0.1:4177/auth/callback`
  e `localhost:4177/auth/callback`. Confirmação de email preservada; somente duas propriedades
  alteradas, demais configurações remotas mantidas. Usar origem 127.0.0.1 para esta prévia.
- `node scripts/configure-remote-preview.mjs --confirm-project=hllsxshahgvdqhzxdmef`
  salva somente URL, chave anon pública e origem em `.env.remote.local` ignorado, modo 600.
  `node scripts/preview-remote.mjs --build` compila o perfil em `.next-remote`; depois
  `node scripts/preview-remote.mjs` inicia a prévia de produção em **4177**.
  `.env.local`, Docker e testes 4175 continuam locais; CI não usa cloud/credenciais remotas.
- Smoke remoto explícito: RLS como anon e duas identidades autenticadas; catálogo protegido,
  conclusão própria, isolamento de leitura e inserção entre usuários, update/delete negados,
  Storage privado e variantes arquivadas negadas, RPC anônimo negado. Login real no navegador,
  catálogo/prática e endpoint de áudio 200/206 autenticado e 401 após limpar cookies: PASS.
  Contas sintéticas removidas (não foram criadas contas pessoais nem enviados emails).
- Duas execuções do smoke geraram agregados de teste em UTC **2026-10-02**: quatro cadastros
  confirmados, duas conclusões e um acesso. Não são adoção real; foram preservados, não zerados.
- Advisor de segurança: um WARN para `record_practice_access` SECURITY DEFINER executável por
  authenticated. É intencional para incremento agregado sem grant de escrita na tabela;
  search_path vazio, anon negado, sem PII. Contador pode ser inflado por conta autenticada,
  limitação já aceita; não é auditoria/funil de usuários. Nenhuma proteção foi relaxada.
- Lint, typecheck, build Webpack e três testes determinísticos do perfil remoto: PASS.
  A primeira tentativa de smoke navegou antes de iniciar o servidor e falhou sem vazamento;
  contas foram limpas. Uma leitura transitória de Storage falhou; repetição idempotente passou.
- Para cadastrar sua conta, usar email de membro da equipe Supabase e abrir confirmação no
  mesmo navegador. Entrega real/recuperação ainda não verificadas. SMTP padrão restringe
  destinatários à equipe e atualmente duas mensagens/hora: [documentação oficial](https://supabase.com/docs/guides/auth/auth-smtp).
  SMTP público e Google OAuth aguardam credenciais próprias; não solicitar segredos no chat.
  Nenhuma publicação/deploy/push foi realizada; dispositivos, email público e release gates
  T036/T037 permanecem abertos. Configuração remota deixou de ser pendência de T040 apenas.

## Refinamento de prática e performance (T041–T045, 2026-10-02)

- Diagnóstico: prévia remota anterior executava `next dev`, com compilação fria de rotas
  (login/catalog ~9.3s, dos quais ~8.5s de compilação; cenário ~6.4s/~4.6s de compilação).
  Além disso, layout/página repetiam Auth e o cenário fazia consultas sequenciais; cada
  reprodução voltava a baixar referência autenticada. Não é evidência de lentidão do banco
  sozinho nem uma medição de Core Web Vitals.
- Correções: prévia remota em produção com bundle isolado `.next-remote`; Auth deduplicado
  por render, claims no Proxy e **getUser mantido nas operações protegidas**; playlist,
  frases, variantes e conclusão na mesma consulta RLS. Suspense entrega somente skeleton
  neutro antes de autorização. Sem migration, cache pessoal compartilhado ou alteração de CI.
- Smoke remoto autorizado mediu um login → catálogo renderizado em **1640ms** e um clique
  de playlist → prática renderizada em **886ms**. Rede/Supabase externos continuam influindo;
  amostra única, não SLA ou comparação percentual entre perfis frios e quentes.
  RLS anon/A/B, conclusão própria, Storage privado e Range: PASS; contas temporárias removidas.
  Os smokes adicionam eventos agregados sintéticos; eles foram preservados, não são adoção real.
- Referência atual/próxima pré-carregada em memória; fetch deduplicado e até quatro entradas
  (incluindo recentes e requests em voo). Abort e revogação de blobs ao sair; HTTP no-store,
  nada em localStorage/IndexedDB e nenhum upload de gravação pessoal.
- Cadastro mostra “Check your email”; primeiro acesso **autenticado** explica e solicita
  microfone, sem MediaRecorder, e libera tracks imediatamente. Recusa não bloqueia navegação,
  tem retry e “Not now”. Privacidade factual em details separado do painel de prática;
  não substitui a política jurídica de T037. Conta pendente de confirmação não acessa prática.
- Speak mantém texto/ícone em retakes; troca de voz preserva take, readiness e comparações.
  Compare acionável sem take orienta a gravar, mas mantém interlock durante captura/playback.
  Feedback rotineiro fica assistivo; erros e timer continuam visíveis. Previous/count e replay
  avulso removidos; Next e sidebar preservados. Nenhum breakpoint novo: padrões responsivos
  existentes mantidos, footer alinhado à direita em todas as larguras.
- Fim de fala: RMS ≥ .02 por 200ms, depois 1500ms de silêncio; silêncio inicial/ruído breve
  ignorados, pausa menor preservada, Stop/30s continuam fallback. Detector de energia local,
  não reconhecimento linguístico. Ruído contínuo pode exigir Stop; calibrar em dispositivo real.
- Motion guiado pelas skills de animação/performance: entrada entre rotas com opacity e
  translateY(4px), 180ms; reduced-motion apenas fade 120ms, teclado imediato. Sem animação
  no carregamento inicial, delay artificial ou animação do layout que altere o hero.
- Revisão focada da implementação: sem novos segredos client-side, getUser/RLS/revogação
  preservados; tracks/AudioContext/buffer e callbacks assíncronos têm cleanup/invalidação.
  Revisão local, não parecer independente novo. Hardware e serviços externos continuam abertos.

### Verificação final deste refinamento

- `npm run lint` (58 arquivos), `npm run typecheck`: PASS.
- `npm run build`: bloqueado pelo Turbopack ao abrir porta interna (`Operation not permitted`).
  `npm run build -- --webpack`: PASS; build remoto isolado também PASS. Sem alteração do gate.
- `npm run test:db`: **34 PASS**; dois checks de fim de fala e três de perfil remoto via Node:
  **5 PASS**; `npm run test:audio-generator`: **12 PASS** sem provedor pago.
- Conclusão + oito testes de refinamento: **9 PASS (30.3s)**; rodada completa final:
  **69 PASS (2.6m)**. Cookies forjados/revogação, RLS, Range, conclusão por conta, cleanup,
  ausência de upload, reprodução/word replay com áudio decodificado e motion incluídos.
- Rodadas anteriores localizaram race de status antes do download, mudança de src durante
  word replay e animação inicial alterando medição do hero: corrigidos sem remover assertions.
  Fixture de contas agora pagina listUsers (evita duplicação após muitas rodadas). Uma execução
  foi interrompida por servidor local órfão; reinício em sessão própria e suíte inteira passaram.
- Capturas finais revisadas: `/tmp/echoflow-final-practice-{972,375,1440}.png`.
  Todos os viewports usam os mesmos tokens e breakpoints existentes; simulação não prova hardware.
- Convergência: acceptance T041–T045 implementado/verificado; T036/T037 continuam pendentes
  exclusivamente para hardware, email/Google/termos/limites e publicação. Nenhum push/deploy,
  nova migration, alteração de RLS, credencial, SMTP ou provider pago neste refinamento.

## Modal de microfone e página de privacidade (T046–T049, 2026-10-02)

- Banner/details de microfone removidos do topo. Onboarding reutiliza `ModalDialog` com
  AuthModal: mesma superfície 400px azul, Nunito, close e trap de foco, backdrop/250ms;
  reduced-motion fade120ms e teclado imediato. Mascote original `kitten.png` reutilizado,
  sem gerar/improvisar asset diferente das referências da marca.
- Modal aparece na primeira entrada da conta/aba; navegador pede permissão **apenas após
  Enable microphone** (substitui timer300ms). Sucesso libera tracks/fecha sem gravação.
  Denied oferece retry; Escape/close/Not now dispensam e retornam foco ao conteúdo.
  Stream recebido após dismiss/unmount é imediatamente liberado, sem reabrir ou gravar.
- `/privacy`: página pública Server Component estática, sem Auth, catálogo ou pedido de mic;
  textos factuais sobre gravações, conta/conclusão/Supabase, sessão e contadores. Links em
  landing, conta e modal. Não é política legal aprovada: contato/retenção/termos de lançamento
  dependem do responsável e permanecem em T037; nenhuma promessa jurídica foi inventada.
- Mesmo reflow existente para modal; scroll interno em viewport baixo. Página usa padding
  fluido e coluna de leitura de no máximo760px, sem breakpoint novo ou cartões por parágrafo.
  Capturas revisadas: `/tmp/echoflow-microphone-modal-{1440,972,375}.png` e
  `/tmp/echoflow-privacy-{1440,972,375}.png`; menor viewport375×556 mantém close na tela.
- Lint61 arquivos/typecheck: PASS. Build padrão continua falhando na restrição Turbopack de
  porta interna; builds Webpack local e remoto isolado: PASS, sem mudar scripts/CI/locks.
- HEAD anônimo `/privacy` na prévia4177:200; sem alteração no projeto Supabase ou deploy.
  Rodada completa:74 PASS/1 falha (3.5m); teste legado de confirmação tentava logout por trás
  do novo modal. Jornada adaptada para dispensar via Not now, preservando asserts PKCE/recovery.
  Repetição final de auth/prática/privacy: **22 PASS (55.1s)**, incluindo o caso corrigido.
  Retorno de foco também corrigido e validado (link de conteúdo antes do botão de filtro).
- Convergência T046–T049: acceptance implementado; nenhuma dependência/credencial/migration/RLS
  ou operação remota de dados modificada, nem push/deploy. Hooks before/after ausentes.
  T036/T037 permanecem abertos para hardware, política jurídica completa e release.

## Gates de lançamento restantes

T036: dispositivos reais, entrega email/Google/domínio remotos. T037: termos/privacidade aprovados,
teto de gasto, limites/alertas e tráfego de abuso em ambiente autorizado; autorização específica de
publicação. Contadores locais já implementados/testados, mas eventos de acesso são indicativos
(incluem renders/prefetch e podem ser inflados pelo RPC de uma conta), não auditoria de pessoas.

Google OAuth real, entrega de email, domínio, configuração remota Supabase, texto legal aprovado, limites de abuso, observabilidade, teto de gasto aprovado, políticas remotas e browser em dispositivo com permissão de microfone/reprodução/interrupções exigem validação separada antes de lançamento. Definir métricas de cadastro confirmado → acessos à prática → primeira conclusão por conta sem guardar áudio pessoal. Nenhum desses itens é provado por build ou mocks. Chamadas pagas a provedores de voz não fazem parte desta validação ordinária. Publicação/deploy e operações em produção requerem autorização posterior.

Estratégia de medição proposta: contadores diários agregados de cadastros confirmados (fonte Auth), acessos autenticados à rota de prática (eventos, sem deduplicação de pessoas) e primeiras conclusões por conta (novas linhas em `playlist_completions`). Não comparar os três como funil de usuários únicos. Eventos analíticos não incluem email, ID pessoal, transcrição ou áudio; usar somente agregados diários. Metas de adoção exigem baseline pós-lançamento. Antes de publicar, testar em ambiente de teste que os três sinais são coletados e que limites de solicitações de autenticação/email e áudio respondem ao tráfego de abuso dentro do teto aprovado; configuração remota só após autorização específica.
