# Feature Specification: Plataforma pública e redesign EchoFlow

**Feature Branch**: `codex/public-platform-plan`

**Created**: 2026-09-29

**Status**: Draft — planejamento, sem implementação

**Input**: Tornar o protótipo local uma plataforma pública inicialmente gratuita, exigir cadastro para frases e prática, usar Supabase para banco e autenticação, e redesenhar landing e área logada conforme os nós Figma 69:1150 e 72:1683. O usuário fornecerá links de skills de motion, desenvolvimento web da Vercel e front-end design antes do trabalho de design.

Os frames inspecionados mostram landing com chamada de beta gratuito e modal de cadastro por Google ou email; área logada com playlists disponíveis, busca/filtro, estado vazio ou selecionado e controles de prática. O texto legal de Mobbin no frame é um placeholder e não representa conteúdo aprovado do EchoFlow.

## Clarifications

### Session 2026-09-29

- Q: O selo "Completed" deve persistir por usuário? → A: Sim, salvar por usuário quando ele conclui uma playlist.
- Q: "Puck / Alice" e "Mode 1" são opções finais? → A: São placeholders; preservar as opções de voz e modo já aceitas pelo projeto.

### Session 2026-10-01

- Correção solicitada: Login, Sign up e Practice now abrem formulários em modal sobre a landing,
  sem navegar para uma página separada. Alternar cadastro/entrada e abrir recuperação mantém o
  mesmo modal; Escape/fechar devolve o foco ao acionador. Rotas diretas de autenticação continuam
  disponíveis para callbacks, recuperação e redirecionamentos protegidos.
- Refinamento visual: hero desktop com largura estável de 894 px onde cabe (a partir de
  960 px); abaixo disso, coluna com título/descrição/CTA antes de How it works e assets.
  Textos devem ter linhas equilibradas, sem separar “It’s free!”. Campo de senha mascarado
  por padrão, placeholder de pontos e controle acessível de mostrar/esconder sem perder valor.
  Abertura e troca signup/login/recover têm movimento sutil de até 250 ms, sem bloquear ações;
  teclado é imediato e reduced-motion remove deslocamento/escala.

## User Scenarios & Testing

### User Story 1 - Entrar na prática com uma conta (Priority: P1)

Um visitante conhece o EchoFlow pela landing pública, cria uma conta gratuita, entra e chega à prática de frases. Ao sair, perde acesso ao conteúdo protegido; pode entrar novamente com sua conta.

**Why this priority**: Cadastro obrigatório para frases e prática é a mudança central do produto.

**Independent Test**: Partindo de um navegador sem sessão, criar conta, confirmar o endereço quando solicitado, entrar, abrir uma frase e sair; verificar também as tentativas diretas sem sessão.

**Acceptance Scenarios**:

1. **Given** um visitante sem sessão, **When** abre a landing, **Then** pode ver a proposta do produto, o aviso de beta gratuito e caminhos claros para cadastro ou entrada, sem ver a lista completa de frases nem a prática.
2. **Given** um visitante sem sessão, **When** abre diretamente uma rota de frases ou prática, **Then** é encaminhado para entrar e, após autenticação, pode voltar ao destino solicitado.
3. **Given** uma pessoa com conta ativa, **When** entra, **Then** tem acesso à área logada e consegue iniciar a prática existente.
4. **Given** uma pessoa autenticada, **When** sai, **Then** novas requisições a conteúdo protegido são negadas, inclusive após atualizar a página; bytes já recebidos pelo navegador não podem ser revogados retroativamente.
5. **Given** credenciais inválidas, confirmação pendente ou serviço de autenticação indisponível, **When** tenta entrar, **Then** recebe estado de erro compreensível, sem acesso ao conteúdo, e pode tentar novamente.
6. **Given** o modal de cadastro aberto, **When** escolhe Google ou email, **Then** segue o fluxo correspondente; nenhum texto legal de outra marca aparece como termo do EchoFlow.

### User Story 2 - Consultar frases em catálogo compartilhado (Priority: P2)

Uma pessoa autenticada percorre os cenários e frases disponíveis e usa a referência de áudio correta para praticar. O conteúdo é compartilhado entre contas; gravações pessoais permanecem na sessão do navegador.

**Why this priority**: O catálogo precisa sobreviver ao protótipo local e servir usuários diferentes sem romper o fluxo de áudio aceito.

**Independent Test**: Entrar com duas contas de teste, consultar o mesmo catálogo, reproduzir as duas vozes e confirmar que áudio pessoal de uma conta não aparece para a outra nem é armazenado no catálogo.

