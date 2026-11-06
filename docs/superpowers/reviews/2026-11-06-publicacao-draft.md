# Publicação oficial e correção de conferência do draft

## Primeira entrega

PR #44 integrada com nove verificações aprovadas em 06/11/2026 às 00:48:36 de São Paulo. Fonte integrada: `be1c30a76a376f3552f9e71d86f1820dc33cae77`, versão 1.21.0. Gate local do código final: tipos/lint e 865 testes unitários aprovados; pacote oficial gerado por `build.ps1` do SHA integrado, sem fonte modificada nem build remoto.

Release privada oficial: [app-v1.21.0-be1c30a76a37-20261106T034840Z](https://github.com/bsgirardi/appb2t-distribuicao/releases/tag/app-v1.21.0-be1c30a76a37-20261106T034840Z).

- Arquivo images.tar.gz: 285097199 bytes.
- SHA-256: `03abf7e003b1e36112ae4d5ccc573c9d36ca127e8275f53738f3ef8e3b35c134`.
- Três assets completos, com tamanho e digest conferidos contra arquivos locais.
- Imagens app/tools Linux amd64, usuário node, revisão OCI e versão interna da app conferidas.
- Atualizador/guia sincronizados no repositório privado com fonte integrada registrada em SOURCE_COMMIT.
- Política pós-merge adicionada ao AGENTS.md, ao modelo de PR e ao roteiro de distribuição. Registro operacional fica em .b2t/ e no resumo da PR/Release, sem abrir nova PR apenas para registrar a execução.

## Falha real e recuperação

O envio dos três assets terminou, mas `GET releases/tags/:tag` retornou 404 enquanto a Release ainda era draft, com URL provisória `untagged-*`. A consulta por tag não é uma forma confiável de localizar draft ainda sem tag Git criada. Os assets não foram perdidos nem substituídos; a entrega permaneceu não pública.

Recuperação autorizada dentro da publicação solicitada: localizar ID numérico pela listagem autenticada, obter o draft por esse ID, conferir tag/estado/quantidade e nomes/tamanho/SHA-256 dos três arquivos contra o pacote validado, e somente então promover com `gh release edit --draft=false`. Release publicada confirmada com draft=false e prerelease=false. Nenhuma tag no repositório de código foi criada.

## Correção permanente, nova PR 1.21.1

Como 1.21.0 já estava integrada, esta correção recebe PATCH 1.21.1 e notas próprias, sem reescrever a PR anterior.

- `publish.ps1` resolve exatamente um ID numérico positivo pela listagem autenticada paginada e confere assets por `/releases/ID`.
- Todas as validações anteriores de conteúdo, privacidade, duplicidade, tamanho e SHA-256 continuam antes da promoção.
- Teste passou a simular 404 para `/releases/tags/:tag`: falhou com o código anterior e passou com o novo. Destino público, Release existente, draft incompleto e pacote completo continuam cobertos.
- Revisão independente não encontrou problemas acionáveis. Limite do mock: não exercita separadamente listagem com zero/mais de um ID, rejeitada explicitamente pelo código.
- 12 testes Node e quatro testes de versão/rodapés/histórico aprovados. A nova PR terá as verificações completas antes de integrar; a publicação real pelo script corrigido será conferida no commit integrado.

## Limite operacional

Esta atividade integra código e publica imagens privadas. Não instala o atualizador nem altera containers, banco, ambiente ou volumes no servidor remoto. A implantação operacional exige bootstrap revisado e ensaio isolado do ambiente alvo conforme o guia.
