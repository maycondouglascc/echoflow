# Research: prática local de shadowing

**Feature**: Prática local de shadowing (001-local-shadowing)
**Data**: 2026-09-25

## Decisões

### R1. Reutilizar a base web e separar leitura de interação com o microfone

**Decisão**: manter Next.js App Router, React e TypeScript já fixados em package.json e package-lock.json. Renderizar cenário e dados sem estado de servidor; limitar a interação de áudio e navegador ao trecho de tela que depende de eventos, estado e APIs do dispositivo.

**Motivo**: há três frases estáticas e um percurso. A raiz atual já usa App Router e renderiza no servidor. Só gravação, controle de áudio e estado da sessão requerem o navegador. Isso segue AGENTS.md e evita mudar a arquitetura para conteúdo estático.

**Alternativas consideradas**: Supabase e rotas de API. Rejeitadas porque introduzem conta, rede e persistência contra o escopo expresso pelo usuário.

### R2. Gerar voz sintética uma vez offline e versionar os arquivos estáticos de referência

**Decisão**: gerar as três falas em WAV antes de iniciar o protótipo, usando a API C do eSpeak NG em inglês dos EUA por `ctypes` da biblioteca padrão Python e velocidade fixa de 150 palavras por minuto. O executável CLI não estava instalado, mas a biblioteca e os dados de voz locais estavam disponíveis. Incluir os arquivos em public/fixtures/audio/ e registrar versão do gerador, voz, parâmetros, checksums e proveniência em public/fixtures/audio/README.md e nos scripts de geração. No uso local e nos testes, servir apenas os WAVs versionados; não executar TTS em tempo de execução, CI ou build.

