# Financeiro e tributação — composição e leitura

08/11/2026, America/Sao_Paulo. Base limpa: main 1.27.3, `0a73e718ef994e7bd7868def8c2ce9d1a094bcda`. PRs #55, #56 e #57 abertas na consulta inicial; suas worktrees e diffs não fazem parte deste trabalho.

## Intenção e limites

Continuidade autorizada do Design System: distinguir saldo, obrigação prevista, baixa, movimento realizado e estimativa tributária. Sem novas funções financeiras, cálculos, regras fiscais, consultas, permissões, banco, dependências ou decisões de marca. Sem operação financeira real, merge, Release ou implantação autorizados.

## Inventário e decisões

- `finance-dashboard`: a posição atual e os totais por período dividem a mesma grade; explicitar o alcance diferente e a natureza dos títulos.
- `cash-flow`: cabeçalhos idênticos escondem a distinção entre data efetiva e vencimento; tabelas não têm nome próprio e vazio é genérico. Preservar valores e sinais; saldo nulo continua indisponível.
- `filters`: critérios somem quando recolhidos; datas usam De/Até sem contexto. Exibir critérios fora do painel, preservar os parâmetros existentes no GET e na paginação; informar limites distintos do período no painel e na projeção.
- `entry-panel` e `movement-panel`: alinhar moeda, nomear tabelas, distinguir título/baixa/movimento, tratar página sem itens com total positivo. Leitura de detalhe precisa feedback pendente e prevenção de respostas fora de ordem.
- `tax-report`: já separa estimativas de caixa e pagamentos. Destacar cobertura parcial e zero conhecido que não representa isenção; mostrar origem/vigência do perfil mensal existente, referências congeladas e retorno à consulta corrente ao abrir memória.
- `settings/tax-settings-panel`, formulários de título/baixa/transferência, páginas e serviços: inspecionar contratos e manter o fluxo de edição, confirmações, idempotência e validação. Alterar configurações apenas se houver incoerência concreta de interpretação.

Abordagens: redesenhar o módulo ou centralizar variantes teria impacto transversal desnecessário. Adotada evolução local de composição, vocabulário e receita `.finance-reading`, sem substituir primitivas. Roboto e tokens de Aparência existentes, claro/escuro, continuam sendo a fonte; não fixar novos HEX. Texto alinhado à esquerda e moeda à direita com algarismos tabulares.

```text
posição atual → critérios e período → realizado / previsto
títulos → detalhe → baixas preservadas
competência tributária → cobertura → fontes → memórias
```

## Plano de execução

1. Testar critérios, preservação de URLs, nulo versus zero, separação de tabelas e detalhe pendente; ajustar somente apresentação financeira.
2. Testar cobertura tributária, perfil mensal, memória corrente/salva, falha/pending/reenvio; melhorar a leitura sem alterar payloads.
3. Criar prévia sintética delimitada; conferir larguras 320/390/768/1440 e temas, teclado/foco/rolagem e estados. Executar testes relevantes, tipos, lint e build. Registrar somente evidência observada.
4. Conferir main novamente, aplicar PATCH único e notas portuguesas, verificar rodapés e histórico. Revisar diff e entregar estado real de commit/PR/publicação.

Foco de revisão: filtros parcialmente preenchidos, página fora do resultado, valores extremos/negativos/nulos, perfis mensais ausentes ou diferentes dos snapshots, falha e clique repetido durante carregamento/salvamento. Prévia não homologa persistência ou operação real.

## Evidências e entrega

