# Contrato de tela: prática de shadowing

**Escopo**: contrato entre a pessoa e a aplicação web local para o percurso da US1. Não há API externa, login ou operação de gravação no servidor.

## Navegação e conteúdo

- `/` apresenta EchoFlow e um controle acessível para abrir o cenário único.
- `/scenarios/introducing-yourself` mostra três frases em inglês, na ordem 1–3, com texto coerente com o WAV correspondente.
- A tela identifica a posição atual, por exemplo “Phrase 2 of 3”. Previous e Next são botões navegáveis por teclado; estão desabilitados nos limites e não fazem wrap-around.
- Ativar Next/Previous escolhe a frase adjacente, interrompe reprodução em andamento, preserva as gravações voláteis já concluídas e não começa captura ou reprodução automaticamente. Se houver captura ativa, ela é interrompida e descartada, suas tracks são encerradas e nenhuma gravação parcial fica disponível.

## Escuta e captura

| Controle / estado | Pré-condição | Resultado visível e audível |
|---|---|---|
| Play reference | Frase selecionada | Toca o WAV estático correspondente; indica que o áudio está em andamento. |
| Ready to record | O player de referência terminou; transcorreram 300 ms | Gravar fica disponível. Ainda não há solicitação de permissão ou faixa aberta. |
| Record | A pessoa ativa o botão | Só então o browser pede acesso ao microfone; mostra que está aguardando uma resposta. |
| Recording | Stream concedido e captura ativa | Mostra tempo de até 00:30 e um controle Parar. |
| Stop | Captura ativa antes de 00:30 | Encerra captura e faixa de entrada; a gravação concluída fica acessível para ouvir e comparar. |
| Recording limit | 00:30 alcançado | Encerra captura e faixa automaticamente e disponibiliza a gravação, sem ultrapassar o limite pedido. |
| Play my recording | Clip válido da frase atual | Toca a gravação local atual sem pedir uma nova permissão. |
| Compare | Referência e gravação da frase atual disponíveis | Toca primeiro o WAV de referência. Depois do evento de fim desse áudio, toca o clip pessoal; a tela anuncia qual áudio está tocando. No fim retorna a estado pronto para comparar outra vez. |

## Recuperação e indisponibilidade

- Em permissão negada, ausência de dispositivo, API ou formato compatível, mostrar instrução curta em inglês simples com próximo passo e uma ação Try again quando a ação do browser puder ser repetida.
- Se o navegador bloqueou a permissão no nível das configurações do site, indicar que a pessoa precisa liberar Microphone para este site e ativar Try again. Nunca exigir reload para seguir.
- Referência, texto, Previous e Next continuam disponíveis durante um erro de microfone.
- Falha de referência indica que ela não tocou e deixa tentar novamente; não inicia microfone.
- Se a captura resultar em áudio vazio ou não reproduzível, comunicar a falha e oferecer nova captura. Não criar uma gravação persistente vazia.
- Anunciar estados que mudam sem navegação por leitor de tela por meio de texto de status; rótulos de botões são explícitos, distinguem referência de gravação e são acessíveis ao teclado.

## Fronteira de rede e memória

- Únicas solicitações de mídia permitidas no uso local: leitura GET de WAVs de referência inclusos no projeto.
- Bytes ou URLs da gravação pessoal nunca são enviados. A gravação pode permanecer associada às três frases somente enquanto a sessão de página existe. Fechar ou recarregar a página elimina seu acesso pela aplicação.
- Não há URL ou ação “Salvar”, download, botão de compartilhamento, historial ou progresso entre sessões.

## Fora do contrato

Seleção de outro cenário, expansão do catálogo, modos de fala simultânea (“acompanhar com atraso” e “falar junto”), avatar/conta, progresso, waveform, velocidade lenta, avaliação automática de pronúncia, vídeo, upload, provedor de fala e publicação em URL pública.
