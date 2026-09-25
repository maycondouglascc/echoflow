# Feature Specification: Prática local de shadowing

**Feature Branch**: `codex/local-shadowing`

**Created**: 2026-09-25

**Status**: Draft

**Input**: Primeiro protótipo local do EchoFlow: um usuário abre um cenário com três frases de exemplo, ouve a frase, grava a própria voz por até 30 segundos e reproduz o áudio de referência e a gravação em sequência. Conteúdo e áudios são fixtures locais; a gravação existe somente na memória da sessão. Sem autenticação, Supabase, uploads, provedores pagos ou deploy público.

## Clarifications

### Session 2026-09-25

- Q: Para as três fixtures de referência, qual padrão de voz devo especificar? A documentação do EchoFlow pede uma voz natural, o que favorece gravações humanas licenciadas; eSpeak NG é mais simples e offline, mas soa robótico. → A: Usar voz sintética offline com eSpeak NG.

## User Scenarios & Testing

### User Story 1 - Praticar uma frase em um cenário de shadowing (Priority: P1)

Uma pessoa abre o EchoFlow localmente, seleciona o cenário de apresentação pessoal, escolhe uma de três frases, ouve a pronúncia de referência, grava sua própria voz e compara os dois áudios em sequência. Este protótipo oferece somente o modo pedagógico “ouvir e repetir”: a referência termina antes da captura. A pessoa pode navegar pelas frases e repetir o exercício durante a sessão.

**Why this priority**: Esse é o menor percurso completo que demonstra a proposta central de praticar shadowing e verificar a própria fala, sem exigir conta, serviço remoto ou retenção da gravação.

**Independent Test**: Em uma sessão local e em um navegador que ofereça áudio e microfone, abrir o cenário, praticar cada uma das três frases, ouvir a comparação de referência seguida da gravação e avançar e voltar entre as frases. Em um cenário de falha separado, negar a permissão de microfone e então concedê-la para verificar a recuperação.

**Acceptance Scenarios**:

1. **Given** a tela inicial local, **When** a pessoa abre o cenário “Introducing Yourself”, **Then** vê as três frases de exemplo, identificadas e em ordem.
2. **Given** a primeira frase selecionada, **When** a pessoa usa os controles de navegação, **Then** a frase seguinte é selecionada e a anterior pode ser selecionada novamente; voltar na primeira frase e avançar na última são controles desabilitados, sem retorno circular.
3. **Given** uma frase selecionada, **When** a pessoa inicia e termina o áudio de referência, **Then** ouve a fixture de fala correspondente à frase selecionada e pode reproduzi-la outra vez.
4. **Given** o fim do áudio de referência, **When** passam 300 ms, **Then** a ação de gravar fica habilitada. Nenhum acesso ao microfone é solicitado até a pessoa ativar essa ação.
5. **Given** permissão de microfone concedida e a pessoa inicia a gravação, **When** ela para antes do limite, **Then** o tempo decorrido é mostrado, a gravação pode ser ouvida e o exercício continua utilizável.
6. **Given** uma gravação em andamento, **When** ela chega a 30 segundos, **Then** a captura para automaticamente no limite e essa gravação pode ser ouvida.
7. **Given** uma frase com áudio de referência e gravação disponíveis, **When** a pessoa escolhe comparar, **Then** ouve primeiro a referência, espera seu término e ouve depois a própria gravação, sem sobreposição. Ao terminar, pode comparar novamente ou repetir a gravação.
8. **Given** a permissão de microfone negada, **When** a pessoa tenta gravar, **Then** vê uma explicação e instruções para liberar a permissão nas configurações do navegador; a frase, a navegação e o áudio de referência continuam utilizáveis. Se a permissão for liberada, ela pode tentar gravar outra vez e concluir o exercício sem recarregar a página.
9. **Given** qualquer estado com gravação durante a sessão, **When** a pessoa navega para outra frase e volta, **Then** pode comparar novamente a gravação associada àquela frase. **When** a sessão de página termina ou a página é recarregada, **Then** as gravações anteriores não estão mais disponíveis.
10. **Given** uma gravação produzida na sessão, **When** a prática é exercitada ou observada durante o cenário, **Then** nenhum pedido de rede contém ou envia os dados de áudio pessoal; a gravação não é gravada em armazenamento persistente do app, exportada, nem incluída em URL, registro ou cache de aplicação.

