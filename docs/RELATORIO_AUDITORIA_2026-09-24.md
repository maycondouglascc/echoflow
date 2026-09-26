# EchoFlow — diagnóstico e plano de melhorias

Data: 24/09/2026. Base examinada: commit `0475b31` e arquivos presentes no checkout.

**Diagnóstico:** a proposta tem um núcleo de produto claro e um MVP viável, mas o repositório está em fase de especificação. O principal trabalho agora é corrigir o escopo e validar a experiência de prática. A troca de fornecedor de voz é uma decisão secundária, que deve depender de um teste auditivo controlado.

**Recomendação:** lançar prática com três modos, áudios previamente gerados e revisados, repetição livre e progresso de atividade. Deixar avaliação automática para uma segunda etapa, começando pelo feedback após a tentativa. Manter ElevenLabs como referência inicial e comparar OpenAI, Gemini e Cartesia antes de decidir uma migração.

## 1. O que existe de verdade

A varredura encontrou sete arquivos versionados: README, CLAUDE.md, três documentos em `docs/`, `.gitignore` e configuração local do Claude. Há apenas o commit inicial. Não existem `package.json`, código de aplicação, arquivos de áudio, migrações executáveis, testes, lockfile ou configuração de deploy.

Foram lidos README, regras locais, especificação, arquitetura e plano completo de 606 linhas. A configuração local foi inspecionada apenas estruturalmente, sem reproduzir valores de permissões.

Portanto:

- Next.js, TypeScript, Supabase, Vercel e ElevenLabs são **escolhas planejadas**, não integrações verificadas.
- As 40 frases existem como texto dentro do plano; não como catálogo operacional.
- O SQL é um exemplo dentro de Markdown; não foi aplicado ou testado.
- Não há build, testes ou interface que possam ser executados neste checkout.
- Não foram acessados ambientes externos, contas de fornecedores ou uma eventual implementação em outro local.
- A comparação de fornecedores abaixo é documental. Não houve geração paga de áudio, escuta comparativa ou benchmark nesta auditoria.

Isso muda a leitura dos achados: são defeitos e riscos da especificação, não vulnerabilidades comprovadas em uma aplicação publicada.

## 2. O produto que faz sentido construir

EchoFlow é uma ferramenta de prática oral guiada: o aluno ouve uma referência, imita sua pronúncia e prosódia, repete e acompanha a consistência da prática. O objetivo descrito pelo proprietário inclui aproximação do sotaque e da entonação de uma referência nativa.

Os três níveis devem ser tratados como **modos pedagógicos do produto**, sem apresentá-los como classificação científica universal:

| Modo | Comportamento proposto | O que precisa na interface |
|---|---|---|
| Ouvir e repetir | A referência termina; o aluno repete | Replay, espaço para falar e opção de gravar |
| Acompanhar com atraso | O aluno começa pouco depois da referência e continua enquanto ela toca | Contagem, indicação visual de entrada e atraso ajustável |
| Falar junto | O aluno tenta acompanhar a referência desde o começo | Contagem inicial, repetição em loop e controle de velocidade |

Estou interpretando o segundo modo como início defasado **com sobreposição**. Esperar a frase inteira terminar e adicionar uma pausa seria apenas uma variação do primeiro modo. O atraso exato deve ser validado com usuários; 500–1.000 ms pode ser uma hipótese inicial de interface, não uma regra pedagógica estabelecida.

A primeira entrega pode permitir praticar sem microfone. Gravação e replay local agregam autoavaliação, mas não precisam bloquear o treino nem exigir upload a cada tentativa. A ausência de feedback automático no MVP é uma decisão de escopo coerente.

## 3. O que há de bom

