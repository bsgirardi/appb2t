# Resumo da atualização manual

**Objetivo:** reunir ao final do script os tempos medidos e o resultado, preservando o comportamento de publicação e recuperação. Implementação autorizada pelo pedido do usuário, sem acesso ou mudanças em produção.

**Desenho:** manter Bash e os logs existentes. Registrar duração/status de cada etapa, início/fim com fuso, commit, versão, janela de manutenção, saúde e backup. Exibir o resumo no terminal e salvar resumo.txt e etapas.tsv no diretório privado existente. EXIT centraliza a emissão em sucesso, repetição sem alterações, falha e interrupção. Não estimar RAM/CPU nem cache hits sem medição; essas métricas exigiriam instrumentação separada. Catálogo/checksum não são apresentados como ensaio de restauração.

**Alternativas:** resumo apenas no terminal é simples, mas se perde; JSON exigiria codificação/escape adicional. Texto e TSV reutilizam ferramentas já existentes e permitem leitura/comparação. Essa é a decisão de implementação.

## Execução

- [x] Testar resumo único em sucesso/falha/sem alterações; duração de etapas não executadas não pode parecer medida.
- [x] Testar janela encerrada na confirmação de saúde, recuperação antes da migração e situação não confirmada após falha de migração/saúde.
- [x] Testar SIGINT, status de saída preservado, ausência de segredos, arquivos privados e falha da escrita do resumo sem mascarar o resultado original.
- [x] Implementar registro de etapas e resumo por EXIT sem nova dependência; impedir resumos/recuperação duplicados em subshells.
- [x] Validar shell em Linux, Git/flock, CLI real e versão/histórico; revisão independente.
- [x] Atualizar versão PATCH/histórico/documentação e entregar PR com exemplo real dos testes. Não executar deploy.
