# Recuperação de senha administrativa

Objetivo: recuperar a senha de um ADMIN ativo pelo terminal do servidor, sem excluir usuários ou alterar dados comerciais.

Abordagem: ampliar o serviço Docker admin com o argumento explícito --reset-password. Sem argumento, preservar a criação exclusiva do primeiro administrador. Reutilizar prompts ocultos, scrypt e as travas transacionais de autenticação. Não criar endpoint público nem reativar contas.

- [x] Testar recuperação, isolamento de outros usuários, revogação de sessões, desbloqueio de login e rejeição de contas não elegíveis e credenciais inválidas no banco b2t_test.
- [x] Implementar função de recuperação e modo interativo com confirmação da senha; rejeitar argumentos desconhecidos antes de solicitar credenciais.
- [x] Documentar comandos Docker e validar testes, tipagem e lint. Não executar recuperação sobre contas operacionais nem registrar senhas.

## Validação

12 testes de integração de recuperação, autenticação e usuários aprovados em banco descartável separado. Fluxo interativo de recuperação executado com credenciais fictícias: e-mail, duas entradas ocultas e saída zero. Argumento desconhecido rejeitado antes dos prompts. Tipagem, lint dos arquivos alterados e diff --check aprovados.

As dependências locais estavam incompletas e o Prisma Client não incluía C4/C5. npm ci e prisma generate sincronizaram o ambiente sem mudar o lockfile. A tentativa posterior da suíte completa foi interrompida após o banco em tmpfs esgotar espaço (No space left on device). Portanto não há aprovação da suíte completa nesta entrega. Os 12 testes focados foram repetidos com sucesso em novo banco descartável com armazenamento em disco. Nenhuma senha ou conta operacional foi alterada. Não houve build da imagem Docker nem publicação no servidor.

## Revalidação para a PR — 26/10/2026

12 testes de integração em 3 arquivos (recuperação, autenticação e usuários) passaram novamente em banco descartável dedicado, após aplicar as 26 migrações. Tipagem, lint dos arquivos TypeScript alterados, rejeição de argumento desconhecido antes dos prompts e diff --check aprovados. Revisão independente sem problemas concretos. O banco de testes antigo estava em recuperação de inicialização; seu volume foi preservado, e a revalidação usou o projeto Docker separado appb2t-password-test. Não houve alteração de senha operacional, execução da suíte completa ou publicação no servidor nesta preparação.

