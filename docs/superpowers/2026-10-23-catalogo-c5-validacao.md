# C5 — Implementação e validação do checkout

Registro histórico da validação anterior à integração. C5 foi posteriormente integrado e publicado: [registro operacional](2026-10-23-publicacao-c5.md). Administrador e preferência manual de tema foram tratados no [encerramento](2026-10-23-tema-e-encerramento.md).

Estado: implementação e validação isolada concluídas, com limites de navegador registrados abaixo; integração e publicação ainda pendentes. Desenho e execução nativa aprovados pelo usuário em 23/10/2026.

Worktree: C:/Users/Administrador/.codex/worktrees/catalogo-c5/appb2t. Branch codex/catalogo-c5; base de implementação f0ff9f3. Original X:/codex/appb2t, .agents/, skills-lock.json e worktree/evidências C4 preservados.

## Comportamento implementado

Compra direta exige política explícita por produto/kit, preço resolvido e modalidade comum. Usa preço/faixas/adicionais e descontos existentes. Pedido com consulta ou frete pela equipe segue para conferência sem criar cliente/venda/recebível; equipe prepara o orçamento existente, confere entrega e publica total/parcelas para aceite privado. Compra direta usa parcela única com vencimento na data da confirmação em São Paulo. Pagamento continua externo e registrado no financeiro existente.

Confirmação e conversão compartilham núcleo transacional, preservam origem por linha/kit e vínculos de arte C4, geram venda/parcelas/recebíveis uma vez e não reservam material/capacidade. Cliente pode solicitar cancelamento, cuja conclusão usa controles financeiros/produtivos existentes. Operações administrativas também reconciliam o estado público.

Sessão existe antes da confirmação; cookies específicos por checkout impedem troca acidental do pedido entre abas. Links privados usam segredo de 256 bits, hash persistido, chave HMAC CHECKOUT_ACCESS_KEY separada, sete dias de validade e revogação. Não há acesso por protocolo isolado, gateway, tarifas simuladas, integração de transportadora ou mensagens automáticas.

## Verificação automatizada

- Base C4 Linux/Node 22: 683 testes aprovados em 211 arquivos.
- Primeira suíte C5: 705 aprovados, duas falhas na lista explícita de campos públicos de produto, atualizada para incluir checkoutPolicy. Regressão focada de produtos posterior: 5/5.
- Suíte anterior à revisão final: 707/707 aprovados em 228 arquivos.
- Tipagem e lint aprovados, sem rebaixamento de regras nem atualização forçada de dependências.
- Suíte após correções da revisão: 715/715 aprovados em 230 arquivos, Linux/Node 22, saída 0 (191,06 s).

## Revisão independente

Uma revisão independente somente leitura encontrou seis problemas importantes. Todos foram reproduzidos antes das correções:

1. Confirmação/recuperação em outra aba podia usar cookie global de nova compra: formulário agora fixa o checkout original, inclusive após recarga. Três regressões de interface.
2. Edição/transição de orçamento podia reabrir checkout cancelado: estado CLOSED é preservado e conversão de pedido encerrado permanece impedida.
3. Novas linhas do orçamento podiam herdar personalização por posição ou omitir campos: projeção pública completa usa identidade estável, com campos vazios explícitos para itens novos.
4. Cancelamento administrativo não atualizava o cliente: núcleo compartilhado encerra checkout e conclui solicitação pendente sem divulgar notas internas.
5. Conversão administrativa podia criar parcelas diferentes da oferta mostrada: projeção confirmada usa documento, total e parcelas efetivamente gravados; oferta histórica permanece separada.
6. Chave de envio para conferência podia ser reutilizada no aceite posterior: tentativas distinguem CONFIRM e ACCEPT_QUOTE, versão e fingerprint; recuperação comprovada encerra a tentativa anterior.

Regressões focadas: quatro integrações e quatro testes de interface da revisão passaram, além de vendas/orçamentos/cancelamento relacionados. Não houve segunda rodada de revisão. Nenhum achado menor foi adiado.

## Migração e preservação de dados

Migração aditiva 20261023190000_catalog_checkout aplicada somente no PostgreSQL de testes. Backup final da publicação C4 restaurado em b2t_c5_restore no contêiner appb2t-test-db-1; migrações C4/C5 aplicadas, 85 projeções de tabelas legadas idênticas antes/depois, usando somente colunas anteriores na comparação. As 26 migrações também passaram em banco vazio b2t_c5_empty no mesmo PostgreSQL isolado. Suítes mutáveis usam exclusivamente b2t_test na porta 55432.

O backup operacional final era de uma instalação sem usuários/dados comerciais; o ensaio prova preservação dessa instalação e não representa teste com histórico operacional populado. Regressões automatizadas usam dados demonstrativos para exercitar o histórico comercial.

## Decisões técnicas de execução e limites

