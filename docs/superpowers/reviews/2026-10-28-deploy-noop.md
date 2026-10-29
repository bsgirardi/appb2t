# Repeticao sem build - 1.10.4

O Docker 29 do Debian alterou o ID da imagem tools numa repeticao em cache: 31bf0719 para c887c826. O hash de Config e RootFS permaneceu b0ff46df96cf8a3379e42cd7b365906afac9a152a7a4d1355d4e087aa69bff77. As atestacoes alteraram o manifesto. O teste foi interrompido antes de parar a aplicacao; 1.10.3 permaneceu saudavel.

A verificacao antecipada exige igualdade da imagem instalada, revisao OCI em app/tools, configuracao, saude e status Prisma. Sem divergencias, nao executa builds. Falhas seguem o procedimento completo. Nao se compara somente o nome de uma tag.

Regressao reproduzida: novo teste exigindo ausencia de builds falhou na versao anterior. Com a correcao, 24 cenarios shell Linux, Git e flock passaram. As assercoes de ausencia usam retorno explicito: ! grep sozinho nao interrompe o shell com set -e. Tipos, lint e 3 testes de versao/rodapes passaram. Revisao independente sem bloqueadores.

Publicacao anterior 1.10.3: tools 332 s, runtime 237 s; troca 26 s. Backup validado, 29 migracoes completas, zero incompletas, 103 projecoes legadas iguais, health/login 200. A primeira tentativa 1.10.2 teve 143 s de indisponibilidade antes de recuperar 1.4.1, sem novas migracoes. Metricas e backups privados permanecem no Debian.

Builds finais e repeticao real serao conferidos antes da entrega operacional. Nao alterar configuracoes globais, .env ou outros projetos.