- Dependências preparadas pelo lock, sem alterar versões de dependências; Prisma Client gerado localmente. CLI shadcn 4.23.0 e MCP oficial disponíveis, configuração Radix preservada. Consultados os guias instalados de Next 16.4.2 para formulários, Link, loading e fronteira servidor/cliente, documentação upstream de Card/Table/Alert/Empty e os contratos locais.
- Regressão inicial: 1.000 testes unitários em 233 arquivos aprovados. Tipos, lint e build de produção aprovados nessa passagem. Dois testes adicionais foram incluídos depois, para foco/retorno e projeção vazia com vencidos; verificações finais abaixo.
- Dez testes novos exercitam seleção GET/URLs, preservação de contexto/paginação, datas efetivas versus previstas, nulo versus zero, sinal negativo, leitura pendente/erro/concorrência, foco/retorno, DAS separado, perfil Simples, origem/vigência, cobertura incompleta e pending/reenvio da memória com a mesma operação. Formulários financeiros e configuração tributária mantêm suas regressões existentes.
- Revisão independente apontou um P2: `projected=[]` não significa ausência de títulos, pois vencidos podem estar em `overdueNet`. Reproduzido em teste vermelho; mensagem corrigida para “Nenhuma linha de projeção no período”, sem mudança de cálculo. A revisão não encontrou outra regressão concreta em filtros, URLs, valores, fontes ou payloads.
- Prévia somente de apresentação em `tests/finance-reading-preview.html`, com fixtures locais, sem sessão, banco ou chamada financeira real. Executar `node tests/finance-reading-preview-server.mjs`, abrir `http://127.0.0.1:4177/tests/finance-reading-preview.html`; parâmetros `view=overview|entries|movements|tax|settings`, `theme=light|dark`, `state=empty|outside|memory|pending`.
- Matriz de medidas DOM: quatro telas principais × larguras 320/390/768/1440 × claro/escuro (32 consultas). Nenhuma mostrou largura de documento maior que a viewport. Nas tabelas móveis, conteúdo de cerca de 722–780 px ficou dentro de regiões de 239/309/439 px com `tabIndex=0`. Isso demonstra contenção, não execução da rolagem por teclado.
- Inspeção por captura: visão financeira em 390 claro, tributação em 320/390 escuro, títulos em 1440 claro, movimentos em 768 escuro e estado de página fora dos resultados em 320 claro. Textos extensos e valores de R$ 999.999.999,99 usados apenas como fixtures. Capturas/medidas locais em `.b2t/finance-reading/`, fora do versionamento.
- Limitação do navegador: clique e Enter no filtro não alteraram `aria-expanded`; não foi possível homologar expansão, sequência Tab, foco visível e rolagem por teclado no navegador. Testes jsdom exercitam montagem dos controles e foco do detalhe, mas não substituem acessibilidade integral. Prévia usa adaptadores de navegação e não homologa persistência, autenticação ou qualquer operação financeira real. Sem avaliação fiscal nova.
- O DTO do painel geral fornece saldo como string e não expõe a indisponibilidade de referência das contas; esse contrato não foi ampliado. Nas linhas do fluxo que já fornecem saldo nulo, a apresentação preserva “Sem referência” e nunca substitui por zero.
- Main reconferida após implementação: permanece em 1.27.3 no mesmo SHA; #55/#56/#57 seguem abertas. PATCH candidato único 1.27.4 em manifestos e histórico, sujeito à conciliação antes de futura integração. `APP_VERSION` segue derivado do package, sem números duplicados em login/rodapé/Atualizações. Sem push, PR, merge, Release ou implantação nesta etapa.

Verificação final na versão candidata **1.27.4**: **1.002 testes unitários aprovados em 233 arquivos**, incluindo os dez novos testes. Passagem dirigida adicional: 27 testes em oito arquivos aprovados, incluindo versão/rodapés/Atualizações para ADMIN e OPERATOR. `npm run typecheck`, `npm run lint`, `npm run build` e `git diff --check` aprovados. O jsdom emitiu três avisos de navegação entre documentos não implementada, sem falha de teste. Não foram executadas suítes que exigem banco.

A revisão independente repetiu os seis testes financeiros após a correção do P2 e confirmou resolução sem regressão concreta. Memória tributária em 1440 escuro, estado de página fora dos resultados em 390 claro e configuração tributária vazia em 390 claro também foram inspecionados por captura; formulário fiscal continuou sem DAS fictício e com salvamento bloqueado até as declarações existentes. Matriz final repetida no servidor específico: 32 consultas, zero transbordamentos da página. Servidores e aba de prévia encerrados; viewport restaurada. Nenhuma worktree foi removida.

Entrega mantida na branch local `codex/financeiro-tributacao`, com commit identificado no resumo do chat. Sem push ou PR criada; sem merge, Release, instalação ou implantação. O número 1.27.4 é uma versão candidata desta branch e não uma afirmação sobre versão instalada.
