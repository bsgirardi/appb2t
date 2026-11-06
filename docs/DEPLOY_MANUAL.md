# Deploy manual: construção, medição e recuperação

> Novo fluxo sem compilação em produção: [Entregas com imagens prontas](DISTRIBUICAO_IMAGENS.md). O procedimento abaixo é o legado e ainda constrói no servidor. Não misturar os dois atualizadores na mesma instalação.

O fluxo continua: desenvolver → integrar em main → executar manualmente atualizar-projeto.sh → atualizar-docker.sh no Debian. Sem Actions, registry ou pipeline externo no caminho do deploy. A configuração de CI já existente é independente: nenhum script desta entrega a consulta ou aguarda.

## Construção

O alvo tools deriva de tools-deps, com Prisma, cliente Prisma, tsx, zod e prompts administrativos. Não inclui Next, lint ou testes. O build da aplicação continua usando deps completo. Cada instalação gera seu próprio cliente Prisma. COPY --chown prepara a propriedade; não existe chown recursivo.

O estágio manifests deriva os arquivos de instalação dos manifestos oficiais. Somente as três versões raiz são normalizadas para 0.0.0; dependências, scripts, configurações e registros transitivos continuam participando do cache. Os arquivos do repositório não são alterados. Build/runtime e tools recebem a versão verdadeira antes da entrega. Se a raiz tiver hooks de instalação, deps preserva também a versão original, pois os hooks podem observá-la.

O lock de tools é reduzido por npm com --package-lock-only --offline --ignore-scripts, usando cache de metadados vazio. Essa preparação não instala pacotes; a instalação efetiva é npm ci com scripts de dependências habilitados. Um verificador rejeita qualquer artefato cuja versão, URL ou integridade não exista no lock original. A lista de dependências diretas fica em scripts/docker/build-manifests.mjs: ao adicionar imports aos comandos administrativos, atualizá-la e testar os comandos reais. Alterações incompatíveis no lock ou workspaces exigem revisão explícita.

Rodar npm run test:docker para os testes de manifestos. Na validação Docker, conferir uma revisão apenas de versão, uma mudança de dependência e contexto com permissões restritivas. Não basta medir uma repetição idêntica. O Next continua compilando quando a versão muda, para atualizar a versão exibida nas telas; a otimização reaproveita a instalação, sem reutilizar indevidamente um bundle de outra versão.

NEXT_BUILD_MAX_OLD_SPACE_SIZE permite ajustar o heap apenas no RUN do Next (padrão 1536 MiB, validado após E5). Não muda runtime nem representa limite de RSS total. Manter verificação de tipos habilitada e medir memória/swap ao alterar esse valor.

O script constrói migrate e app em comandos separados. Imagens usam o commit completo como tag; migrate e admin compartilham appb2t-tools. A revisão OCI identifica a origem. Para administrar a versão publicada, exporte APP_IMAGE_TAG com o commit registrado, confirme a existência da imagem e use `docker compose --profile tools run --rm --no-deps --pull never admin`. Não passar --no-build a compose run: essa opção pertence a up. O script valida o parser da CLI antes de parar app e confirma que a imagem tools existe.

Depois de confirmar saúde e identidade, o script atualiza também appb2t-app:latest e appb2t-tools:latest para as imagens publicadas. Isso mantém os comandos manuais Compose compatíveis quando a variável exportada no subprocesso termina, sem modificar .env. Uma candidata que falhou não recebe esses aliases. Não manter APP_IMAGE_TAG antigo exportado no terminal para comandos operacionais; usar o commit publicado explicitamente ou o padrão latest verificado.

Os dois aliases não são atualizados atomicamente. Se um docker tag falhar, o script retorna erro sem afirmar sucesso; a aplicação candidata pode já estar saudável. Conferir o estado e repetir o script para reparar os aliases pelo caminho sem nova parada. Até reparar, não usar up com o padrão latest.

Os caches locais appb2t-npm-node22 e appb2t-next-node22-next16 pertencem ao builder e não às imagens finais. Não contêm .env nem banco. Cache pode desaparecer por gerenciamento normal do Docker: uma compilação sem cache deve funcionar. Não configurar GC global ou limpar caches de outros projetos.

## Execução

No servidor, branch main limpa:

```bash
cd /etc/docker/appb2t
bash scripts/atualizar-projeto.sh
bash scripts/atualizar-docker.sh
```

Um bloqueio impede concorrência entre esses scripts; comandos Docker manuais não participam desse bloqueio. O script verifica imagem, hash da configuração e saúde; se tudo já corresponde e Prisma não tem migrações pendentes, encerra sem parar app.

O build mantém a aplicação disponível. A janela de manutenção começa em stop app e termina na confirmação da imagem e saúde. Backup continua dentro dessa janela para preservar o procedimento atual. Banco e outras aplicações não são recriados.

Cada etapa registra início, resultado e duração em segundos. O diretório backups/atualizacao-* usa permissões privadas e contém log, configuração candidata efetiva, inspect anterior, identificação de imagens, .env privado, dump e checksum. Não publicar esses arquivos nem copiar seus conteúdos para relatórios. A configuração efetiva de uma entrega bem-sucedida fica também em .git/b2t-compose-instalado.yaml e será arquivada como anterior na próxima entrega. Instalações legadas não têm esse registro: o inspect anterior auxilia recuperação manual, mas não equivale a um Compose anterior completo.

Ao encerrar uma execução que obteve o bloqueio, o script apresenta um resumo único no terminal: resultado e código de saída, início/fim com fuso, versão alvo/commit/imagem candidata, tempo total e por etapa, situação da manutenção, healthcheck validado e backup. O total é do script Docker; não inclui o git pull executado pelo outro script. Tempos aparecem em HH:MM:SS e segundos; etapas não executadas são identificadas, sem inventar uma duração.

