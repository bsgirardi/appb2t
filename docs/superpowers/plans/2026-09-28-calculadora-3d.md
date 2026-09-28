# B2T Calculadora — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a calculadora interna de impressão 3D com configurações compartilhadas, acesso por perfil e execução em Docker/PostgreSQL.

**Architecture:** Uma aplicação Next.js App Router atende páginas e operações autenticadas; PostgreSQL persiste usuários, sessões e cadastros via Prisma. Um motor decimal puro é compartilhado entre simulação no navegador e futuros usos no servidor. Os limites de autorização ficam nas operações de servidor, não apenas na navegação.

**Tech Stack:** TypeScript, Next.js, React, PostgreSQL, Prisma, decimal.js, Zod, Vitest, Docker Compose. Usar versões estáveis compatíveis com Node 22.20.0; conferir engines e documentação na instalação e fixar resoluções no package-lock.json. CSS próprio responsivo, sem serviço externo de fontes.

**Spec:** `docs/superpowers/specs/2026-09-28-calculadora-3d-design.md` (aprovada).

## Global Constraints

- Supabase não será utilizado.
- Todos os dados pertencem a uma única equipe. Não há isolamento por empresa nesta versão.
- Interface em português brasileiro, valores em reais e layout responsivo.
- Operadores não alteram parâmetros globais nem substituem preços cadastrados durante uma simulação.
- Usar aritmética decimal e preservar precisão intermediária.
- Minutos ficam entre 0 e 59.
- Percentuais de manutenção, falhas e acabamento ficam entre 0 e 100; acréscimo pode superar 100%.
- O banco permanece na rede interna do Compose, sem porta pública por padrão.
- O catálogo, cadastro de produtos, fotos, publicação de preços, histórico de orçamentos e integrações de venda serão etapas futuras.

## Review Focus

1. Vírgula decimal, campo vazio e notação não finita: interpretar entradas brasileiras válidas sem transformar ausência em zero (tarefas 1 e 5).
2. Dois administradores removendo privilégios simultaneamente: preservar pelo menos um administrador ativo sob concorrência real (tarefa 3).
3. Duas abas editando a mesma configuração: rejeitar a versão antiga e preservar o rascunho local (tarefas 4 e 6).
4. Sessão de usuário desativado ou com senha redefinida: invalidar imediatamente em todos os dispositivos (tarefas 2 e 3).
5. Troca de tecnologia ou atualização que inativa a seleção atual: limpar referências incompatíveis e não exibir resultado antigo como atual (tarefa 5).

## Ambiente e sequência

Em 28/09/2026: pasta contém apenas documentação, não é repositório Git; Node 22.20.0, npm 11.5.2 e Git disponíveis. Docker CLI 29.5.3 instalado, mas engine Linux do Docker Desktop indisponível. Isto não impede escrever código nem executar testes unitários; integração e build Docker exigem engine funcional. Tentar iniciar Docker Desktop durante a execução; se continuar indisponível, registrar a limitação sem declarar testes de integração aprovados.

Executar tarefas 1 → 7. Inicializar Git nesta pasta antes de implementar, preservar os documentos existentes e fazer commits locais por tarefa. Não criar worktree antes de existir repositório/base; o diretório dedicado e vazio será o checkout inicial. Não publicar nem enviar commits a remoto nesta etapa.

## Estrutura de arquivos

| Caminhos | Responsabilidade |
| --- | --- |
| `src/domain/calculation/{types,validation,calculate}.ts` | Contratos, entradas decimais e fórmulas |
| `src/lib/{db,env,errors}.ts` | Banco, ambiente e erros tipados |
| `src/server/auth/{password,session,rate-limit,service,guards}.ts` | Autenticação e autorização |
| `src/server/{users,catalog-inputs,settings}.ts` | Operações autorizadas, transações e versões |
| `src/app/api/**/route.ts` | Adaptadores HTTP, origem e respostas |
| `src/app/(private)/**`, `src/app/login/page.tsx` | Páginas autenticadas e login |
| `src/components/{ui,shell,calculator,settings}/` | Formulários e apresentação |
| `prisma/schema.prisma`, `prisma/migrations/` | Modelo e evolução do banco |
| `tests/{unit,integration}/`, `scripts/` | Verificação e administração |
| `Dockerfile`, `compose.yaml`, `compose.test.yaml`, `.env.example`, `README.md` | Build e operação |

