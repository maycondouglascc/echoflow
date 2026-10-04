# Requirements Quality Checklist: Plataforma pública e redesign

**Purpose**: Revisão de qualidade dos requisitos de autenticação, dados, segurança e UX antes de implementação.
**Created**: 2026-09-29
**Feature**: [spec.md](../spec.md)

**Note**: Checklist customizada do `$speckit-checklist` para revisão de texto, não da implementação.
**Review Ownership**: Revisor decide cada critério; `[x]` só significa qualidade de requisitos aprovada.
**Marker Semantics**: Nenhum item foi marcado durante a geração.

## Requirement Completeness

- [x] CHK001 O requisito de acesso enumera todas as superfícies protegidas, inclusive links diretos e arquivos de áudio? [Completeness, Spec §FR-002/FR-014]
- [x] CHK002 Os fluxos email, Google, confirmação, saída e recuperação têm resultados definidos? [Completeness, Spec §FR-003]
- [x] CHK003 O escopo do catálogo inicial e do conteúdo arquivado está delimitado sem prometer 40 frases? [Completeness, Spec §FR-005]
- [x] CHK004 O significado de conclusão de playlist está definido sem persistir gravações ou progresso parcial? [Completeness, Spec §FR-013]
- [x] CHK005 O requisito visual cobre landing, modal e estados vazio/filtrado/selecionado da área logada? [Completeness, Spec §FR-008]

## Requirement Clarity and Consistency

- [x] CHK006 A autenticação exigida para texto e áudio é consistente entre spec, plano e contrato? [Consistency, Spec §FR-002/FR-014]
- [x] CHK007 O rótulo Completed é derivado de conclusão por conta e não de um estado visual arbitrário? [Clarity, Spec §FR-013]
- [x] CHK008 A decisão sobre Alice/Mode 1 reconcilia o frame com vozes e modo aceitos? [Consistency, Spec §Assumptions]
- [x] CHK009 A supersessão do bucket público legado está explícita e rastreável? [Conflict, Spec §FR-014]
- [x] CHK010 A exigência legal separa placeholder externo de conteúdo aprovado para lançamento? [Clarity, Spec §FR-012]

## Acceptance Criteria Quality

- [x] CHK011 Há critérios observáveis para negar acesso anônimo e permitir jornada autenticada? [Measurability, Spec §SC-001/SC-002]
- [x] CHK012 Os critérios de isolamento distinguem leitura de catálogo compartilhado da conclusão pessoal? [Measurability, Spec §SC-004/SC-008]
- [x] CHK013 Há critérios para preservar associação das dez variantes e alinhamentos? [Measurability, Spec §SC-003]
- [x] CHK014 Os critérios de responsividade e acessibilidade fornecem alvos verificáveis? [Measurability, Spec §SC-005]
- [x] CHK015 A revisão visual exige evidência de diferenças dos frames sem prometer paridade não inspecionada? [Measurability, Spec §SC-006]

## Scenario and Edge Case Coverage

- [x] CHK016 Falhas de login, sessão expirada, callback inválido e redirecionamento externo têm destino seguro definido? [Coverage, Spec §Edge Cases]
- [x] CHK017 Catálogo/áudio indisponível e variante ausente têm comportamento recuperável sem fallback silencioso? [Coverage, Spec §US2]
- [x] CHK018 Falha na gravação da conclusão e repetição idempotente têm resultado claro? [Coverage, Spec §US2/Edge Cases]
- [x] CHK019 Busca com zero resultado e limpeza do filtro estão cobertas no catálogo de uma playlist? [Coverage, Spec §US3]
- [x] CHK020 A revisão distingue testes automatizados, serviços externos e áudio/microfone em dispositivo? [Coverage, Spec §FR-011]

## Dependencies and Assumptions

- [x] CHK021 As quatro skills fornecidas estão nomeadas como gate futuro do redesign, sem instalação nesta fase? [Dependency, Spec §Assumptions]
- [x] CHK022 Conteúdo legal, configuração Google/email e autorização de publicação estão identificados como dependências externas? [Dependency, Spec §Assumptions]
- [x] CHK023 A hipótese de conclusão na mesma sessão está explícita e pode ser revista sem alterar o dado persistido? [Assumption, Spec §Assumptions]

## Notes

- Itens continuam vazios até parecer do revisor dono da checklist. Parecer deve entrar em pm-review.md com versão por hash.
- `$speckit-implement` lê o estado desta checklist; não altera marcadores.