### Edge Cases

- A permissão do navegador é negada ou a solicitação de microfone falha; o restante do cenário segue utilizável e a tentativa pode ser repetida após a liberação da permissão.
- O navegador não disponibiliza a API de microfone ou de gravação, ou não reconhece um formato de gravação reproduzível; a pessoa recebe uma explicação e continua podendo ouvir a referência e navegar.
- O áudio de referência falha ao iniciar ou termina por interrupção; a gravação não começa automaticamente, um estado recuperável é mostrado e a pessoa pode tentar o áudio novamente.
- A pessoa muda de frase enquanto uma referência ou gravação está tocando; o áudio anterior para, não se sobrepõe à nova frase e não grava uma nova captura sem ativação da pessoa. Se a captura do microfone estiver ativa, ela para, as tracks são encerradas e o clip incompleto é descartado; gravações já concluídas permanecem associadas às suas frases.
- A pessoa para a gravação antes de 30 segundos; a captura não ultrapassa o pedido de parar e a comparação usa a gravação concluída.
- A pessoa sai da página ou a recarrega; qualquer gravação desta sessão deixa de estar acessível.
- A gravação termina sem dados reproduzíveis ou o navegador perde a entrada de áudio; é mostrado um erro recuperável para tentar gravar de novo, mantendo referência e navegação disponíveis.

## Requirements

### Functional Requirements

- **FR-001**: O EchoFlow MUST permitir abrir localmente um cenário predefinido chamado “Introducing Yourself” com exatamente três frases de exemplo em ordem.
- **FR-002**: O EchoFlow MUST deixar a pessoa selecionar as frases anterior e seguinte e MUST desabilitar a navegação para além da primeira e da última frase.
- **FR-003**: O EchoFlow MUST fornecer áudio de referência local correspondente a cada frase e controles explícitos para ouvir e repetir esse áudio.
- **FR-004**: Depois que a reprodução da referência termina, o EchoFlow MUST habilitar a ação de gravar após uma espera de 300 ms. A pessoa MUST iniciar o pedido de permissão e a gravação por meio de sua própria ação.
- **FR-005**: Depois da concessão de permissão, o EchoFlow MUST permitir interromper manualmente uma gravação antes de 30 segundos e MUST interrompê-la automaticamente ao atingir 30 segundos.
- **FR-006**: O EchoFlow MUST manter cada gravação somente na memória da sessão e associá-la à frase praticada. Navegar entre frases na mesma sessão mantém as gravações disponíveis até que a sessão de página termine; recarregar ou encerrar essa sessão as descarta.
- **FR-007**: O EchoFlow MUST permitir reproduzir uma gravação concluída e comparar a referência e a gravação na ordem referência primeiro, gravação da pessoa depois, sem que os áudios sejam reproduzidos ao mesmo tempo.
- **FR-008**: Se o pedido de microfone for negado ou a gravação falhar, o EchoFlow MUST informar a causa e o próximo passo possível, manter acessíveis o cenário, a frase e o áudio de referência e oferecer nova tentativa depois da recuperação.
- **FR-009**: As três frases, metadados e áudios de referência MUST vir de fixtures incluídas no projeto e disponíveis durante a execução local; a experiência de prática não MUST requerer conta, rede externa, provedor de IA pago ou serviço de armazenamento.
- **FR-010**: A gravação pessoal MUST NOT ser enviada em um pedido de rede, persistida pelo app, adicionada à URL, registro ou cache de aplicação, ou compartilhada fora da sessão. O encerramento ou recarregamento da página MUST torná-la indisponível.
- **FR-011**: O EchoFlow MUST permitir escutar o áudio de referência e navegar pelas três frases sem solicitar permissão para microfone.

