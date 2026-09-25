# Implementation Plan: Prática local de shadowing

**Branch**: codex/local-shadowing | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from specs/001-local-shadowing/spec.md

## Summary

Construir um único percurso de shadowing local no modo “ouvir e repetir”: tela inicial → cenário “Introducing Yourself” com três frases estáticas e arquivos WAV de fixture → escuta de referência → gravação voluntária de no máximo 30 segundos → comparação da referência e da própria voz em sequência. Não implementar modos com captura sobreposta à referência. Usar a base Next.js/React/TypeScript existente, fixtures incluídas no repositório e estado volátil no navegador. A gravação não toca servidor nem armazenamento do app. A única dependência planejada para testes é Playwright Test; as APIs de captura serão simuladas nos testes e verificadas em dispositivos reais separadamente.

## Technical Context

**Language/Version**: TypeScript 5.9.3; Node.js 24.19.0; npm 11, conforme os arquivos fixados do projeto.

**Primary Dependencies**: Next.js 16.3.6 App Router e React 19.2.8, já instalados; adicionar @playwright/test como dependência de desenvolvimento e fixar versão em package-lock.json. Gerador local de assets: biblioteca C e dados de voz do eSpeak NG, chamados somente pelo script Python de geração; não são dependências de execução do app, build, teste ou CI.

**Storage**: Nenhuma gravação persistente. Frases em dados estáticos do projeto; WAVs de referência em public/fixtures/audio/. Blob e URL temporária de gravação somente no estado em memória da página. Sem serviços remotos.

**Testing**: Teste de percurso do browser em Chromium com APIs de captura simuladas, execução por npm run test:e2e. Preservar npm run lint, npm run typecheck, npm run build e npm audit --audit-level=high no CI atual. Checagens reais de permissão, captura e reprodução em iOS Safari e Android Chrome no dispositivo.

**Target Platform**: Aplicação web local, Chromium nos testes automatizados, dispositivos atuais iOS Safari e Android Chrome na checagem de hardware exigida pelo projeto. A captura requer contexto seguro; a execução no próprio computador usa localhost. Para acessar o servidor a partir de um celular na rede local, disponibilizar origem HTTPS com certificado confiável nesse dispositivo. Servidor e rede de teste ficam restritos ao desenvolvimento local, sem hospedagem externa.

**Project Type**: Aplicação web Next.js com estado de interação restrito à prática.

**Performance Goals**: Um cenário, três frases e até uma gravação de 30 segundos por frase. Não introduzir metas de concorrência ou disponibilidade de servidor remoto.

**Constraints**: Não incluir login, Supabase, tabelas, APIs de upload, gravação automática, provedor TTS em runtime/CI, chamadas pagas, serviço de armazenamento, cache persistente da gravação ou deploy público. Interromper captura no limite de 30 segundos, parar tracks, impedir sobreposição e limpar URLs temporárias do áudio. Preservar os checks existentes; acrescentar regressão automatizada sem afrouxar os gates.

**Scale/Scope**: Uma pessoa por sessão local; um cenário; três frases; uma aplicação web. Sem histórico entre recargas.

## Constitution Check

| Princípio ou restrição | Avaliação | Evidência no plano |
|---|---|---|
| I. Construir em fatias pequenas | PASS | Uma história e um cenário completam o percurso principal. |
| II. Provar comportamento de forma independente | PASS | Testes determinísticos de browser para navegação, permissão negada, limite e comparação; verificação manual para hardware real. |
| III. Proteger dados e credenciais | PASS | Sem conta ou dado persistido no servidor; gravação permanece no cliente e testes inspecionam requisições. RLS não se aplica sem dados nem armazenamento. |
| IV. Rastreabilidade | PASS | Tarefas apontam IDs de requisitos e cenários; feature em codex/local-shadowing. |
| V. Simplicidade e reprodução | PASS | Base instalada mantida, uma dependência de teste, dados e áudio congelados em fixtures locais. |
| Checks e política externa | PASS | Lint, typecheck, build e audit continuam; nenhum provedor, chamada paga ou deploy é adicionado. |

**Constitution violations**: Nenhuma. O teste manual de dispositivos fica pendente para a implementação, conforme a política do projeto.

## Project Structure

### Documentation (this feature)

