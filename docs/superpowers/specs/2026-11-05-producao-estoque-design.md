# Produção e Estoque: clareza operacional

Execução autorizada no pedido de continuidade. Decisões rotineiras delegadas; merge e publicação ficam fora desta entrega.

## Desenho

Manter fila, planejamento e comandos existentes. A lista de ordens deve apresentar estado, prazo civil em português, responsável, máquinas planejadas, quantidades boas/falhas/pendentes e orientação de próxima ação conforme o estado. Orientações não representam autorização ou garantia de liberação: os comandos continuam validando os bloqueios reais.

No estoque, explicar físico, reservado e disponível sem calcular um segundo saldo. Materiais e peças prontas permanecem separados. Detalhes e formulários devem manter contexto da lista, permitir atualização sem apagar campos e proteger saídas com rascunho. Evitar apresentar listas operacionais por trás de uma ação em edição.

Filtros e paginação devem reutilizar componentes existentes, preservar contexto da venda e diferenciar ausência de dados, busca sem resultados e página fora do intervalo. Não alterar schema, bibliotecas, regras, consultas de valoração ou operações.

## Abordagens consideradas

1. Reorganizar a apresentação e reutilizar os fluxos existentes (escolha técnica): menor superfície de regressão e consistência com as etapas anteriores.
2. Substituir por novo painel/kanban: duplicaria planejamento e motores já existentes, sem benefício demonstrado.

## Validação

Testes de interface com dados fictícios para leitura das ordens, estados vazios, proteção de campos, falha de carga e permissão de operador. Reexecutar testes operacionais existentes de quantidades, estados, custos e reenvio idempotente. Conferir tipos, lint e prévia local em temas e larguras diferentes. Sem banco publicado.