### Key Entities

- **Cenário**: o contexto de prática selecionável, com título, descrição e a ordem das frases. Há um único cenário nesta feature.
- **Frase de exemplo**: texto curto e identificador de ordem que possui uma fixture de áudio de referência correspondente. As três frases seguem as posições 1–3 do cenário 1 em docs/IMPLEMENTATION_PLAN.md, seção “The 40 Phrases”, com os campos variáveis preenchidos por dados fictícios explícitos.
- **Gravação de sessão**: áudio capturado pela pessoa, associado a uma frase somente para comparação naquela sessão de página e descartado no seu encerramento ou recarregamento. Não é uma conta, progresso ou dado persistente.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Em uma execução local, a pessoa pode ir da tela inicial ao cenário com três frases usando um único controle de abertura e pode selecionar qualquer uma das três frases; nos limites, o controle fora do intervalo é desabilitado.
- **SC-002**: Para cada frase, seu controle de referência reproduz a fixture correspondente, e a ação de repetição volta a reproduzi-la.
- **SC-003**: Uma gravação interrompida manualmente é reproduzível e comparável; uma captura mantida em andamento é interrompida automaticamente aos 30 segundos.
- **SC-004**: Em cada comparação concluída, a fixture de referência termina antes do início da gravação da pessoa; as duas fontes de áudio nunca se sobrepõem.
- **SC-005**: Nos testes automatizados da feature, o caso de negação de microfone mostra instrução recuperável, mantém a referência navegável e conclui uma nova tentativa após concessão. A validação manual obrigatória confirma a solicitação e a reprodução reais em dispositivos suportados.
- **SC-006**: Durante os cenários automatizados de captura, rede e recarregamento, nenhuma solicitação transmite os bytes da gravação, nenhuma camada de armazenamento persistente do app recebe áudio e uma gravação em memória deixa de estar acessível após recarga.

## Assumptions

- **Conteúdo**: docs/EchoFlow.md lista “Introducing Yourself” como primeiro cenário; docs/IMPLEMENTATION_PLAN.md, seção “The 40 Phrases”, define as frases e contém dez linhas para esse cenário. Esta feature usa as três primeiras, com [name] = “Alex”, [city] = “Recife” e [job title] = “software engineer”:
  1. `Hi, my name is Alex. It's nice to meet you.`
  2. `I'm originally from Recife, but I've been living here for a few years.`
  3. `I work as a software engineer at a tech company downtown.`
- **Reprodução**: a ordem da comparação é áudio de referência seguido da gravação da pessoa, conforme o fluxo de referência da arquitetura existente e o pedido atual.
- **Navegação**: os limites das três frases desabilitam avançar ou voltar, sem navegação circular. A gravação de cada frase dura apenas até 30 segundos e continua disponível em memória enquanto a pessoa navega pela sessão de página.
- **Microfone**: a permissão é solicitada somente após a ativação da ação de gravar. A espera de 300 ms depois da referência habilita a ação, não abre o dispositivo automaticamente.
- **Idiomas**: as frases, as fixtures de fala e os rótulos relacionados à prática são em inglês, coerentes com o produto e a raiz da aplicação atuais.
- **Plataforma**: a feature é executada na aplicação web local; as verificações manuais de áudio e microfone seguem a exigência do projeto para Safari atual no iOS e Chrome atual no Android. Nenhum deploy ou hospedagem pública está coberto.
- **Fixtures de áudio**: as três fixtures de fala serão geradas antecipadamente, de forma offline com eSpeak NG em inglês, e versionadas como WAVs estáticos locais. Na execução, o app serve apenas esses arquivos, sem instalar, executar ou chamar eSpeak NG. A implementação registrará versão do sintetizador, voz, parâmetros de geração e origem/licença dos assets. A recomendação do relatório de auditoria local de testar vários fornecedores e oferecer três modos descreve a direção mais ampla do produto; esta fatia implementa somente “ouvir e repetir” e segue a escolha explícita do usuário por voz sintética offline. “Acompanhar com atraso” e “falar junto”, que sobrepõem a referência e a captura, ficam fora desta feature.
- **Limite de privacidade**: “somente na memória” restringe persistência e transmissão feitas pelo app; o navegador pode manter recursos de reprodução apenas enquanto a página está aberta. O app limpa referências temporárias do áudio ao encerrar sua sessão.
- **Requisitos existentes**: o suporte a registro automático remoto descrito em docs/EchoFlow.md e docs/IMPLEMENTATION_PLAN.md aplica-se ao MVP mais amplo. Para esta primeira feature, a instrução atual de não autenticar, enviar, persistir ou usar provedores é mais específica e prevalece; este protótipo não registra progresso.

