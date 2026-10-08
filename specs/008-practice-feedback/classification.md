# Classificação e roadmap dos oito feedbacks

Prioridades são recomendações do PM, não gravidade medida em produção. Esforço relativo: S = alteração localizada; M = múltiplos módulos; L = integração/discovery e dispositivos. Não são estimativas de prazo.

| ID | Feedback | Classe / prioridade | Evidência e escopo | Esforço / risco | Frente e entrega |
| --- | --- | --- | --- | --- | --- |
| F01 | Ouvir gravação sozinha sem referência | Lacuna UI; P1 | `playRecording` já existe no hook; falta botão. “Vídeo” não acrescenta importação V2. | S / baixo | A: botão solo e regressões, primeira entrega |
| F02 | Palavras cortadas/misturadas; partes/linking | Defeito de qualidade percebida + evolução conteúdo; P1 | Fonte frase+seek e fim por RAF; timing válido não prova fronteira fonética. Causa ainda não reproduzida. | L / alto pedagógico/custo | B: diagnóstico → exemplos corretos/fallback → grupos naturais; TTS individual só piloto aprovado |
| F03 | Transcrição ao vivo e detectar fim | Descoberta de capacidade + evolução; P3 de entrega, discovery cedo | RMS local já termina após silêncio. Texto reconhecido não valida pronúncia; browser pode usar serviço remoto. | L / alto privacidade/compatibilidade | D: spike local sem rede/fixtures → decisão → integração opcional; parada assistida futura |
| F04 | Gravar durante referência; tocar ambos | Novo modo core; P1 | Contratos anteriores excluem overlap; máquina atual tem playing/recording exclusivos. Exige transporte/captura, não só habilitar botão. | L / alto lifecycle/eco | A: replay solo → transporte comum → mic-only capture with reference/comparison mix; sequential fica default |
| F05 | Frases já ouvidas e contagem | Histórico por conta; P2 | Contadores/eventos por conta (decisão humana), separados de compared/completed. Schema, ownership, idempotência e concorrência necessários. | L / alto ownership/duplicação | H: transação eventos/counters e RLS → A: eventos full reference ended → C: lista |
| F06 | Containers 100vh só lista rola | Layout; P2 | Shell tem margens; mobile atual empilhado não comporta literal duas alturas. | M / médio overflow/a11y | C: viewport disponível, drawer mobile, zoom/shortheight fallback |
| F07 | Sons para divertir | Motivação opcional; P3 | Requer mute/gesto visual equivalente e supressão em recording/media. | M / médio contaminação | E: cues opt-in → A integração de eventos → C UI |
| F08 | Esconder painel esquerdo | Foco; P2 | Sidebar contém lista/account; restauração precisa controle persistente e focus management. | S–M / médio a11y | C: collapse/restore junto layout, preservando estado |

## Ondas de execução

Este resumo é visão produto. Sequência exata, dependências, slots e ownership em tasks.md/execution.md prevalecem; não despachar todos papéis desta tabela simultaneamente.

1. **Contrato e baseline**: root identifica estado sujo; escolhe snapshot de base e cria worktrees próprios (sem copiar secrets). Fixa interfaces/owners abaixo. Nenhum agente escreve no checkout compartilhado atual. Define fixtures/ports individuais; CI e provider APIs ficam separados.
2. **Entrega imediata**: A expõe solo; B faz diagnóstico de palavras; C extrai layout/sidebar e implementa viewport/foco. Essas três frentes têm arquivos distintos depois da fundação. Máximo três executores em paralelo, com coordenador no quarto slot.
3. **Núcleo áudio**: A implementa transporte/speak-along/simultaneous/eventos de history; H implementa backend/RLS history em arquivos separados; B aplica correção causal e unidades contextuais; D faz adapter recognition isolado com fake/capability, se discovery admitir. C pode implementar lista de counts após contrato, mas root serializa integração em `ShadowingPractice.tsx`.
4. **Polimento seguro**: E desenvolve módulo cues isolado enquanto C testa acessibilidade e B valida listening review; A integra cues/recognition, um por vez. O orçamento/custo de TTS e comprovação de processamento local ASR são gates separados: demais histórias não esperam serviço pago.
5. **Revisão/integracão**: revisor por slice lê diff congelado e hash; owner corrige achados; root roda gates e device checklist, sem publicar. Release bloqueada por achado alto ou device requisito não demonstrado.

## Skills na futura execução

| Papel | Skills a carregar, razão | Critério de parada / entrega |
| --- | --- | --- |
| Coordenador | `pm-speckit`, `speckit-analyze`; posteriormente `speckit-implement`/`speckit-converge` só após autorização | Dar brief com IDs, base hash, arquivos, recursos, contratos, testes/gates, exclusões, dependências; integrar commits coerentes somente quando autorizados |
| A áudio e contadores | `speckit-implement`; `diagnosing-bugs` se reprodução revelar race/skew | Só owner de hook/capture/transport; testes determinísticos e métricas device, sem APIs pagas |
| B diagnóstico/conteúdo | `diagnosing-bugs` (reproduzir→hipótese→experimento→fix); `speckit-implement` após causalidade | Relatório asset/alinhamento/seek/end/race, fixture red→green; TTS/import remoto exige orçamento/destino aprovados |
| C layout/foco/lista | `emil-design-eng`, `mobile-native`, `speckit-implement` | Prática atual preservada; screenshots desktop/mobile/zoom, keyboard/focus; `review-animations` só se mudar movimento |
| D reconhecimento | `research` para spike primário; `speckit-implement` apenas para ramo aprovado | Matriz capability real/locality/network; offline failure fechado; ASR externo excluído pelo dono |
| H história por conta | `speckit-implement`, revisão `code-review` em auth/RLS | Migration local aditiva, action usuário+Origin quando aplicável, transação idempotente, A/B/anon, nenhuma gravação persistida |
| E feedback sonoro | `emil-design-eng` para timing/estado; `speckit-implement` | Três cues pequenos/lícitos, opt-in/mute, supressão, zero alteração fluxo/pronúncia |
| Revisor produto | `grilling` via `grill-me` sob autonomia delegada ao PM | Cobertura F01–F08, conflitos/claims/preferências, critérios mensuráveis; não inventar respostas do dono |
| Revisor código | `code-review`, `web-design-guidelines` para UI; `review-animations` quando aplicável | Métodos de prova independentes, altas/criticas bloqueiam slice; schema/auth/RLS precisa revisão A/B |

Nomes indicam skills instaladas pertinentes; agentes devem ler seus SKILL.md na execução. Planejamento atual executa Specify/Clarify/Plan/Checklist/Tasks/Analyze; não afirma que skills de implementação foram executadas.
