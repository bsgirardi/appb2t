# Catálogo compacto — plano de implementação

**Objetivo:** destacar produtos com filtros recolhidos e tema como ícone, conforme recomendação aprovada pelo usuário.
**Arquitetura:** Accordion shadcn/ui existente envolvendo o formulário GET existente; abertura automática quando houver erros. Propriedade compact opcional no seletor de tema, usada apenas na loja.
**Abordagens:** escolhida abertura local dos filtros e tema como ícone; alternativa de tema no rodapé não escolhida. Manter formulário aberto não atende ao objetivo.
**Restrições:** preservar parâmetros, filtros ativos, acessibilidade, controles administrativos e login. PATCH 1.5.2 com notas em português.

- [x] Envolver formulário em Accordion, fechado por padrão e aberto com erros; preservar envio GET.
- [x] Adicionar modo compacto ao tema e usá-lo na loja, com nome acessível e dica.
- [x] Sincronizar manifestos e histórico; conferir APP_VERSION nos rodapés.
- [x] Verificar testes existentes, tipos, lint e diff.

**Revisão:** teclado, erro de preço, pesquisa com filtros, troca de tema e tamanho mínimo de toque.

Ajuste solicitado durante a execução: usar skill shadcn/ui; reutilizado Accordion instalado, sem novas dependências.
