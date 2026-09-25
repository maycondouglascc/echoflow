# Requirement-quality checklist: prática local de shadowing

**Purpose**: Revisar completude, clareza, consistência e mensurabilidade dos requisitos antes de implementar
**Created**: 2026-09-25
**Feature**: [spec.md](../spec.md)
**Audience**: revisor do pacote de requisitos

## Requirement Completeness

- [ ] CHK001 Os requisitos identificam claramente o único cenário e as três frases da sessão? [Completeness, Spec §FR-001]
- [ ] CHK002 A especificação cobre abrir o cenário, avançar/voltar, ouvir referência, gravar e comparar? [Coverage, Spec §User Scenarios]
- [ ] CHK003 Os limites anterior e seguinte e o comportamento não circular estão explícitos? [Completeness, Spec §FR-002]
- [ ] CHK004 O comportamento quando o browser não oferece gravação, o microfone falha ou o áudio fica vazio está definido? [Edge Cases]
- [ ] CHK005 As verificações manuais de aparelho estão identificadas separadamente das verificações automatizadas? [Completeness, Spec §Assumptions]

## Requirement Clarity and Consistency

- [ ] CHK006 A espera de 300 ms, o fim da referência e a habilitação do controle para gravar têm uma relação inequívoca? [Clarity, Spec §FR-004]
- [ ] CHK007 A especificação deixa claro que a permissão aparece apenas após a ação explícita de gravar? [Clarity, Spec §FR-004]
- [ ] CHK008 A parada manual e o limite automático de 30 segundos distinguem quando a captura termina? [Clarity, Spec §FR-005]
- [ ] CHK009 A ordem da comparação e a ausência de sobreposição são definidas para cada reprodução? [Consistency, Spec §FR-007]
- [ ] CHK010 A recuperação de permissão negada permite nova tentativa sem reload e mantém referência e navegação? [Clarity, Spec §FR-008]
- [ ] CHK011 A resposta da pessoa sobre eSpeak NG está documentada sem atribuir a ela escolhas técnicas que não fez, como velocidade ou formato? [Traceability, Spec §Clarifications e §Assumptions]

## Privacy and Scope

- [ ] CHK012 O prazo de disponibilidade das gravações em memória é claro ao navegar, fechar e recarregar a página? [Clarity, Spec §FR-006]
- [ ] CHK013 O que não pode enviar ou persistir a gravação é verificável sem depender de interpretação vaga de “sessão”? [Measurability, Spec §FR-010]
- [ ] CHK014 O escopo exclui autenticação, Supabase, upload, provedores pagos e deploy público? [Completeness, Spec §Input]
- [ ] CHK015 A ausência de progresso ou salvamento remoto é consistente com as instruções e com o fluxo de produto legado? [Consistency, Spec §Assumptions]
- [ ] CHK016 A origem e a licença dos WAVs de referência estão cobertas antes de incluir fixtures no projeto? [Completeness, Spec §Assumptions]

## Acceptance Criteria and Dependencies

- [ ] CHK017 Todos os resultados observáveis pedidos têm cenário de aceitação e critério de sucesso rastreáveis? [Coverage, Spec §Success Criteria]
- [ ] CHK018 O plano automatizado testa casos determinísticos sem afirmar que prova o funcionamento de microfone ou hardware real? [Consistency, Plan §Automated and device verification]
- [ ] CHK019 As tarefas cobrem regressão automatizada, fixtures, rota, captura, privacidade, recuperação e checagem em aparelhos? [Coverage, Tasks]
- [ ] CHK020 O quickstart explica uma origem segura para teste local em telefone sem publicar o protótipo? [Completeness, Quickstart]

## Notes

- Artefato de checklist customizada; os itens verificam qualidade das exigências. Não representam execução da implementação.
- Todas as caixas permanecem vazias até a revisão designada. O PM registrará parecer, cobertura e eventuais lacunas em pm-review.md, sem simular assinatura humana nem alterar estes marcadores.