## Contratos compartilhados

Em `src/domain/calculation/types.ts`: `Technology = 'FDM' | 'RESIN'`; `DecimalText = string` com ponto decimal canônico. `PrinterValues` tem `acquisitionCost, amortizationMonths, daysPerMonth, hoursPerDay, watts`; os inteiros são numbers, os demais DecimalText. `SettingsValues` tem `energyRate, maintenancePercent, failurePercent, finishingPercent, fixation, markupPercent`, todos DecimalText. `CalculationInput` tem `technology, consumption, hours, minutes, materialPrice, printer, settings`; hours/minutes são inteiros. `CalculationResult` contém DecimalText para `material, energy, hourlyMachine, machine, maintenance, subtotal, failure, finishing, fixation, total, profit, sale`.

Em `src/lib/errors.ts`: `AppError(code, message, fields?)`, com códigos `VALIDATION`, `UNAUTHENTICATED`, `FORBIDDEN`, `CONFLICT`, `RATE_LIMIT`, `NOT_FOUND`. Respostas HTTP mapeiam respectivamente 422, 401, 403, 409, 429 e 404; erros inesperados retornam 500 sem detalhes internos. Formato JSON `{data:T}` ou `{error:{code,message,fields?}}`.

Em `src/server/auth/session.ts`: `Actor = {id:string; name:string; email:string; role:'ADMIN'|'OPERATOR'}`. Rotas extraem a sessão de cookie no servidor; nunca recebem Actor do JSON. Operações de domínio autenticadas recebem esse Actor já verificado. Todos os DTOs retornam decimais como strings e datas ISO, excluindo hashes e tokens.

### Tarefa 1: Motor de cálculo e base testável

**Arquivos:** criar package.json, package-lock.json, tsconfig.json, vitest.config.ts, eslint.config.mjs, .gitignore, `src/domain/calculation/{types,validation,calculate}.ts`, `tests/unit/calculation.test.ts`, `tests/unit/numeric-input.test.ts`.

**Interfaces:** produzir `parseDecimalInput(raw:string):DecimalText`, `validateCalculation(input:unknown):CalculationInput`, `calculate(input:CalculationInput):CalculationResult` e `formatBRL(value:DecimalText):string`. Decimal.js com precisão 40 e arredondamento HALF_UP apenas na exibição. Valores persistíveis usam Decimal(18,6); limites: 0–999999999999.999999, consumo até 1000000, horas inteiras até 100000, meses até 1200; preservar limites mais restritos da especificação.

- [ ] Inicializar projeto/configurações e scripts `test`, `test:unit`, `test:integration`, `typecheck`, `lint`, `build`, `dev`, `start`, `db:migrate`, `admin:create`; instalar dependências e preparar runner, sem implementar fórmulas.
- [ ] Escrever `acceptance_example` com `expect(result.total).toBe('16.064')`, `expect(result.sale).toBe('48.192')` e `expect(formatBRL(result.sale)).toContain('48,19')`, usando exatamente o exemplo aprovado.
- [ ] Escrever casos FDM/resina equivalentes, taxas zeradas, markup 200%, meses zero, dias 32, horas/dia 25, minutos 60, negativos e consumo/tempo vazios. `parseDecimalInput('1,25') === '1.25'`; `''`, `Infinity`, `NaN` e separadores ambíguos devem falhar.
- [ ] Executar `npm run test:unit`; confirmar falha por motor ainda ausente.
- [ ] Implementar contratos, validação e as onze fórmulas da especificação sem arredondar etapas intermediárias.
- [ ] Executar `npm run test:unit` e `npm run typecheck`; esperar aprovação. Commit `feat: add validated decimal pricing engine`.

### Tarefa 2: Banco e autenticação

**Arquivos:** criar `prisma/schema.prisma`, `prisma/migrations/202609280001_init/migration.sql`, `prisma.config.ts` quando exigido pela versão, `src/lib/{db,env,errors}.ts`, `src/server/auth/{password,session,rate-limit,service,guards}.ts`, `src/app/api/auth/{login,logout}/route.ts`, `tests/integration/auth.test.ts`, `tests/integration/setup.ts`, `compose.test.yaml`.

