# Inventário visual dos frames Figma

**Fonte**: arquivo [EchoFlow — Design System](https://www.figma.com/design/OcQrZwX31egwiIsVylsHJq/EchoFlow-%E2%80%94-Design-System), nós [69:1150](https://www.figma.com/design/OcQrZwX31egwiIsVylsHJq/EchoFlow-%E2%80%94-Design-System?node-id=69-1150) e [72:1683](https://www.figma.com/design/OcQrZwX31egwiIsVylsHJq/EchoFlow-%E2%80%94-Design-System?node-id=72-1683), inspecionados pelo coordenador em 2026-09-29 por metadata e screenshot. É inventário dos elementos observados; medidas, tokens, assets e estados móveis serão extraídos em design após instalar/ler as skills fornecidas.

| Frame | Elementos e estados observados | Contrato de produto |
|---|---|---|
| 69:1150 Home | Hero azul; "free during beta" / $0; Sign up, Login, Practice now; modal "Create your account"; Continue with Google ou email; texto de termos/privacidade de Mobbin | Landing pública; beta gratuito; CTA abre cadastro; Google/email funcionais; substituir texto e links legais por conteúdo aprovado do EchoFlow |
| 72:1683 Logged in area | Duas telas desktop; "Available playlists", busca/filtro, selo "Completed"; "No playlist selected"; playlist/frases selecionadas; Play reference, Speak, Compare, Next phrase; toggle Puck/Alice; menu Mode 1 | Catálogo de uma playlist inicial, busca e estados; conclusão persistida por conta; controles preservam fluxo aceito; Alice/Mode 1 são placeholders, manter opções atuais |

## Revisão visual

### Extração de design para implementação

Contexto de design e screenshots obtidos dos filhos desktop `69:981` (landing), `69:1115`
(cadastro), `69:1519` (catálogo vazio) e `69:1205` (prática). As quatro skills fornecidas foram
instaladas e lidas. Fonte Nunito 400–900, Gochi Hand 400, hospedadas localmente com licença OFL.
Exports originais em `public/design/`; origem e IDs constam em `scripts/fetch-design-assets.mjs`.

Tokens: gradiente vertical #008ce3 → #5dc1ff; faixa beta #4afece; superfície glow #0087da;
texto/CTA #1a1e26; destaque easy #77ff33; painéis brancos; borda #eceff2; Completed #e7f0e0.
Desktop 1440×900: faixa 40; header logo 157.344×32; hero 486×420 em x273/y259;
headline Nunito 800 72/72, tracking -1.5; descrição 28/42; CTA 188×56;
How it works 384×380, padding40, raio35.859, x783/y279. Kitten original 384×256,
playback180×180 girado13.5°, star120×120 girado4.91°, shadow SVG original.
Modal400 de largura padding40, fundo glow, botões48; acrescentar senha necessária ao contrato
email/password. Área logada: padding24, gap24, sidebar448, painel flex920, ambos raio8/altura852.
Título sidebar32/40, frase72/72 com largura564; ações48, gap10, Next phrase no rodapé direito.

Diferenças deliberadas: uma playlist real com cinco frases (sem oito cópias), Puck/Harper,
sem menu fictício Mode 1; conteúdo legal Mobbin removido até aprovação EchoFlow.
Mobile375 não possui frame aprovado: reflow em uma coluna, hero40px, ações quebram linha,
painéis sem largura fixa. Gravação individual e navegação anterior preservadas como controles
secundários; estados de erro/status não existem no frame e serão exibidos sem alterar a máquina.
Motion: Jakub primário (rápido/contido), Emil secundário (clareza funcional). Modal com entrada
180ms opacity/translate8px, sem animação de ações repetidas; reduced-motion remove transições.
Replay usa o highlight já aceito, adaptado à superfície branca.

Comparação das capturas locais 1440/375 com screenshots Figma realizada nesta implementação.
Gradiente, tipografia, assets originais, hero, painel glow, modal, sidebar/painel branco e
controles reproduzidos. Desktop mantém os painéis448/920, padding24, frase72/72 e fonte Nunito.
Header final respeita logo em x120 e margem direita42. Capturas com reduced-motion eliminam
frames intermediários; captura de prática aguarda seleção real. Não é alegada paridade pixel-perfect.

Diferenças aceitas de produto: título real Voice Comparison e cinco frases distintas em vez dos
placeholders repetidos; Harper em vez de Alice; Shadowing em vez de menu Mode1; botões Speak/Compare
desabilitados até cumprir a sequência; labels de email/senha, campo senha e altura maior do modal;
termos Mobbin ausentes; status, erro/retry, reprodução pessoal e navegação anterior permanecem.
Números de passos usam cinza mais escuro para leitura. Empty state usa o mesmo kitten/shadow
original; uma playlist em vez de oito cartões. Mobile faz reflow vertical e scroll da lista,
sem overflow horizontal; as ações seguem acessíveis ao rolar. Testes cobrem modal, busca/filtro,
zero resultado, seleção, Completed, foco/teclado e reduced-motion. Legal e dispositivo não aprovados.
