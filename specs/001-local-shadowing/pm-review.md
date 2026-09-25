# Parecer PM: feature 001 — prática local de shadowing

**Status do parecer original**: pronta para autorização da implementação. Este pacote cobre especificação e planejamento; nenhuma implementação foi iniciada.

**Feature ativa**: `specs/001-local-shadowing/` na branch `codex/local-shadowing`.

## Decisões e hipóteses

| Decisão | Origem | Efeito e alternativa considerada |
|---|---|---|
| Gerar as referências offline com eSpeak NG. | Usuário, resposta à pergunta de clarify em 2026-09-25. | WAVs locais, sem TTS em runtime. A voz sintética é menos natural que gravações humanas; a qualidade precisa ser ouvida antes de aceitar os assets. |
| Usar “Introducing Yourself”, as frases 1–3, e preencher os placeholders com Alex, Recife e software engineer. | Inferência do PM a partir de `docs/EchoFlow.md` e `docs/IMPLEMENTATION_PLAN.md`, seção “The 40 Phrases”. | Fixa texto e pronúncia das fixtures; o cenário e as frases escolhidas podem ser trocados antes da geração dos arquivos. |
| Reter até três gravações na memória enquanto a página permanecer aberta; descartá-las ao sair ou recarregar. | Inferência do PM que concilia navegação por frases com a restrição de sessão. | Permite voltar e comparar; não há persistência nem autosave. |
| Pedir microfone só após ativação explícita de Gravar; aguardar 300 ms depois da referência antes de habilitar a ação. | Pedido atual e fluxo documentado; decisão de interação do PM. | Entrar no cenário, ouvir e navegar não abre o microfone. |
| Comparar primeiro a referência e depois a gravação, em reprodução sequencial. | Pedido atual e arquitetura existente. | Sem sobreposição. |
| Limitar a feature ao modo pedagógico “ouvir e repetir”. | Inferência do PM pelo fluxo sequencial pedido. | O relatório de auditoria preexistente recomenda três modos; “acompanhar com atraso” e “falar junto” ficam fora desta fatia, sem alterar a direção ampla do produto. |
| Usar inglês na interface e uma voz en-US com velocidade fixa de 150 palavras por minuto. | Hipóteses técnicas do PM: a aplicação atual declara `lang="en"`; escolher uma variante e velocidade fixa torna os WAVs reproduzíveis. | Não são escolhas atribuídas ao usuário. Reavaliar antes de gerar os assets se o proprietário do produto quiser outra variante ou ritmo. |

Nenhuma decisão humana bloqueia o plano. A proveniência e os termos dos WAVs precisam estar documentados e permitir seu uso no projeto antes de incluí-los. O host atual não tem o executável CLI do eSpeak NG, mas contém a biblioteca C e os dados de voz compatíveis. O helper de geração usa essa API local, sem instalar software nem adicioná-la ao runtime, build ou CI. O teste de microfone real requer iOS Safari e Android Chrome em origem local segura, conforme o quickstart.

## Revisões e análise

Os papéis de produto, arquitetura, checklist e análise foram executados sequencialmente pelo PM porque a tentativa de iniciar o agente de PM terminou com o limite de uso da conta. Isso é um parecer interno, não uma revisão independente. A skill `grill-me` encaminha para `grilling`, mas a dependência não está instalada; fiz revisão crítica interna sem atribuir a ela um parecer.

| Revisão | Resultado | Limite |
|---|---|---|
| Produto: solicitação original, docs de produto/arquitetura e relatório de auditoria preexistente | Corrigida a fonte das frases (elas estão no plano, não no resumo de produto), fixados os textos concretos, esclarecido o modo sequencial e mantidos explícitos os limites de escopo. Nenhum achado crítico ou alto permanece. | Não valida eficácia pedagógica nem naturalidade dos WAVs. |
| Técnica: código e configuração atuais, convenções locais, arquitetura, estratégia Playwright e quickstart | Plano usa a base Next.js/React/TypeScript existente; mocks cobrem browser sem fingir teste de hardware; checks existentes são preservados; estados de negação, falha e recuperação têm tarefa de teste e implementação. | Nenhum código, áudio ou teste foi implementado; checks de aplicação e dispositivos ficam para a implementação. |
| Checklist de qualidade dos requisitos | Os 20 itens CHK001–CHK020 foram examinados; cada ponto está refletido na spec, plano, tarefas ou quickstart. | Caixas customizadas mantidas vazias, conforme a regra de ownership; este registro não finge uma assinatura independente. |
| Análise cruzada Spec Kit | Cobertura requisito → tarefa → validação abaixo; nenhum requisito sem tarefa e nenhuma tarefa de implementação órfã. Marcadores de template e decisões pendentes não foram encontrados. | Análise executada internamente pelo PM, em modo somente leitura sobre os artefatos finais. |
| Revisão crítica (fallback de Grillme) | Contrapus a recomendação mais ampla de três modos, a recomendação de voz humana e a prática sem microfone com o escopo explícito do usuário. Registrei o recorte, a limitação sintética e a recuperação sem bloquear escuta/navegação. | Não equivale a execução real de Grillme nem a parecer independente. |

### Cobertura requisito → tarefa → validação

