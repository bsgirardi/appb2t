# Cache de dependências e ferramentas menores

O usuário autorizou seguir a recomendação após integrar as PRs pendentes. A PR26 foi integrada como 1.11.0. O objetivo desta entrega é reduzir operações de instalação e exportação do projeto, preservando deploy manual, verificações, versão visível e recuperação.

## Abordagem

Preparar manifestos derivados em um estágio Docker. Normalizar somente as versões raiz para 0.0.0 na instalação, sem alterar os arquivos de origem. Build e imagem final recebem a versão verdadeira. Se houver scripts de ciclo de instalação na raiz, preservar os manifestos completos sem normalização: esses scripts podem depender da versão.

Tools terá instalação independente de @inquirer/prompts, @prisma/client, prisma, tsx e zod. O lock original é a base; npm recalcula apenas seu subconjunto com --package-lock-only --offline --ignore-scripts e cache vazio em um teste. Não resolver versões novas pela rede. npm ci instala os pacotes e preserva os scripts das dependências. Prisma generate continua habilitado.

Consideradas: manter todas as dependências (menor mudança, conserva exportação pesada); copiar node_modules e apagar pacotes (operação pesada e risco de dependência transitiva); instalação independente a partir do lock existente (escolhida, verifica dependências e produz camada menor).

## Restrições

Não modificar .env, servidor, banco ou serviços nesta implementação. Não limpar cache global. Não remover verificações. Versão PATCH única sobre main: 1.11.1. Usar locks existentes e validar imports reais dos scripts administrativos. Manter os alvos deps, build, tools e runtime e o fluxo Compose atual. O limite de heap 1536 recém-validado permanece exclusivo do build.

## Validação

Testar mudança apenas de versão, mudança de dependência, mudança transitiva no lock, scripts de instalação e ausência de pacote obrigatório. Construir com npm sem cache inicial e resolver o lock sem rede. Confirmar cache da instalação em alteração apenas de versão, versão final correta, Prisma, importação de administração, permissões com contexto 0600, build runtime, health em banco isolado e scripts shell. Medir imagens na mesma engine; resultados locais não são previsão de tempo no Debian.