**Interfaces:** `hashPassword(password:string):Promise<string>`, `verifyPassword(password:string,hash:string):Promise<boolean>`, `login(email:string,password:string):Promise<{token:string;actor:Actor}>`, `getSession(token:string):Promise<Actor|null>`, `logout(token:string):Promise<void>`, `requireActor():Promise<Actor>`, `requireAdmin():Promise<Actor>`.

- [ ] Escrever testes: login correto cria sessão sem token em texto no banco; incorreto e e-mail inexistente geram a mesma mensagem; expirado/inativo retorna null; logout revoga; sexta tentativa em 15 minutos retorna RATE_LIMIT após cinco falhas.
- [ ] Preparar banco de testes dedicado `b2t_test` em Compose separado com projeto/volume próprios, acesso localhost para testes; recusar limpeza se DATABASE_URL não identificar banco de testes. Rodar `npm run test:integration -- auth`; confirmar falhas de implementação, sem tratar erro de conexão como evidência TDD.
- [ ] Modelar User, Session, Material, Printer, CalculationSettings e LoginAttempt. E-mail normalizado único, role/technology enums, decimais (18,6), versões inteiras nos registros editáveis, timestamps, índices e chave única fixa para configurações. LoginAttempt persiste janelas e contadores para limitar tentativas entre instâncias sem depender de memória.
- [ ] Implementar senha com scrypt do Node, salt aleatório, comparação em tempo constante, limites de 12–128 caracteres e sessão de 7 dias com token aleatório de 32 bytes/hash SHA-256. Atualizar contador de tentativas atomicamente por hash de e-mail normalizado, limpar janelas antigas. Verificar senha contra hash fictício quando usuário não existir.
- [ ] Implementar cookies HttpOnly, SameSite=Lax, Path=/, Secure conforme APP_URL HTTPS; validar APP_URL e Origin em requisições mutáveis. Recusar produção externa em HTTP; permitir HTTP localhost para teste. Respostas autenticadas e login sem cache, sem log de credenciais; limitar corpo JSON.
- [ ] Rodar migrações no banco dedicado e testes auth; esperar aprovação. Commit `feat: add postgres sessions and protected authentication`.

### Tarefa 3: Administração de usuários

**Arquivos:** criar `src/server/users.ts`, `src/app/api/users/route.ts`, `src/app/api/users/[id]/route.ts`, `src/app/api/users/[id]/password/route.ts`, `src/app/api/account/password/route.ts`, `scripts/create-admin.ts`, `tests/integration/users.test.ts`.

**Interfaces:** `createUser(actor:Actor,input:CreateUserInput):Promise<UserDTO>`, `updateUser(actor:Actor,id:string,input:UpdateUserInput):Promise<UserDTO>`, `resetPassword(actor:Actor,id:string,password:string):Promise<void>`, `changeOwnPassword(actor:Actor,current:string,next:string):Promise<void>`. Inputs Zod: create recebe nome/e-mail/perfil/senha; update recebe nome/e-mail/perfil/ativo/expectedVersion. UserDTO omite hash.

- [ ] Escrever testes para operador recusado em todas as mutações, e-mail equivalente com espaços/maiúsculas duplicado, senha inválida, versão antiga, último admin e revogação em troca de senha/desativação. Duas tentativas concorrentes de rebaixar dois admins devem deixar ao menos um ativo.
- [ ] Rodar `npm run test:integration -- users`; esperar falha funcional.
- [ ] Implementar serviços e adaptadores HTTP com verificação de ADMIN. Serializar alterações de privilégio/ativação com advisory lock transacional PostgreSQL antes de contar administradores; usar versão na atualização. Redefinição, mudança de senha própria e desativação removem sessões em transação. Exigir senha atual na troca própria; após troca, redirecionar para novo login.
- [ ] Implementar `npm run admin:create` com prompt de senha oculto e e-mail/nome; recusar sobrescrever conta existente; bloquear bootstrap se já houver administrador. Não passar senha por argumento de linha de comando nem imprimir senha/hash.
- [ ] Executar testes usuários e auth; esperar aprovação. Commit `feat: add administrator-managed team accounts`.

### Tarefa 4: Materiais, impressoras e parâmetros

