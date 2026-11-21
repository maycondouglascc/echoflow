# Jev da TypeSafe: valor potencial para o EchoFlow

Data: 2026-10-04. Status: pesquisa e recomendação; nenhuma integração implementada.

## Parecer

Não recomendo colocar Jev no fluxo de prática atual. Recomendo avaliar um piloto de revisão editorial do catálogo, fora da experiência do aluno, se houver novos lotes recorrentes. Busca por intenção e triagem de feedback são oportunidades condicionais; seleção de trechos de vídeo depende de uma futura feature de importação.

Há compatibilidade técnica, mas não evidência de retorno financeiro ou pedagógico no EchoFlow. Hoje não existe uma chamada de LLM para classificação a ser substituída. A comparação econômica correta é com regras locais e trabalho editorial manual, não com um agente generativo caro que o projeto não usa.

## Base examinada

- Produto e arquitetura: [EchoFlow.md](EchoFlow.md), [system_architecture.md](system_architecture.md) e [README](../README.md).
- Features [002](../specs/002-openrouter-audio-catalog/spec.md), [005](../specs/005-public-platform-redesign/spec.md) e [006](../specs/006-contextual-feedback/spec.md).
- Código: [PlaylistBrowser](../src/components/PlaylistBrowser.tsx), [catalog](../src/lib/catalog.ts), [speech-end](../src/lib/speech-end.ts), [feedback-store](../src/lib/feedback-store.ts), [rota de feedback](../src/app/api/feedback/route.ts), [gerador de áudio](../scripts/generate-openrouter-audio.py) e [tipos do banco](../src/lib/supabase/database.types.ts).
- Conteúdo: [lote de trabalho](content/README.md) e [textos canônicos](content/work-playlists.json).

O catálogo documentado contém seis playlists, 80 frases e 160 variantes ativas. A busca implementada verifica substring no título e filtra conclusão. As gravações e a detecção de silêncio são locais. A persistência de prática registra conclusão por playlist, sem transcrição, nota de pronúncia ou histórico detalhado de erros. Feedback é privado e consultado por ferramentas administrativas do Supabase.

Alguns parágrafos antigos de produto/arquitetura ainda descrevem uma playlist e deployment pendente. Para esta análise, o lote documentado e as atualizações datadas do README representam o estado mais recente. Não consultei dados de produção, métricas de uso nem volumes de feedback; as quantidades acima vêm dos artefatos locais.

## O que Jev oferece