## Ambiguidades analisadas antes do planejamento

Não resta uma decisão de produto humana que impeça o plano. As alternativas encontradas foram resolvidas pelas fontes listadas ou por um padrão técnico reversível, explicitado nas premissas acima:

| Ponto | Evidência / alternativa | Resolução para esta feature | Natureza |
|---|---|---|---|
| Qual cenário e quais frases usar? | O pedido pede um cenário e três frases; docs/EchoFlow.md lista “Introducing Yourself” primeiro, e docs/IMPLEMENTATION_PLAN.md fornece o texto das 10 frases desse cenário. | Usar as três primeiras frases desse cenário, preenchendo os três campos de exemplo com valores fictícios para fala fluida. | Inferência do PM, ancorada em documento do produto. |
| A gravação permanece ao navegar para outra frase? | O pedido permite navegação e restringe a gravação à memória da sessão; o fluxo antigo propunha salvar ao avançar. | Reter as três gravações somente na memória enquanto a página está aberta, ligadas à frase, e apagá-las ao fechar ou recarregar. Nenhum auto-save. | Escolha reversível do PM que respeita a retenção solicitada e preserva comparação ao voltar. |
| A abertura da página pode solicitar acesso ao microfone? | Pode interromper a visita e os navegadores podem exigir uma ação direta antes de abrir o microfone. | Só solicitar permissão quando a pessoa ativar Gravar; negar permissão não bloqueia ouvir nem navegar. | Decisão técnica do PM, guiada pelo fluxo e pela recuperação pedida. |
| Qual é a ordem da comparação e quais modos incluir? | A arquitetura registra comparação sequencial; o pedido exige referência e gravação em sequência. O relatório de auditoria descreve também modos com sobreposição. | Implementar somente “ouvir e repetir”: primeiro referência, depois gravação. Modos simultâneos ficam fora desta fatia. | Ordem inferida pelo PM da arquitetura e pedido atual; recorte de modos decorre do pedido desta feature e da auditoria de produto. |
| Em quais ambientes comprovar áudio real? | O projeto exige verificação manual de microfone e áudio em iOS Safari e Android Chrome; os testes automatizados não provam hardware. | Planejar testes automatizados determinísticos e checagem manual nos dois dispositivos; ambos continuam locais. | Regra do projeto. |
| Como obter áudio de referência sem chamar um provedor pago? | O produto propõe uma voz natural, enquanto as fixtures desta fatia são locais; o usuário escolheu fala sintética offline. | Gerar WAVs estáticos com eSpeak NG, usar somente os arquivos durante a prática e informar a voz sintética menos natural como limitação do protótipo. | Decisão do usuário para o tipo de fonte; versão, voz e parâmetros específicos são escolhas técnicas do PM. |

A etapa de clarify perguntou sobre a fonte e o padrão da voz porque essa escolha altera a qualidade percebida das fixtures. O usuário escolheu eSpeak NG offline. A escolha de cenário e o preenchimento dos placeholders foram inferidos dos documentos; o modo “ouvir e repetir” delimita o pedido por comparação sequencial, e não pretende resolver a recomendação mais ampla de três modos da auditoria. As demais alternativas avaliadas têm padrões sustentados pelo pedido atual ou pelas regras de desenvolvimento, sem decisões humanas adicionais pendentes.
