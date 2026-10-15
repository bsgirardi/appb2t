# appb2t — pendências resumidas

Atualizado em 15/10/2026.

1. **Segurança:** avaliar e corrigir os seis alertas altos do npm audit em Next.js e ferramentas de lint. São dependências preexistentes; a aplicabilidade ainda não foi avaliada. Fazer atualização controlada com regressões antes da exposição pública.
2. **Novo servidor:** configurar .env, domínio/proxy HTTPS e backups automáticos; testar restauração. Não há comprovação de configuração externa existente.
3. **Dados:** decidir entre instalação vazia e migração; para migrar, transferir backup atual separadamente e validar o destino. Nenhum dado ou senha real está no pacote.
4. **Publicação:** executar o build e a implantação no destino. Roboto administrativo e favicon estão validados na candidata, mas ainda não foram publicados na instalação antiga.
5. **Visual:** continuar a adaptação incremental Nova por componente, preservando customizações. Roboto administrativo e paletas separadas já estão prontos; o preset completo ainda não está aplicado. Revisão do catálogo/loja fica para a próxima etapa.

Aceite de navegador U4/U5 concluído para cenários representativos em celular/desktop, claro/escuro e teclado. Não há pendência de reimplementação desses módulos. Não houve push ou alteração da produção local nesta preparação.
