# Composição do PDV presencial

07/11/2026 · branch `codex/pdv-composicao` · base main 1.27.3, SHA `0a73e718ef994e7bd7868def8c2ce9d1a094bcda`.

## Diagnóstico e decisão

O consumidor operacional é `src/app/(private)/pdv/page.tsx`: exige ator autenticado e fornece compra e catálogo a PosPanel. O painel já permite consumidor não identificado, cliente existente ou cadastro junto à conclusão; já possui revisão, rascunho, recuperação de resultado incerto, escolha de edição conflitante e proteção flight. Nenhuma falha de domínio foi presumida.

O esforço observado é visual: catálogo começa diretamente pela busca sem título; itens, desconto, cliente e pagamento formam uma coluna com pouca separação; nome longo se repete na label da quantidade; ausência de peças deixa a revisão desabilitada sem orientação junto à ação; processamento diz somente “Aguarde…”. A compra inteira era sticky apesar de poder exceder a altura da tela.

A composição local preserva catálogo/compra lado a lado no desktop e sequência natural no celular. Foram descartadas abas ou seções recolhidas por esconderem dados durante a conferência; migrar componentes globais ou regras comerciais excederia o recorte. Roboto, tokens e paletas de Aparência continuam vigentes, sem decisão nova de marca.

## Implementação e contratos preservados

- Catálogo ganha título e contagem do conjunto visível. O vazio orienta consultar novamente; produto com reason ou zero disponível mostra “Indisponível” na ação já bloqueada, sem ícone de adicionar.
- Compra ganha título semântico e seção nomeada de itens, separadores entre cliente/pagamento e resumo junto às ações. A label visual de quantidade é curta; o nome acessível continua incluindo o produto. Reason existente também aparece junto ao item da compra.
- Cliente permanece opcional, com as mesmas três opções e campos; seleção pendente orienta selecionar ou continuar sem identificação. Valor entregue inválido em dinheiro recebe orientação, sem nova validação.
- Pending continua derivado do mesmo busy e informa aguardar o processamento. Erro mantém Alert e foco existentes; recuperação e conflito continuam com os mesmos controles. Nenhum handler, payload, schema, disabled, cálculo, taxa, preço, faixa, endpoint, permissão ou transição mudou.
- A receita `.admin-ui .pos-workspace` é exclusiva deste painel: quebra textos longos, organiza fieldsets e opções em larguras estreitas, alinha valores tabulares e acomoda a barra móvel/safe area e garante 44 px nas opções de cliente/pagamento até 767 px. A compra deixa de ser sticky; segue no fluxo de rolagem, sem ocultar sua parte inferior. Nenhum CSS anterior ou variante compartilhada foi removido.

## Evidências

Dois testes novos falharam antes da implementação pela falta dos títulos e mensagem genérica de processamento, e passaram depois. A rodada final de comportamento reuniu **39 testes em 11 arquivos**, incluindo pos-panel, pos-contract, app-version, ui-contracts, appearance-palettes, theme, theme-preference, admin-shell, commerce-totals, commerce-installments e quantity-pricing. Cobrem mínimo/faixas de quantidade, cliente identificado/não identificado, cadastro opcional, atualização explícita de preços, revisão, rascunho com repetição bloqueada durante pending, foco no erro com compra preservada e recuperação de resposta perdida/edição conflitante. App-version renderiza login, rodapé e atualizações para ADMIN/OPERATOR em 1.27.4. Aviso jsdom de navegação entre documentos não implementada, sem falhas.

Tipos, lint completo e build de produção aprovados localmente. Prisma Client gerado localmente, sem consulta ao banco. Dependências preparadas pelo lock com scripts desabilitados; nenhuma biblioteca nova. Os controles e exemplos foram consultados pela CLI e MCP oficial shadcn; guia Next instalado de use client lido antes das alterações.

Prévia Vite existente, em porta 4188 para preservar outro processo em 4178. `POS_PREVIEW_PORT` permite a escolha sem encerrar outros servidores. Cenários `empty`, `filled`, `long`, `catalog-empty`, `error` e `pending`, com `theme=light|dark`, usam apenas fixtures. Error/pending disparam a busca existente após montagem, com resposta sintética rejeitada/pendente. A compra inicial é sincronizada com a memória da API de prévia, sem representar persistência real.

Inspeções realizadas: desktop 1440 claro com compra preenchida, pagamento/resumo/ações e erro/foco com compra preservada; desktop escuro com compra vazia; celular 390 claro e 320 escuro com nomes extensos e opções quebrando em linha; tablet 768 escuro com processamento e ações desabilitadas; catálogo vazio no celular claro. Medidas da página: 375/390, 305/320 e 753/768 px, sem overflow horizontal. Fonte computada Roboto. Capturas locais na pasta de visualizações deste chat: `pdv-celular-claro.png`, `pdv-celular-escuro.png`, `pdv-desktop-erro-claro.png` `pdv-tablet-processamento-escuro.png`, `pdv-desktop-claro.png` e `pdv-catalogo-vazio-claro.png`.

A ferramenta de navegador não efetivou clique para adicionar produto nem navegação por Tab; não foi alegada homologação manual da sequência de teclado ou retorno de foco. O foco automático no Alert foi observado visualmente e na árvore acessível; os comportamentos relevantes também são exercidos nos testes. Sem homologação de leitor de tela, zoom, tema automático ou fluxo comercial persistido. Não houve login, vendas, operações financeiras, alterações de sessão ou acesso a dados operacionais.

Revisão independente do diff sem achados P1/P2 abertos; 8 testes do painel repetidos pelo revisor. A revisão identificou a necessidade de sincronizar a compra inicial da fixture com a API em memória, atendida antes do fechamento.

## Estado de entrega

Versão preparada **1.27.4**, uma única vez para esta nova entrega, com manifestos sincronizados e nota em português no início do histórico. Main reconferida continua em 1.27.3 no SHA base. Commit e abertura de PR autorizados na continuidade. Sem merge, Release ou implantação. Revalidar a versão de main antes da futura integração; a distribuição só deve ocorrer quando autorizada.
