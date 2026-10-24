# appb2t — estado e pendências

Atualizado em 23/10/2026. Este arquivo descreve o estado atual; desenhos e validações anteriores são registros históricos.

## Desenvolvimento concluído

- Gestão integrada U1–U5, dashboard, catálogo, solicitações, personalização e kits entregues.
- C4: anexos e aprovação privada de arte, histórico imutável e bloqueios produtivos aplicáveis entregues.
- C5: compra direta explícita, conferência de frete/consulta, aceite privado de orçamento, venda/parcelas idempotentes e cancelamento entregues. PR #5 integrado e C5 publicado em http://localhost:3000; 95 projeções legadas e volume preservados. [Registro](docs/superpowers/2026-10-23-publicacao-c5.md).
- Primeiro administrador criado pelo procedimento oficial, com ADMIN ativo; nenhuma senha registrada na documentação.
- Seletor Automático → Claro → Escuro publicado na loja, login, administrativo e acompanhamento privado pelo PR #6. Preferência individual salva no navegador; paletas da empresa preservadas. Validação final com 719 testes em 231 arquivos, tipagem, lint, build e login administrativo na instalação publicada. [Verificação e publicação](docs/superpowers/2026-10-23-tema-e-encerramento.md).

Não há funcionalidade obrigatória pendente do escopo aprovado até C5. A configuração comercial será feita manualmente pelo usuário; não representa módulo por desenvolver.

## Configuração e operação pelo responsável

- Preencher contatos, endereço de retirada, produtos/kits, preços, instruções de pagamento e modalidades. Compra direta dos itens legados permanece desabilitada até ativação explícita.
- Configurar domínio/proxy HTTPS e APP_URL para acesso externo; a instalação atual continua local, limitada a 127.0.0.1:3000.
- Para instalar do zero pelo GitHub no outro servidor e atualizar versões, seguir [INSTALACAO_SERVIDOR.md](INSTALACAO_SERVIDOR.md). Compose e exemplo de ambiente suportam pasta persistente, rede própria e porta 1992, mantendo o fallback da instalação local existente. A configuração remota deve ser executada no servidor pelo responsável.
- Configurar retenção e cópia automática de backups fora desta máquina, com restauração periódica. Backups manuais e ensaios desta entrega já foram feitos.
- Antes de maior volume público, estabelecer ingresso confiável para refinar a cota compartilhada de inicialização/troca de links. Não confiar em cabeçalhos fornecidos pelo visitante.

## Expansões opcionais

Frete automático depende de escolher e contratar provedor real. Gateway, integrações bancárias/fiscais, marketplaces e outras expansões exigem escopo próprio. Pagamento e frete pela equipe continuam manuais. Não existe C6 aprovado.

## Evidências e limites

[Validação C5](docs/superpowers/2026-10-23-catalogo-c5-validacao.md) e [encerramento](docs/superpowers/2026-10-23-tema-e-encerramento.md) distinguem testes, inspeção visual e limites da automação. Relatos antigos de C5 apenas em desenho, administrador inexistente e inspeção restrita ao tema do sistema foram superados. A limitação da automação do campo nativo de data não representa defeito reproduzido no preenchimento humano.

Dados de outras instalações não foram importados. .env, chaves, senhas, capturas, dumps e evidências operacionais permanecem fora do Git.
