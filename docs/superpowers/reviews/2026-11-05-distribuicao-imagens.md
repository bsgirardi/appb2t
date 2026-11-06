# Revisão da distribuição privada — 06/11/2026

Versão candidata: 1.21.0, preparada sobre main 1.20.0. Produção remota não alterada. Repositório privado `bsgirardi/appb2t-distribuicao` criado e privacidade conferida por API.

## Revisão independente e correções

Um revisor independente inspecionou código, desenho e plano, incluindo comandos reais de configuração do Docker Compose, sem alterar containers operacionais.

- P1: Compose sem perfil tools omitiria admin e bloquearia instalação padrão. Regressão `profile` falhou antes da mudança; resolveu-se o modelo com `--profile '*'`, mantendo a ativação de serviços na implantação explícita. Regressão aprovada.
- P1: teste unitário existente lê `.github/workflows/ci.yml`, excluído do contexto. Ensaio `Dockerfile.context` falhou por ausência do arquivo e passou após permitir somente esse fixture. O gate Docker real executou tipos, lint e **865 testes unitários**, todos aprovados.
- P2: `$` literal em credenciais é escapado como `$$` por Compose. Regressão `dollar` falhou antes da correção e passou com normalização somente da cópia de comparação. O Compose candidato mantém o escape original.

Auditou-se também produção com `npm audit --omit=dev`: inicialmente apontou Zod vulnerável a consumo excessivo de memória ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)). Atualizado de 4.6.5 para **4.6.7**; auditoria seguinte: **zero ocorrências conhecidas nas dependências de produção**. Isso não equivale a análise completa do sistema operacional/imagem nem garante ausência de vulnerabilidades.

## Evidências já executadas

- Contrato/distribuição e manifestos legados: 12 testes Node aprovados.
- Publicador PowerShell: destino público e entrega existente rejeitados; draft incompleto não publicado; pacote completo promovido, usando CLI simulada.
- Gerador PowerShell: pacote real comprimido/validado com backend Docker simulado, reconstruções com identidade distinta e verificação obrigatória antes da exportação.
- Atualizador Linux: 18 cenários aprovados, incluindo perfil e dólar, autorização/rede, corrupção, arquitetura, manifesto, assets ausentes, espaço, volume divergente, importação, parada/backup, migração/saúde e idempotência. Verificado que não há build/pull e que falhas de preflight não param app.
- Shell legado de atualização do projeto e fluxo de deploy aprovado. O ensaio compose-cli separado depende de imagem/socket reais e não foi executado no container de mocks.
- PowerShell analisado sem erros; Bash validado em Linux. `git diff --check` aprovado.
- Tipos, lint, build de produção nativo e quatro testes de login/rodapé/histórico aprovados antes da atualização Zod; depois dela, o gate Docker confirmou tipos/lint e os 865 unitários.

## Decisões e limites

- Preservar Compose/.env instalados e aplicar apenas imagens/pull_policy/remoção de build. Não aplicar o template da Release sobre os dados existentes. Custo: mudanças futuras de serviços/configuração exigem revisão explícita.
- Testes Linux copiam arquivos para container sem socket/bind do worktree, pois Docker Desktop aguardou compartilhamento desse novo diretório. Não se alteraram compartilhamentos globais. Custo: mocks não provam orquestração real.
- Revisor não comprovou download privado redirecionado real, idempotência dos hashes em implantação real nem recuperação de sinal durante backup real. Mantidos como limites: controle de credencial depende do curl suportado e HTTPS; testes de fluxo cobrem comportamento simulado; ensaio isolado da instalação alvo e restauração de backup continuam obrigatórios antes da primeira troca operacional.
- Não foi adotado blue-green nem prometida indisponibilidade zero. Atualizar por imagens prontas elimina compilação operacional, mas download/importação ainda usam disco e precisam de medição no servidor.
- Não atualizar major do Node nem trocar Debian slim por Alpine nesta entrega. Atualizar base/pacotes por reconstrução controlada, sem atualizar containers vivos.

## Ensaio final real e distribuição

- Imagens Linux amd64 de app/tools construídas a partir do código revisado `4a3d746ef37a688f5093729568e5569ac16c36e5`, com usuário node, versão 1.21.0 e revisão OCI conferidas. Builds concluíram com tipos habilitados. As tags de ensaio não substituíram latest nem a instalação operacional.
- Pacote exportado por docker save, comprimido, validado pelo contrato e carregado por docker load: **285098031 bytes** comprimidos, abaixo de 2 GiB. Tags/IDs preservados. O arquivo de metadados manual do ensaio teve uma seleção escalar incorreta do digest base e foi rejeitado pelo validador; corrigido o metadado e repetida a validação antes da importação. O gerador oficial usa seleção explícita de array e passou em seus testes.
- Instalação descartável exclusiva `b2t-dist-rehearsal`, PostgreSQL 17 sem porta externa e app apenas em 127.0.0.1:33121. Migrações aplicadas; app/banco saudáveis; login HTTP 200 com versão 1.21.0 e health HTTP 200. Nenhuma conta artificial criada na instalação operacional.
- Dump desse banco descartável restaurado realmente em outra base descartável, em transação única: 33 migrações presentes após restauração. Isso não é homologação de dados de negócio existentes nem restauração de backup operacional.
- Compose serializado para JSON e relido produziu o mesmo hash do container real. Isso confirma estabilidade desse modelo no ensaio, sem alegar execução completa do atualizador remoto autenticado.
- Repositório privado criado, scripts de update/deploy/validador e guia sincronizados com referência de origem. Bootstrap do servidor continua manual, revisado e fixado em commit; não ocorreu instalação remota.
- Containers operacionais locais originais conferidos por IDs exatos: app e ambos os PostgreSQL continuaram running/healthy. Ensaio usou rede, banco e porta separados.

Nenhuma Release de aplicação foi publicada a partir de código não integrado em main. A primeira entrega oficial ainda depende de integrar a PR e executar o gerador no commit final; download autenticado de Release e homologação da instalação remota permanecem pendentes. Não houve merge nem publicação operacional nesta execução.
