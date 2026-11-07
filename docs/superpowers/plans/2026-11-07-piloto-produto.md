# Piloto do formulário de produto

**Objetivo:** executar o recorte autorizado no handoff: clareza de requisitos e contratos locais, preservando o fluxo de cadastro/edição.

**Arquitetura:** Field/TextareaField continuam donos de label, obrigatório e erro. AdminForm permite substituir sua orientação geral por orientação contextual; o padrão dos demais consumidores permanece. Arranjo pertence à receita de produto em design.css. Sem migração transversal de variantes ou tokens.

**Direção visual:** manter Roboto, alinhamento à esquerda e paleta configurada. Referências de fallback existentes: página #f3f5f7, superfície #ffffff, texto #182637, borda #cbd5df, ação #176b59; são referências do tema, não valores novos no consumidor. No escuro e em Aparência personalizada, usar os pares existentes. O resumo de preço continua o destaque funcional; nenhum ornamento novo.

Layout: orientação única → dados principais → seções progressivas; resumo ao lado no desktop e abaixo conforme TaskLayout existente. Nome e preço são curtos; descrição e pagamento ganham largura integral. A sugestão permanece próxima do preço.

**Alternativas:** somente cortar texto manteria a inconsistência dos campos manuais; centralizar CSS atingiria consumidores fora do piloto. Adotar os adaptadores já instalados e receita contextual resolve o recorte autorizado. Revisão contra o brief: sem novos cards decorativos, paleta, fonte ou navegação.

## Execução

- [x] Trazer documentos, AGENTS e skills sem modificar origem; conservar incremento único 1.27.1.
- [x] Testar orientação contextual e obrigatoriedade/erros dos campos principais antes de implementar.
- [x] Aplicar composição local e espaçamento; preservar eventos, limites, nomes e estados.
- [x] Rodar testes de produto/contratos/versão, checagem de tipos e lint pertinentes.
- [x] Inspecionar prévia sintética desktop/celular claro/escuro, foco, erro recolhido e overflow; registrar limites.
- [x] Atualizar contratos, roadmap e notas em português; revisar diff sem merge/publicação.

## Cuidados de revisão

Salvar inválido sem requisição; erros em seções recolhidas; preço negociado preservado; cancelamento com rascunho; pending/disabled e reenvio. Os testes existentes exercitam cálculos, upload e FormData; ampliar apenas contratos tocados e lacunas relevantes.

## Resultado

46 testes passaram em 11 arquivos; typecheck e ESLint dos arquivos alterados passaram. Revisão independente sem achados, com 20 testes repetidos. Inspeção em desktop e celular claro/escuro, foco e erro recolhido descrita em [PILOTO-PRODUTO.md](../../design/PILOTO-PRODUTO.md). Cancelamento com diálogo nativo teve timeout na ferramenta, coberto por teste automatizado. Sem commit nem publicação.