1. **Recorte inicial pequeno:** quatro cenários e 40 frases permitem revisar todo o conteúdo e aprender com usuários antes de ampliar o catálogo.
2. **Áudio pré-gerado:** separar produção de conteúdo da reprodução evita chamadas TTS a cada treino e permite reutilizar uma referência estável.
3. **Comparação por escuta:** ouvir a referência e depois a própria gravação entrega utilidade sem depender de um avaliador automático.
4. **Intenção de segurança correta:** chaves no servidor, gravações privadas e isolamento por usuário estão explicitados. Ainda falta implementá-los e testá-los.
5. **Simplicidade técnica:** estado local e uma aplicação com backend integrado são compatíveis com esse tamanho de MVP. Não há motivo demonstrado para introduzir microsserviços ou estado global complexo.
6. **Atenção a celulares:** o plano já pede verificação em Safari/iOS e Chrome/Android e contempla falhas de microfone e rede.
7. **Sequência de entregas:** existe um plano organizado e conteúdo de partida. É uma base útil, embora deva mudar para refletir os três modos e a futura avaliação da fala.

## 4. O que está ruim ou incompleto

P0 significa corrigir a especificação antes de construir a parte afetada; P1, resolver antes do piloto público; P2, melhoria posterior. As referências abaixo apontam para os documentos existentes.