- Ledger/comandos adaptados a PowerShell; mesma sequência de testes e commits. Isso evita depender dos scripts Bash no Windows.
- ADD já existia na configuração de produto: foi reutilizado com preço/faixas, sem matriz nova de combinações. Oferta sem condição firme permanece em conferência.
- Política isolada em policy.ts evita ciclo de imports com validação de kits e solicitações.
- sale-write.ts é fachada transacional como quote-write.ts; corpos ficam ao lado dos helpers existentes em sales.ts para limitar alterações no legado.
- Compra direta conserva um CatalogRequest encerrado como origem técnica imutável para documentos/arte; isso não cria segunda intenção ou segundo envio do cliente.
- Testes reais de rotas cobrem HTTP em vez de simular o servidor em um teste unitário paralelo.
- Sem origem confiável de IP, inicialização e troca de token usam cota compartilhada conservadora; revisão e confirmação têm cotas por sessão. Cabeçalhos fornecidos pelo visitante não são tratados como identidade confiável. Isso pode limitar visitantes legítimos simultâneos; refinamento depende de ingresso confiável configurado.
- Aspectos que o revisor deixou ao executor: build, restauração, navegador e suíte pertencem a esta validação; carrinho remoto é preservado pelo armazenamento existente; endereço e kit têm elegibilidade/revisão; concorrência comercial e arte usam lock de planejamento e regressões; gateway/reserva automática/transporte/restituição financeira continuam fora do escopo aprovado.

## Imagem e navegador

Build Docker candidato aprovado: appb2t:c5-candidate-20261023; Next 16.4.2, compilação e tipagem concluídas, saída 0. Testes HTTP e navegador concluídos com os limites descritos abaixo. Não substituir a imagem C4 nem a aplicação na porta 3000 durante a validação.

Candidata disponível somente em http://localhost:3107. PostgreSQL visual descartável appb2t-c5-browser-db, banco b2t_c5_browser na porta 55433; todas as migrações aplicadas antes de criar os dados demonstrativos. A conexão usa host.docker.internal no contêiner com porta publicada somente no loopback Windows, pois o modo host não expôs a porta ao navegador neste ambiente.

O banco original da suíte (b2t_test/55432) entrou em recuperação com sincronização de arquivos após reinício. Para evitar bloquear a validação visual ou modificar arquivos de recuperação, foi criado o segundo PostgreSQL descartável. A recuperação ainda estava em progresso na última observação; nenhum reset de WAL ou outra intervenção destrutiva foi executado. A suíte 715/715 precede essa recuperação. Isso não envolve o banco operacional.

HTTP na imagem final: compra direta e envio para conferência, repetição idempotente da confirmação, detalhe privado, cache private/no-store, Referrer-Policy no-referrer e ausência de customerId passaram. Detalhe público por protocolo rejeitado com 403; rota administrativa sem sessão rejeitada com 401. O primeiro roteiro tentou reaproveitar uma sessão já enviada para outra compra e recebeu 409 como previsto; foi corrigido para iniciar uma sessão independente por jornada.

Navegador: personalização e entrada pela lista; compra direta de R$ 75,00; recarga e consulta de resultado; outra compra em segunda aba sem trocar o pedido original; entrega pela equipe sem total fechado; atendimento e cliente fictício revisado; orçamento emitido de R$ 90,00 (R$ 75,00 + R$ 15,00 de frete), publicação de duas parcelas de R$ 45,00, aceite explícito privado e persistência após recarga; pedido de cancelamento e conclusão pela equipe, refletidos no pedido original. Publicação com versão anterior após emissão rejeitou a gravação; após Atualizar checkout, a publicação passou. Nota interna demonstrativa ausente na página privada do cliente.

Limites de navegador: o controle de data aceitou valor visual pela automação, mas não atualizou o estado React do formulário legado; não foi certificado o preenchimento manual desse campo. A preparação do orçamento foi concluída via prepareRequestQuote, serviço existente, exclusivamente no banco descartável; emissão, publicação e aceite foram feitos pela interface. Kits, concorrência e arte têm cobertura automatizada, sem uma segunda jornada visual completa de kit. Não foram emulados tema claro ou movimento reduzido por falta de capacidade anunciada no navegador. O tema escuro disponível foi inspecionado. Não há alegação de certificação visual dessas modalidades.

Responsividade: larguras 320/390/1440 sem overflow horizontal (scrollWidth 305/375/1425). Controles principais medidos com 44 px; checkbox nativo mediu 13 px, com rótulo clicável. Navegação Tab alcançou o motivo de cancelamento com anel de foco de 3 px visível. Capturas completas inspecionadas em backups/validacao-c5-20261023/ (ignoradas pelo Git).

Invariantes após jornadas HTTP/visuais: quatro vendas demonstrativas, cinco parcelas, zero liquidações financeiras, zero reservas de estoque, zero ordens de produção e zero alocações de reserva produtiva. Estados dos cinco checkouts: três CONFIRMED, um REVIEW e um CLOSED. As vendas adicionais pertencem às repetições do roteiro com sessões novas; cada replay da mesma operação retornou o mesmo resultado.

C4 final: appb2t:c4-20261023 continua na porta 3000 e saudável. Foi observado contador de reinício 1; não há medição inicial que permita atribuir esse reinício ao build. Não houve troca manual de imagem, migração ou gravação de dados operacionais.

Evidências e ledger foram realocados do diretório temporário do plano para backups/validacao-c5-20261023/evidence, ignorado pelo Git. Arquivos de ambiente de teste permanecem privados nesse diretório, sem inclusão no commit. Base de integração preservada: codex/catalogo-c5-design (f0ff9f3); branch de implementação codex/catalogo-c5. Nenhum push, PR, merge ou publicação executado.
