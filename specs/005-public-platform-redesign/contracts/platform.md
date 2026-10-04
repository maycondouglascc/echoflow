# Contratos da plataforma

## Rotas e autorização

| Superfície | Sem sessão | Com sessão | Evidência |
|---|---|---|---|
| `/` landing | 200, CTA cadastro/entrada, sem frases/áudio | Pode ir à área logada | Playwright anônimo/autenticado |
| `/login`, `/signup` | Formulários email e Google | Redirecionar a `/home` | E2E de fluxos |
| `/auth/callback` | Aceitar apenas callback válido e destino interno permitido | Criar/atualizar sessão e redirecionar | E2E de sucesso/falha e open redirect |
| `/home`, `/scenarios/[id]`, `/practice/[phraseId]` | Redirecionar para `/login?next=...`, sem payload protegido | Checar usuário no servidor antes de buscar e renderizar | Teste direto sem cookie, cookie expirado |
| Legados `/scenarios/voice-comparison` e `/scenarios/introducing-yourself` | Mesmo bloqueio, sem fixture publicada | Redirecionar para rota protegida equivalente | Teste direto anônimo nas duas URLs antigas |
| Leitura/mutação de catálogo, conclusão e `GET /api/reference-audio/[variantId]` | 401/redirect sem dados | Revalidar sessão e políticas a cada operação | Integração A/B/anon |

O parâmetro `next` aceita somente caminho relativo interno conhecido; caminhos externos ou `//` caem em `/home`. Respostas privadas não entram em cache público. Proxy atualiza cookies, mas não substitui verificação na função de servidor.

## Auth

- Email/senha: cadastro com confirmação de email em produção; mensagem de confirmação pendente; login inválido sem sessão; recuperação por email. Para email já cadastrado, mostrar resposta neutra de solicitação recebida e orientar entrada/recuperação, sem confirmar a existência da conta. O modo local usa inbox de teste.
- Google: OAuth com callback PKCE e allowlist de origem/redirecionamento. Cancelamento/falha retorna a fluxo de entrada recuperável. Client Secret apenas na configuração privada do provedor.
- Saída: encerrar a sessão do navegador atual e negar novas requisições desse navegador a rotas, catálogo e áudio em navegação/refresh. Outras sessões/dispositivos permanecem ativos; uma ação global de logout está fora de escopo. O navegador pode manter bytes já baixados em buffer; o produto não promete apagá-los retroativamente.

## Catálogo e áudio

- Resposta de playlist publicada contém identificador, título, descrição, ordem e `completed` derivado da conta atual.
- Lista de frases contém ordem, categoria e texto; variantes ativas indicam modelo, voz e disponibilidade, sem divulgar caminho do objeto privado ao visitante.
- Leitura de áudio usa ID de variante em `GET /api/reference-audio/[variantId]`. O servidor verifica sessão, publicação de playlist/frase e variante ativa, baixa do bucket privado com o contexto autenticado e transmite bytes com tipo correto e `Cache-Control: private, no-store`. Para um `Range: bytes=` simples e válido, responde `206` com `Content-Range`, `Content-Length` e `Accept-Ranges: bytes`; para intervalo fora do arquivo, `416` com `Content-Range: bytes */<total>`. Sem Range, responde `200` com arquivo completo. A autorização é repetida em cada pedido, inclusive ranges. O endpoint não devolve link de Storage. Variantes arquivadas, IDs desconhecidos e visitante recebem erro sem bytes. Arquivo ausente produz erro recuperável, nunca fallback de voz. Verificar seeking/replay de palavra com payload real.
- Busca/filtro local da única playlist inicial deve suportar termo sem correspondência e limpar filtro; nenhuma playlist extra é inventada.

## Conclusão

- A UI só solicita conclusão após gravação e comparação de todas as frases da playlist naquela sessão; o servidor valida usuário e playlist, deriva `user_id` da sessão e faz upsert idempotente. O servidor não certifica que áudio foi capturado no dispositivo, pois gravações não saem do navegador; o selo é um estado pessoal de conclusão, sem implicação de avaliação auditável.
- A linha `playlist_completions` tem chave `(user_id, playlist_id)` e timestamp. Não armazena áudio, texto falado, escolha de voz ou progresso parcial.
- A conta A não pode ler/inserir/alterar linha de B, mesmo chamando API/banco diretamente. Falha de rede mantém a UI sem selo novo e oferece nova tentativa; sucesso aparece após reload/login.

## UI e estados

Landing: hero azul, beta gratuito, CTA Practice now, Sign up/Login; modal Create your account com Google ou email e link legal verdadeiro do EchoFlow antes de publicar. Área logada: Available playlists, filtro, badge Completed derivado do banco, No playlist selected, playlist selecionada e controles de prática atuais. `Alice` e `Mode 1` são placeholders: duas vozes existentes e único modo atual permanecem. Foco, labels, teclado, reduced motion e layout responsivo são parte do contrato.

## Falhas e limites

- Supabase indisponível: não liberar dados protegidos; mostrar retry para autenticação/catálogo/conclusão.
- Sessão expirada: não completar mutação nem transmitir referência; redirecionar para login; áudio pessoal em memória não sobe automaticamente.
- Buckets e migrations remotos, Google OAuth, domínio, email transacional e texto legal exigem configuração/revisão humana antes da publicação.
