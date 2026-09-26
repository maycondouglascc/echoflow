# Feature Specification: Catálogo de áudio por modelo e voz

**Feature Branch**: codex/openrouter-audio-catalog
**Created**: 2026-09-25
**Status**: Implemented; physical-device validation pending
**Input**: Cadastrar as amostras fornecidas para cinco frases, identificar cada áudio pela frase, modelo e voz, permitir escolher qual das duas vozes será ouvida no cenário e preparar a geração futura dos mesmos dez arquivos pela API do OpenRouter.

## User Scenarios & Testing

### User Story 1 - Escolher uma voz de referência (Priority: P1)

A pessoa abre “Voice Comparison”, pratica cinco frases amostrais de três contextos e escolhe entre as referências geradas por Google Gemini 3.8 Flash TTS com Puck e Microsoft MAI-Voice-2 com en-US-Harper:MAI-Voice-2. A voz escolhida é usada para ouvir e comparar todas as frases da sessão.

**Why this priority**: Comparar e escolher a voz é o principal resultado visível desta evolução.

**Independent Test**: Abrir o cenário, alternar entre as duas opções, navegar pelas cinco frases e ouvir e comparar a referência selecionada sem iniciar outra geração.

**Acceptance Scenarios**:

1. **Given** o cenário aberto, **When** a pessoa consulta as opções de referência, **Then** vê exatamente os dois modelos e suas vozes correspondentes.
2. **Given** qualquer uma das cinco frases, **When** a pessoa escolhe uma voz e escuta a referência, **Then** o player reproduz o arquivo ligado àquela combinação de frase, modelo e voz.
3. **Given** uma gravação de prática concluída, **When** a pessoa inicia a comparação, **Then** a referência da voz escolhida toca antes da gravação pessoal, sem sobreposição.
4. **Given** a pessoa muda de frase ou volta para outra, **When** a sessão continua, **Then** a escolha de voz permanece ativa; ao recarregar a página, a escolha volta ao padrão Google/Puck.
5. **Given** o modelo/voz ou arquivo não tem um áudio cadastrado, **When** o catálogo é carregado ou a pessoa tenta reproduzi-lo, **Then** o app não toca outra variante silenciosamente e apresenta um estado recuperável.

### User Story 2 - Identificar e manter amostras de áudio (Priority: P1)

Quem mantém o conteúdo consegue identificar cada amostra sem ouvir pelo nome do arquivo: categoria, frase, texto, modelo, voz, formato, origem, checksum e metadados de geração estão ligados em um catálogo único. Os dez arquivos enviados ficam em caminhos estáveis e descritivos. Os três WAVs eSpeak NG originais continuam catalogados como baseline arquivado, fora das opções atuais.

**Why this priority**: Um catálogo explícito reduz confusão entre arquivos e dá uma fonte de verdade para o player e a geração futura.

**Independent Test**: Conferir o catálogo contra os cinco textos e os dez arquivos; cada frase possui uma variante Google/WAV e uma variante MAI/MP3, com checksums correspondentes.

**Acceptance Scenarios**:

1. **Given** os cinco textos do cenário, **When** o catálogo é consultado, **Then** cada texto tem exatamente uma amostra ativa de cada modelo/voz selecionado.
2. **Given** os dez arquivos atuais, **When** são localizados pelo catálogo, **Then** os nomes identificam frase, modelo e voz e os metadados distinguem WAV/PCM do MP3.
3. **Given** as três referências eSpeak NG existentes, **When** o catálogo é consultado, **Then** elas continuam identificadas como baseline arquivado e não aparecem como uma terceira escolha no player.

### User Story 3 - Preparar lote pela API (Priority: P2)

Quem mantém o conteúdo pode pré-visualizar o lote de cinco frases por dois modelos/vozes e, em uma execução explicitamente solicitada, gerar os arquivos por chamadas do OpenRouter. O script usa os mesmos textos e o mesmo catálogo da aplicação.

**Why this priority**: Uma única configuração diminui erros de associação quando novas frases ou lotes forem gerados mais tarde.

