# Verificação da primeira versão

Data: 28/09/2026.

## Resultados

- 49 testes aprovados: 37 unitários/interface e 12 de integração com PostgreSQL real.
- TypeScript e ESLint sem erros ou avisos.
- Build de produção Next.js concluído, incluindo cliente Prisma e saída standalone.
- Servidor standalone executado localmente; a verificação HTTP de autenticação e permissões também passou nessa versão de produção.
- Auditoria npm sem vulnerabilidades conhecidas nas versões instaladas.
- `docker compose config --quiet` aprovado.
- Navegador: login de administrador, exemplo de venda de R$ 48,19, edição e salvamento de material com vírgula decimal, painel de custos, layout de celular e logout pela conta.
- Operador: acesso direto à página administrativa mostra acesso restrito; o menu não mostra configurações.
- Verificação HTTP adicional: oito leituras/mutações administrativas recusadas ao operador (403), dados da calculadora permitidos com sessão, acesso anônimo recusado (401), origem externa recusada, cookie HttpOnly/SameSite e revogação no logout.
- Revisão independente encontrou dois problemas corrigidos com testes que falharam antes da correção: tempo composto apenas por espaços e mensagens de validação padrão em inglês. Não restaram achados adiados.

## Limitações de verificação

O Docker Desktop local não conseguiu iniciar o engine Linux. Foi possível validar a configuração Compose, mas não executar build das imagens, healthchecks dos containers ou restauração de backup via Docker. Os testes de banco usaram PostgreSQL 18.4 temporário e isolado; a implantação especifica PostgreSQL 17. A documentação de backup foi revisada, mas a restauração ainda deve ser exercitada no servidor de destino.

O projeto está preparado para instalação. Domínio, HTTPS e publicação externa não foram configurados. As contas e dados usados na prévia são fictícios, em banco separado; não são criados na instalação de produção.

## Decisões de execução

1. Usar o diretório inicial e a branch `feat/calculadora`, conforme plano aprovado, pois não havia código existente para isolar.
2. Registrar progresso diretamente em arquivos compatíveis com PowerShell, sem depender dos auxiliares de shell da habilidade de execução.
3. Manter Prisma 6 com API estável e corrigir a dependência transitiva `deepmerge-ts` via override. Usar Vitest 4.1.11 com Vite 7, evitando o binding nativo do Rolldown que não carregou neste Windows. O lockfile e a auditoria registram o resultado; mudanças futuras devem passar pela suíte.
4. Testar com PostgreSQL temporário diante da falha do Docker, sem substituir o banco nem a forma de implantação do produto. O risco residual é a execução das imagens não ter sido confirmada neste computador.
5. Corrigir a tradução das mensagens de validação junto com o problema de espaços no tempo, porque o idioma português faz parte dos requisitos aprovados.

As decisões não alteram as fórmulas nem o escopo aprovado. Commits permanecem locais; nenhum remoto ou serviço externo foi publicado.

## Portfólio e produtos — 28/09/2026

Implementados `/portfolio` público e `/produtos` protegido, com fotos, descrição, preço, condições de pagamento, inativação/reativação e edição de todos os parâmetros da calculadora por produto. A migração `202609280002_products` foi aplicada aos bancos locais isolados `b2t_test` e `b2t_preview`; não foi aplicada a uma instalação de produção.

Verificações realizadas nesta etapa:

- Suíte completa: **84 testes aprovados em 18 arquivos**, incluindo PostgreSQL real.
- Testes de domínio, imagem e formulário criados antes da implementação dos respectivos módulos; falhas iniciais por módulo ausente e aprovação posterior observadas.
- Fluxo integrado usando os Route Handlers reais: upload multipart, normalização WebP, cálculo no servidor, edição preservando foto, inativação, foto privada de produto inativo, permissão de operador e recusa de sessão de usuário desativado. Somente o contexto de cookies do Next é substituído nesse teste; sessão, banco e serviços são reais.
- Projeção pública sem parâmetros internos; snapshot preservado após alterações globais e referências inativas; conflito concorrente preservando texto e foto atomicamente.
- Interface automatizada: edição de custos e prévia de preço, atualização de configurações apenas no rascunho, upload com prévia, preservação de dados em erros e inativação/reativação com versão atual.
- TypeScript, ESLint e `git diff --check` aprovados.
- Build de produção Next.js aprovado com as novas rotas dinâmicas.
- Revisão independente do código não encontrou problemas materiais. A navegação móvel foi ajustada para permitir quebra de linha com os novos itens.

Limitações desta etapa:

- A inicialização do servidor de prévia foi recusada pela revisão automática da ferramenta de execução, com a mensagem `blocked by policy` e sem justificativa adicional. A inspeção visual no navegador em 1440px/390px e o fluxo manual completo não foram executados. Os testes de componentes não substituem essa inspeção visual.
- Docker Desktop retornou erro 500 ao consultar o engine Linux. Build e execução dos contêineres não foram confirmados. Os testes usam PostgreSQL 18.4 local, enquanto o Compose de implantação usa PostgreSQL 17.
- Persistência foi exercitada em transações reais; reinício completo do banco/aplicação e restauração de backup não foram repetidos nesta etapa.

