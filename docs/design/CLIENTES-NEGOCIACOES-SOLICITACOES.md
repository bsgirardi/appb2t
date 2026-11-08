# Clientes, negociações e solicitações

08/11/2026 · base main 1.27.3, `0a73e718ef994e7bd7868def8c2ce9d1a094bcda` · branch `codex/clientes-negociacoes-solicitacoes`.

## Intenção e abordagem

Recorte incremental expressamente autorizado no handoff. Composição local sobre shadcn instalado; sem nova aprovação genérica. Skills brainstorming, frontend-design, shadcn e escrita de planos consultadas. Redesenho integral e migração global de componentes foram descartados pelo alcance; adotar receita delimitada preserva os contratos e a marca existentes. Fonte Roboto, tokens atuais de Aparência, texto à esquerda, contatos quebráveis e tabela com rolagem interna. Nenhum novo valor de cor, KPI, regra comercial ou consulta de domínio.

```text
filtros editáveis → critérios aplicados → identificação / situação → abrir contexto
cliente → documento → e-mail e telefone → editar
negociação → cliente / responsável → etapa / próxima ação → principal / pendências
solicitação → protocolo / contato → recebida / atendimento → vínculo com orçamento
```

## Inventário e plano

Consumidores: CustomerPanel/CustomerForm e `/clientes`; OpportunityPanel/Detail/Form/Decision/QuoteLink/Command e `/negociacoes`, `/negociacoes/[id]`; RequestPanel/Detail/QuoteForm e `/solicitacoes`, `/solicitacoes/[id]`. Formulários, decisões e comandos existentes serão mantidos; apenas apresentação/contexto dos painéis e detalhes muda. Sem dependência funcional das PRs #55/#56/#57 ou dos diffs financeiro e rentabilidade não integrados; origem anterior somente lida.

- [x] Testes: critérios aplicados versus rascunhos, ambos contatos, ausência de contato, vínculos principal/secundário, página vazia e retorno restrito à listagem.
- [x] Implementar resumo local, contexto dos cartões e detalhes, sem alterar handlers/payloads, rascunhos, permissões ou transições.
- [x] Validar regressões, tipos, lint, build e prévia sintética em ambos temas e 320/390/768/1440; registrar limitações separadamente.
- [x] Preparar incremento PATCH único e notas, conferir rodapés/Atualizações; entregar diff sem merge/publicação. Main será reconferida no fechamento abaixo.

Focos de revisão: critérios padrão de negociações abertas precisam aparecer; rascunho não descreve resultado aplicado; principal ausente não equivale a nenhum orçamento; solicitação preparada não equivale a proposta enviada; ausência de contatos não equivale a cliente desconhecido; retorno deve rejeitar destinos externos e outras rotas.

## Evidências e entrega

### Implementação

- `RelationshipCriteria` tem apenas os três painéis como consumidores; recebe consulta aplicada, nunca o rascunho. A etapa padrão Abertas é explícita nas negociações. FilterPanel permanece montado e inalterado; filtros opcionais de clientes/solicitações dispensam guia de obrigatoriedade. Solicitações passam a restaurar os controles quando os parâmetros recebidos mudam.
- Clientes: documento e ambos contatos identificados, sem confundir ausência de contato com cliente desconhecido. Tabela nomeada, cabeçalhos com scope e quebra de nomes/contatos longos. CustomerForm e ContextEditor, descarte, validação, salvamento e deduplicação não foram alterados.
- A inspeção do vazio de clientes identificou cabeçalhos sem linhas criando rolagem desnecessária. Tabela agora só aparece com resultados; Empty continua disponível sem essa rolagem. Reteste dirigido após esse ajuste final, sem alteração de domínio.
- Negociações: cliente e responsável identificados separadamente, próxima ação, data/atraso segundo função de domínio vigente, pendências e motivo de perda. Principal distingue documento indisponível, principal não definido e nenhum vínculo. Estado do orçamento vem do DTO existente; não se infere espera de retorno pela etapa Proposta. Detalhe conserva decisão comercial, alertas de retorno configuráveis e comandos existentes. Não foi alterado orçamento principal/versões, conversão, cálculo ou memória.
- Solicitações: protocolo, estado textual, data de recebimento, canal preferido, responsável e orçamento vinculado. Orçamento preparado não é descrito como proposta enviada nem decisão registrada. Detalhe prioriza protocolo/estado/responsável e contato recebido antes dos blocos de arte; atendimento, notas, preparação, consentimentos e handlers intactos. Nova convenção loading usa Skeleton; erros continuam no boundary privado e Notice atuais.
- Links dos cartões levam a consulta/página no parâmetro returnTo. Detalhes aceitam somente a rota exata correspondente ou sua query; outros caminhos, fragmentos, barras invertidas, controles e destinos externos voltam à listagem padrão. Paginação usa critérios aplicados; solicitações usa pageSize recebido no limite de próxima página, em vez de literal 20.
- CSS delimitado a `.admin-ui .relationship-reading`, só nos cinco consumidores deste recorte. Nenhum token, variante, componente global ou seletor legado foi alterado. Cores de Aparência, claro/escuro e fontes preservados. Sem consultas novas, migrations, dados reais, envio de mensagens, novas permissões ou ações de domínio.

