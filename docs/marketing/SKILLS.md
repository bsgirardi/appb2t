# Skills instaladas para esta evolução

Revisão de procedência em 09/11/2026. Instalação local em `.agents/skills`, usando o helper oficial skill-installer com `--ref` fixo e destino explícito. Nenhum diretório local foi sobrescrito. Novas skills serão descobertas pelo Codex no próximo turno.

| Origem | SHA | Diretórios selecionados | Versões declaradas |
| --- | --- | --- | --- |
| [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills/tree/7c187944fa63d149879459ba53ef4fd3c0364c50) | 7c187944fa63d149879459ba53ef4fd3c0364c50 | copywriting, cro, seo-audit, site-architecture, analytics | 2.3.5, 2.0.6, 2.2.5, 2.1.3, 2.2.5 |
| [google/skills](https://github.com/google/skills/tree/793c036c3af827151ada918c5f8cba823ef7086d/skills/analytics/google-analytics-data-api-basics) | 793c036c3af827151ada918c5f8cba823ef7086d | google-analytics-data-api-basics | 1.0.0 |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/skills/react-best-practices) | 1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62 | react-best-practices (nome interno vercel-react-best-practices) | 1.0.0 |

As licenças raiz disponibilizadas pelos dois primeiros repositórios foram preservadas em `licenses/marketing.txt` (MIT) e `licenses/google.txt` (Apache 2.0). A skill Vercel declara MIT e autoria Vercel em seu frontmatter; esse snapshot não disponibiliza arquivo LICENSE separado na árvore. Frontmatter, referências e atribuições internas foram preservados integralmente.

Foi revisado o conteúdo das sete skills e a referência Node do Google. São orientações de texto/referências; não se executaram comandos fornecidos por elas para conceder acesso, habilitar APIs, publicar campanhas ou modificar contas. Apenas o conjunto selecionado foi instalado, com seus recursos de apoio, sem o pack inteiro. Não há dependência de runtime adicionada à aplicação.

## Conflitos resolvidos

- Nomes atuais são `cro` e `analytics`, substituindo os nomes antigos mencionados na pesquisa.
- As recomendações Google para habilitar API e executar login ADC não foram executadas: exigem autorização específica e não são necessárias para implementar o fluxo OAuth de leitura. A aplicação usa endpoints REST oficiais com fetch/crypto nativos; não precisa adicionar o SDK Node para os poucos relatórios fixos.
- Recomendações de criar propriedades, marcar conversões ou alterar canais são planejamento, não autorização. Escopos de Cloud Platform/Admin/edição não foram solicitados.
- Recomendações comerciais não autorizam alegações não comprovadas, alteração de políticas, feed externo ou publicação de fotos de clientes.
- shadcn local, Aparência, identidade oficial, contratos Next instalados e AGENTS.md prevalecem sobre exemplos genéricos. Nenhum preset ou componente local foi substituído.

As skills locais frontend-design e shadcn já existentes permaneceram intactas. O MCP shadcn foi consultado para composição e checklist. A verificação não constitui auditoria de todas as referências externas nem autorização para executá-las futuramente.

Os snapshots preservam inclusive espaços finais e quebras Markdown upstream. Não foram normalizados para fazer um check de whitespace passar; a verificação de whitespace da aplicação exclui esse material de terceiros.