| Prioridade | Evidência no repositório | Problema e consequência | Correção proposta |
|---|---|---|---|
| P0 | `CLAUDE.md:148–159` | O microfone só aparece após o áudio e a máquina de estados impõe reprodução seguida de gravação. Isso não representa os modos com sobreposição. | Definir estados e eventos por modo; permitir reprodução e captura concorrentes. |
| P0 | `docs/IMPLEMENTATION_PLAN.md:381, 521–527` | `audio_url` é obrigatório, mas o seed manda inserir frases sem áudio antes de gerá-lo. | Permitir rascunho sem áudio e bloquear publicação até estar pronto, ou inserir somente após gerar o arquivo. Não usar string vazia como solução. |
| P0 | `docs/IMPLEMENTATION_PLAN.md:399` | O banco guardaria uma URL assinada como referência permanente à gravação. O acesso expira. | Guardar bucket/caminho estável e criar URL temporária ao consultar. [Supabase: URLs privadas](https://supabase.com/docs/guides/storage/serving/downloads). |
| P0 | `docs/IMPLEMENTATION_PLAN.md:457–463` | Buckets são definidos, mas não há políticas de `storage.objects`, regras por proprietário ou limites de upload. RLS das tabelas não descreve essa proteção. | Definir caminhos por usuário, políticas de leitura/escrita/exclusão e limites de MIME, tamanho e duração; testar dois usuários. [Supabase: buckets privados](https://supabase.com/docs/guides/storage/buckets/fundamentals). |
| P0 | `docs/IMPLEMENTATION_PLAN.md:156` | Proteger `/app/*` não corresponde às URLs planejadas: `(app)` é um grupo de rotas, então as URLs são `/home`, `/practice/...` etc. | Proteger as rotas efetivas e verificar autenticação/autorização no acesso aos dados. [Next.js: route groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups). |
| P1 | `docs/IMPLEMENTATION_PLAN.md:395–402` | Uma linha única por usuário/frase não guarda tentativas, modo, atraso, velocidade e tempo de prática. | Separar histórico de tentativas e resumo de progresso; não confundir conclusão com domínio da fala. |
| P1 | `docs/IMPLEMENTATION_PLAN.md:346` | Um único MIME de gravação é imposto sem negociação de suporte. | Usar `MediaRecorder.isTypeSupported`, fallback e MIME/extensão reais; verificar gravação e replay em dispositivos físicos. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static). |
| P1 | `docs/IMPLEMENTATION_PLAN.md:351` | Error Boundary é tratado como solução para falhas de áudio/microfone, embora não capture todos os erros assíncronos e de eventos. | Tratar rejeições de `play`, captura e upload explicitamente, com recuperação na máquina de estados. [React](https://react.dev/reference/react/Component). |
| P1 | `docs/IMPLEMENTATION_PLAN.md:234–241` | V2 é importação de vídeo, enquanto a evolução pedida é análise de fala. | Mover avaliação pós-tentativa para V2; manter vídeo como iniciativa independente e posterior. |
| P1 | `docs/EchoFlow.md:29` e plano de seed | Há frases pré-escritas, mas não pipeline de geração de frases com IA, revisão ou publicação. | Criar produção editorial por lotes com metadados, validação e aprovação. |
| P1 | `docs/IMPLEMENTATION_PLAN.md:472–474` | Placeholders como `[name]` e `[job title]` podem resultar em referência falada diferente da frase exibida. | Substituir por exemplos concretos antes da síntese; personalização dinâmica fica fora do primeiro catálogo. |
| P1 | `docs/EchoFlow.md:19, 58–61` | Há alegações absolutas sobre eficácia e inexistência de ferramentas; a seção do ciclo de prática termina incompleta. | Remover alegações sem evidência e concluir a especificação com fluxos e critérios verificáveis. |
| P2 | Bootstrap usa `--src-dir`; árvores posteriores usam `/app` na raiz | A documentação permite scaffolds divergentes. Também combina `@latest` com versões declaradas como fixas. | Escolher uma estrutura e versões suportadas no início da implementação; registrar lockfile. |

Outras lacunas relevantes:

- A máquina de estados não contempla pausa, cancelamento, nova tentativa, erro, permissão recusada ou interrupção por mudança de aba.
- A restrição de 30 segundos deve acomodar a duração real da referência e o modo; precisa ser aplicada no servidor se houver upload.
- O plano não define retenção, exclusão de gravações, limpeza de arquivos órfãos ou consentimento para envio a avaliadores externos.
- Um endpoint de TTS acessível a usuários autenticados ainda pode consumir orçamento indevidamente. Para conteúdo curado, um script administrativo com limites e retentativas é suficiente.
- Não há versionamento de texto, áudio, voz, modelo e instruções. Alterar a referência pode invalidar comparações históricas.
- Waveform indica energia no tempo; não é uma nota de pronúncia ou uma medida suficiente de entonação.
- O SQL do trigger com `security definer` merece endurecimento de `search_path` e nomes qualificados antes de virar migração.
- `.claude/settings.local.json` está versionado: avaliar se essa configuração local deve ser compartilhada. Não foi identificado ou alegado vazamento de chave.

## 5. ElevenLabs versus OpenAI e concorrentes

**Resposta direta:** há alternativas tecnicamente competitivas que justificam um teste, mas a pesquisa documental não prova que alguma supera ElevenLabs nas frases, sotaque e estilo do EchoFlow. Alegações dos próprios fornecedores não constituem comparação independente.

| Candidato | O que a documentação oferece | Decisão sugerida para o EchoFlow |
|---|---|---|
| ElevenLabs — `eleven_v3` / `eleven_multilingual_v2` | v3 prioriza expressividade; Multilingual v2 é apresentado como consistente, especialmente em gerações longas. | Manter como referência inicial; comparar os dois com estilo conversacional, sem atuação exagerada. [Modelos](https://elevenlabs.io/docs/overview/models). |
| OpenAI — `gpt-4o-mini-tts` | Controle por instruções de sotaque, entonação, velocidade e tom; vozes otimizadas para inglês. A documentação recomenda `marin` e `cedar` para qualidade. | Primeiro desafiante a testar para frases curtas. Controle por prompt não garante aderência em cada geração. [Guia oficial](https://developers.openai.com/api/docs/guides/text-to-speech). |
| Google — Gemini 3.8 Flash TTS / Flash-Lite TTS | A documentação consultada apresenta controles de estilo, múltiplos falantes e as duas variantes. | Testar Flash TTS para qualidade e Flash-Lite se volume se tornar relevante. Registrar versão exata e disponibilidade na conta. [Guia oficial](https://ai.google.dev/gemini-api/docs/speech-generation). |
| Cartesia — Sonic 3.6 | Documentação apresenta modelo disponível, fidelidade ao texto e snapshots datados, incluindo `sonic-3.6-2026-08-27`. | Candidato adicional; estabilidade de versão interessa ao catálogo. Baixa latência não é decisiva para arquivos pré-gerados. [Documentação](https://docs.cartesia.ai/build-with-cartesia/tts-models/latest). |

Para esse produto, a melhor voz precisa produzir **inglês natural e reproduzível**, com contrações, ligações entre palavras, acentos de frase e pausas adequadas. Uma voz muito teatral ou que enuncia todas as palavras isoladamente pode soar impressionante e servir mal ao exercício.

### Teste que resolve a escolha

Protocolo proposto, ainda não executado:

1. Usar as 40 frases, substituindo placeholders, e acrescentar desafios de perguntas, contrações, reduções, números e ênfase contrastiva.
2. Fixar inicialmente um sotaque-alvo e uma intenção comunicativa por frase. Evitar comparar uma voz americana casual com uma britânica de locução.
3. Gerar duas versões por configuração finalista para medir variação. Guardar áudio original, modelo, voz, prompt, parâmetros, custo e data.
4. Fazer comparação cega, em ordem aleatória e volume equivalente, com pelo menos três avaliadores proficientes, incluindo um professor de pronúncia, e um piloto pequeno de alunos.
5. Avaliar de 1 a 5: fidelidade ao texto, naturalidade, estabilidade do sotaque, ritmo/entonação e facilidade de imitação. Pesos propostos: 25%, 20%, 20%, 25% e 10%.
6. Rejeitar individualmente qualquer áudio com palavras omitidas, acrescentadas, pronunciadas incorretamente ou artefatos relevantes, mesmo que a média seja alta.
7. Apurar preferência pareada, dispersão das notas, taxa de rejeição e custo por minuto aprovado. Uma diferença pequena ou inconsistente não justifica migração; ampliar amostra se necessário.

O benchmark é uma decisão editorial para este catálogo, não uma prova universal de superioridade de um modelo. Não publicar ranking de qualidade sem realizar esse teste.

### Custo: dimensionamento proporcional ao MVP

As 40 frases atuais somam **2.394 caracteres e 440 palavras**, contados diretamente no plano. A tabela pública da ElevenAPI consultada informa US$ 0,10/1.000 caracteres para v3/Multilingual e US$ 0,05/1.000 para Flash/Turbo. Aplicando essas tarifas ao texto atual, uma passagem pelo catálogo representaria aproximadamente **US$ 0,24 ou US$ 0,12 de consumo**, respectivamente. Isso não é o valor total da contratação: plano, mínimos, impostos, vozes, tentativas descartadas e futuras condições devem ser verificados. [Preços da ElevenAPI](https://elevenlabs.io/pricing/api).

Não consegui confirmar uma tarifa comparável de OpenAI nas páginas oficiais recuperadas; portanto, não atribuo economia numérica a ela. Comparar caracteres com tokens de áudio diretamente também seria inadequado.

A decisão econômica relevante é: `custo de produção / minutos aprovados`, somado a armazenamento e distribuição. Áudio pré-gerado é reutilizado entre usuários; número de reproduções não multiplica a geração TTS. Avaliação da fala, por outro lado, cria custo a cada tentativa analisada. No catálogo inicial, qualidade editorial provavelmente pesa mais que diferenças pequenas de síntese — esta é uma avaliação de produto baseada no volume observado.

## 6. Conteúdo gerado com IA

Proposta de pipeline: **brief pedagógico → geração de frases → revisão → síntese → inspeção do áudio → publicação**.

O brief deve especificar cenário, dificuldade estimada, sotaque-alvo, duração desejada e objetivo de pronúncia. Cada frase precisa ter texto final, tradução de apoio quando útil, contexto, marcação de palavras enfatizadas e identificador de versão. O rótulo de dificuldade produzido por IA é uma estimativa editorial, não uma certificação de proficiência.

Revisar correspondência entre texto e áudio, naturalidade, excesso de formalidade, placeholders, frases duplicadas e adequação ao nível. Organizar dificuldade também por duração, densidade de palavras e complexidade sonora; somente separar por restaurante/entrevista não cria progressão.

Começar com uma voz por trilha facilita a consistência; outras vozes e sotaques entram depois. Manter a referência original em velocidade normal. A reprodução lenta deve preservar pitch e ser testada nos navegadores; não é equivalente a uma nova locução pedagógica mais lenta. [MDN: preservesPitch](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/preservesPitch).

## 7. Evolução: avaliar a fala do aluno

Há três problemas diferentes:

| Dimensão | Pergunta | Abordagem inicial |
|---|---|---|
| Conteúdo | Falou as palavras esperadas? | Transcrição/alinhamento com texto conhecido |
| Pronúncia e fluência | Como realizou os sons e as pausas? | Avaliador especializado, calibrado com professores |
| Prosódia da referência | Aproximou ritmo, ênfase e movimento de entonação? | Alinhamento temporal e análise acústica comparativa |

**Whisper ou outro transcritor isolado não resolve a avaliação.** Uma transcrição correta não mede entonação; um erro de transcrição também pode decorrer de ruído. Da mesma forma, pedir uma nota a um modelo que recebeu apenas texto não permite julgar características acústicas.

Azure Pronunciation Assessment é um candidato concreto: documenta resultados de acurácia, fluência e prosódia; a avaliação de prosódia está limitada a `en-US` na documentação consultada. Isso merece prova de conceito, não adoção automática. Sua pontuação não demonstra, por si só, semelhança com o áudio específico da ElevenLabs. [Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment).

Speechace é outro candidato especializado em pronúncia e fluência que vale comparar quanto a granularidade, sotaques e resultados para brasileiros. [Documentação do fornecedor](https://api-docs.speechace.com/).

Arquitetura proposta para V2: gravação consentida → validação de qualidade → análise com texto conhecido → resultados estruturados → explicação pedagógica curta → nova tentativa. Um LLM pode explicar os resultados, mas deve receber evidências e se abster quando a captura não permite avaliação.

Para a comparação de entonação com a referência, investigar alinhamento por palavra/fonema, duração relativa, pausas, intensidade normalizada e contorno de frequência fundamental normalizado. Não comparar amplitude bruta ou pitch absoluto como se igualdade de timbre fosse boa pronúncia. Esses sinais são insumos experimentais e precisam de validação humana.

No modo simultâneo, o microfone pode captar também a referência; fones reduzem essa contaminação. Para a primeira versão do avaliador, uma tentativa individual após ouvir a referência oferece uma captura mais controlada. Preservar os modos simultâneos de treino mesmo que a avaliação comece em um modo separado.

Começar com feedback **após a tentativa**, oferecendo uma ou duas orientações acionáveis e trechos para repetir. Tempo real só entra após comprovar qualidade do diagnóstico, custo e benefício para o aluno.

Validação necessária: gravações consentidas de brasileiros em diferentes níveis e aparelhos, avaliação por professores, concordância entre avaliadores, análise de falsos alertas e comparação entre tentativas. Medir pronúncia, fluência e prosódia separadamente. Retorno ao aplicativo ou quantidade de frases concluídas não demonstra melhora de fluência espontânea; essa transferência exige atividade de fala não ensaiada.

## 8. Arquitetura e dados propostos

Manter a stack planejada é razoável; não há evidência que justifique trocá-la nesta fase. A implementação deve fixar versões suportadas no momento do bootstrap.

- **Cliente:** reprodução local, controle dos três modos, gravação opcional, replay imediato sem esperar upload e recuperação de erros.
- **Servidor:** autenticação/autorização, persistência de progresso, controle de upload e tarefas administrativas de conteúdo.
- **Storage:** referências publicadas e versionadas; gravações privadas somente quando necessário.
- **Produção editorial:** script administrativo idempotente; gerar novamente apenas itens pendentes ou explicitamente selecionados.
- **V2:** processamento assíncrono das avaliações com estado, retentativas limitadas e orçamento por usuário.

Modelo mínimo recomendado:

| Entidade | Campos/regras importantes |
|---|---|
| `scenarios` | Organização do catálogo |
| `phrases` | Texto, cenário, dificuldade, objetivo pedagógico, versão e estado editorial |
| `phrase_audio` | Frase/versão, caminho, provedor, modelo, voz, sotaque, instruções, duração e aprovação |
| `practice_attempts` | Usuário, referência/versão, modo, atraso, velocidade, duração e data; gravação opcional |
| `user_progress` | Resumo de atividade por frase/modo, sem fingir pontuação de domínio |
| `speech_assessments` — V2 | Tentativa, avaliador/versão, resultados por dimensão, confiança e estado |

Não é necessário criar todas essas tabelas no primeiro dia. A separação entre referência, tentativa e avaliação evita, porém, prender todo o histórico a uma única coluna de gravação. Importação de vídeo e `video_sessions` não precisam fazer parte da primeira migração.

## 9. Plano de execução priorizado

Estimativas abaixo são de planejamento para uma pessoa dedicada; não são compromisso de prazo e pressupõem acesso às contas e revisão de conteúdo.

| Etapa | Entregas | Critério de aceite | Esforço indicativo |
|---|---|---|---|
| A — Alinhar especificação | Reescrever PRD, três modos, V2 de avaliação e corrigir P0 do plano | Fluxos, dados e critérios de conclusão sem contradições | 1–2 dias |
| B — Provar o núcleo de áudio | Tela com poucas referências, três modos, repetição e captura/replay local opcionais | Uso em Safari/iOS e Chrome/Android; falhas recuperáveis; nenhuma gravação obrigatória para praticar | 3–5 dias |
| C — Catálogo e escolha de voz | Pipeline editorial e benchmark dos finalistas | 40 frases e áudios aprovados, versões registradas e justificativa da escolha | 2–4 dias + agenda de revisores |
| D — Persistência e isolamento | Auth, banco, migrações, progresso, armazenamento opcional e exclusão | Usuário A não acessa arquivos/dados de B; URLs renovadas; retentativas não duplicam tentativas | 3–5 dias |
| E — Piloto do MVP | Onboarding, acessibilidade, telemetria mínima, testes e deploy | Sessão completa nos três modos, retomada após falha e dados básicos de uso | 3–5 dias + 1–2 semanas de observação |
| F — Prova de conceito de avaliação | Comparar avaliadores e calibrar feedback após tentativa | Concordância humana e taxa de falsos alertas aceitáveis, definidas antes do piloto | 1–2 semanas iniciais; calibração adicional incerta |

Sequência recomendada: A → B → C/D → E → F. O protótipo de áudio vem antes do dashboard completo porque é a maior incerteza do produto. A consulta documental já foi feita nesta auditoria; as gerações e avaliações auditivas da etapa C continuam pendentes.

**Dentro do MVP:** catálogo pequeno, três modos, replay, velocidade, ajuda contextual, prática sem feedback automático, progresso de atividade, gravação opcional e experiência móvel confiável.

**Fora do MVP:** notas automáticas, feedback em tempo real, importação de vídeo, clonagem de voz, geração personalizada ilimitada, ranking de alunos e dashboard complexo.

## 10. Verificação e métricas

Automatizar o que protege o núcleo: transições da máquina de estados, cancelamento de timers e áudio ao navegar, idempotência de salvamento, RLS de banco/Storage, autorização, URLs temporárias e retomada após upload falho. Testar rejeição de microfone, formato não suportado, dupla ação rápida e rede instável. Manter validação em dispositivos físicos para captura, reprodução e interrupções.

Métricas iniciais: primeira sessão concluída, sessões por semana, minutos de prática ativa, repetição voluntária, uso por modo, retorno em 7 dias, falhas de reprodução/captura e custo por usuário ativo. Definir o que conta como prática: ouvir um áudio inteiro não prova que a pessoa falou.

Critérios operacionais propostos para o piloto: todo áudio publicado revisado; nenhuma falha conhecida de isolamento entre contas; retomada explícita quando um salvamento falha; aluno consegue concluir uma sessão sem intervenção. Metas numéricas de retenção e ganho pedagógico devem ser estabelecidas como hipóteses e revistas com dados, sem inventar resultados.

**Decisão recomendada ao final desta auditoria:** corrigir o plano, provar os três modos no celular e publicar um catálogo cuidadosamente revisado. Manter a escolha de TTS substituível no pipeline de conteúdo; decidir a voz por escuta. Investir em avaliação automática somente depois de validar que o ciclo básico de prática é útil e recorrente.
