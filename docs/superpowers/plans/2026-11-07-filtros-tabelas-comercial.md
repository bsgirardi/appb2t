# Filtros e tabelas comerciais

Escopo autorizado no handoff: apenas listagens de orçamentos e vendas, preservando o piloto de produto. Base atual conferida: main a5805f40578a50b7007b4b10b55bf58c85e393d5 (1.27.0). Entrega conjunta preparada: 1.27.1, sem commit ou publicação.

## Direção e escolhas

Manter Roboto, paletas configuradas e tokens existentes. A hierarquia será consulta → critérios aplicados → resultados → paginação. Não adicionar métricas ou cores. Manter busca dentro do painel recolhível: movê-la exigiria alterar a composição do formulário e seus contratos. Resumo visível fora do painel torna a consulta compreensível sem descartar valores em edição. Não alterar FilterPanel/Table/Pagination globais; composição e receita delimitadas aos dois consumidores evitam alcance transversal.

## Execução

1. Trazer o diff rastreado e documentos/skills pertinentes do piloto após comparar sua base com main; preservar origem. Concluído, bases idênticas.
2. Acrescentar testes comportamentais de critérios aplicados versus rascunho, submissão GET com todos os campos após recolher/reabrir, limpar, paginação e retorno existente. Ver falhas antes da implementação.
3. Compor resumo local reutilizado apenas nas duas listagens. Usar requiredGuide=false, ação Aplicar filtros, Card completo, tabela nomeada, cabeçalhos e números alinhados; preservar status e valores sem reformatar. Estados vazios continuam com suas ações existentes.
4. Validar testes relevantes e contratos compartilhados, tipos, lint e diff. Inspecionar fixture sintética desktop/celular claro/escuro, teclado, texto longo, painel e tabela; sem banco ou autenticação artificial.
5. Revisar diff, registrar evidências/limitações e atualizar documentos e nota única 1.27.1. Sem merge, Release ou implantação.

## Registro

O pedido já optou pela execução desta etapa e dispensa reabrir aprovação genérica. Não haverá commits automáticos. A suíte padrão inclui integrações com banco; a validação fica nas suítes pertinentes sem banco conforme o escopo autorizado.