Jev responde perguntas limitadas sobre texto ou JSON textual: `Choice` escolhe uma opção, `Score` avalia uma rubrica ordenada e `Noul` retorna a probabilidade de uma condição ser verdadeira. Não gera explicações livres. É possível enviar várias perguntas independentes sobre o mesmo estado em uma chamada. [Introdução oficial](https://docs.typesafe.ai/introduction).

O modelo documentado `jev-1.13.0` aceita somente texto, sem áudio, imagem ou vídeo. A tarifa direta publicada é US$ 0,042 por milhão de tokens de entrada, com saída gratuita; outros canais precisam de confirmação própria. [Modelos](https://docs.typesafe.ai/models).

`confidence` em Choice/Score resume a distribuição das alternativas; não significa automaticamente a taxa de acerto em nosso domínio. Noul não retorna confidence separado. Precisamos medir erro e cobertura em exemplos próprios antes de escolher limiares. [Confidence](https://docs.typesafe.ai/confidence).

A TypeSafe documenta erros com números, interpretação literal, contexto irrelevante, conteúdo adversarial e ordem das opções. Saída tipada pode estar semanticamente errada. Ganhos anunciados de velocidade/custo em outros workflows não são ganhos medidos no EchoFlow. [Limitações](https://docs.typesafe.ai/model-jaggedness/jev-1.13).

## Casos de uso concretos

| Caso | Exemplo e implementação possível | Ganho provável e decisão |
| --- | --- | --- |
| Revisão editorial antes do TTS | Avaliar se uma frase é natural, adequada a reuniões e independente de contexto; classificar intenção e dificuldade textual com rubricas separadas. Gerar relatório de revisão antes do lote de áudio. | Melhor piloto: pode poupar revisão repetitiva e evitar gerar duas vozes para conteúdo ruim. Valor depende da frequência dos lotes e dos erros encontrados. |
| Busca por intenção | “Quero discordar educadamente numa reunião” ou “preciso negociar um prazo” → escolher playlist existente ou reordenar candidatos, com opção de nenhum resultado adequado. | Benefício perceptível frente à busca literal; hoje seis playlists também podem ser atendidas por descrições, sinônimos e tags. Adiar integração até demonstrar vantagem sobre essa alternativa. |
| Triagem de Feedback | “Harper não toca depois de mudar a frase” → classificar como reprodução/áudio, separar sugestão de bug e estimar impacto descrito. | Poupa tempo se houver volume significativo. Processar após salvar, sem atrasar envio. Não resolve o problema nem lê screenshot diretamente. Adiar até quantificar trabalho manual. |
| Escolha de próxima prática | Objetivo informado + catálogo elegível → escolher uma playlist ainda não concluída. | Pouco sinal atual: conclusão não demonstra domínio. Regras por objetivo e status são mais simples. Não recomendar como personalização adaptativa hoje. |
| Seleção de trechos no futuro Video Import | Após transcrição e segmentação, julgar se cada trecho é compreensível isoladamente, útil e adequado para shadowing. | Potencial maior com muito conteúdo importado; depende de transcrição, direitos, privacidade e feature V2 ainda não implementada. |

As cinco propostas são inferências de aplicação ao nosso produto, não funcionalidades já construídas nem resultados comprovados. O fornecedor publica padrões de [composição de scores](https://docs.typesafe.ai/patterns/composite-scoring), [roteamento por intenção](https://docs.typesafe.ai/patterns/intent-routing) e um [cookbook de reranking](https://docs.typesafe.ai/cookbooks/rerank_typesafe) que sustentam a viabilidade do mecanismo, sem validar sua qualidade pedagógica aqui.

### Melhor candidato: revisão do catálogo

Entrada: texto canônico, cenário pretendido e rubricas editoriais. Perguntas independentes: a frase soa natural? O contexto combina com a playlist? A frase depende de uma fala anterior ausente? Qual faixa de complexidade textual melhor a descreve?

Saída: relatório separado dos textos aprovados, com rótulos, probabilidades e itens para revisão humana. O modelo não reescreve a frase, não publica conteúdo nem dispara TTS. Avaliação de dificuldade textual é uma estimativa editorial, não certificação CEFR nem avaliação da capacidade do aluno.

Manter em código as verificações que já são exatas: duplicatas literais, tamanho, IDs, integridade de arquivos, checksums, formato de áudio e intervalos de palavras. Avaliar “qualidade do áudio” requer ouvir/analisar áudio; Jev não possui essa entrada.

### Busca: benefício possível com alternativa barata

O problema real é a diferença entre intenção e título. “Pedir mais tempo” pode corresponder a Deadlines and Priorities sem compartilhar palavras. Com seis playlists, podemos avaliar todas; em um catálogo grande, recuperar candidatos antes de reordenar, porque um reranker não recupera itens que ficaram fora da lista inicial.

Comparar com busca ampliada por descrição, frases e sinônimos antes de adicionar uma chamada remota. Consultas em português precisam de avaliação própria: o fornecedor informa melhor precisão em inglês. Não fazer chamada por tecla; usar submissão/debounce, limites e retorno determinístico em falha. O ganho deve aparecer em sucesso da busca e início da prática, não apenas em precisão de rótulos.

## Onde não há encaixe

- Avaliar pronúncia, ritmo, entonação ou sotaque: texto/transcrição não contém toda a evidência acústica e Jev não aceita áudio.
- Gerar referências de voz, transcrever gravações ou produzir novos textos explicativos: manter ferramentas apropriadas a geração/transcrição.
- Controlar silêncio, playback, highlight e recorte por timestamps: cálculos locais têm menor latência e resultado exato.
- Autorizar acesso, decidir ownership ou substituir RLS: identidade e permissões continuam determinísticas no servidor/banco.
- Guardrail universal de segurança: o próprio fornecedor documenta sensibilidade a conteúdo adversarial.

## Custo e retorno

Com a tarifa direta publicada, custo ilustrativo = tokens totais de entrada / 1.000.000 × US$ 0,042. Os tokens incluem estado e perguntas; as hipóteses abaixo não são medições de uso.

| Workload hipotético | Entrada total assumida | Apenas inferência Jev |
| --- | --- | --- |
| Revisar 80 frases a 1.000 tokens por frase | 80.000 | US$ 0,00336 |
| Classificar 1.000 feedbacks a 1.000 tokens cada | 1.000.000 | US$ 0,042 |
| 10.000 buscas a 2.000 tokens totais por busca | 20.000.000 | US$ 0,84 |

Esses valores excluem engenharia, gateway, transcrição, retries, monitoramento e revisão de erros. Inferência barata não torna a integração barata. No catálogo, retorno = tempo editorial poupado + TTS/retrabalho evitado − implementação/manutenção − custo de erros. Na triagem, o benefício só existe se o tempo poupado superar correções de classificação. Na busca, medir se mais pessoas encontram e iniciam a prática; não há baseline disponível hoje.

## Integração proporcional

Para o piloto editorial, usar um script administrativo com modo padrão sem rede, execução explícita e orçamento de chamadas. HTTP direto é suficiente; não precisamos adicionar um framework de agentes. A API direta usa `POST https://api.typesafe.ai/v1/systemone`, com `state`, `questions` e `model`. [Referência HTTP](https://docs.typesafe.ai/api).

Se houver integração no produto, manter credenciais server-side, validar respostas mesmo sendo tipadas, fixar versão/rubricas, limitar retries e usar fallback. O OpenRouter documenta `POST https://openrouter.ai/api/alpha/decisions` com `typesafe/jev-1.13`, acessível com chave OpenRouter sem conta TypeSafe. Não basta trocar o modelo no gerador de TTS existente: o endpoint e o contrato são diferentes. [Tutorial oficial OpenRouter](https://openrouter.ai/blog/tutorials/how-to-use-jev/). O [modelo no OpenRouter](https://openrouter.ai/typesafe/jev-1.13/) também lista US$ 0,042/M de entrada e saída gratuita. Verificar disponibilidade, preço e contrato novamente no início do piloto; um endpoint alpha adiciona risco de manutenção.

Não transmitir gravações, screenshot, e-mail ou identidade para o piloto. Enviar feedback a um novo provedor muda o tratamento descrito na privacidade atual e exige uma decisão explícita sobre minimização e termos do canal utilizado. A TypeSafe declara não treinar com requisições/respostas; ZDR é oferecido para clientes enterprise. Isso não demonstra retenção zero no plano padrão. [Documentos legais](https://docs.typesafe.ai/legal).

## Experimento recomendado e critérios de adoção

Proposta de avaliação, ainda não executada:

1. Montar 150–200 exemplos de textos do catálogo, novos candidatos e problemas editoriais deliberados. Separar calibração de um conjunto final reservado; incluir casos ambíguos e negativos.
2. Definir rubricas com revisão humana e comparar regras simples, revisão manual e Jev. Cronometrar revisão sem assistência e com relatório, em lotes equivalentes.
3. Medir precisão por critério, falsos aprovados, fração encaminhada para revisão, tempo humano e tokens reais. Testar português quando pertinente e permutações de opções.
4. Critérios propostos: reduzir pelo menos 30% do tempo editorial; falsos aprovados em no máximo 5% dos casos rotulados como inadequados; manter todo caso incerto em revisão; zero alteração automática de textos aprovados. Esses números são metas iniciais, não resultados nem garantia estatística.
5. Uma execução paga deve ser autorizada com teto explícito: por exemplo, no máximo 250 chamadas, US$ 1 de inferência e sem retries automáticos. Preparar primeiro fixtures/testes determinísticos; CI não chama o provedor.

Se o piloto não atingir essas metas ou não houver demanda editorial recorrente, manter a curadoria atual. Para busca, um experimento separado deve comparar relevância no top 3 e tempo para encontrar conteúdo contra sinônimos/tags; para feedback, medir primeiro minutos semanais gastos na triagem.

Qualquer comportamento novo deve seguir Spec Kit proporcionalmente. Esta pesquisa não aceita uma nova feature nem autoriza chamadas pagas, alteração de privacidade ou deployment.

## Limites da conclusão

Pesquisei fontes oficiais e confrontei com documentos/código locais. Não executei Jev, não medi latência/qualidade e não acessei feedbacks de usuários. A recomendação é manter o núcleo de prática como está e considerar Jev como ferramenta editorial opcional; ganho real ainda precisa ser demonstrado no piloto.
