# C2 — Validação do recebimento e atendimento integrado

Data: 20/10/2026. Branch: `codex/catalogo-c2`. Produto verificado: `50a794041b5b6a65d3026dd74cfc8f52439e7ca2`; os commits posteriores desta entrega contêm documentação/fixture.

## Estado da entrega

Implementação e validação concluídas com a cobertura descrita abaixo. A instalação operacional C1 em localhost:3000 permanece preservada; C2 não foi integrada nem publicada operacionalmente.

## Ambiente e isolamento

Worktree própria `catalogo-c2`, base `397475c`. Todos os testes mutáveis usam PostgreSQL 17 descartável `b2t_test`, em loopback:55431 (candidata) ou 55432 (regressão final), sem volume operacional. A fixture exige esse banco e porta, e contém somente dados fictícios. Candidata em `http://127.0.0.1:3105`, com cookies separados da instalação localhost.

Imagem `appb2t-catalog-c2-candidate:20261020`, digest `sha256:74e686c2d4b10f872fe21a21db4c786125f65e3f47f31196112fd687b05451dd`, revisão OCI `50a794041b5b6a65d3026dd74cfc8f52439e7ca2`. Compilação Docker passou, incluindo geração Prisma e build Next, sem interferir na DLL Windows carregada por outras instâncias.

## Verificação automatizada

- Antes da revisão final: 174 arquivos e 574 testes aprovados.
- Após a revisão: 577/577 testes aprovados em 174 arquivos, saída 0 (395,99 s). Após os ajustes visuais: novamente 577/577 em 174 arquivos, saída 0 (298,70 s), em outro banco descartável na porta 55432 para preservar a candidata visual.
- TypeScript e ESLint completos após os ajustes visuais: saída 0, sem erros ou avisos. Build final Docker: saída 0.
- Migração: restauração do backup C1 em banco adicional descartável, aplicação da migração C2 e comparação das 78 tabelas históricas (incluindo `_prisma_migrations`): hashes e contagens idênticos. Banco restaurado e cópia temporária do dump removidos após o ensaio. Teste adicional reconstrói o schema anterior e verifica Product, Customer e Quote históricos.
- Recebimento: testes com `connection_limit=1&pool_timeout=2` passaram 6/6, incluindo retries concorrentes, consulta nula, rejeição comercial com cota persistida e identificadores sem colisão.
- Origens: 5 testes passaram, incluindo edição autenticada de 20 origens recebidas com 100 duplicatas explícitas e bloqueio de corpo acima de 16 MiB.
- UI pública e lista: 11 testes passaram, incluindo nova conferência após rejeição, confirmação da oferta atual e contato preservado.

Os logs e imagens locais ficam em `.superpowers/sdd/2026-10-20-catalogo-c2/` e `test-results/catalog-c2/`, ignorados pelo Git. A execução usa a entrada direta do Vitest porque o wrapper npm não encaminhou corretamente uma exclusão no baseline.

## Revisão independente e decisões

Uma revisão final independente, somente leitura, sobre `397475c..6366c68`, encontrou quatro problemas importantes e nenhum crítico. Todos foram reproduzidos em testes que falharam antes e passaram depois, em uma única rodada de correções:

1. O corpo de edição do orçamento crescia com as origens recebidas. A edição autenticada admite até 16 MiB, mantendo 100 linhas limitadas por schema e verificação de origem imutável. O recebimento público continua em 256 KiB. Duplicatas explícitas conservam a origem correta.
2. Rejeição comercial deixava a conferência antiga pronta. Agora invalida a conferência, consulta as condições atuais e exige confirmação dos itens alterados, preservando o contato ao revisar.
3. IDs omitidos podiam colidir com IDs fornecidos. A geração consulta todo o conjunto ocupado antes de atribuir cada identidade.
4. Transações aninhadas dependiam de outra conexão livre. Recebimento, cota e aparência usam o mesmo cliente transacional. Rejeição comercial retorna um resultado que permite commit da cota, sendo lançada fora da transação; falhas inesperadas de banco revertem a operação. Recibo existente continua sendo consultado antes da cota/revisão.

