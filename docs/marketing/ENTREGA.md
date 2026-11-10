# Entrega local — 1.28.0

09/11/2026. Branch `codex/landing-seo-analytics`, worktree `C:/Users/Administrador/.codex/worktrees/69c1/appb2t`. Base e main reconferidas em `8817d5b0502dd8f6dcd6a0102b80b0823ba181e8`, versão 1.27.14. Proposta MINOR única 1.28.0, manifestos raiz e lock sincronizados; APP_VERSION continua derivado de package.json, com histórico anterior preservado. Sem tags.

## Implementado

- Início institucional separado, reaproveitando marca e conteúdo autorizado já cadastrado, processo e ações de catálogo/orçamento. Configurações de merchandising existentes preservadas no início.
- Catálogo em `/catalogo`, sem banner grande, mantendo produtos, filtros, paginação, kits e regras comerciais. Links e redirects legados preservam consultas.
- Área ADMIN SEO e Analytics: campos existentes do catálogo, padrões, overrides públicos, seletor de imagens cadastradas, prévias, indexação, redirects locais validados e gravação com controle de concorrência. Login/admin/fluxos privados não são liberados por override público.
- OAuth Google de leitura implementado com PKCE/state, cookies criptografados e vínculo ao administrador. Relatórios reais via Data API e Search Console, estados independentes, cache/timeout/período/comparação e ausência de dados distinguida de zero.
- Tag opcional com gates de ambiente, escolha individual, DNT, URLs sanitizadas e pageviews manuais. Navegação/contato não geram lead ou compra. Leitura de generate_lead/purchase preparada; emissão autoritativa dessas conversões permanece fora desta implementação.
- Sete skills selecionadas instaladas no projeto, com snapshots e procedência registrados. Nenhuma dependência de runtime adicionada; skills locais preservadas.

## Evidências

- Suíte unitária completa: **249 arquivos, 1.062 testes aprovados**, 282,36 s. A captura da suíte iniciou antes do incremento de versão; testes específicos de manifesto/rodapés/histórico foram executados novamente na versão 1.28.0.
- Testes focados adicionais: OAuth completo simulado, recusa de state/ator/scopes, versão e regressões de SEO aprovados; rodada final na versão 1.28.0: **40 testes em 12 arquivos**, aprovados, incluindo coleta, editor, OAuth, relatórios, navegação e rodapés. Não houve tráfego de teste enviado ao Google.
- Build local Next 16.4.2/Turbopack **aprovado**, incluindo TypeScript, geração de rotas e saída standalone. Prisma generate foi local; não executa migração.
- Lint **aprovado**, sem erros ou avisos. `git diff --check` aprovado para aplicação, testes e documentação. Os snapshots upstream das skills foram excluídos desse check de whitespace: mantêm as quebras Markdown e espaços finais originais, sem reescrever o conteúdo instalado.
- Prévia HTTP/Playwright com PostgreSQL **descartável exclusivo**, `127.0.0.1:55443/b2t_marketing_preview`, contêiner `b2t-marketing-preview-69c1`, com contas ADMIN/OPERATOR e produtos sintéticos. Nenhum acesso ao banco operacional, sessão ou venda real.
- Testes HTTP aprovados: anônimo 401, operador 403 nas APIs, operador com tela de acesso restrito, ADMIN com edição; duas gravações concorrentes resultaram em 200/409; paleta e conteúdo preservados; 308 legados/customizados e consultas repetidas; título/canonical SSR; noindex público e exclusão do sitemap; nenhuma requisição externa.
- **24 capturas**: início, catálogo e administração em 320/390/768/1440 px, claro/escuro; sem transbordamento horizontal, um h1 nas páginas públicas e sem tag Google com coleta desabilitada. Inspeção visual manual de início móvel, catálogo escuro e administração desktop, além das medições automatizadas. Não equivale a teste com todos os leitores de tela ou certificação de acessibilidade.
- Revisão independente encontrou três P2, corrigidos e cobertos: imagem específica de produto/coleção diante do padrão, limite dos detalhamentos GA4 sem disputa do período anterior e permitir medição após recusa. Nenhum Critical relatado.

Logs e capturas locais ficam em `.superpowers/sdd/2026-11-09-landing-seo-analytics/`, fora do Git. `evidence/qa.json` registra as verificações. Prévia usa dados sintéticos sem fotografias comerciais: não valida enquadramento/performance de mídias reais. A biblioteca de imagens e os produtos operacionais não foram alterados.

O servidor de prévia foi encerrado e o contêiner descartável foi parado após os ensaios; dados sintéticos e capturas foram preservados localmente, sem remover worktrees ou volumes alheios.

A revisão automática de aprovação bloqueou a inicialização local da saída otimizada (`npm run start` na porta loopback 3291), sem fornecer motivo detalhado. O build passou; a validação visual/HTTP foi realizada com `next dev`, não com o servidor otimizado. Não houve tentativa de contornar a rejeição nem implantação.

## Pendências objetivas

1. **Resolvido na continuidade:** perfil oficial @somosb2t e uso de fotos/vídeos autorizados pelo usuário. Seis capas reais foram obtidas da grade pública, com fonte/data; seção e sincronização automática implementadas. Ativação da API Meta ainda depende da configuração segura da conta profissional. Ver [INSTAGRAM.md](INSTAGRAM.md).
2. Confirmar domínio público efetivo e propriedades GA4/Search Console; APP_URL continua fonte do canonical. O domínio do exemplo não foi tratado como prova de configuração real.
3. Configurar projeto/cliente e conceder leitura explicitamente na conta Google escolhida. Não foram habilitadas APIs, criados projetos, aceitos termos ou alteradas permissões. OAuth real, renovação/revogação, relatórios reais, cotas e fidelidade dos números aguardam homologação com conta autorizada.
4. Antes de ativar coleta, revisar privacidade, retenção e configuração de medição manual/automática. Os dois gates permanecem false por padrão; não houve coleta em produção.
5. Para emitir conversões de orçamento/compra, implementar contrato autoritativo com deduplicação e consentimento, separado de cliques. O painel desta versão não inventa essas conversões.
6. Homologação humana final: teclado/leitor de tela, contraste em paletas salvas próprias, mídia real e performance no ambiente publicado. A validação local não garante ranking, indexação imediata nem equivalência irrestrita de telas Google.

`npm ci` sinalizou oito vulnerabilidades do conjunto de dependências existente (sete moderadas, uma alta); esta evolução não adicionou pacotes de runtime nem executou correção automática fora do escopo.

## Estado de integração e operação

Implementação local revisável. Não foi aberto PR, feito push, merge, Release, distribuição ou publicação do site. Nenhum script instalado/servidor operacional foi alterado. Produção permanece conforme o estado informado pelo usuário. Comparar main e versão novamente antes de eventual PR/merge autorizado; não incrementar outra vez só para finalizar esta mesma entrega versionada.

Configuração detalhada e contratos: [ARQUITETURA-CONFIGURACAO.md](ARQUITETURA-CONFIGURACAO.md). Procedência: [SKILLS.md](SKILLS.md). Especificação e plano ficam em docs/superpowers.