**Acceptance Scenarios**:

1. **Given** uma conta autenticada, **When** abre o catálogo, **Then** vê as playlists/cenários disponíveis e as cinco frases atuais de Voice Comparison, preservando texto, ordem, variantes e alinhamentos publicados.
2. **Given** uma frase disponível, **When** escolhe uma voz e pratica, **Then** a referência, o destaque de palavras e o replay de palavra mantêm o comportamento aceito nas features 002–004.
3. **Given** um arquivo de áudio ausente ou inacessível, **When** a pessoa tenta reproduzi-lo, **Then** vê uma falha recuperável, sem troca silenciosa de voz e sem iniciar gravação.
4. **Given** duas contas distintas, **When** praticam a mesma frase, **Then** ambas leem o mesmo conteúdo publicado, mas nenhuma obtém gravação pessoal ou dados privados da outra.
5. **Given** uma pessoa concluiu a prática de todas as frases da playlist, **When** retorna à lista, **Then** vê "Completed" para aquela playlist; ao entrar novamente em sua conta, o estado continua visível.
6. **Given** duas contas distintas, **When** só uma conclui a playlist, **Then** a outra não vê "Completed" em sua própria lista e não consegue consultar nem alterar o registro de conclusão alheio.

### User Story 3 - Usar a nova landing e a área logada (Priority: P3)

Visitantes e pessoas autenticadas veem, respectivamente, a nova landing e a nova área logada baseadas nos dois nós Figma fornecidos, em telas móveis e desktop, com navegação e controles acessíveis.

**Why this priority**: O redesign é solicitado, mas deve seguir os contratos de acesso e prática já definidos.

**Independent Test**: Comparar ambas as páginas e seus estados com os frames Figma, percorrer navegação por teclado, verificar layout móvel e desktop e concluir o caminho landing → cadastro → área logada → prática.

**Acceptance Scenarios**:

1. **Given** um visitante, **When** abre a landing, **Then** vê as seções, conteúdo, hierarquia, identidade visual e chamadas para ação do frame de landing aprovado.
2. **Given** uma pessoa autenticada, **When** abre a área logada, **Then** vê a lista de playlists disponíveis (apenas Voice Comparison nesta etapa), busca/filtro, estado "No playlist selected" sem seleção e, ao selecionar a playlist, frases e controles Play reference, Speak, Compare e Next phrase.
3. **Given** uma busca sem correspondência, **When** a pessoa filtra a lista, **Then** vê zero resultados e um meio de limpar o filtro; o conteúdo original volta ao limpar.
3. **Given** teclado, leitor de tela ou preferência por movimento reduzido, **When** percorre as páginas, **Then** todos os controles essenciais são alcançáveis, identificáveis e utilizáveis, e a animação respeita a preferência.
4. **Given** tela estreita, **When** abre qualquer uma das duas páginas, **Then** o conteúdo e as ações essenciais permanecem legíveis e operáveis sem rolagem horizontal.

### Edge Cases

- Uma sessão expira durante a prática: a próxima leitura protegida exige nova autenticação; uma gravação em memória não é enviada nem exposta.
- Links diretos e redirecionamentos pós-login não podem levar a destinos externos arbitrários.
- Conta recém-criada sem confirmação, email duplicado e recuperação de senha têm respostas claras que não revelam se terceiros possuem conta além do necessário ao fluxo.
- Ao cadastrar email já existente, a interface mostra resposta neutra equivalente à de solicitação recebida e orienta tentar entrar ou recuperar acesso, sem confirmar a existência da conta.
- A autenticação por Google é cancelada ou falha: o visitante retorna ao modal/entrada com erro recuperável, sem sessão criada.
- A pessoa repete uma frase concluída ou revisita a playlist: o estado de conclusão já registrado não duplica nem desaparece; um erro ao salvar conclusão é mostrado e pode ser repetido sem perder a gravação que ainda está na página.
- O catálogo vazio, a falta de uma variante e falhas temporárias do serviço precisam de estados explícitos.
- Disponibilidade de microfone e reprodução em dispositivo real continuam verificações manuais obrigatórias; testes simulados não as substituem.

## Requirements

### Functional Requirements

