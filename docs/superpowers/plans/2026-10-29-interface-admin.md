# Ajustes da interface administrativa

**Objetivo:** entregar os seis ajustes solicitados em uma única PR, preservando dados e formulários.

**Implementação:** reutilizar os componentes shadcn/ui e as regras de tema existentes. Corrigir a grade de Aparência separando o formulário da prévia; exibir somente sol/lua no seletor; consolidar a apresentação das notas por data sem alterar entradas históricas; trocar ContextEditor por Dialog; usar Collapsible em FilterPanel com acionador visível. Incluir a correção já validada das chaves do dashboard.

**Escopo adicional solicitado:** corrigir o alinhamento compartilhado de campos, cabeçalhos e paginação nas listagens; padronizar Negociações e Anúncios no mesmo filtro recolhível. URLs das coleções usarão tokens derivados dos nomes, preservando links por identificador; manter filtros, navegação para produto, canonical e sitemap. Nomes iguais após normalização terão sufixo para desambiguação. Renomear uma coleção altera o token por nome; não há histórico de nomes no modelo atual.

**Verificações:**
- [x] Testar agrupamento de versões fora de ordem, preservação de categorias e notas, e histórico original intacto.
- [x] Testar alternância claro/escuro, sincronização de controles e armazenamento indisponível.
- [x] Testar filtros recolhidos, abertura por teclado, preservação de valores e erros.
- [x] Testar fechamento, descarte e reabertura dos editores em Dialog.
- [x] Conferir disposição responsiva da Aparência e navegação repetida no dashboard.
- [x] Conferir manifestos, rodapés e histórico com uma única versão entregue (1.13.0, pois o agrupamento diário acrescenta funcionalidade).
- [x] Executar verificações apropriadas e revisar o diff. Entrega em uma única PR, sem integração automática.

**Validação automatizada:** 697 testes unitários aprovados na rodada final; 12 testes focados de coleções e versão aprovados. Tipagem, lint e compilação com `next build` aprovados. A suíte completa local teve 690 testes aprovados e 302 falhas de integração na proteção que exige banco descartável local. Não alterar dados ou configuração do banco em uso para executar testes; a CI disponibiliza o banco próprio.

**Validação visual:** prévia local dos componentes reais com dados fictícios, em 1440×900 e 390×844. Cartões de Aparência alinhados no desktop e empilhados no celular. Bases dos campos alinhadas em Solicitações, Negociações, Orçamentos, Vendas e Anúncios. Sem transbordamento horizontal nesses exemplos; Dialog móvel testado com campos e ações acessíveis. Revisão independente do diff ampliado sem achados.