**Arquivos:** criar `src/server/{catalog-inputs,settings}.ts`, `src/app/api/materials/route.ts`, `src/app/api/materials/[id]/route.ts`, `src/app/api/printers/route.ts`, `src/app/api/printers/[id]/route.ts`, `src/app/api/settings/route.ts`, `src/app/api/calculator-data/route.ts`, `tests/integration/settings.test.ts`.

**Interfaces:** `getCalculatorData(actor:Actor):Promise<CalculatorData>`; `saveMaterial(actor:Actor,input:MaterialWrite):Promise<MaterialDTO>`; `savePrinter(actor:Actor,input:PrinterWrite):Promise<PrinterDTO>`; `saveSettings(actor:Actor,input:SettingsValues & {expectedVersion:number}):Promise<SettingsDTO>`. Writes contêm id opcional, expectedVersion em edição, name/technology/active e valores do contrato; DTOs acrescentam id/version. CalculatorData contém materiais/impressoras ativos, settings ou null e loadedAt ISO.

- [ ] Escrever testes que gravam e leem via sessões diferentes, recusam operador, validam limites numéricos e comprovam que duas atualizações com a mesma versão produzem um sucesso e um CONFLICT. Desativação retira item de CalculatorData.
- [ ] Rodar `npm run test:integration -- settings`; esperar falhas funcionais.
- [ ] Implementar serviços, schemas e rotas GET/POST/PATCH. Atualização usa id+version com incremento atômico. Nenhum delete físico nesta versão. Configurações iniciais ausentes exigem preenchimento explícito; não inventar tarifas de produção.
- [ ] Rejeitar campos desconhecidos e não aceitar propriedades de autorização do corpo. Não armazenar cache global por usuário. Mensagem de conflito: “Este registro foi alterado por outra pessoa. Atualize os dados antes de salvar novamente.”
- [ ] Executar testes settings e typecheck; esperar aprovação. Commit `feat: persist shared pricing configuration with conflict checks`.

### Tarefa 5: Login, navegação e calculadora responsiva

**Arquivos:** criar `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/login/page.tsx`, `src/app/(private)/layout.tsx`, `src/app/(private)/calculadora/page.tsx`, `src/app/(private)/conta/page.tsx`, `src/components/shell/app-shell.tsx`, `src/components/ui/{field,button,notice}.tsx`, `src/components/calculator/{calculator-form,cost-breakdown}.tsx`, `tests/unit/calculator-ui.test.tsx`.

**Interfaces:** `CalculatorForm({data:CalculatorData,role:Actor['role']})`; consome calculate, formatBRL e GET /api/calculator-data. Componentes compartilhados têm labels associados, erros por campo e foco visível. Usar React Testing Library/jsdom para testes de comportamento.

- [ ] Escrever testes: campos vazios escondem resultado; fixture aprovada exibe R$ 48,19; mudar FDM para RESIN limpa escolhas incompatíveis; atualizar dados que desativam material elimina resultado; erro de atualização preserva a simulação identificada com horário anterior.
- [ ] Executar `npm run test:unit -- calculator-ui`; esperar falhas.
- [ ] Implementar visual com navegação lateral em desktop e compacta em celular, fundo neutro, cartões legíveis, cor de destaque azul/verde e resultado em destaque. Área de dados da peça à esquerda e custos à direita, empilhados em tela pequena. Sem copiar marca ou imagens de terceiros.
- [ ] Implementar login, logout, guard no layout e na leitura de dados, página de conta com troca de senha. Todos os fetches de dados privados usam no-store. Ausência de cadastros tem orientação por perfil; botão Atualizar parâmetros recarrega os dados sem substituir silenciosamente um formulário válido.
- [ ] Executar testes de UI e verificar teclado, labels, BRL, mensagens de arredondamento e estados loading/error/empty. Commit `feat: add responsive authenticated pricing calculator`.

### Tarefa 6: Painel administrativo

**Arquivos:** criar `src/app/(private)/configuracoes/{layout,page}.tsx`, `src/components/settings/{material-editor,printer-editor,cost-editor,user-editor,settings-panel}.tsx`, `tests/unit/settings-ui.test.tsx`. Criar loading.tsx e error.tsx no grupo privado para estados de carregamento/falha.