Os cinco focos do plano estão cobertos: recuperação sem revalidar oferta antiga; limpeza seletiva entre abas; preparação concorrente/rollback; origem estável na edição/emissão; cliente e produto inativo com confirmação explícita. Nenhum vínculo automático de cliente, custo, venda, estoque, financeiro ou produção foi introduzido.

## Aceite no navegador integrado

Conferência pelo navegador integrado, com produtos, conta e contatos fictícios:

- Ana/Bia distintas, R$ 30,00 por linha, R$ 60,00 de referência; contato inválido foca o primeiro erro; envio confirmado SOL-000001, preservado após recarga.
- Seleção adicional com consulta: SOL-000002, soma conhecida R$ 60,00 e indicação de uma linha sem preço/sem total fechado. Recarga preservou o protocolo.
- Caixa interna, atendimento, cadastro consciente do cliente, seleção explícita do cadastro e revisão das linhas. Consulta em branco impediu preparação e focou seu campo; após preço positivo, ORC-000002 foi preparado.
- ORC-000001 foi editado, reordenado e emitido; Bia ficou com R$ 33,00 e Ana com R$ 34,00, total R$ 67,00, com suas origens corretas. A página para impressão mostrou ambas as descrições negociadas. Não foi aberta a caixa nativa de impressão nem enviado documento externo.
- Banco da candidata ao final: 2 solicitações, 1 cliente criado conscientemente, 2 orçamentos; 0 vendas, lançamentos financeiros, comandos de estoque e ordens de produção.

| Vista                       | Claro                                                            | Escuro                                                                                                                                   | Evidência local                                       |
| --------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Formulário/erro público     | 320/390/1440, versão final, mensagem em português e campos 44 px | 320/390/1440 antes do último ajuste de mensagem/altura; falha desktop identificada e corrigida, sem repetir esse último estado em escuro | `light-final-error-*.jpg`, `pre-fix-dark-error-*.jpg` |
| Recibo                      | 320/390/1440, SOL-000002                                         | 320/390/1440, SOL-000001 antes do ajuste dos campos                                                                                      | `light-receipt-*.jpg`, `dark-receipt-*.jpg`           |
| Caixa interna               | 320/390/1440                                                     | 320/390/1440                                                                                                                             | `light-inbox-*.jpg`, `dark-inbox-*.jpg`               |
| Preparação                  | 320/390/1440                                                     | 320/390/1440                                                                                                                             | `light-preparation-*.jpg`, `dark-preparation-*.jpg`   |
| Detalhe preparado           | 320/390/1440                                                     | Incluído na navegação de atendimento; sem matriz separada de capturas                                                                    | `light-detail-*.jpg`                                  |
| Documento emitido/impressão | Desktop, descrições/valores conferidos                           | Sem matriz adicional                                                                                                                     | `quote-issued-origin.jpg`, `quote-print.jpg`          |

Não houve overflow horizontal nas medidas válidas; os controles de atendimento/preparação e do formulário final mediram pelo menos 44 px. Vitrine com Poppins, área interna no padrão existente. Teclado/foco e preferência de movimento reduzido foram exercitados. As imagens foram capturadas e inspecionadas; `metrics.json` registra medidas e exclui uma tentativa cujo controle de largura atingiu outra aba. Não usar arquivos `excluded-*` como evidência.

O tema claro foi efetivamente observado nas novas abas após a troca feita pelo usuário; abas antigas conservaram o esquema anterior até nova navegação. Timeout pós-commit, falha de armazenamento, conflito de oferta, disputa de versão, repetição de preparação e edição concorrente entre abas ficam cobertos por testes determinísticos; não foram induzidos manualmente como falhas de rede no navegador.

Durante a reconstrução, a candidata antiga sofreu OOM (saída 137). Após a compilação, foi recriada com a imagem final e os dados persistidos, e o fluxo continuou. C1 permaneceu saudável com a imagem anterior. A primeira rede Docker interna não publicou a porta; a candidata usa bridge com porta exclusivamente loopback e rede separada para o banco de teste.

## Integração e publicação

Entrega: branch, relatório e PR. Integração/publicação de C2 dependem de autorização própria conforme a especificação aprovada. A publicação C1 não foi substituída.