| Requisito/critério | Tarefas | Validação prevista |
|---|---|---|
| FR-001 | T003–T006 | Três frases em ordem, navegação à rota e fixture correspondente. |
| FR-002 | T003, T006 | Navegação adjacente e limites desabilitados. |
| FR-003 | T003, T004, T007 | Tocar e repetir o WAV selecionado. |
| FR-004 | T003, T007 | Habilitação 300 ms após o fim; nenhum pedido de microfone antes do clique. |
| FR-005 | T003, T007 | Parada manual e automática aos 30 s. |
| FR-006 | T003, T007 | Retenção ao navegar e ausência após reload. |
| FR-007 | T003, T007 | Fim da referência antes do início da gravação; sem sobreposição. |
| FR-008 | T003, T007 | Negação seguida de concessão sem reload; falhas recuperáveis. |
| FR-009 | T003–T005 | Conteúdo/áudio estáticos locais e ausência de dependência de serviço externo. |
| FR-010 | T003, T007 | Blob marcador ausente de requests e storage; limpeza no fim da sessão. |
| FR-011 | T003, T006 | Ouvir e navegar antes de qualquer solicitação de microfone. |
| SC-001 | T003, T006 | Percurso inicial, três frases e limites de navegação. |
| SC-002 | T003, T004, T007 | Referência correspondente reproduzível e repetível. |
| SC-003 | T003, T007 | Replay de gravação manual e captura encerrada no limite. |
| SC-004 | T003, T007 | Comparação sequencial e ausência de sobreposição. |
| SC-005 | T003, T007, T008 | Teste de negação/recuperação e checagem manual em dois dispositivos. |
| SC-006 | T003, T007, T008 | Inspeção de requests/storage e perda após reload. |

T001 e T002 preparam o runner e integram a regressão ao CI; são tarefas fundacionais para T003 e preservam os gates existentes. Os dez cenários de aceitação estão cobertos por T003/T004–T008. Casos de fixture interrompida, API indisponível, captura vazia, mudança de frase e privacidade também aparecem no plano de teste.

**Métricas da análise**: 17 requisitos/critério buildables; 17 com ao menos uma tarefa (100%); 8 tarefas futuras; 10 cenários de aceitação; 20 itens de checklist examinados e não marcados; 0 ambiguidade humana pendente; 0 achado crítico/alto; 0 tarefa de implementação sem história ou validação associada.

## Identificação das versões examinadas

SHA-256 dos artefatos revisados após as correções. `docs/RELATORIO_AUDITORIA_2026-09-24.md` já era não versionado no checkout; foi apenas consultado e preservado.

| Arquivo | SHA-256 |
|---|---|
| `specs/001-local-shadowing/spec.md` | `ea61b8da5e92c1af886b4f88531dab379be1f4b8cfe831b89589e2b8330fe9f3` |
| `specs/001-local-shadowing/plan.md` | `ce7cd8d1c801e837905a1b48541c6b02f29e391a2f7ce9a37da7f626f5989c49` |
| `specs/001-local-shadowing/tasks.md` | `a9052f15002e932ff52fc097fb5461ebeed4529cb49d4430846267b58083f371` |
| `specs/001-local-shadowing/research.md` | `acdfaffe8f1ffb7f191cc42d18941695e78d4704259d357af1afeb87a435bbba` |
| `specs/001-local-shadowing/data-model.md` | `83031c7fc849c34c5bfd33be20f924e0c786f71765f7faf4b81de70d3058a83c` |
| `specs/001-local-shadowing/contracts/practice-screen.md` | `af2bdef72ecce810a18267b34da5c0a4f64065291d53b80d11e1cbf8c3021c83` |
| `specs/001-local-shadowing/quickstart.md` | `bf458910f5bf72b5f22ab0841101976956508d4b20b17f03cabaee3c40b1f965` |
| `specs/001-local-shadowing/checklists/requirements.md` | `9267de973f86d9753f6849085e2cae7cf4f879596a439720abc84e4f5260a3aa` |
| `specs/001-local-shadowing/checklists/requirements-quality.md` | `32ea21bc90e0173e8afdc314494ffb831c079cefc988c734f74197814c4e03ac` |
| `docs/RELATORIO_AUDITORIA_2026-09-24.md` | `6fd9650f7456fcbca744c30b0943f0a6821231d7034abd5470d36eb69159bb09` |

A validação final foi documental: 11 FR, 6 SC, dez cenários de aceitação, oito tarefas de implementação não marcadas, 20 itens customizados não marcados, nenhum placeholder pendente e nenhuma extensão Spec Kit registrada. Lint, typecheck, build, testes de browser, geração/escuta de áudio e testes em aparelhos não foram executados porque não houve mudança de código nem implementação.

**Próxima etapa**: depois de autorização explícita para implementar, executar `$speckit-implement` nesta feature. Não usar `$speckit-converge` antes da implementação.

## Addendum da implementação (2026-09-25)

O parecer e a tabela de hashes acima registram a revisão de planejamento anterior à implementação. Após o proprietário solicitar `$speckit-implement`, a feature foi implementada no escopo aprovado. T001–T008 e T010 estão concluídas; T009 acompanha a checagem manual em dispositivos reais. As checklists de qualidade continuam sob responsabilidade do revisor e seus marcadores não foram alterados.

A validação executada foi: `npm audit --audit-level=high` (0 vulnerabilidades), `npm run lint`, `npm run typecheck`, `npm run build` e `npm run test:e2e` (13/13). Os testes de browser passaram tanto no servidor local de desenvolvimento quanto contra o build de produção. O build e os testes de produção foram executados em cópia temporária para preservar a prévia em localhost:3000.

A tela inicial e a rota `Introducing Yourself` estão implementadas, com três WAVs estáticos locais, gravação e comparação mantidas somente na memória da página, recuperação após permissão negada e parada/descartamento ao navegar durante captura. A geração local chama a API C eSpeak NG por `ctypes`; não há síntese em runtime, CI ou build. Os WAVs são mantidos apenas para este protótipo local, sem afirmação de licença de redistribuição.

A verificação em hardware permanece pendente: ouvir e confirmar a inteligibilidade das três fixtures, permissões e captura em Safari no iOS e Chrome no Android, incluindo recuperação, parada/limite, comparação sequencial e descarte após recarga. Não houve deploy nem compartilhamento público.
