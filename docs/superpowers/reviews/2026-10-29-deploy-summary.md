# Resumo da atualização — 1.13.1

Base main c3b3dae (1.13.0). O usuário pediu informações importantes ao final da atualização. Não houve acesso ou mudança em produção nesta entrega.

## Resultado

O script exibe um resumo único e grava resumo.txt e etapas.tsv no diretório privado existente. Inclui início/fim com fuso, resultado/código, versão alvo, commit/imagem candidata, total do script Docker, etapas, manutenção, healthcheck da candidata e estado/tamanho do backup. O git pull é medido pelo outro script e não integra esse total. Etapa não executada não recebe um tempo fictício.

Sucesso, versão já atualizada, falha e INT/TERM passam pelo mesmo encerramento. O código de saída original é preservado, inclusive 42, 130 e 143. A recuperação antes da migração continua existindo; após iniciar migração não há rollback automático. Erro ao salvar o relatório produz aviso, sem converter uma publicação saudável em falha nem ocultar uma falha real. Um descritor separado impede que o resumo vá para o dump quando ocorre interrupção em comando com stdout redirecionado. Subshells não duplicam resumo ou recuperação.

A manutenção termina na confirmação de saúde/imagem ou da recuperação, antes dos aliases e do registro. Se isso não for confirmado, o relatório explicita a situação e o intervalo observado até a saída. Não é monitoramento HTTP contínuo. Backup informa catálogo validado e checksum gerado: o script não faz restauração nem comparação independente de hash. Não há métricas de RAM/CPU/swap ou taxa de cache sem instrumentação própria.

## Validação

- Regressão reproduzida: testes exigindo resumo falharam no script anterior; passaram com a implementação.
- **29 cenários Docker simulados em Bash/Linux**, além de fluxo Git/fast-forward/flock e teste da CLI real do Compose: aprovados.
- Cenários cobrem sucesso, repetição sem build, preflight, cada falha operacional, saúde, aliases, recuperação bem/malsucedida, erro em subshell, INT/TERM, saída 42 e impossibilidade de gravar resumo.txt.
- Injeção de 1 segundo no build tools verifica uma medição real positiva. Etapas não executadas aparecem com marcador explícito, sem zero falso. Resumo único, código original, backup de 12 bytes da fixture e arquivos com modo 0600 foram conferidos.
- Sentinela simulando conteúdo privado do .env não apareceu no terminal nem no resumo.
- Tipos e lint aprovados; **4 testes em 2 arquivos** de versão, rodapés e agrupamento do histórico aprovados.
- Revisão independente encontrou um P2: aliases rodavam dentro de publicacao, mas apareciam como não executados. Reproduzido por teste, corrigido e verificado com assertivas no sucesso e nas duas falhas de tag. Revisão final sem achados pendentes.
- Capturado exemplo real do ambiente de teste em arquivo temporário ignorado; números da fixture não são medições de produção.

Não foi reexecutada a suíte de negócio inteira nem realizado deploy: a alteração de comportamento está nos scripts, coberta pelo fluxo shell; versão/histórico têm testes próprios. A versão foi incrementada uma vez nesta PR, para PATCH 1.13.1; manifestos e notas preservam as entregas anteriores.
