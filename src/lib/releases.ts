type Release = {
  version: string;
  date: string;
  title: string;
  sections: { title: string; items: string[] }[];
};

// Keep the newest release first and add user-facing notes with each version bump.
export const releases: Release[] = [
  {
    version: "1.6.0",
    date: "2026-10-27",
    title: "Entenda as mudanças na rentabilidade da venda",
    sections: [
      {
        title: "Novidades",
        items: [
          "O detalhe da rentabilidade mostra a contribuição e a margem na receita da memória de preço, na venda negociada e no resultado realizado.",
          "Veja separadamente os efeitos do preço praticado, desconto, frete cobrado e taxas, além das diferenças do custo produtivo, encargos e frete pago, com origem por linha da venda.",
        ],
      },
      {
        title: "Melhorias",
        items: [
          "A explicação informa quando faltam dados ou os custos ainda são provisórios e só confirma a reconciliação quando os valores fecham com as fontes disponíveis.",
          "A referência passa a ser identificada como receita da memória, inclusive quando o preço foi informado pelo operador, sem presumir um histórico de negociação.",
        ],
      },
    ],
  },
  {
    version: "1.5.1",
    date: "2026-10-27",
    title: "Correção das permissões na atualização do servidor",
    sections: [
      {
        title: "Correções",
        items: [
          "Migrações e administração pelo Docker conseguem acessar os arquivos da aplicação mesmo quando o servidor usa permissões restritas ao baixar o projeto.",
        ],
      },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-10-27",
    title: "Busca mais flexível no catálogo",
    sections: [
      {
        title: "Novidades",
        items: [
          "Busca por todas as palavras em qualquer ordem, sem depender de acentos ou maiúsculas, em nome, código e descrição.",
          "Quando não há correspondências exatas, erros leves no nome podem trazer resultados aproximados, identificados com um aviso. Códigos, números e termos curtos permanecem exatos.",
        ],
      },
      {
        title: "Melhorias",
        items: [
          "Categorias, preços, disponibilidade, ordenação e paginação continuam respeitados nos resultados aproximados.",
          "Orientações para ajustar a busca e opção de remover somente o texto pesquisado, mantendo os demais filtros.",
        ],
      },
    ],
  },
  {
    version: "1.4.1",
    date: "2026-10-27",
    title: "Atualização do servidor simplificada",
    sections: [
      {
        title: "Melhorias",
        items: [
          "Atualização do servidor com dois comandos, backup antes da publicação e verificação automática de saúde da aplicação.",
          "Guia de atualização mais curto e instruções para interromper e diagnosticar falhas.",
        ],
      },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-10-27",
    title: "Encontre produtos com filtros comerciais",
    sections: [
      {
        title: "Correções",
        items: [
          "Filtros sem resultados explicam que não há produtos para os critérios escolhidos, sem indicar que o catálogo ou a coleção ainda não foram publicados.",
        ],
      },
      {
        title: "Novidades",
        items: [
          "Filtros combinados de categoria, busca, disponibilidade e faixa de preço-base de referência por unidade.",
        ],
      },
      {
        title: "Melhorias",
        items: [
          "Filtros acompanham a navegação, a paginação e a edição de itens da lista de orçamento.",
          "Critérios ativos podem ser removidos individualmente; valores inválidos permanecem visíveis para correção, com mensagens junto aos campos.",
          "Produtos sob consulta continuam disponíveis no catálogo geral e ficam fora de faixas de preço por não terem referência pública.",
        ],
      },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-10-27",
    title: "Catálogo mais claro e quantidades flexíveis",
    sections: [
      {
        title: "Novidades",
        items: [
          "Quantidade mínima por configuração de produto, aplicada também aos componentes dos kits.",
          "Quantidades de até 100.000 unidades por configuração, com cálculo automático dos preços de referência e das faixas de desconto.",
        ],
      },
      {
        title: "Melhorias",
        items: [
          "Preço de referência por unidade, aviso sobre adicionais e prazo de produção mais claros nos produtos do catálogo.",
          "Disponibilidade, prazo e condições de pagamento reunidos perto das opções de personalização.",
          "Tabela de preços por quantidade mantém todas as faixas visíveis e indica a faixa aplicada, com adicionais separados do preço-base.",
          "Descrições das coleções ajudam a escolher quais produtos explorar.",
        ],
      },
      {
        title: "Correções",
        items: [
          "Escolhas sob consulta ocultam preços por quantidade mesmo quando ainda faltam informações da personalização.",
          "Ações do cabeçalho se ajustam a telas estreitas para manter a lista de orçamento acessível.",
        ],
      },
    ],
  },
  {
    version: "1.2.1",
    date: "2026-10-26",
    title: "Instalação e atualização mais simples",
    sections: [
      {
        title: "Melhorias",
        items: [
          "Guia do servidor simplificado, com projeto, configuração, dados e backups reunidos na mesma pasta.",
          "Instruções diretas de Docker Compose para subir e atualizar o sistema, incluindo backup e preservação dos dados existentes.",
        ],
      },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-10-26",
    title: "Uma visão de cada operação",
    sections: [
      {
        title: "Novidades",
        items: [
          "Seis painéis no Dashboard: Visão geral, Comercial, Produção, Estoque, Financeiro e Rentabilidade. Os painéis financeiros são exclusivos dos administradores.",
          "Seleção de painel e filtros por mês, últimos 30 ou 90 dias e período personalizado, preservados no endereço da página.",
          "Novos indicadores, gráficos com tabelas de valores e prioridades para acompanhar a operação.",
          "Página de Atualizações para consultar as novidades de cada versão, disponível para toda a equipe.",
        ],
      },
      {
        title: "Melhorias",
        items: [
          "Número da versão no login e no rodapé administrativo, com acesso ao histórico pelo painel.",
          "Indicação de informações incompletas nos indicadores, ajudando a identificar o que ainda precisa ser registrado.",
        ],
      },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-10-22",
    title: "Catálogo e gestão mais próximos",
    sections: [
      {
        title: "Novidades",
        items: [
          "Faixas de preço por personalização, kits com desconto próprio e montagem por fotos no catálogo.",
          "Dashboard inicial com vendas do mês, orçamentos abertos, produção e indicadores financeiros para administradores.",
        ],
      },
      {
        title: "Melhorias",
        items: [
          "Navegação agrupada em Vendas, Produção e Financeiro, com acesso a Solicitações e Kits.",
          "Ajustes nos filtros e espaçamentos das telas de gestão.",
        ],
      },
    ],
  },
];