```text
specs/001-local-shadowing/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── pm-review.md
├── contracts/
│   └── practice-screen.md
├── checklists/
│   ├── requirements.md
│   └── requirements-quality.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── page.tsx
│   └── scenarios/introducing-yourself/page.tsx
├── components/
│   └── ShadowingPractice.tsx
└── lib/
    └── fixtures/introducing-yourself.ts
public/
└── fixtures/audio/
    ├── README.md
    ├── introducing-yourself-01.wav
    ├── introducing-yourself-02.wav
    └── introducing-yourself-03.wav
scripts/
├── generate-reference-audio.sh
└── generate-reference-audio.py
playwright.config.ts
tests/e2e/shadowing.spec.ts
package.json
package-lock.json
.github/workflows/ci.yml
```

**Structure Decision**: continuar na única aplicação Next.js. A rota inicial anuncia o único cenário; a rota do cenário fornece conteúdo estático e monta a tela de prática somente para controles dependentes das APIs do browser. O conteúdo fica numa fonte local e os assets públicos são três WAVs. Testes de browser ficam em tests/e2e. Não criar diretórios de auth, API, server actions, persistência nem pacote de aplicação.

## State and interaction design

O JSON é a fonte canônica das três frases e dos caminhos de referência; o módulo TypeScript tipa e exporta a fixture imutável. Os WAVs são gerados a partir desse JSON com ordem e caminho explícitos. O servidor renderiza o catálogo. A tela interativa conserva a frase selecionada, estado do fluxo de áudio e até três registros de sessão na memória local da página.

Os estados visíveis formam um só percurso: selecionada → referência tocando → pronta para Gravar → aguardando permissão → gravando → gravação pronta → comparando referência → comparando gravação. Gravar só solicita microfone após ação direta. Esperar 300 ms depois do fim da referência habilita Gravar sem abrir o dispositivo. Ao negar ou falhar, o estado de erro mantém frase, referência e navegação. Ao concluir captura, liberar a entrada de áudio, limitar o cronômetro e a captura a 30 segundos e manter o resultado apenas em memória.

Trocar de frase interrompe o player ativo e qualquer comparação em curso. Se a pessoa estiver gravando, parar a captura, encerrar as tracks e descartar o clip incompleto; não iniciar outra gravação. Voltar à frase recupera sua gravação em memória. Comparar valida que os dois clips existem, toca e aguarda o término natural da referência, e só então toca a gravação. Uma tentativa pode ser repetida. Erro de reprodução nunca inicia gravação implícita.

O mapa de gravações não é serializado nem enviado. Ao substituir um clip, desmontar a prática ou sair da página, parar tracks ativas e invalidar URLs temporárias. Não registrar bytes, nome do arquivo, URL temporária ou áudio em console, telemetry, cookies, storage, ações do servidor ou requests. A única requisição de áudio esperada é GET dos assets locais estáticos de referência.

## Automated and device verification

A suíte Playwright executa a aplicação construída em localhost e intercepta os eventos de áudio para fixar início e término de cada player. Um script de inicialização instala stream e gravador falsos antes do carregamento, alterna entre negação e concessão de permissão e emite um blob marcador para verificar que nenhum pedido de rede o contém. Cobrir os cenários de aceitação 1–10 e os casos extremos descritos na spec, com ênfase nos limites de navegação, comparação que aguarda o fim, parada aos 30 segundos, negação seguida de nova tentativa, interrupção ao mudar de frase, ausência da gravação após recarga, falha/interrupção da fixture, parada de áudio/captura ao navegar sem início implícito, API de gravação indisponível, resultado vazio/não reproduzível e ausência de mídia pessoal em requisições.

A validação de hardware deve confirmar inteligibilidade da fixture, solicitação de permissão apenas após Gravar, captura e encerramento das tracks, ordem de comparação, recuperação depois de alterar a permissão do site e descarte da gravação após recarga. Registrar resultado separado para Safari atual no iOS e Chrome atual no Android. Mocks de browser não substituem esse teste.

No CI, Playwright roda em um único Chromium determinado pela versão do pacote. A etapa instala somente esse browser e executa a suíte contra o servidor Next local pós-build; nenhuma API externa de áudio/microfone ou provedor recebe requisições.

## Complexity Tracking

Nenhuma violação da constituição nem abstração de infraestrutura prevista.