O mesmo resumo fica em resumo.txt e a tabela de etapas em etapas.tsv, no diretório privado indicado ao final. São arquivos UTF-8; o TSV usa tabulações e pode ser importado em planilhas. O log completo permanece em atualizacao.log. Uma repetição já atualizada gera resumo com manutenção não iniciada e sem afirmar que criou backup.

A janela de manutenção é medida da tentativa de parar app até confirmar saúde/imagem candidata ou recuperar a versão anterior. É uma medida operacional conservadora, não uma medição contínua de disponibilidade HTTP. Se a conclusão não puder ser confirmada, o relatório mostra o tempo decorrido até encerrar o script e essa incerteza. Falha de aliases após saúde confirmada continua sendo falha do procedimento, mas não prolonga artificialmente essa janela. Recuperação e atualização de aliases têm etapas próprias.

Falhas e sinais INT/TERM também geram resumo e preservam o código de saída. Interrupção antes das migrações mantém a tentativa de recuperação existente; depois de iniciá-las, não há rollback automático. Se a escrita dos relatórios falhar, um aviso é emitido sem trocar o resultado original da atualização. O resumo não inclui configuração efetiva, conteúdo do .env ou credenciais. Tamanho do dump é registrado em bytes; catálogo validado e checksum gerado não são apresentados como uma restauração testada ou comparação independente de hash. Uso de RAM/CPU/swap, latência HTTP e taxa de cache não são medidos por esse resumo.

O registro inclui imagem e hash da configuração do container publicado. Se o container atual divergir, o snapshot será preservado como compose-ultima-publicacao-script.yaml, sem afirmar que representa a configuração anterior. Uma troca manual de tag commit para latest também pode alterar o hash sem alterar comportamento; a divergência pede revisão, não bloqueia a atualização.

## Falhas e recuperação

1. Falha antes da parada: app anterior continua executando.
2. Falha no stop/backup/catálogo/checksum, antes de iniciar migração: script tenta docker start com o ID exato do container anterior e aguarda sua saúde. Não usa compose start, que pode iniciar dependências, nem up, que poderia trocar a imagem.
3. Assim que migração começa, não existe retorno automático: uma falha pode ter aplicado parte do esquema. Avaliar registros Prisma, SQL e compatibilidade antes de retornar.
4. Falha na nova aplicação: retornar imagem somente se ela for compatível com o banco atual. A imagem preservada consta em imagem-anterior.txt e possui tag antes-*. Não restaurar banco sobre novas escritas.

Se o container atual ainda executa, mas sua imagem original foi removida do armazenamento, o preflight interrompe antes dos builds. É necessário preservar e ensaiar uma imagem de recuperação em procedimento operacional separado; não há export/import automático. Na publicação de referência, essa condição foi tratada com snapshot sem pausa e ensaio isolado.

Com autorização operacional específica e após confirmar compatibilidade, usar o Compose anterior arquivado com `--project-directory /etc/docker/appb2t`, um override de image apontando ao ID preservado e `up -d --no-deps --no-build --wait app`. Revisar o arquivo privado e os caminhos antes: não executar um exemplo genérico sobre produção. Na primeira entrega otimizada, sem Compose anterior registrado, reconstruir/revisar a configuração a partir do inspect e do histórico antes da recuperação.

Restaurar dump primeiro em PostgreSQL 17 descartável, sem volume/porta de produção. `pg_restore --list` e SHA-256 validam formato/bytes; não provam restauração ou regras de negócio. Conferir tabelas, registros legados e migrações no ensaio. Cópia externa e retenção do backup são tarefas operacionais separadas; o script não apaga backups.

## Medição comparável

- Registrar commit, Docker/BuildKit, imagem base, CPUs e memória disponíveis.
- Medir build inicial, repetição idêntica e alteração de fonte real. Uma repetição totalmente em cache não representa atualização funcional.
- Usar progresso plain para distinguir npm, Prisma, Next, cópias e exportação.
- Durante o build autorizado, observar vmstat, pressão de memória/I/O e RSS. Se iostat já estiver disponível, observar latência do dispositivo. Não instalar ferramentas ou alterar o servidor como parte do script.
- Comparar duração das etapas e indisponibilidade; não somar atividades Next concorrentes.
- Conferir imagem executada, login, rodapés, Atualizações e fluxos usados. Health SELECT 1 não detecta sozinho versão errada ou migração pendente.

## Auditoria de referência: 28/10/2026

No Debian: tools 2h04min24s; npm ci 69,2 s; build 2247,3 s; chown 4796,6 s; exportação tools 330,5 s. Contexto 625,58 kB. No dia anterior, chown 4661,8 s. Tools 4,82 GB; runtime 624 MB. Cache global 32,67 GB (não limpo). Checkout 1.10.1, container ativo 1.4.1; 27 migrações registradas e duas ausentes. Essas observações não autorizam migrar ou atualizar produção.

O log Next registrou escrita do cache em 31,8 min sobreposta a outras atividades; não somar esse valor ao tempo de build. Consumo histórico de swap e latência de disco não foram recuperados. Uma medição local não prevê o tempo no Debian.


A conferência de versão instalada ocorre antes dos builds: exige imagem app idêntica, revisão OCI correta em app/tools, configuração igual, saúde e Prisma atualizado. Assim uma repetição não recompila nem recria containers por mudança apenas nas atestações do BuildKit. Divergências seguem o fluxo completo.
