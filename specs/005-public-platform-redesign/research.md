# Pesquisa e decisões técnicas

Consultado em 2026-09-29. Estas são decisões de planejamento; não houve integração ou teste de serviço externo.

## Sessão e autorização

**Decisão**: Usar `@supabase/ssr` com cookies, cliente de servidor e browser separados. Validar identidade com mecanismo de verificação do Auth em cada rota, ação e consulta protegida; `proxy.ts` só renova sessão e melhora navegação.

**Justificativa**: Supabase documenta dois clientes para Next SSR e alerta para não confiar em `getSession()` como verificação no servidor. Next 16 chama middleware de Proxy e adverte que funções de servidor precisam da própria autorização. [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Next Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy).

**Alternativas**: Apenas ocultar UI cliente ou depender só do Proxy — não protege Server Functions nem acesso direto; service role em leituras comuns — ignora RLS.

## Dados e RLS

**Decisão**: Tabelas de catálogo com leitura para `authenticated` e sem escrita para clientes; tabela de conclusão com `user_id = auth.uid()` para ler/inserir/atualizar, constraint única por usuário/playlist, grants mínimos. Testar anon, usuário A e usuário B em SQL/integração.

**Justificativa**: Em Supabase, grants e policies são controles distintos; service role ignora RLS. [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [testes de banco](https://supabase.com/docs/guides/local-development/testing/overview).

**Alternativas**: Apenas filtro de aplicação ou testes via service role — não evidenciam isolamento.

## Auth social e email

**Decisão**: Email/senha com confirmação em produção e Google OAuth via Supabase, PKCE/callback e redirecionamentos permitidos; não guardar tokens Google de provedor.

**Justificativa**: Frame Figma mostra Google e email; Supabase exige configuração Google Client ID/Secret, redirect URI e callback para SSR. [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

**Alternativas**: Só email diverge do design; outros provedores não pedidos ampliam escopo.

## Catálogo e áudio

**Decisão**: Migrar metadados da fixture atual para tabelas/seed versionadas, preservar checksums e importar os dez arquivos a bucket privado. Substituir caminhos públicos por objeto estável e servir bytes por rota de áudio que verifica sessão a cada requisição, usa o cliente autenticado para baixar do Storage e responde com `Cache-Control: private, no-store`. Remover/excluir de build os arquivos públicos após verificar paridade e replay. Buscar catálogo no servidor para rotas protegidas. Guardar alinhamento por variante sem alterar timing.

**Justificativa**: specs 002–004 aceitam exatamente cinco frases, duas variantes e replay alinhado. Arquivos em `public/` seriam acessíveis sem sessão, contrariando cadastro obrigatório. docs/IMPLEMENTATION_PLAN.md prevê explicitamente bucket público e leitura anônima, uma decisão legada superada pela solicitação atual. docs/system_architecture.md apresenta URL direta no fluxo e URL temporária para objetos privados no modelo. A nova spec resolve o conflito para esta feature: bucket privado com acesso autenticado, seguido de atualização dos documentos duráveis após aceite.

**Alternativas**: Manter arquivos em `public/` — viola a barreira de acesso; URL assinada curta — continua sendo um link portador utilizável sem sessão durante a validade, portanto não satisfaz FR-014; gerar áudio em tempo real — custo, latência e mudança indevida.

**Seeking**: Como replay alinhado precisa reposicionar áudio, o endpoint autenticado deve aceitar range simples e devolver `206`/`416` conforme HTTP, inclusive revalidando a sessão. [HTTP Range](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests); [Supabase private downloads](https://supabase.com/docs/guides/storage/serving/downloads).

## Progresso

**Decisão**: Persistir somente conclusão por usuário/playlist. A UI rastreia frases praticadas na sessão e grava conclusão depois de gravação e comparação de todas as cinco; operação idempotente. Não persistir áudio, seleção de voz nem progresso parcial.

**Justificativa**: O usuário decidiu explicitamente sobre `Completed`; nenhuma outra persistência foi autorizada. Constraint única evita duplicação. Sucesso do registro deve ser apresentado separadamente do fim da comparação para permitir retry.

**Alternativas**: Salvar cada tentativa/áudio ou badge só na sessão — divergem do escopo/decisão.

## Ambiente e migrações

**Decisão**: Supabase CLI já disponível 2.118.0; usar stack local e migrations SQL versionadas/seed sintética. `supabase db reset` somente no ambiente local isolado, nunca `--linked` em produção. Sem criar projeto remoto nesta fase.

**Justificativa**: [Workflow oficial](https://supabase.com/docs/guides/local-development/cli-workflows) distingue reset local de reset remoto destrutivo. CLI foi verificado no sistema pelo coordenador.

**Alternativas**: Instalar CLI novamente ou editar banco remoto no dashboard — não melhora reprodutibilidade.
