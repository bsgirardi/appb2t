# Publicação 1.28.0 sem implantação

Objetivo autorizado: integrar a PR 66 e publicar a Release privada oficial, sem atualizar servidores.

## Ajuste necessário para o build local

O Docker local tem 2 GiB e o host não dispõe de memória física para expansão online. O gate com heap de 1280 MiB já aprovou tipos, lint e 1079 testes; a compilação Next também terminou, mas o processo reteve memória ao iniciar a checagem de tipos. Usar os modos oficiais compile e generate em processos separados, com typecheck explícito entre ambos. Ambos os modos pulam a checagem App Router na versão instalada 16.4.2. Não desativar verificações, não alterar dependências ou serviços.

## Execução e evidências

1. Dockerfile: compilar, encerrar processo, verificar tipos, gerar saída standalone completa. Limitar heap a 1280 MiB. Validar imagem de ensaio e solicitar revisão somente leitura.
2. Registrar manutenção nas notas existentes 1.28.0, sem outro incremento para esta mesma PR. Enviar atualização e aguardar todos os checks da revisão exata.
3. Revalidar main e versão, integrar com head correspondente e obter mergeCommit.oid completo.
4. Em checkout limpo do SHA integrado, executar scripts/distribution/build.ps1 com BuildId novo. Não reutilizar imagem de ensaio como entrega.
5. Conferir manifesto, origem, plataforma, imagens e checksums. Executar publish.ps1 para draft, upload, verificação remota e publicação imutável.
6. Conferir Release oficial e três assets pela API; registrar evidências sem credenciais em .b2t e na PR. Não executar atualizador operacional nem mudar servidores.

As tentativas, logs e metadados de execução ficam em .b2t/release-1.28.0. Qualquer falha após merge deixa a entrega pendente até recuperação, sem alegar implantação.
