type Release = {
  version: string;
  date: string;
  title: string;
  sections: { title: string; items: string[] }[];
};

// Keep the newest release first and add user-facing notes with each version bump.
export const releases: Release[] = [
  {
    version: "1.10.3",
    date: "2026-10-28",
    title: "Compatibilidade e recuperação da atualização manual",
    sections: [
      {
        title: "Correções",
        items: [
          "O procedimento valida as opções do Docker Compose antes da manutenção e executa migrações sem exigir entrada interativa.",
          "A recuperação anterior às migrações retoma somente a aplicação, sem iniciar serviços dependentes.",
          "A atualização é interrompida com antecedência quando a imagem instalada não está disponível para recuperação.",
        ],
      },
    ],
  },
  {
    version: "1.10.2",
    date: "2026-10-28",
    title: "Atualização manual com melhor reaproveitamento da compilação",
    sections: [
      {
        title: "Melhorias",
        items: [
          "A atualização reaproveita caches locais e prepara as ferramentas de manutenção sem recompilar a aplicação.",
          "O procedimento registra o tempo das etapas e confere a imagem instalada antes de informar sucesso.",
        ],
      },
      {
        title: "Correções",
        items: [
          "As permissões das ferramentas são preparadas durante a cópia, evitando uma operação demorada sobre todos os arquivos.",
          "Se o backup falhar antes das migrações, o procedimento tenta retomar a aplicação anterior com segurança.",
        ],
      },
    ],
  },
  {
    version: "1.10.1",
    date: "2026-10-28",
    title: "Verificações automáticas e atualização mais confiável",
    sections: [
      {
        title: "Melhorias",
        items: [
          "Alterações passam por verificações automáticas de testes, tipagem, qualidade e compilação no GitHub para reduzir regressões nas próximas atualizações.",
        ],
      },
      {
        title: "Correções",
        items: [
          "Formulários administrativos localizam e focam campos obrigatórios sem disparar validações repetidas ao abrir seções com pendências.",
          "A validação considera somente os testes atuais e separa os bancos exclusivos de planejamento e negociações, evitando cópias antigas e conflitos entre ambientes.",
        ],
      },
    ],
  },
  {
    version: "1.10.0",
    date: "2026-10-28",
    title: "Negociações e próximos contatos",
    sections: [
      {
        title: "Novidades",
        items: [
          "Acompanhe oportunidades desde o contato inicial até a venda ou perda, com responsável, próxima ação e pendências.",
          "Registre interações e motivos de perda em um histórico interno, e encontre contatos atrasados pelos filtros de negociações.",
          "Vincule os orçamentos da negociação e identifique o principal, mantendo o fechamento pelas rotinas comerciais existentes.",
        ],
      },
      {
        title: "Melhorias",
        items: [
          "O fechamento administrativo e o aceite privado do orçamento atualizam a oportunidade sem gerar uma segunda venda para a mesma negociação.",
          "Ofertas privadas ativas precisam ser retiradas antes de registrar a perda; vendas canceladas continuam identificadas no histórico da oportunidade.",
        ],
      },
    ],
  },
  {
    version: "1.9.0",
    date: "2026-10-28",
    title: "Calendário de produção e simulação da fila",
    sections: [
      {
        title: "Novidades",
        items: [
          "Calendário semanal por impressora com preparação, impressão, espera pela equipe e retirada prevista.",
          "Simulação de mudanças na fila antes de confirmar, com comparação dos horários e das ordens de produção afetadas, inclusive em outras máquinas.",
        ],
      },
      {
        title: "Melhorias",
        items: [
          "Movimentos sucessivos podem ser avaliados na mesma simulação; a confirmação confere se os dados e a previsão continuam atuais.",
          "Lotes sem previsão completa mostram o motivo e permitem acessar os detalhes. A previsão de retirada não inclui acabamento, embalagem ou transporte e não garante entrega.",
        ],
      },
    ],
  },
  {
    version: "1.8.0",
    date: "2026-10-28",
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
    version: "1.7.0",
    date: "2026-10-28",
    title: "Compare o resultado de diferentes lotes",
    sections: [
      {
        title: "Novidades",
        items: [
          "Comparação de quantidades com custo e preço por peça, receita, contribuição, margem efetiva e resultado após depreciação de cada lote.",
          "Tempo de máquina, contribuição estimada por hora e consumo de cada material, incluindo desperdício fixo, para apoiar a escolha da quantidade.",
        ],
      },
      {
        title: "Melhorias",
        items: [
          "Explicações distinguem cobertura dos custos modelados, meta comercial e despesas fixas da empresa, preservando a decisão de preço da equipe.",
        ],
      },
    ],
  },
  {
    version: "1.6.0",
    date: "2026-10-28",
    title: "Calculadora V3 e cadastro de produtos mais claro",
    sections: [
      {
        title: "Novidades",
        items: [
          "Calculadora V3 com os mesmos cálculos por lote da V2, entrada de horas e minutos, custos ao lado e ajustes avançados recolhidos. As três calculadoras preservam seus rascunhos ao alternar entre elas.",
          "Opção Exibir banner inicial em Aparência permite ocultar o destaque de abertura da loja sem apagar seu conteúdo.",
        ],
      },
      {
        title: "Melhorias",
        items: [
          "Filtros do catálogo recolhidos em Filtrar produtos e seletor de tema compacto no cabeçalho deixam mais espaço para os produtos.",
          "Filtros das listagens administrativas e período do dashboard ficam recolhidos para destacar os registros. Os valores digitados são preservados ao fechar e reabrir o painel.",
        ],
      },
      {
        title: "Correções",
        items: [
          "O cadastro de produtos começa com zero horas, permitindo informar impressões de menos de uma hora sem preencher um campo vazio. Pendências de consumo, tempo e custos agora são identificadas junto aos campos, com indicação dos itens obrigatórios. Apenas as seções com pendências são abertas ao validar o cadastro.",
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
