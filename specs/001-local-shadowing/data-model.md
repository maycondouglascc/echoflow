# Data model: prática local de shadowing

## Fonte da verdade e retenção

Todo conteúdo de frases é uma fixture imutável versionada no projeto. WAVs de referência correspondem por ordem e ID estável. A página do browser possui o único estado de sessão mutável. Não há modelo, tabela, API, conta ou persistência de gravações no servidor.

## Entidades

### ScenarioFixture

| Campo | Tipo conceitual | Regra |
|---|---|---|
| id | Identificador estável | Único nesta fixture; valor `introducing-yourself`, igual ao slug da rota. |
| title | Texto | “Introducing Yourself”. |
| description | Texto | Contexto curto em inglês. |
| phraseIds | Lista ordenada de PhraseFixture | Exatamente três frases, nas posições 1, 2 e 3. |

### PhraseFixture

| Campo | Tipo conceitual | Regra |
|---|---|---|
| id | Identificador estável | Único no cenário; ordinal estável de 1 a 3. |
| text | Texto em inglês | Frase falada e exibida são idênticas, incluindo campos fictícios resolvidos. |
| referenceAsset | Caminho local de mídia | Aponta a um único WAV versionado que pronuncia a mesma frase. Não aponta a provedor nem URL remota. |
| order | Inteiro | Valores 1, 2 ou 3 sem duplicação; define navegação e rótulo “frase N de 3”. |

Frases e paths estão sujeitos a verificação estática que falha caso falte uma das três relações ou o arquivo não exista. Origem, variante en-US e parâmetros de eSpeak NG são anotados no README junto dos WAVs. Não há geração na leitura da fixture.

### SessionRecording

| Campo | Tipo conceitual | Regra |
|---|---|---|
| phraseId | Identificador de PhraseFixture | A gravação pertence a uma frase nesta sessão de página. No máximo um clip atual por frase. |
| audioBlob | Bytes de mídia voláteis | Criados pelo navegador. Têm tamanho maior que zero e duração entre maior que 0 e no máximo 30 segundos. |
| objectUrl | Referência de reprodução temporária | Derivada apenas durante a página aberta; não é caminho de arquivo, link externo ou propriedade que vai ao servidor. Invalidada quando o Blob é substituído ou a página é encerrada. |

Não incluir transcript, pontuação da pronúncia, arquivo exportável, identidade, progresso, usuário, instante de upload nem metadado persistido.

## Estado da interação

### PracticeSessionView

| Campo | Escopo | Regra |
|---|---|---|
| selectedPhraseId | Página aberta | Deve ser um dos três IDs. Início na posição 1. |
| audioState | Página aberta | Um estado de controle por vez; impede reprodução sobreposta. |
| recordingsByPhraseId | Memória da página | Mapa de até três SessionRecording. Sempre vazio depois de uma recarga. |
| error | Memória da página | Mensagem de recuperação para permission denied, dispositivo ou API indisponível, formato inválido ou falha de reprodução; não contém bytes nem mensagem técnica bruta. |

### Estados e transições

| Estado de origem | Ação / evento | Estado de destino | Efeito observável |
|---|---|---|---|
| selected | Play reference | reference-playing | A frase selecionada toca sua fixture; navegação interrompe-a. |
| reference-playing | ended da fixture | ready-to-record após 300 ms | A ação Gravar habilita; microfone ainda fechado. |
| reference-playing | erro/interrupção | recoverable-error | A referência pode ser tentada de novo; captura não começa. |
| ready-to-record | clique em Gravar | requesting-microphone | Browser solicita permissão; botão expõe que está aguardando. |
| requesting-microphone | permissão negada / erro | recoverable-error | Instrução e nova tentativa; ref/nav continuam ativos. |
| requesting-microphone | permissão concedida, stream reproduzível | recording | Cronômetro inicia; uma sessão de captura por vez. |
| requesting-microphone | cancelamento seguido de permissão tardia | ready-to-record | Tracks tardias são fechadas; captura não começa. |
| recording | clique em Parar / limite aos 30 s | recorded | Captura fecha, tracks fecham e Blob não vazio permanece na memória. |
| recording | erro / Blob vazio | recoverable-error | Não disponibilizar gravação inválida; tentar novamente. |
| recorded | Play recording | recording-playing | Apenas o Blob da frase atual toca. |
| recorded | Compare | comparing-reference | Tocar referência e aguardar ended; não tocar Blob simultaneamente. |
| comparing-reference | ended da referência | comparing-recording | Tocar gravação vinculada. |
| comparing-reference | erro ou navegação | selected / recoverable-error | Interromper o player; não iniciar gravação. |
| comparing-recording | ended da gravação | recorded | Disponibilizar comparação novamente. |
| qualquer estado tocando ou recording | selecionar outra frase | selected | Parar áudio e captura, encerrar tracks, descartar clip em andamento e selecionar frase; gravações anteriormente concluídas permanecem em memória. |
| qualquer estado | recarregar ou sair da página | sessão destruída | Streams fechados; object URLs invalidadas; todos os Blobs deixam de ser alcançáveis pela aplicação. |

## Regras negativas e invariantes

- Nenhuma SessionRecording cruza a fronteira navegador→servidor. No máximo arquivos estáticos da aplicação são recebidos; corpo POST/PUT/PATCH, upload, envio Beacon ou URL com áudio não faz parte do contrato.
- Nenhum byte de SessionRecording é escrito em IndexedDB, local/session storage, cache, cookies, filesystem, logs ou telemetry.
- Permission denied não remove dados do cenário nem impede áudio de referência.
- Apenas uma faixa de entrada e um player são ativos por vez. Trocar de frase interrompe ambos, encerra as tracks e descarta a captura incompleta antes de selecionar o próximo fluxo; clips já concluídos continuam associados às frases anteriores.
- O limite de 30 segundos começa na captura ativa e para MediaRecorder; um contador exibido é indicativo, mas não substitui a chamada de parar no limite.
- O mapa de gravações fica vinculado à vida da página, não à navegação de rota. Nenhuma recuperação após reload é permitida.