- **FR-001**: A landing MUST permanecer pública e fornecer caminhos distintos e funcionais para cadastro e entrada. Login, Sign up e Practice now MUST abrir formulários modais sobre a landing sem navegação; a alternância cadastro/entrada e recuperação permanece no modal.
- **FR-002**: O cadastro inicial MUST ser gratuito, e frases, catálogo completo e prática MUST exigir uma sessão autenticada válida em acessos diretos e pela navegação.
- **FR-003**: O produto MUST permitir cadastro/entrada por email e por Google, confirmação de email no fluxo de produção, saída e recuperação de acesso por email; falhas MUST ser recuperáveis sem concessão de acesso.
- **FR-004**: Cada leitura de conteúdo protegido MUST verificar a sessão no servidor; conclusão de playlist MUST ter isolamento por proprietário no servidor e no banco.
- **FR-005**: O catálogo compartilhado MUST preservar as cinco frases e as duas referências ativas da experiência atual, sua ordem, metadados de áudio e alinhamento por palavra; baselines arquivados não viram escolha ativa.
- **FR-006**: A prática MUST preservar reprodução sequencial, gravação local temporária, escolha de voz, destaque e replay de palavra, inclusive tratamento de falha e movimento reduzido, conforme specs/001–004.
- **FR-007**: Gravações pessoais e seleção de voz MUST continuar restritas à sessão de página nesta etapa; não devem ser persistidas, enviadas ao provedor ou compartilhadas entre contas. Somente a conclusão da playlist é persistida por conta.
- **FR-008**: A landing e a área logada MUST refletir os respectivos frames Figma fornecidos, cobrindo hero azul, indicação de beta gratuito, chamadas de cadastro/entrada e modal com Google/email na landing; lista de playlists, busca/filtro, estados vazio e selecionado e controles de prática na área logada. Busca/filtro MUST operar sobre o catálogo publicado, inclusive zero resultado e limpeza.
- **FR-009**: As duas páginas MUST permitir navegação por teclado, nomes acessíveis, foco visível, leitura por tecnologia assistiva, movimento reduzido e uso em telas móveis e desktop.
- **FR-010**: A transição do protótipo para a plataforma pública MUST preservar uma referência recuperável da versão atual e incluir plano de reversão antes de publicar.
- **FR-011**: Cada mudança de comportamento MUST ter uma verificação automatizada de regressão; autenticação e isolamento de dados MUST ser testados com identidades distintas, além de verificações manuais para áudio/microfone reais.
- **FR-012**: O texto de termos e privacidade de marca alheia no frame MUST ser substituído por conteúdo do EchoFlow antes da publicação; links legais só podem apontar para páginas realmente disponíveis e aprovadas.
- **FR-013**: O selo "Completed" MUST ser persistido por conta após a pessoa completar a prática de cada frase da playlist, incluindo uma gravação e comparação para cada uma; repetição não cria conclusão duplicada. Só o proprietário pode consultar ou alterar seu estado, sem compartilhar áudio pessoal.
- **FR-014**: Texto, catálogo e arquivos de referência de áudio MUST ser inacessíveis sem sessão válida, inclusive por URL direta ao endpoint de áudio ou ao Storage; a versão pública planejada de `phrase-audio` em docs/IMPLEMENTATION_PLAN.md fica superada para esta feature.

### Key Entities

- **Conta**: identidade autenticada com email verificado conforme fluxo escolhido; determina acesso ao conteúdo protegido.
- **Cenário**: conjunto ordenado de frases compartilhadas e publicadas.
- **Frase**: texto, categoria, ordem e estado de publicação de uma prática.
- **Variante de áudio**: referência de uma frase em modelo/voz específicos, formato, localização estável, proveniência e alinhamentos de palavras.
- **Sessão de prática**: estado temporário da página, incluindo seleção de voz e gravação pessoal em memória; não é dado persistido nesta feature.
- **Conclusão de playlist**: estado persistente ligado à conta e à playlist, com data de conclusão; não armazena gravação nem transcrição da voz pessoal.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Em testes automatizados, 100% das rotas de frase e prática negam conteúdo a visitante sem sessão; a landing continua acessível.
- **SC-002**: Em teste de ponta a ponta, uma nova conta consegue chegar da landing à primeira prática após concluir as etapas de autenticação configuradas, e saída impede novo acesso direto.
- **SC-003**: As cinco frases existentes e suas dez variantes ativas continuam associadas corretamente, sem perda de texto, ordem, voz ou alinhamento.
- **SC-004**: Testes com duas identidades demonstram que uma conta não lê, cria ou altera conclusão de outra; ambas leem o mesmo catálogo publicado e nenhuma gravação pessoal é criada em banco ou Storage.
- **SC-005**: Em larguras de 375 px e 1440 px, as duas páginas apresentam ações essenciais sem rolagem horizontal; o fluxo principal pode ser concluído por teclado e com movimento reduzido.
- **SC-006**: Antes de publicar, uma revisão visual compara os dois frames Figma com as páginas correspondentes e registra diferenças aceitas ou corrigidas; verificações reais de reprodução e microfone são registradas em dispositivo.
- **SC-007**: Busca/filtro e estados vazio/selecionado da área logada são exercitados em testes, inclusive zero resultado e limpeza; os controles de prática preservam o fluxo aceito, sem texto legal de terceiros ou opções de áudio inexistentes.
- **SC-008**: A conclusão é gravada uma única vez após as cinco frases serem praticadas com comparação, reaparece após nova entrada e nunca aparece para uma segunda conta que não concluiu.
- **SC-009**: Antes do lançamento, há medição definida para cadastros confirmados, acessos à prática e primeiras conclusões de playlist por conta, sem armazenar áudio pessoal; acessos são eventos e não pessoas únicas, e metas de adoção só serão definidas com dados reais posteriores.