**Interfaces:** `SettingsPanel({initialData})` carrega DTOs das tarefas 3 e 4; cada editor conserva `expectedVersion` recebido. Dados completos de cadastros, inclusive inativos, vêm de GET administrativo das respectivas rotas; filtros da calculadora continuam separados.

- [ ] Escrever testes de formulário: cancelar descarta rascunho; salvar envia versão e valores normalizados; 409 mantém valores digitados e oferece recarregar explicitamente; falha de rede permite tentar novamente; redefinição de senha nunca reaparece na lista.
- [ ] Executar `npm run test:unit -- settings-ui`; esperar falhas.
- [ ] Implementar seções materiais, impressoras, custos/taxas e usuários, criando e editando sem sair da área. Mostrar custo/hora calculado na edição de impressora. Salvar explícito, botão desativado enquanto pendente, erros em português, confirmação após resposta válida.
- [ ] Proteger layout de configurações e chamadas de servidor com ADMIN; operador acessando URL recebe recusa sem dados administrativos. Distinguir inativação de exclusão; permitir reativação.
- [ ] Executar testes UI, integração de permissões e revisão no navegador em 390 px e desktop: login admin, cadastro, salvar, simular; login operador em outra sessão, mesmos parâmetros, alteração administrativa negada. Commit `feat: add separate administrative settings panel`.

### Tarefa 7: Docker, operação e verificação final

**Arquivos:** criar `Dockerfile`, `.dockerignore`, `compose.yaml`, `.env.example`, `README.md`, `src/app/api/health/route.ts`; finalizar `next.config.ts` com output standalone e scripts npm. `.env` e backups ignorados no Git.

**Interfaces:** `GET /api/health` retorna 200 `{status:'ok'}` se banco responde ou 503 `{status:'unavailable'}`, sem expor dados. Compose usa `db`, `migrate`, `app` e perfil `tools` para `admin`; serviço admin executa o comando da tarefa 3 com terminal interativo.

- [ ] Adicionar teste de health com banco indisponível → 503 sem detalhes internos; rodar e observar falha antes de implementar a rota.
- [ ] Criar Dockerfile em estágios deps/build/runtime/tools, lockfile obrigatório com npm ci, cliente Prisma gerado no build, runtime não root e ferramentas de migração/admin no estágio tools. Build não consulta banco real nem exige segredos; conexão é aberta somente no runtime.
- [ ] Configurar PostgreSQL com volume nomeado, pg_isready, senha exigida por variável e rede interna. App depende de db saudável e migrate concluído com sucesso. Pin de versões de imagens, sem latest. Testar migração inicial e reexecução idempotente.
- [ ] Documentar .env, build/subida, bootstrap interativo, acesso local, domínio/HTTPS para dispositivos remotos, backup pg_dump e restauração em banco separado. Não alterar infraestrutura externa. Nunca usar down -v sobre os dados reais.
- [ ] Executar `npm run test:unit`, `npm run test:integration`, `npm run typecheck`, `npm run lint`, `npm run build`; resultados reais devem ser registrados. Sem engine, reportar exatamente quais verificações não puderam rodar.
- [ ] Com engine disponível, executar `docker compose config --quiet`, `docker compose build`, `docker compose up -d`; conferir saúde, login e cálculo. Reiniciar containers sem remover volumes e verificar persistência. Restaurar backup em banco de teste e conferir cadastros.
- [ ] Revisar diff final contra especificação e permissões, corrigir falhas e repetir só verificações afetadas. Commit `build: ship docker deployment and operating documentation`.

## Referências técnicas

- Next.js deployment: https://nextjs.org/docs/app/getting-started/deploying
- Docker Compose startup order/health dependencies: https://docs.docker.com/compose/how-tos/startup-order/
- Conferir a documentação da versão instalada do Prisma durante a tarefa 2, incluindo adapter/config exigidos pela versão, sem reaproveitar configuração de major incompatível.

## Entrega

Código, migrações, testes, documentação operacional e configuração Docker no diretório do projeto. Informar como executar, verificações concluídas e limitações reais. Catálogo e publicação externa continuam fora deste escopo. Execução recomendada: nesta conversa pelo agente principal, com revisão final, porque as sete tarefas compartilham contratos sequenciais; o usuário pode escolher execução com subagentes.