**Independent Test**: Sem chave ou rede, pré-visualizar exatamente dez tarefas. Com um servidor HTTP local simulado, verificar corpo, formato e validações; nenhuma execução automatizada chama um provedor real.

**Acceptance Scenarios**:

1. **Given** o script sem opção de execução, **When** é iniciado, **Then** apenas lista as dez combinações e não faz chamadas de rede.
2. **Given** uma execução explícita sem chave, **When** o script começa, **Then** falha antes de fazer qualquer chamada ou alterar arquivo.
3. **Given** uma resposta de áudio válida, **When** o lote é executado, **Then** os bytes são gravados no destino estável, o WAV é envelopado com o formato PCM configurado e o registro da amostra recebe geração, data e checksum.
4. **Given** uma saída já existente, **When** a geração não foi autorizada a sobrescrever, **Then** nenhum arquivo é substituído.
5. **Given** uma resposta HTTP de erro, MIME inesperado ou corpo vazio, **When** a geração falha, **Then** o arquivo incompleto é descartado e a falha é mostrada sem imprimir a chave de API.
6. **Given** a execução ordinária de CI, **When** os checks do projeto rodam, **Then** nenhum pedido pago ao OpenRouter é realizado.

### Edge Cases

- A pessoa alterna a voz enquanto áudio toca ou a gravação está ativa; a troca não altera a fonte no meio da reprodução nem interrompe uma captura em andamento.
- Um modelo ou variante não tem correspondência para uma frase; a opção inválida é bloqueada e nenhum outro áudio é usado como fallback.
- Um arquivo foi removido, está vazio ou não pode ser decodificado; o player mostra uma falha recuperável.
- O script recebe resposta HTML/JSON de erro em vez de áudio, ou um tipo de áudio diferente do esperado.
- O script é interrompido depois de gerar parte do lote; apenas arquivos completos permanecem e suas informações de geração são registradas.
- Há destino existente; a operação segura preserva o asset atual.
- A credencial privada do OpenRouter não está definida; o modo de pré-visualização continua disponível sem credenciais.
- O WAV do modelo Google é entregue como PCM bruto; o arquivo salvo recebe cabeçalho WAV com 24 kHz, mono e PCM signed 16-bit little-endian, conforme os arquivos existentes dessa voz.

## Requirements

### Functional Requirements

- **FR-001**: A experiência Voice Comparison MUST exibir cinco frases amostrais em ordem: três de Introducing Yourself, “Could we get a table for two, please?” da categoria At a Restaurant, e “I have about five years of experience in software development.” da categoria Job Interview Basics.
- **FR-002**: O cenário MUST fornecer exatamente duas opções selecionáveis de referência: google/gemini-3.8-flash-tts com Puck e microsoft/mai-voice-2 com en-US-Harper:MAI-Voice-2.
- **FR-003**: O catálogo MUST identificar a categoria e o texto de cada frase, além de ligar cada frase a uma variante de cada modelo/voz selecionável, com caminho, formato, origem e checksum.
- **FR-004**: O player MUST usar a variante selecionada ao reproduzir a referência e ao comparar com uma gravação; a referência MUST terminar antes da gravação começar.
- **FR-005**: A escolha de modelo/voz MUST permanecer entre frases durante a sessão da página e MUST voltar à opção padrão Google/Puck após recarga.
- **FR-006**: As três amostras eSpeak NG preexistentes MUST permanecer preservadas e identificadas como baseline arquivado; elas MUST NOT ser apresentadas como opção ativa desta comparação.
- **FR-007**: O catálogo MUST registrar as dez amostras atuais sem inventar data ou identificador de geração que não estejam disponíveis.
- **FR-008**: O script MUST ler textos e configurações de modelo/voz do catálogo, pré-visualizar exatamente dez tarefas por padrão e fazer chamadas à API somente sob uma opção explícita de execução.
- **FR-009**: O script MUST manter a credencial do provedor privada e fora do navegador, do catálogo, dos registros e dos artefatos versionados.
- **FR-010**: O script MUST validar que a resposta é um áudio válido e não vazio antes de salvar; usar escrita atômica; registrar o identificador de geração fornecido, data UTC e SHA-256 após uma síntese válida.
- **FR-011**: O script MUST preservar arquivos existentes por padrão e não realizar chamadas a provedores durante CI.
- **FR-012**: A integração MUST manter as gravações pessoais em memória da sessão, sem enviá-las ao OpenRouter nem persistir a escolha da voz ou a gravação.
- **FR-013**: Nenhuma chamada ao OpenRouter será feita como parte desta implementação; o lote atual foi enviado pelo usuário e será apenas catalogado.

