# Distribuição de imagens prontas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Construir localmente, distribuir por Releases privadas e atualizar produção sem compilação remota.

**Architecture:** Scripts locais PowerShell geram imagens Linux e publicam assets em draft antes de publicar a Release. Atualizador Bash baixa arquivos autenticados, valida um manifesto estrito e reutiliza as proteções de backup/migração/saúde existentes, sem Git do projeto em produção.

**Tech Stack:** Docker BuildKit/Compose, PowerShell 7, Node.js para contrato local, Bash/curl/jq no Linux, GitHub CLI somente na publicação local.

**Spec:** docs/superpowers/specs/2026-11-05-distribuicao-imagens-design.md

## Global Constraints

- Sem Actions/GHCR, build remoto, secrets em imagem, dados operacionais em testes ou limpeza global.
- Produção Linux ~1906 MiB; plataforma inicial linux/amd64, validada antes de importação.
- Base Debian slim atualizada e registrada por digest, sem mudança de major do Node.
- Repositório de distribuição privado, destino explícito e versão explícita; sem latest implícito.
- Preservar recuperação antes de iniciar migração; depois, intervenção manual.
- Nova funcionalidade MINOR a partir de main; incrementar uma vez, sem tags de código.

## Review Focus

- Redirecionamento de asset privado deve funcionar sem vazar Authorization para outro host.
- Duas entregas do mesmo commit precisam manter imagens/tags e registros distintos.
- Compose candidato não pode criar um volume vazio quando a instalação usa bind personalizado.
- Manifesto com tamanhos impossíveis ou caminhos precisa falhar antes de load/stop.
- Interrupção no backup deve tentar recuperação; após início da migração deve preservar evidências.

### Task 1: Contrato e geração local

**Files:** scripts/distribution/manifest.mjs; scripts/distribution/build.ps1; Dockerfile; tests/docker/distribution.test.mjs.

**Interfaces:** manifesto schemaVersion=1 com release/appVersion/sourceCommit/platform/baseReference, images.app/tools.{tag,imageId,sizeBytes}, files contendo nome/sha256/sizeBytes; release = app-v<VERSAO>-<COMMIT12>-<BUILDID>. Validador CLI recebe caminho do pacote. Build recebe -Commit, -OutputDirectory, -BuildId e -Platform.

- [x] Escrever testes Node para manifesto válido, chaves desconhecidas, caminhos, plataforma, hashes, tamanho >=2GiB, identidade de reconstrução e ausência de segredos.
- [x] Rodar node --test tests/docker/distribution.test.mjs; observar falha pela funcionalidade ausente.
- [x] Implementar validador/gerador e build a partir de git archive de commit de origin/main, conferindo clean source, versão e checks locais. Base por digest, caches mantidos, imagens exclusivas e save comprimido. Validar tamanho, checksums e configuração somente de execução.
- [x] Repetir testes até aprovação e verificar sintaxe PowerShell.

### Task 2: Publicação privada e bootstrap

**Files:** scripts/distribution/publish.ps1; scripts/distribution/bootstrap-distribution.ps1; docs/DISTRIBUICAO_IMAGENS.md; tests/docker/distribution.test.mjs.

**Interfaces:** publish recebe -PackageDirectory e -Repository; bootstrap recebe -Repository (padrão proposto bsgirardi/appb2t-distribuicao) e exige privacidade. Publicação cria draft, sobe assets completos e confere tamanhos/digests antes de publicar. Não substituir Release existente.

- [x] Adicionar testes de rejeição de destino público, draft incompleto e release existente, com CLI simulada sem rede.
- [x] Observar RED, implementar scripts com argumentos estruturados e sem tokens nos argumentos, repetir GREEN.
- [x] Documentar autenticação de escrita local e leitura remota restrita, instalação inicial sem executar script baixado automaticamente e limites por asset.

### Task 3: Download e implantação sem Git/build

**Files:** scripts/distribution/update.sh; scripts/distribution/validate-manifest.jq; compose.production.yaml; tests/shell/distribution.sh.

**Interfaces:** update.sh --repository OWNER/REPO --release TAG --installation DIR --token-file FILE. Diretório exige .env e compose.yaml da instalação; trava fora de .git, staging privado e registro em .b2t. Não executar código do pacote. Download por API em HTTPS, credencial em arquivo privado curl config; validação antes de docker load. Usar projeto/diretório/ambiente originais.