## Assumptions

- Cadastro por email e senha, com confirmação e recuperação por email, e Google OAuth compõem a experiência de cadastro apresentada no Figma. Cobrança não entra nesta etapa.
- O produto continua focado no cenário atual de cinco frases e duas vozes; as quatro categorias de dez frases e importação de vídeo descritas como visão futura em docs/EchoFlow.md não serão inventadas nesta entrega.
- O banco serve identidade, catálogo compartilhado e conclusão de playlist por conta. Histórico detalhado de frase, métricas de desempenho e armazenamento de gravações não entram nesta feature.
- Os nós 69:1150 e 72:1683 correspondem, respectivamente, à landing e à área logada, conforme inspeção Figma de 2026-09-29.
- O usuário decidiu que "Completed" persiste por conta. O critério operacional proposto pelo PM é concluir cada frase com uma gravação e comparação na mesma sessão da playlist; uma interrupção não marca as frases não praticadas, e progresso parcial não é salvo. "Mode 1" e "Alice" no frame são placeholders; a interface usará as duas vozes aceitas e o único modo de prática atual.
- Como gravações não são enviadas ao servidor, o selo representa conclusão declarada pelo fluxo de UI do próprio usuário, sem prova server-side de execução física da fala. O servidor garante somente identidade, playlist válida e isolamento do estado pessoal.
- Sair encerra a sessão do navegador/dispositivo atual; sessões em outros dispositivos não são encerradas por esta ação. Uma função de "sair de todos os dispositivos" não entra nesta feature.
- O desenho de lançamento tem somente uma playlist disponível; busca/filtro aplica-se a ela e prepara a interface para mais conteúdo sem inventar frases.
- Termos e política de privacidade precisam de texto e publicação aprovados pelo responsável pelo produto antes de disponibilizar cadastro público; esta spec não cria conteúdo jurídico.
- Antes da publicação gratuita, o responsável pelo produto deve definir orçamento/teto operacional e a equipe deve configurar limites de abuso/observabilidade para cadastro, email e tráfego de áudio. Nenhum valor numérico de gasto foi presumido pelo PM.
- A exigência nova de cadastro obrigatório supersede o plano legado de leitura pública de cenários/frases e bucket `phrase-audio` público em docs/IMPLEMENTATION_PLAN.md. docs/system_architecture.md contém direções conflitantes (URL direta no fluxo e URL assinada para objetos privados no modelo); esta feature escolhe áudio privado com acesso autenticado. Atualizar os documentos duráveis após aceite da spec.
- Antes do slice de design, instalar e usar as skills fornecidas pelo usuário: `anthropics/skills/frontend-design`, `vercel-labs/agent-skills/web-design-guidelines`, `vercel-labs/agent-skills/vercel-react-best-practices` e `kylezantos/design-motion-principles/design-motion-principles` via skills.sh. A inspeção Figma precisa resolver conteúdos e estados exatos antes de implementar o redesign.
- Esta spec autoriza planejamento e validação documental; instalação de dependências, mudanças de aplicação e publicação ficam para etapa posterior autorizada.

## Autorizações posteriores (2026-10-01)

A implementação foi autorizada posteriormente via `$speckit-implement`. O responsável criou
o projeto Supabase `echoflow` (`hllsxshahgvdqhzxdmef`) e autorizou explicitamente seu
provisionamento via CLI: backup, migrations, catálogo, áudios privados, Auth URLs e
credenciais locais para visualizar a área interna. A prévia remota usa porta 4177 e não
substitui o ambiente local/testes 4175. Essa autorização não inclui publicação, deploy,
contratação de serviço pago, desativação da confirmação de email ou criação de conta
pessoal do responsável. Google OAuth e SMTP público continuam dependentes de configuração.
