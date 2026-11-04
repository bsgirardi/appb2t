# Painel administrativo integrado — 1.17.0

04/11/2026. Base publicada no Git: main 1.16.0, commit 307220d. Publicação autorizada pelo usuário exclusivamente no Docker local em localhost:3000.

## Integração

Incorporados com seus commits originais: etapa 1 (355e2a6, navegação/estrutura), etapa 2 (38dd157, dashboard/Clientes/editor) e etapa 3 (49e7553, decisões comerciais). A etapa 4 permanece intacta. Conflitos restritos a manifestos e histórico, resolvidos mantendo a release 1.16.0 já integrada e reunindo todas as notas das branches não publicadas em uma única 1.17.0. Não há releases artificiais 1.15.1 ou 1.16.0 duplicadas.

O menu organiza Comercial, Catálogo, Operação, Parcerias, Financeiro e Configurações com permissões preservadas. Dashboard destaca pendências antes dos gráficos. Clientes preserva filtros aplicados na paginação, sincroniza histórico e organiza identificação/contato/resumo; editor confirma descarte e recarregamento com alterações.

## Pendência comercial concluída

Escolha confirmada pelo usuário: simulação consolidada com custo de envio e encargos sobre frete declarados pela equipe. O cálculo reutiliza o rateio em centavos do domínio de rentabilidade e as memórias válidas do orçamento, incluindo fingerprints, quantidades e estados. Desconto proporcional à receita bruta; taxas de cada memória incidem nos produtos após desconto; custo fixo do canal é preservado uma vez por linha. Receita inclui frete cobrado; custo de envio e seus encargos são deduzidos separadamente. Depreciação permanece separada da contribuição.

Todos os itens precisam de cobertura. Campos em branco ou inválidos mantêm o consolidado indisponível; zero exige declaração explícita. Atualizar consulta/trocar orçamento limpa as premissas e resultados. Nenhuma venda, recebimento, estoque, reserva ou compromisso de produção é criado. Não se trata de lucro líquido ou prazo garantido. Arquivos novos: src/domain/opportunities/consolidation.ts e src/components/opportunities/consolidation.tsx.

## Validação

- Suíte unitária: 195 arquivos, 793 testes aprovados. Após os últimos casos sugeridos pela revisão, seis testes de consolidação aprovados em dois arquivos.
- Integrações pertinentes: seis arquivos, 18 testes aprovados em PostgreSQL descartável localhost:55432/b2t_test (consultas/API de rentabilidade, clientes, HTTP de clientes, preços comerciais e orçamentos).
- Tipos, lint, build e sete testes dos manifestos Docker aprovados. Imagem runtime de validação construída com sucesso.
- Revisão independente de toda a integração sem defeitos acionáveis; lacunas de taxas distintas com receitas desiguais e limpeza após atualização bem-sucedida cobertas por novos testes.
- 23 verificações HTTP reais com ADMIN/OPERATOR, login, páginas do painel, versão/histórico, orçamento/memórias e autorização de rentabilidade aprovadas.
- Navegador com sessões reais em contêiner isolado, conectado somente ao banco descartável: ADMIN acessa grupos financeiros; OPERATOR não vê Financeiro/Configurações, mantém calculadora e consulta comercial. Margem consolidada 16,59% no cenário fictício de oferta 82,00, envio 6,00 e encargos sobre frete 1,00.
- Desktop 1280×900 e celular 390×844, claro/escuro, Roboto e rolagem sem expansão horizontal. Escape do menu devolve foco ao gatilho; Escape do editor alterado pede confirmação antes de descartar.

A revisão automática bloqueou o processo Next iniciado diretamente no host, sem motivo adicional. A validação autenticada foi concluída com sucesso no runtime Docker isolado, preservando a instalação operacional durante os testes. Nenhuma credencial operacional foi usada nos testes nem foram inseridos dados fictícios no banco operacional.

## Publicação

Instalação local encontrada em 1.15.0, saudável. Publicar somente após PR/CI/merge da 1.17.0: construir app/tools com revisão OCI do commit integrado, preservar imagem/configuração/ambiente anteriores, gerar backup e checksum, ensaiar restauração em PostgreSQL isolado, conferir migrações e trocar somente a aplicação. Preservar o contêiner e volume PostgreSQL e comparar projeções das tabelas antes/depois. Registros operacionais privados em backups/publicacao-1.17.0-20261104-painel no checkout local X:/codex/appb2t; resultado final informado no chat, sem incluir dados ou segredos nesses documentos.