### Verificação automatizada e revisão

- Três testes iniciais falharam por contatos incompletos, ausência de critérios e recuperação de página; passaram após a implementação. Seis testes finais novos cobrem ambos contatos/ausentes, rascunho/recolhimento, restauração dos controles, etapa padrão, principal/versões, solicitação preparada versus envio, recuperação de página e retorno restrito.
- Suíte unitária completa: **998 testes aprovados em 233 arquivos**, incluindo clientes, solicitações, negociações, comandos/retry/conflito, decisões, contratos compartilhados e versão. Avisos jsdom de navegação entre documentos não implementada, sem falhas. Nenhuma suíte com banco executada.
- Tipos, lint e build de produção aprovados. Build passou sem ambiente/credencial copiada ou acesso a banco operacional. APP_VERSION continua derivado do package.json; testes app-version verificam login, rodapé administrativo e Atualizações para ADMIN/OPERATOR.
- Revisão independente encontrou wrapper p inválido ao redor de Badge, que localmente renderiza div. Corrigido e reconferido pelo revisor: sem achados acionáveis restantes. Nenhum arquivo de origem de outra worktree foi editado.
- MCP oficial shadcn e CLI 4.23.0 confirmados. Docs Badge/Empty/Card e checklist consultados; guias Next instalados para Link, fronteira cliente e searchParams de páginas. Nenhuma instalação ou atualização de dependência: runtime previamente preparado e compatível com lock foi copiado localmente. Tentativa inicial com junction esbarrou na raiz hermética do Turbopack; resolvida com cópia local, sem mudar next.config. Prisma gerado sem consulta ao banco. Não foi copiado diff, ambiente, segredo ou backup das origens.

### Prévia e limites

Prévia sintética `tests/relationship-reading-preview.html`, pelo servidor existente `node tests/catalog-admin-preview-server.mjs`, porta 4321. Views customers/requests/opportunities/detail/request-detail, temas light/dark, flags empty/outside. Componentes reais, adapters locais de navegação e dados sintéticos; fetch bloqueado. A navegação do shell usa o adapter histórico de Produtos; não representa breadcrumb homologado dessas rotas no Next.

Matriz DOM dos três painéis e detalhe de negociação: quatro views × dois temas × 320/390/768/1440 = 32 verificações. Documento não excedeu viewport; clientes tem tabela 640 px em contêineres de 239/309/439 px, e 1126 px no desktop. Capturas conferidas: clientes desktop claro e celular escuro; negociações desktop escuro; solicitações celular claro; detalhe de solicitação celular escuro. Dados incluem nomes e contato longos, contatos ausentes, ausência de responsável, principal enviado e negociação perdida.

Detalhe de solicitação: mais oito verificações DOM nas mesmas larguras/temas, sem exceder viewport (40 no conjunto). Vazios filtrados de clientes/solicitações e página fora do resultado de negociações conferidos em 390 escuro. Erro de rede e processamento cobertos pelos testes existentes; não foram homologados visualmente no navegador.

A ferramenta de navegador repetiu a limitação de interação: click e Enter no disparador de filtros não alteraram aria-expanded=false; Tab não avançou como esperado. Não foram homologados navegação sequencial completa, abertura visual/interação de editores, retorno de foco, arraste/rolagem horizontal efetivados ou persistência real. Testes jsdom cobrem expansão, rascunhos, conflitos, reenvio e aplicação de filtros; isso não substitui homologação manual. Não há alegação de teste de leitor de tela, zoom, tema automático, envio de comunicação ou gravação real.

### Estado da entrega

PATCH único candidato 1.27.4 em ambos manifestos e histórico em português, data 08/11/2026. Não representa versão instalada e deve ser reconciliado com main antes de futura integração. Implementação entregue inicialmente como diff local; criação de commit, push e PR autorizada em seguida pelo usuário. Consultar o GitHub para o estado atual da revisão. Sem merge, Release ou implantação. PRs #55/#56/#57 consultadas: abertas; não incorporadas.

Main reconferida por fetch após implementação e validação: mesmo SHA completo e versão 1.27.3. Manifestos da branch, APP_VERSION e histórico consistentes na candidata 1.27.4.

Fechamento após ajuste do vazio: tipos, lint e build novamente aprovados; rodada dirigida de 13 testes aprovada, seguida por seis testes novos novamente aprovados com a asserção de vazio sem tabela. Revisor reconferiu o último delta sem achados. Captura sintética de negociações salva fora do repositório na pasta de visualizações deste chat (`negociacoes-previa.png`).
