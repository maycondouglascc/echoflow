# Feature Specification: Exportação automática de feedbacks para Notion

**Feature Branch**: `codex/notion-feedback`
**Created**: 2026-10-04
**Status**: Accepted scope; implementation and activation gates tracked in tasks.md
**Input**: Todos os feedbacks exportados automaticamente para database no Notion para controle pelo Hermes. Criar database e incluir screenshots.

## User Scenarios & Testing
### User Story 1 - Inbox completo para Hermes (Priority: P1)
Hermes encontra relatos antigos e novos com conteúdo integral e anexos escolhidos pelo usuário.
**Why this priority**: Uma origem única de triagem.
**Independent Test**: Inserir relatos com/sem imagem e conferir dados na inbox.
**Acceptance Scenarios**:
1. **Given** feedback antigo ou novo, **When** sincronização configurada roda, **Then** aparece com identificador, texto integral, remetente por ID, datas, página, viewport, contexto e screenshot quando presente.
2. **Given** serviço disponível e fila sem backlog, **When** feedback é enviado, **Then** aparece em até cinco minutos sem bloquear a confirmação de envio.

### User Story 2 - Recuperação sem perda ou duplicação (Priority: P1)
Operador identifica pendências e recupera interrupções.
**Why this priority**: Falhas externas não devem perder ou multiplicar sugestões.
**Independent Test**: Simular rejeição, resposta perdida e reinício.
**Acceptance Scenarios**:
1. **Given** indisponibilidade/limite, **When** falha, **Then** relato continua salvo e tentativa é reagendada com erro operacional sem texto privado.
2. **Given** página criada com resposta perdida, **When** retoma, **Then** reconcilia pelo identificador, sem recriar.
3. **Given** criação incerta sem página encontrada, **When** retoma, **Then** mantém pendência explícita para reconciliação sem criar outra página automaticamente.

### User Story 3 - Triagem privada e preservada (Priority: P1)
Hermes gerencia status, prioridade, categoria, responsável, notas, próxima ação e issue.
**Why this priority**: Exportação deve preservar decisões e privacidade.
**Independent Test**: Alterar status, repetir entrega e testar visitante/A/B.
**Acceptance Scenarios**:
1. **Given** triagem alterada, **When** repete sincronização, **Then** decisões permanecem intactas.
2. **Given** screenshot privado, **When** exporta, **Then** envia arquivo ao workspace restrito sem URL pública da origem.
3. **Given** usuário ou visitante, **When** acessa controles de exportação, **Then** não lê nem altera entregas.

### Edge Cases
- Token ausente/revogado, schema renomeado, imagem ausente, limite externo, encerramento.
- Instâncias concorrentes, lease expirada, página duplicada manualmente, arquivada ou Feedback ID alterado.
- Texto de 5000 caracteres, emoji no limite de fragmento, contexto vazio, histórico antigo.

## Requirements
### Functional Requirements
- **FR-001**: Exportar relatos antigos e novos com dados completos e screenshots opcionais.
- **FR-002**: Guardar pendência durável sem depender do Notion nem modificar confirmação/permissões de envio.
- **FR-003**: Processar continuamente; entregar em até cinco minutos sem backlog; recuperar falhas com atraso crescente até uma hora e respeitar limites externos.
- **FR-004**: Reconciliar por Feedback ID; impedir processamento concorrente e novas criações após resultado incerto; expor pendências para intervenção.
- **FR-005**: Criar inbox/guia Hermes; iniciar status Novo e prioridade Não definida; preservar alterações de triagem.
- **FR-006**: Segredos fora do cliente/logs; exportador privilegiado isolado da aplicação; controles inacessíveis a visitante/A/B; imagens sem URL pública.
- **FR-007**: Documentar configuração, monitoramento, reconciliação e remoção de cópias; explicar destino a quem envia.
- **FR-008**: Testes determinísticos para integridade, falha/retomada, duplicação e acesso. Ativação e acesso Hermes são verificações externas explícitas.

### Key Entities
- Feedback original: registro privado imutável e screenshot opcional.
- Entrega: pendência, tentativas, lease, próxima tentativa, criação iniciada, página e erro operacional.
- Inbox Hermes: dados originais e campos independentes de triagem.

## Success Criteria
### Measurable Outcomes
- **SC-001**: 100% dos relatos de fixtures preservam texto/contexto e screenshot ou ausência.
- **SC-002**: Zero duplicações nos testes de concorrência, resposta perdida e reinício; resultados incertos rastreáveis.
- **SC-003**: 100% dos testes visitante/A/B negam controles; triagem sobrevive a repetições.
- **SC-004**: Operador identifica pendências, tentativas e causa sem segredos/conteúdo privado em logs.

## Assumptions
- Unidirecional; Supabase é origem. Hermes usa própria integração no mesmo workspace; permissão depende de verificação externa.
- Criação do database e screenshots autorizados. Usuário não tem token: configuração segura e ativação são gates externos.
- Execução persistente na nuvem aprovada; não depende do computador do usuário ou CI ordinário. Usuário autorizou migração, exportação e ativação contínua em 04/10/2026; push não solicitado.
- Exclusão na origem não remove cópias no Notion: operador trata ambos, inclusive arquivos. Sem e-mail/gravações/conteúdo adicional.
