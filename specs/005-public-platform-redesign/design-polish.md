# Refinamento das anotações — 2026-10-01

Escopo: landing e formulários existentes, sem substituir identidade, fontes Nunito/Gochi,
assets Figma, autenticação, catálogo ou políticas de acesso. Largura do hero desktop:
894 px, constante em 960/1024/1200/1440/1543/1864 px. Abaixo de 960 px a composição
é vertical, porque duas colunas não cabem mantendo o tamanho aceito e sem overflow.
Assets se reposicionam em telas intermediárias; o texto de How it works não fica encoberto.

## Skills instaladas e aplicadas

Instaladas com o helper Codex a partir de [emilkowalski/skills](https://github.com/emilkowalski/skills):
`review-animations`, `apple-design`, `find-animation-opportunities`, `emil-design-eng`, `animate`.
Leitura completa dos cinco SKILL.md, receitas de animate e padrões de review-animations.
Apple/emil orientam hierarquia tipográfica, equilíbrio das linhas e resposta imediata;
animate implementa as oportunidades abaixo; review-animations verifica o resultado.
Vercel React orienta manter a landing server component e limitar estado às interações,
sem nova dependência de animação. As skills globais não são dependências do aplicativo.

## Oportunidades de motion — find-animation-opportunities

| # | Local | Hoje | Propósito | Frequência | Movimento escolhido |
| --- | --- | --- | --- | --- | --- |
| 1 | `src/app/globals.css:281`, `.signup-dialog` | Entrada por keyframe com easing genérico | Spatial consistency | Ocasional | CSS starting-style, scale(.96)/opacity → none/1, 250 ms, cubic-bezier(.23,1,.32,1); backdrop sincronizado; teclado imediato e reduced-motion só opacity/120 ms |
| 2 | `src/components/AuthModal.tsx:21`, `.auth-view` | Signup/login/recovery trocam abruptamente | Preventing a jarring change | Ocasional | WAAPI opacity .65/scale(.97) → 1/none, 180 ms, mesmo ease-out; retarget do valor visual atual, cancelamento no fechamento; teclado imediato e reduced-motion só opacity/120 ms |

Candidatos rejeitados:

- Hero/assets com flutuação contínua: falha de propósito, distrai da leitura e do CTA.
- Animação no mostrar/esconder senha: controle funcional frequente; máscara muda imediatamente.
- Animação de cada campo/stagger: atrasa a leitura do formulário sem explicar algo novo.
- Interpolação de height/width entre formulários: custo de layout por frame; animar apenas
  o conteúdo com transform/opacity. Não acrescentar timers ou bloquear input para esperar motion.

Veredito de oportunidades: duas transições bastam. Prioridade é tornar legível a mudança
de tarefa, não adicionar decoração. Implementação pela skill animate, usando a receita de modal
e WAAPI, sem biblioteca adicional.

## Revisão de craft/motion

| Before | After | Why |
| --- | --- | --- |
| Hero muda fonte/largura abaixo de 1200 px | Hero 894 px/72 px estável até o breakpoint de coluna | Preservar proporção e ritmo da composição solicitada |
| “free!” fica sozinho | text-wrap balance e grupo “It’s free!” indivisível | Evitar viúva sem mudar a mensagem |
| Senha vazia sem affordance | Pontos no placeholder, máscara inicial e eye/eye-off com alvo de 44 px | Clareza e controle, sem persistir valor |
| Keyframe de entrada 180 ms ease-out | starting-style + CSS transition 250 ms com curva forte | Entrada centralizada, sem custo de layout ou biblioteca |
| Troca instantânea de formulários | WAAPI 180 ms sobre base opaca, retarget atual e sem espera | Evitar salto visual/bleed da landing; permitir troca rápida e Escape durante movimento |
| Motion igual para qualquer acionamento | Teclado imediato; reduced-motion apenas fade | Respeitar método de entrada e preferência de acessibilidade |
| Modal pode ultrapassar viewport curto | Conteúdo com scroll interno, close fora do scroller | Manter saída e ações essenciais alcançáveis |
| Recovery/senha revelada podem sobreviver ao fechamento | Remount por sessão de modal | Voltar ao formulário inicial sem reexibir credenciais |

**Veredito review-animations: Approve.** `AuthModal.tsx:21` cancela/reorienta motion a partir
do estado visual atual, sem esperar animation.finished; CSS/WAAPI animam apenas opacity/transform,
sem ease-in, keyframes reiniciáveis, hover ou propriedades de layout. `globals.css:281` usa
origem central e 250 ms; keyboard é imediato e reduced-motion mantém apenas fade de 120 ms.
Fechamento continua imediato (Escape/foco), conforme escopo de animar abertura e trocas.

Verificação final registrada no quickstart. Feel-check realizado na abertura/trocas em
câmera lenta (playbackRate .2) e capturas locais, incluindo modal em 375×556 com close
inteiramente dentro do viewport (y=16, altura=40). Browser simulado
não substitui julgamento em dispositivos físicos nem os gates de lançamento existentes.
