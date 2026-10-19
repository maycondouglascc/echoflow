# Feature Specification: Feedback com contexto da página

**Feature Branch**: `codex/contextual-feedback`
**Created**: 2026-10-04
**Status**: Implemented and verified — remote enablement authorized on 2026-10-04
**Input**: Adicionar botão flutuante “Feedback” no canto inferior direito, receber sugestões de melhoria com screenshot da página e contexto de navegação recente.

## User Scenarios & Testing

### User Story 1 - Enviar uma melhoria sem sair da prática (Priority: P1)

Uma pessoa autenticada abre Feedback em qualquer página da área logada, escreve sua sugestão, revisa os anexos e envia sem perder sua prática.

**Why this priority**: O feedback deve chegar à equipe e preservar o contexto da pessoa.
**Independent Test**: Entrar, abrir o botão, escrever uma sugestão, enviar e confirmar que o registro persistiu ligado ao remetente e à página.
**Acceptance Scenarios**:
1. **Given** uma página da área logada, **When** a pessoa abre Feedback, **Then** vê um formulário acessível sem navegar ou iniciar gravação de voz.
2. **Given** texto entre 10 e 5000 caracteres, **When** envia, **Then** recebe confirmação apenas após persistência, sem duplicar a sugestão em uma repetição do mesmo envio.
3. **Given** falha de envio, **When** retorna ao formulário, **Then** o texto e os anexos continuam disponíveis para nova tentativa.
4. **Given** teclado ou viewport móvel, **When** abre/fecha o formulário, **Then** o foco fica no diálogo e retorna ao botão, sem bloquear os controles da prática.

### User Story 2 - Compartilhar contexto visual conscientemente (Priority: P1)

A pessoa vê uma prévia da página capturada antes de enviar e pode retirar a imagem ou o histórico.

**Why this priority**: A equipe precisa entender a tela e a sequência anterior ao problema.
**Independent Test**: Navegar entre duas playlists, abrir Feedback e conferir screenshot e sequência de páginas, depois retirar um anexo antes do envio.
**Acceptance Scenarios**:
1. **Given** o formulário aberto, **When** a captura termina, **Then** a pessoa vê uma prévia da página anterior ao diálogo, com os campos de entrada excluídos.
2. **Given** uma sequência recente de navegação, **When** revisa o contexto, **Then** vê até 20 páginas/ações permitidas dos últimos cinco minutos, em ordem cronológica.
3. **Given** imagem/contexto retirados ou captura indisponível, **When** envia, **Then** a sugestão é aceita sem esses anexos e a equipe recebe essa ausência corretamente.
4. **Given** a pessoa cancela o diálogo, **When** retorna à prática, **Then** nenhuma captura ou histórico é transmitido.

### User Story 3 - Proteger os registros e anexos (Priority: P1)

A equipe autorizada consulta sugestões privadas; cada usuário tem acesso somente aos próprios registros e anexos.

**Why this priority**: Screenshots e comentários podem conter informações particulares.
**Independent Test**: Usar visitante e usuários A/B; confirmar que B não lê, altera ou anexa conteúdo ao feedback de A e que uma sessão expirada falha antes de persistir.
**Acceptance Scenarios**:
1. **Given** um feedback de A, **When** B tenta ler o registro ou a imagem, **Then** o acesso é negado.
2. **Given** visitante ou sessão expirada, **When** tenta enviar, **Then** não cria feedback nem anexo.
3. **Given** conteúdo inválido, anexo excessivo ou origem externa, **When** solicita envio, **Then** é rejeitado antes da gravação.

### Edge Cases

- Captura falha, fontes/imagens não carregam ou o dispositivo não suporta a renderização.
- Conta é trocada ou a pessoa sai durante a navegação: contexto anterior não é reutilizado.
- Clique repetido, resposta perdida ou rede interrompida entre salvar imagem e registrar texto.
- Screenshot contém campos de autenticação, comentários digitados, mídia pessoal ou elementos privados: esses elementos são excluídos.
- Página muito longa: captura somente a área visível, com tamanho limitado.
- URLs com parâmetros, tokens ou hashes: esses trechos não entram no contexto.

## Requirements

### Functional Requirements

- **FR-001**: Botão “Feedback” fixo no canto inferior direito da área autenticada, responsivo e acessível por teclado.
- **FR-002**: Diálogo com texto obrigatório de 10–5000 caracteres, screenshot revisável e contexto recente revisável, confirmação e recuperação de erro.
- **FR-003**: Screenshot somente da viewport do app, sem diálogo de feedback, campos digitados, elementos marcados privados ou mídia pessoal; prévia antes de envio e retirada opcional.
- **FR-004**: Contexto limitado a 20 eventos dos últimos cinco minutos no mesmo acesso autenticado; somente caminhos do app e ações de uma lista explícita. Não registrar valores digitados, consultas de URL, hashes, credenciais, conteúdo de rede, console, áudio ou vídeo pessoal.
- **FR-005**: Imagem/contexto permanecem locais até envio explícito; cancelamento transmite zero anexos. Troca de conta/saída descarta contexto.
- **FR-006**: Texto, página, instante, viewport, contexto e referência da imagem são persistidos como um feedback privado ligado à identidade autenticada.
- **FR-007**: Servidor e regras de acesso validam identidade e propriedade; visitante e outra conta não podem acessar o feedback ou anexo.
- **FR-008**: Validar tamanho e conteúdo do screenshot, formato de página/eventos e corpo; rejeitar solicitação de outra origem; chave privilegiada não chega ao navegador.
- **FR-009**: Envio idempotente com identificador estável por tentativa; falha não perde rascunho, não sobrescreve outro feedback e limpa anexo criado se o registro falhar.
- **FR-010**: A prática e seus áudios/gravações não mudam. Captura visual é carregada somente ao abrir Feedback.
- **FR-011**: Atualizar a explicação de privacidade para descrever feedbacks e seus anexos e testar os limites com contas distintas e fixtures determinísticas.

### Key Entities

- **Feedback**: Sugestão, remetente, página, viewport, data, contexto escolhido e anexo opcional.
- **Contexto recente**: Sequência temporária e limitada de páginas/ações permitidas da sessão atual.
- **Screenshot**: Imagem da área visível escolhida para envio, armazenada privadamente.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Feedback pode ser aberto e enviado em home e todas as playlists sem navegar para outro formulário.
- **SC-002**: Cada envio válido resulta em exatamente um registro e uma imagem ou ausência explícita; repetição não duplica registro.
- **SC-003**: 100% dos testes de visitante/B contra feedback e screenshot de A negam leitura e alteração.
- **SC-004**: 100% das verificações de contexto excluem parâmetros, hashes, campos digitados, áudio e itens fora da janela de cinco minutos/20 eventos.
- **SC-005**: Falha de captura não bloqueia sugestões; falha de envio preserva texto/anexos. Teclado e viewport de 375px passam na verificação.

## Assumptions

- Primeira versão disponível na área logada; sugestões são consultadas pela equipe via armazenamento administrativo já existente, sem novo painel administrativo.
- Por padrão, contexto é histórico de páginas e ações permitidas, não vídeo nem replay contínuo. A preferência foi perguntada ao usuário antes do planejamento final.
- Conteúdo usa a linguagem inglesa já presente na interface; o botão mantém o rótulo solicitado “Feedback”.
- Contexto não é persistido entre carregamentos ou contas; anexos são opcionais e mostrados antes do envio.
