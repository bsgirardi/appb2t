# appb2t — pendências resumidas

Atualizado em 23/10/2026.

1. **Segurança e C4:** Next.js/eslint-config-next 16.4.2, suíte final com 683 testes em 211 arquivos, tipagem, lint e build Docker aprovados. Auditorias finais de produção e completa com desenvolvimento retornaram zero vulnerabilidades conhecidas. Publicação C4 concluída em 23/10 em http://localhost:3000; resultado operacional no registro abaixo. Primeiro administrador continua dependendo de criação interativa. Relatos de cinco alertas e bloqueio Docker em documentos anteriores são históricos.
2. **Novo servidor:** configurar .env, domínio/proxy HTTPS e backups automáticos; testar restauração. Não há comprovação de configuração externa existente.
3. **Dados:** o usuário escolheu instalação vazia neste computador. Preparar banco PostgreSQL 17 próprio e primeiro administrador; não importar dados antigos nem usar os bancos de outros aplicativos. Nenhum dado ou senha real está no pacote.
4. **Publicação local concluída:** versão 1.1.0 em http://localhost:3000, imagem `appb2t:1.1.0` saudável, dashboard e catálogo C3 integrados pelo [PR #3](https://github.com/bsgirardi/appb2t/pull/3). Migração aditiva aplicada após backup final; as 82 projeções históricas e o volume `b2t-calculadora_postgres_data` foram preservados. Publicação externa depende do servidor/domínio descritos acima.
5. **Visual:** adaptação local de Button/Input/NativeSelect/Card/Badge e catálogo validada, incluindo 48 cenários integrados e fluxo da lista de orçamento. O preset completo não foi aplicado; configuração do gerador e Sheet/menu permanecem preservados. Não há pendência do aceite integrado representativo desta etapa. Registro: docs/superpowers/2026-10-16-catalogo-integrado.md.
6. **C3 e dashboard concluídos na 1.1.0:** revisão sem achados críticos/importantes, 651 testes em 199 arquivos, tipagem, lint, build e aceite do dashboard desktop/móvel aprovados. Migração ensaiada em PostgreSQL 17 separado e aplicada na instalação local; verificações HTTP do catálogo passaram. Movimento reduzido conferido por verificação automatizada conforme autorizado. Ver [registro da release](docs/superpowers/2026-10-22-release-1.1.0.md).
7. **Correções da versão 1.1.0:** os dois menores conhecidos de C3 foram corrigidos com regressões: Atualizar lista recupera a versão atual após conflito, e Decimal local de 40 dígitos evita arredondamento intermediário do percentual. A mesma precisão foi aplicada ao agregado mensal do dashboard. A alteração administrativa aprovada em 19/10 foi recuperada de arquivos locais não commitados e integrada à candidata. Movimento reduzido mantém a verificação automatizada autorizada. Capturas, dumps, configuração privada e temporários ficam fora do Git.

Aceite de navegador U4/U5 concluído para cenários representativos em celular/desktop, claro/escuro e teclado. Não há pendência de reimplementação desses módulos. Repositório privado GitHub configurado em https://github.com/bsgirardi/appb2t, com histórico enviado nas branches main e feat/calculadora.

## C4 e continuidade C5 — 23/10/2026

C4 implementado e validado: anexos pela equipe, aprovação por link privado, revisões imutáveis, continuidade em documentos e bloqueio de novos apontamentos quando a arte exigida não estiver aplicável. Publicação local concluída, com backup final e 85 projeções preservadas; consultar [registro C4](docs/superpowers/2026-10-23-publicacao-c4.md) para o resultado efetivo.

C5 permanece em desenho, com compra direta e fechamento de orçamento, pagamento externo registrado pela equipe e modalidades de entrega por produto/kit. Cálculo automático depende de serviço real ainda não escolhido. Não há checkout C5 publicado.
