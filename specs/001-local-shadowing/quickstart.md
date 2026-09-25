# Quickstart: validar a prática local de shadowing

Este guia descreve verificações para executar depois que as tarefas da feature forem implementadas. As gravações de usuário são sempre sintéticas nos testes automatizados; evite voz pessoal em capturas de tela ou relatórios de teste.

## Preparação local

Requisitos: Node.js 24.19.0, npm 11 e dependências travadas no projeto. A execução usa apenas os WAVs versionados; para regenerá-los, instale a biblioteca C `libespeak-ng` e seus dados de voz localmente e rode `scripts/generate-reference-audio.sh` antes de iniciar a aplicação.

1. Ativar a versão do Node já especificada e instalar as dependências do lockfile: `nvm use` e `npm ci`.
2. Rodar os checks de integração e gerar o build de teste: `npm run lint`, `npm run typecheck` e `npm run build`.
3. Instalar o browser Chromium da mesma versão travada por Playwright uma vez na máquina: `npx playwright install chromium`.
4. Executar o percurso automatizado contra o build com dispositivos simulados: `npm run test:e2e`.
5. Iniciar o protótipo local com `npm run dev` e abrir `http://localhost:3000` no browser de desenvolvimento.

Resultado esperado: abrir “Introducing Yourself”, ouvir cada uma das três fixtures, navegar para frente e para trás, gravar e parar uma captura, reproduzir e comparar referência seguida da própria gravação, recuperar uma permissão inicialmente negada e recarregar a página para constatar que a gravação desapareceu.

## Passos de browser e privacidade

1. Abrir a tela inicial e entrar uma vez no cenário. Confirmar as três frases, sua ordem, indicação de posição e desativação dos controles de navegação nos limites.
2. Reproduzir e repetir cada referência. Ouvir as falas e confirmar que pronunciam exatamente o texto exibido.
3. Na primeira tentativa, negar o microfone. Confirmar mensagem, instrução e manutenção da referência/nav; permitir acesso nas configurações do site e usar Try again sem reload.
4. Fazer uma gravação curta, parar antes de 30 segundos e ouvi-la; para o teste automático do limite, manter outra gravação ativa até 00:30 e confirmar parada automática.
5. Comparar. Confirmar que a fixture terminou antes de a gravação pessoal começar e que a sequência pode ser repetida sem sobreposição.
6. Navegar para outra frase, voltar à primeira e comparar a gravação que permaneceu em memória. Durante uma nova captura, navegar para outra frase e confirmar que a captura e as tracks param e que o áudio incompleto é descartado. Recarregar; confirmar que o controle de reprodução pessoal não está disponível.
7. No painel Network, filtrar requests da sessão: a gravação não produz corpo de requisição, POST/PUT/PATCH, Beacon nem solicitação para host externo. Revisar Application/Storage: nenhum blob de gravação em local/session storage, IndexedDB, cache ou cookie. Apenas os WAVs versionados podem ser lidos por GET same-origin.

Nos testes automatizados, o gravador usa um blob marcador não sensível. Os testes falham se bytes do marcador aparecerem em qualquer request e verificam o estado vazio depois do reload.

## Checagem de microfone real nos dispositivos

A política do projeto exige checar Safari atual no iOS e Chrome atual no Android. `getUserMedia` requer uma origem segura: localhost no computador da aplicação ou HTTPS confiável quando um celular na LAN acessa outro computador ([MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)). O CLI atual do Next tem suporte de HTTPS apenas para desenvolvimento e opção para vincular hostname/interface ([Next.js CLI](https://nextjs.org/docs/app/api-reference/cli/next#next-dev-options)).

1. Na estação de desenvolvimento, gerar um certificado local confiável, com a LAN IP/hostname no SAN, e instalar a autoridade local em cada dispositivo usado no teste. Nunca copiar chave privada para o repositório.
2. Usar a chave e o certificado em um servidor Next restrito à rede de desenvolvimento; por exemplo, adaptar `npm run dev -- --hostname 0.0.0.0 --experimental-https --experimental-https-cert ./certs/local.pem --experimental-https-key ./certs/local-key.pem` aos caminhos locais do certificado.
3. Abrir o hostname HTTPS do servidor no dispositivo e permitir Microphone. Confirmar a luz/indicador do browser enquanto grava, negar uma vez, alterar a permissão no site e concluir uma nova captura. Repetir no segundo browser/dispositivo.
4. Verificar navegação, fixture, parada manual, limite de 30 segundos, comparação sequencial e estado perdido ao fechar/recarregar. Gravar em registro de teste se cada caso passou; não alegar que Playwright substitui esta checagem física.
5. Encerrar o servidor e remover certificados e chaves locais quando não forem mais necessários. A validação fica na LAN, sem URL pública.

Não enviar chave/CA ao Git. A opção de HTTPS do Next é destinada a desenvolvimento, não constitui configuração de produção nem autoriza publicação.
