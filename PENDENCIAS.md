# appb2t — estado e pendências

## Roadmap de evolução aprovado em 27/10/2026

O acompanhamento das melhorias de calculadora, rentabilidade, produção, negociações, pontos de venda e anúncios está em [docs/ROADMAP-SELLER.md](docs/ROADMAP-SELLER.md). Consultar e atualizar esse arquivo ao trabalhar nessas etapas em qualquer chat. A ordem foi aprovada; o detalhamento e a implementação de cada etapa continuam pendentes. As pendências históricas abaixo devem ser verificadas no código e nas entregas mais recentes antes de retomá-las.

Atualizado em 26/10/2026. Este arquivo descreve o estado atual; desenhos e validações anteriores são registros históricos.

## E4 — em validação

E4.1 implementado localmente na branch `codex/e4-negociacoes`, base main 1.5.1 (`d74ee75`): oportunidades, responsável, próxima ação, histórico privado e vínculo ao fechamento comercial existente. Validação: 28 testes focados/regressões, tipagem, lint, build e prévia sintética aprovados; revisão independente com correção de filtro e cenários adicionais preparados. PostgreSQL E4 exclusivo indisponível: integrações, migração real e concorrência pendentes; suíte completa limitada por recursão do Vitest. [Relatório e limites](docs/superpowers/reviews/2026-10-28-e4-negociacoes.md). E4 permanece parcial; versão 1.5.1, sem PR/push/merge/publicação ou alteração de contêineres/banco. Próxima ação: validar em banco E4 exclusivo por procedimento autorizado e resolver/aceitar limite da suíte antes de eventual integração.

## Desenvolvimento concluído