Decisões de execução: continuar no checkout e branch existentes `feat/calculadora`, mantendo a integração local; registrar progresso com ferramentas nativas do Windows em vez dos auxiliares Bash; reutilizar PostgreSQL de teste isolado diante da indisponibilidade do Docker. O custo dessas escolhas é não haver isolamento adicional de checkout e permanecer pendente a verificação específica dos contêineres. Não houve push, merge ou publicação externa.

## Catálogo, coleções e aparência — 29/09/2026

- Preço final informado separadamente da sugestão, galeria de 1–10 fotos, carrossel acessível, coleções e personalização administrativa implementados.
- Suíte completa: 106 testes aprovados em 27 arquivos, com PostgreSQL real isolado; TypeScript e ESLint aprovados.
- Migração completa em banco descartável da versão anterior preservou preço 75,15, snapshot e bytes da foto. Migração de galeria também testada em tabela temporária.
- Docker Linux voltou a funcionar: imagens de produção construídas, migrações aplicadas e aplicação saudável em projeto de validação separado, acessível somente por loopback.
- Navegador: produto criado com dez fotos, troca da capa, reabertura com todas as imagens, alteração de custos mantendo preço final 75,00, criação de coleção e troca do nome da empresa. Carrossel público navegável, filtro e imagens carregados.
- HTTP de produção: visitante acessa portfólio e fotos; API de produtos exige sessão; operador acessa produtos/coleções e não altera aparência. Reinício do banco e da aplicação preservou fotos, preço, coleções e marca.
- Visual: rótulos de custos passaram de 10px para 14px. Variantes clara/escura renderizadas em fixture isolada do formulário real, em 1440/390px; sem overflow horizontal. Catálogo real verificado em 390px. O navegador disponível não oferece emulação de preferência de cor; a troca do tema do sistema durante a sessão não foi exercitada. A fixture seleciona a regra CSS de cada tema, sem mudar preferências do computador.
- Revisão independente tentada, mas o agente não iniciou por falta de créditos do ambiente. Foi feita revisão local pelo autor, que é menos independente. Ela identificou URL de logo inalterada após substituição; corrigida com chave de imagem renovada, teste inicialmente falhando e suíte 106/106 após a correção. Não há parecer independente desta entrega.
- Decisões: manter checkout/branch aprovados; usar cabeçalhos `Task` para compatibilidade dos auxiliares de execução; prosseguir com revisão local diante da indisponibilidade do revisor. Custos residuais: sem isolamento adicional de checkout e possibilidade de pontos cegos do autor. Metadados e identidade são carregados em execução, permitindo build Docker sem banco conectado.

Esta validação atualiza as limitações antigas de Docker e início da prévia descritas acima. Não houve publicação externa, push ou merge. Vendas e financeiro pertencem às próximas entregas aprovadas.

## Clientes, orçamentos e vendas — 30/09/2026

- Implementados clientes privados, orçamentos com emissão/aprovação/reabertura, snapshots comerciais e arquivo de logo, impressão privada, vendas diretas/conversão, parcelas, estados operacionais e cancelamento.
- Suíte após correção de revisão: 132 testes aprovados em 40 arquivos, com PostgreSQL real. TypeScript, lint, build local e build Docker executados; imagens de validação contêm a entrega comercial. O ajuste final do parcelamento é coberto pelo teste de regressão.
- Concorrência: mesma conversão repetida cria uma venda e seus recebíveis uma única vez. Falha de constraint durante a gravação desfaz venda, parcelas, operação idempotente e mudança do orçamento. Confirmação não registra pagamento.
- Navegador: cliente fictício → orçamento com preço negociado R$ 100 → emissão → aprovação → entrada R$ 20 + duas parcelas R$ 40 → venda → produção → pronta → entregue. Resumo manteve recebido R$ 0 e pendente R$ 100.
- HTTP de produção com operador confirmou acesso comercial, recusa de visitante e impressão sem notas privadas do cliente/documento. Reinício do banco e aplicação preservou snapshots, eventos, parcelas, estado entregue e vínculo com orçamento convertido.
- Visual: aplicativo real no tema escuro, tela móvel 390px sem overflow horizontal; impressão com fundo claro e cabeçalhos legíveis. Formulários reais renderizados em fixture nos temas claro/escuro, incluindo 390px. Alternância do tema do sistema e diálogo nativo de impressão/PDF não foram automatizados. Capturas preservadas no diretório de evidências desta entrega.
- Revisão independente comercial concluída: nenhuma falha crítica; um achado importante no parcelamento com entrada em 31/01 foi reproduzido por teste falhando e corrigido. Vencimentos agora mantêm 28/02, 31/03 e 30/04. Observação menor adiada: os horários do histórico comercial seguem o fuso do navegador; datas civis e validações de validade usam São Paulo.
- Escopo financeiro nesta etapa: recebíveis persistentes e resumo com recebido zero. Baixas, contas e caixa pertencem à entrega financeira seguinte; não há integração bancária/fiscal.