### Key Entities

- **Modelo de áudio**: Provedor e modelo que sintetizam fala, com nome legível, identificador canônico e configurações de saída.
- **Voz**: Identificador de voz compatível com um modelo. Esta feature associa uma voz fixa a cada modelo.
- **Variante de áudio**: Arquivo de uma frase, produzido por uma combinação específica de modelo e voz, com formato e proveniência.
- **Registro de geração**: Metadados de uma chamada de síntese, incluindo identificador OpenRouter, data e checksum; valores desconhecidos permanecem ausentes.
- **Baseline arquivado**: Referências eSpeak NG locais preservadas para rastreabilidade, sem seleção no fluxo atual.

## Success Criteria

### Measurable Outcomes

- **SC-001**: O cenário apresenta cinco frases em ordem e duas escolhas de voz, cada uma identificada pelo modelo e pela voz.
- **SC-002**: As cinco frases reproduzem a variante correta para cada escolha; há dez combinações ativas distintas e nenhuma associação ambígua.
- **SC-003**: O registro do catálogo corresponde aos checksums dos dez arquivos entregues e identifica os três WAVs eSpeak como arquivados.
- **SC-004**: O modo de pré-visualização do script lista dez tarefas e conclui sem chave OpenRouter ou tráfego de rede.
- **SC-005**: Em uma geração bem-sucedida, cada áudio e seu registro de geração são escritos sem expor a chave; saídas existentes permanecem intactas sem autorização de sobrescrita.
- **SC-006**: A escolha da voz vale até o fim da sessão de página; nenhuma gravação pessoal é enviada, persistida ou incluída em metadados de geração.

## Assumptions

- As cinco frases de amostra cobrem três categorias do conteúdo do produto; as dez gravações atuais formam o lote desta versão. O MP3 openrouter-audio-output-109.mp3 contém a quinta frase.
- A voz padrão é Google/Puck porque essa foi a primeira opção fornecida; o estado da escolha não é persistido entre recargas.
- Cada MP3 pertence a Microsoft MAI-Voice-2 / en-US-Harper:MAI-Voice-2 e cada WAV pertence a Google Gemini 3.8 Flash TTS / Puck, conforme informado pelo usuário.
- Os arquivos entregues usam mono a 24 kHz; os WAVs atuais são PCM signed 16-bit. Não inferir o momento ou X-Generation-Id das gerações manuais.
- O script de síntese é uma ferramenta local de manutenção de conteúdo; a reprodução do app continua sem API ou chave OpenRouter.
- A síntese usa o serviço TTS do OpenRouter conforme configurado no catálogo; o script não chama o serviço nesta implementação.
- As categorias das cinco frases seguem docs/IMPLEMENTATION_PLAN.md: três itens de Introducing Yourself, um de At a Restaurant e um de Job Interview Basics. docs/EchoFlow.md e specs/001-local-shadowing descrevem decisões de produto mais amplas ou o protótipo anterior. Para esta feature, as cinco frases e as duas vozes são a nova decisão local aceita. Não há mudança em gravação, autenticação, persistência ou deploy.

## Validation Notes

A análise automatizada da suíte existente deve ser atualizada para cobrir o novo total de frases e as duas escolhas de referência. A checagem manual em navegador continua necessária para validar a inteligibilidade real das dez amostras; o cadastro dos arquivos não substitui a avaliação auditiva.