E3.1 entregue na [PR #22 em rascunho](https://github.com/bsgirardi/appb2t/pull/22), versão 1.6.0 (MINOR), após autorização específica. Revalidação: 46 testes focados, tipagem, lint e build aprovados, incluindo manifestos, rodapés e Atualizações ADMIN/OPERATOR. Limites de suíte completa/banco mantidos; E3 segue parcial. E1 #19 e E2 #21 também propõem 1.6.0: reconciliar versão/notas conforme a main e a ordem de integração antes de merge. Sem merge, publicação, migração ou alteração de contêineres. A nota abaixo registra a entrega local anterior à PR.

E3.1 implementado localmente na branch `codex/e3-fila-visual`, base main 1.5.1 (`d74ee75`): calendário semanal por impressora e reordenação simulada antes de confirmar, com OPs/linhas e impacto entre máquinas, validade temporal, conferência dos dados atuais e idempotência. Validação: 45 testes focados, tipagem, lint, build e prévia sintética desktop/375 px aprovados; revisão independente com dois achados corrigidos. Integrações de banco não executadas (instância E3 exclusiva indisponível) e suíte completa não validada por recursão do Vitest. [Relatório e limites](docs/superpowers/reviews/2026-10-27-e3-fila-visual.md). E3 permanece parcial; versão 1.5.1, sem PR/push/merge/publicação, migrações ou alteração de contêineres. Próxima ação: validar banco exclusivo e resolver/aceitar limite da suíte antes de eventual integração; demais incrementos E3 continuam pendentes.

E2.1 entregue na [PR #21 em rascunho](https://github.com/bsgirardi/appb2t/pull/21), versão 1.6.0, sem merge/publicação. Preparação validada com 37 testes relacionados, tipagem, lint e build; limite da suíte completa e pendências E2 mantidos no relatório. A nota de entrega local abaixo registra o estado anterior à autorização da PR.

E2.1 foi implementado localmente em isolamento na branch `codex/e2-reconciliacao`, sobre a main 1.5.1, sem PR, push, merge ou publicação. O detalhe de rentabilidade explica memória de preço → venda negociada → realizado com fontes e cobertura, sem duplicar perdas ou mudar apurações históricas. Validação: 34 testes relacionados, tipagem, lint, build e prévia sintética responsiva aprovados; suíte unitária completa continua limitada pela recursão do Vitest. E2 permanece parcial. [Verificação e limites](docs/superpowers/reviews/2026-10-27-e2-reconciliacao.md).

E1.1 foi implementado em isolamento na versão 1.6.0 e entregue na [PR #19 em rascunho](https://github.com/bsgirardi/appb2t/pull/19), sem merge ou publicação. Comparação ampliada de lotes validada com 78 testes relacionados, tipagem, lint, build e prévia responsiva; suíte unitária completa continua limitada pela recursão do Vitest. E1 permanece parcial, com canais/descontos e comparação de memórias pendentes. [Verificação e limites](docs/superpowers/reviews/2026-10-27-e1-comparacao-lotes.md).

- Gestão integrada U1–U5, dashboard, catálogo, solicitações, personalização e kits entregues.
- C4: anexos e aprovação privada de arte, histórico imutável e bloqueios produtivos aplicáveis entregues.
- C5: compra direta explícita, conferência de frete/consulta, aceite privado de orçamento, venda/parcelas idempotentes e cancelamento entregues. PR #5 integrado e C5 publicado em http://localhost:3000; 95 projeções legadas e volume preservados. [Registro](docs/superpowers/2026-10-23-publicacao-c5.md).
- Primeiro administrador criado pelo procedimento oficial, com ADMIN ativo; nenhuma senha registrada na documentação.
- Seletor Automático → Claro → Escuro publicado na loja, login, administrativo e acompanhamento privado pelo PR #6. Preferência individual salva no navegador; paletas da empresa preservadas. Validação final com 719 testes em 231 arquivos, tipagem, lint, build e login administrativo na instalação publicada. [Verificação e publicação](docs/superpowers/2026-10-23-tema-e-encerramento.md).
- Revisão da experiência administrativa entregue pelo [PR #9](https://github.com/bsgirardi/appb2t/pull/9) e aplicada no Docker local: campos obrigatórios e condicionais destacados, dados principais agrupados, seções adicionais expansíveis, resumos contextuais, ações de formulário acessíveis durante a rolagem e edições de clientes/configurações em painel lateral. Regras, permissões e dados preservados. [Relatório](docs/superpowers/reviews/2026-10-25-administrativo-ux.md).

Não há módulo de negócio obrigatório por desenvolver no escopo aprovado até C5. A revisão administrativa foi implementada; as pendências de validação e operação abaixo continuam abertas. A configuração comercial será feita manualmente pelo usuário e não representa módulo por desenvolver.

## Pendências técnicas e de validação

1. **Estabilizar a execução completa do Vitest.** A validação da revisão administrativa teve 446 testes aprovados em grupos; na preparação do PR, 267 testes de domínio/upload e 41 testes focados de interface passaram novamente. O grupo completo de interface e a execução conjunta reproduziram recursão no transporte de erros. Investigar a causa e obter uma execução completa reproduzível, sem suprimir erros.
2. **Validar a revisão administrativa com integrações de banco.** Executar somente no banco dedicado `localhost:55432/b2t_test`, pois o preparo dos testes limpa tabelas. Não usar o banco operacional. Esta validação não foi feita para a revisão de interface; validações anteriores de C5 e de recuperação de administrador não a substituem.
3. **Conferir os fluxos reais com a equipe.** Validar cadastro de produto, orçamento/venda, apontamento de produção, recebimento de estoque e lançamento financeiro com dados representativos. As verificações visuais automatizadas desta revisão usaram fixtures; ajustes de usabilidade devem partir das dificuldades reproduzidas no uso.
4. **Integrar e disponibilizar a recuperação de senha administrativa.** A implementação está preparada em branch/PR própria, separada do PR #9: comando de console para ADMIN ativo, revogação de sessões e limpeza do bloqueio de login. Revalidação em 26/10/2026: 12 testes focados de integração aprovados em banco descartável dedicado, tipagem e lint aprovados. A integração na main e a atualização da ferramenta no servidor permanecem pendentes; nenhuma senha operacional foi alterada.
5. **Adicionar verificações automáticas no GitHub.** Não há workflow de CI/publicação configurado no repositório. Definir verificações de tipagem, lint e testes reproduzíveis; publicação automática precisa de destino e configuração próprios. Não é uma funcionalidade de negócio já contratada.

## Configuração e operação pelo responsável

- Preencher contatos, endereço de retirada, produtos/kits, preços, instruções de pagamento e modalidades. Compra direta dos itens legados permanece desabilitada até ativação explícita.
- Configurar domínio/proxy HTTPS e APP_URL para acesso externo; a instalação atual continua local, limitada a 127.0.0.1:3000.
- Para instalar do zero pelo GitHub no outro servidor e atualizar versões, seguir [INSTALACAO_SERVIDOR.md](INSTALACAO_SERVIDOR.md). Compose e exemplo de ambiente suportam pasta persistente, rede própria e porta 1992, mantendo o fallback da instalação local existente. A configuração remota deve ser executada no servidor pelo responsável.
- Configurar retenção e cópia automática de backups fora desta máquina, com restauração periódica. Backups manuais e ensaios desta entrega já foram feitos.
- Antes de maior volume público, estabelecer ingresso confiável para refinar a cota compartilhada de inicialização/troca de links. Não confiar em cabeçalhos fornecidos pelo visitante.

## Expansões opcionais

Frete automático depende de escolher e contratar provedor real. Gateway, integrações bancárias/fiscais, marketplaces e outras expansões exigem escopo próprio. Pagamento e frete pela equipe continuam manuais. Não existe C6 aprovado.

## Evidências e limites

A revisão administrativa passou por build local e Docker, tipagem, lint, revisão independente e verificações visuais com fixtures. Seus 446 testes unitários passaram em grupos separados de interface e domínio. A execução conjunta do Vitest apresenta recursão no transporte de erros neste runtime; na preparação da PR, a repetição do grupo completo de interface também encontrou esse erro, enquanto domínio, tipagem e lint passaram novamente. Integrações de banco dessa revisão não foram executadas, pois exigem o banco exclusivo de testes. Os resultados históricos anteriores continuam válidos para suas respectivas entregas; não representam uma nova execução completa após esta revisão.

[Validação C5](docs/superpowers/2026-10-23-catalogo-c5-validacao.md) e [encerramento](docs/superpowers/2026-10-23-tema-e-encerramento.md) distinguem testes, inspeção visual e limites da automação. Relatos antigos de C5 apenas em desenho, administrador inexistente e inspeção restrita ao tema do sistema foram superados. A limitação da automação do campo nativo de data não representa defeito reproduzido no preenchimento humano.

Dados de outras instalações não foram importados. .env, chaves, senhas, capturas, dumps e evidências operacionais permanecem fora do Git.
