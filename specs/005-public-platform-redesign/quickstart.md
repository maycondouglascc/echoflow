# Guia de validação futura

Nenhum comando abaixo foi executado nesta fase de planejamento. Use apenas no ambiente local isolado após implementação; não apontar CLI para projeto remoto de produção.

## Pré-requisitos

Node/npm da versão do package.json, Docker compatível, Supabase CLI (2.118.0 já instalado), fixtures sintéticas, credenciais locais de teste. Configurar `.env.local` sem comitar segredos. Para Google real, configurar projeto de teste, redirect allowlist e segredo privado. O teste local de email usa a inbox do Supabase local.

## Preparar e verificar localmente

1. Na worktree de implementação, confirmar projeto Supabase local isolado e executar `supabase start`; então `supabase db reset` apenas local para aplicar migrations e seed. Não usar `--linked`.
2. Executar `supabase test db`, verificando grants/RLS como anon, usuário A e B, inclusive catálogo, conclusão e política de Storage.
3. Executar `npm run lint`, `npm run typecheck`, `npm run build` e testes automatizados introduzidos na implementação (`npm run test:e2e` e comandos de integração definidos em package.json).
4. Conferir cinco frases e dez variantes; comparar checksums dos objetos privados aos arquivos de origem e confirmar que nenhuma URL pública antiga nem o endpoint de áudio libera bytes sem login.

## Jornadas observáveis

1. Em janela sem sessão, abrir `/`, acionar Practice now e cadastro; verificar email e Google. Tentar `/home`, `/scenarios/voice-comparison`, `/scenarios/introducing-yourself`, prática e `GET /api/reference-audio/[variantId]` diretamente, inclusive após logout/expiração; nenhum conteúdo ou byte de áudio deve vazar.
2. Com conta A, abrir playlist, trocar entre as duas vozes aceitas, reproduzir, gravar, comparar e avançar pelas cinco frases. O selo Completed aparece após conclusão, sobrevive a reload/login. Falha simulada de persistência oferece retry sem duplicar linha.
3. Com conta B, ver a mesma playlist sem Completed; tentar ler/gravar conclusão de A por API/banco com token B e confirmar negação. Verificar ausência de gravações em tabelas/Storage e que voz volta ao padrão ao recarregar.
4. Buscar termo presente e ausente, limpar busca, alternar estado sem seleção/selecionado. Testar 375 px e 1440 px, teclado, leitor de tela e movimento reduzido. Comparar com [inventário Figma](contracts/figma-inventory.md) e registrar diferenças.
5. Simular auth indisponível, áudio ausente, callback OAuth inválido e `next` externo; exigir falha recuperável sem acesso indevido.

## Checks externos e físicos

Google OAuth real, entrega de email, domínio, configuração remota Supabase, texto legal aprovado, limites de abuso, observabilidade, teto de gasto aprovado, políticas remotas e browser em dispositivo com permissão de microfone/reprodução/interrupções exigem validação separada antes de lançamento. Definir métricas de cadastro confirmado → acessos à prática → primeira conclusão por conta sem guardar áudio pessoal. Nenhum desses itens é provado por build ou mocks. Chamadas pagas a provedores de voz não fazem parte desta validação ordinária. Publicação/deploy e operações em produção requerem autorização posterior.

Estratégia de medição proposta: contadores diários agregados de cadastros confirmados (fonte Auth), acessos autenticados à rota de prática (eventos, sem deduplicação de pessoas) e primeiras conclusões por conta (novas linhas em `playlist_completions`). Não comparar os três como funil de usuários únicos. Eventos analíticos não incluem email, ID pessoal, transcrição ou áudio; usar somente agregados diários. Metas de adoção exigem baseline pós-lançamento. Antes de publicar, testar em ambiente de teste que os três sinais são coletados e que limites de solicitações de autenticação/email e áudio respondem ao tráfego de abuso dentro do teto aprovado; configuração remota só após autorização específica.