- [x] Escrever teste Bash com comandos externos simulados cobrindo fluxo, repetição, rede/401, arquivo ausente, checksum/tamanho inválido, manifesto/plataforma/disco, concorrência, load, alteração de mounts, migração e saúde; verificar ausência de stop em preflight e ausência de build/pull sempre.
- [x] Observar RED; implementar JSON estrito, arquivos fixos, espaço conservador, conferência de IDs/labels, Compose sem build e com pull_policy never, preservação de mounts/rede/bind e backups.
- [x] GREEN: testes shell em Linux isolado e testes Node, bash -n. Confirmar recuperação por container ID e registros privados com duração real.

### Task 4: Ensaio, versão e revisão

**Files:** package.json; package-lock.json; src/lib/releases.ts; docs/DEPLOY_MANUAL.md; INSTALACAO_SERVIDOR.md; docs/superpowers/reviews/2026-11-05-distribuicao-imagens.md.

- [x] Conferir versão atual de main e definir MINOR seguinte, sincronizar manifests/notas e confirmar APP_VERSION nos rodapés.
- [x] Rodar testes focados, shell legado, lint/tipos e build com ambiente sintético. Ensaiar docker save/load com imagem pequena e, se recursos locais permitirem, pacote real em instalação descartável sem portas/volumes operacionais.
- [x] Revisar branch por agente independente, resolver problemas relevantes com regressões RED/GREEN e registrar limitações reais.
- [x] Entregar alterações e instruções sem afirmar publicação remota. Criação privada do repositório está autorizada pela aprovação do desenho; nenhuma credencial de produção será criada por suposição.

## Execution ledger

- Aprovação do desenho recebida no chat. Execução local contínua; publicação operacional remota permanece fora do escopo.
- Pre-flight: Tasks 1–3 compartilham contrato do manifesto, tags por entrega e hashes; manter um esquema estrito e fixtures comuns. Task 4 depende das verificações de 1–3.
- Ruling: manter .env e Compose já instalados como fonte de identidade e aplicar somente troca de imagens validada — evita recriar banco, mounts e rede por diferenças entre instalações; configuração nova requer procedimento explícito.
- Tasks 1–3: contrato Node 12/12 incluindo legado; PowerShell publicação simulado aprovado (público/existente/incompleto/sucesso); atualizador Linux 16 cenários aprovados. Scripts PowerShell analisados sem erros; Bash validado em Linux.
- Task 4 em andamento: tipos, lint, build local de produção e quatro testes de versão/histórico aprovados; fluxos shell legados atualizar-projeto/deploy-flow aprovados. compose-cli requer imagem/socket reais e não foi exercitado no container de mocks. Revisão independente e ensaio de imagem pendentes.
- Ruling: ensaios Linux copiam arquivos para container sem bind mount ou socket Docker — mounts do novo worktree ficam aguardando no Docker Desktop; o teste não deve alterar compartilhamentos globais nem a instalação operacional. Custo: a cobertura de orquestração real precisa de ensaio adicional antes de produção.
- Final: corrigidos os três achados do revisor com regressões RED→GREEN (profile, dollar e contexto Docker). Gate Docker real: tipos/lint e 865 unitários aprovados. Shell novo: 18 cenários aprovados.
- Ruling: download privado redirecionado, hashes em implantação real e sinais sob backup real não foram homologados em operação — exigir ensaio isolado e restauração antes da primeira troca; custo: testes simulados não substituem essa homologação.
- Ruling: atualizar Zod para 4.6.7 nesta mesma PR de publicação segura — auditoria de produção caiu de um achado high para zero; custo: patch exige regressões amplas, cobertas pelos 865 testes unitários e tipos/lint em Linux.
- Tasks 1–4 implementadas e verificadas. Ensaio real de imagens/285098031 bytes save-load, migrações, restauração descartável (33 registros), login/saúde e hash Compose concluído. Repositório privado criado e sincronizado. Detalhes e limites em docs/superpowers/reviews/2026-11-05-distribuicao-imagens.md.
- Final: download privado real e backup operacional não ensaiados, deliberadamente fora da preparação local. Custo/condição: primeira entrega oficial somente do commit integrado e primeira instalação remota condicionada à homologação isolada do ambiente alvo. Nenhuma Release de aplicação publicada nem servidor remoto alterado.