**Motivo**: o usuário escolheu eSpeak NG offline. O upstream documenta tanto síntese em WAV quanto uma voz formântica menos natural do que síntese baseada em gravações humanas ([README eSpeak NG](https://github.com/espeak-ng/espeak-ng), [integração da API C](https://github.com/espeak-ng/espeak-ng/blob/master/docs/integration.md)). Os arquivos estáticos mantêm a experiência determinística e sem provedor. A naturalidade reduzida fica explícita para um protótipo da técnica de shadowing.

**Proveniência**: o projeto eSpeak NG identifica seu código e dados sob GPL-3.0-or-later ([licença upstream](https://github.com/espeak-ng/espeak-ng/blob/master/COPYING), [documentação das vozes](https://github.com/espeak-ng/espeak-ng/blob/master/docs/voices.md)). A seção 2 da licença descreve a saída como coberta somente se seu conteúdo constituir uma obra coberta, e permite executar obras cobertas que não sejam transmitidas. Isso sustenta o uso no protótipo local e não resolve uma licença separada para a saída. O EchoFlow não inclui biblioteca ou dados de voz e não alega permissão para redistribuir os WAVs; publicação ou compartilhamento do repositório exige revisão própria. Isso segue a exclusão explícita de deploy público.

**Alternativas consideradas**: serviço TTS pago (excluído explicitamente), voz web gerada em runtime (não determinística/offline e não fornece fixture estática), gravações humanas licenciadas (o usuário escolheu a opção sintética). Nenhuma chamada de rede ou sintetizador deve ser necessária para reproduzir um fixture incluído.

### R3. Solicitar microfone somente a partir da ação Gravar e controlar a comparação em série

**Decisão**: associar a solicitação de acesso ao microfone à ativação de Gravar. Depois da concessão, limitar a gravação a 30 segundos, encerrar as tracks quando a captura parar e só então preparar a reprodução da gravação. Comparar reproduz a referência até o evento de término e só então inicia a gravação.

**Motivo**: a documentação de produto prevê pausa de 300 ms na transição da escuta, mas navegadores exigem contexto seguro e autorização para obter microfone. MDN documenta a recusa quando o acesso é negado e que a solicitação pode ficar pendente até a pessoa responder ([MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)). O dispositivo não pode ser aberto automaticamente ao entrar na página. A ordem sequencial corresponde a docs/system_architecture.md e ao pedido.

**Falhas cobertas**: permissão negada, navegador sem gravação disponível, dispositivo ausente, solicitação pendente, início de áudio rejeitado e formato não reproduzível. Falhas mantêm a navegação e a referência. Uma permissão concedida tardiamente após cancelamento encerra as tracks sem iniciar uma captura inesperada.

### R4. Automatizar o percurso de navegador com dispositivos simulados e reservar teste real para hardware

**Decisão**: adicionar @playwright/test como dependência de desenvolvimento, fixá-la em package-lock.json, adicionar npm run test:e2e e executar a suíte em Chromium headless no CI. Instalar somente o browser Chromium requerido. Na configuração de teste, iniciar a aplicação local depois do build. Os testes simulam stream e gravador de mídia e observam ordem de interação e pedidos de rede; não dependem de microfone físico.

**Motivo**: docs/DEVELOPMENT_WORKFLOW.md e docs/IMPLEMENTATION_PLAN.md exigem regressões automatizadas e inspeção em iOS Safari e Android Chrome para áudio e microfone. Playwright documenta servidor local via webServer e configuração de APIs simuladas antes do carregamento da página ([servidor local de testes](https://playwright.dev/docs/test-webserver), [mocks de APIs de navegador](https://playwright.dev/docs/mock-browser-apis)). Mocks fornecem cobertura repetível sem alegar que provam comportamento no hardware.

**Alternativas consideradas**: confiar só em lint/typecheck/build (não verifica o percurso), adicionar somente teste unitário sem navegador (não reproduz interação de browser), ou testar serviços externos (desnecessário e contra o escopo). Playwright exige um pacote e um binário de browser no CI; limitá-los a um browser automatizado e dois dispositivos manuais.

### R5. Manter gravações associadas a frases apenas na memória da página

**Decisão**: guardar cada gravação e a URL temporária de reprodução na memória local da página, indexada pela frase. Invalidar URLs temporárias e parar tracks ao substituir o áudio, desmontar a prática ou sair da página. Uma recarga reinicia o estado. Não usar cache, cookie, localStorage, sessionStorage, IndexedDB, endpoint, beacon, service worker de gravação, log ou telemetry para guardar os áudios.

**Motivo**: manter os clips durante a visita permite voltar às três frases e comparar novamente sem aplicar o salvamento automático do fluxo legado. Encerrar ou recarregar a página perde as gravações.

**Alternativas consideradas**: salvar no servidor ao avançar, descartar imediatamente ao mudar de frase e persistir no navegador. O primeiro contradiz o pedido; o segundo inviabiliza comparar ao voltar; o terceiro excede a retenção da sessão.

## Evidência local consultada

- docs/EchoFlow.md: catálogo de cenários, incluindo “Introducing Yourself” em primeiro lugar; não contém os textos das frases.
- docs/IMPLEMENTATION_PLAN.md, seção “The 40 Phrases”: dez frases para esse cenário, com placeholders nas três primeiras; os placeholders são preenchidos explicitamente na spec.
- docs/RELATORIO_AUDITORIA_2026-09-24.md (arquivo preexistente não versionado): recomenda três modos pedagógicos e um benchmark de voz. A feature solicitada cobre somente “ouvir e repetir” e o usuário escolheu eSpeak NG offline; modos sobrepostos e benchmark ficam fora deste escopo.
- docs/system_architecture.md: comparação de referência e voz da pessoa em sequência, separada pelo fim da referência.
- docs/IMPLEMENTATION_PLAN.md: limite de 30 segundos, pausa de 300 ms e testes reais em Safari/iOS e Chrome/Android. Upload, progresso, autenticação e provedor TTS do MVP amplo não se aplicam à instrução atual.
- docs/DEVELOPMENT_WORKFLOW.md e .specify/memory/constitution.md: regressões automatizadas e verificação em hardware para áudio; simplicidade e rastreabilidade.
- package.json e package-lock.json: Next.js 16.3.6, React 19.2.8 e TypeScript 5.9.3 existentes. Nenhum runner de teste ou fixture de áudio instalado.
- src/app/page.tsx e src/app/layout.tsx: tela inicial mínima e idioma padrão inglês.
- Ferramentas observadas no host em 2026-09-25: o executável CLI do eSpeak NG não existe, mas a biblioteca C 1.52.0 e os dados de voz 1.52.0+dfsg-5build1 já estão instalados via Ubuntu; `apt-get download` falhou por falta de rota ao espelho. A geração usa essa API já disponível sem instalar software nem acessar a rede. A execução, os testes e o build usam WAVs versionados e não dependem do eSpeak NG.

## Limites de conclusão

Teste de browser com MediaRecorder simulado verifica estados e prevenção de envio, mas não estabelece inteligibilidade de voz sintética, permissão real nem reprodução em hardware. As verificações manuais são necessárias nesses pontos. Conferir cada WAV gerado ouvindo a frase correspondente antes de aceitar as fixtures. Nenhuma conclusão de qualidade de áudio real foi verificada durante este planejamento.
