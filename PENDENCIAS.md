# appb2t — pendências resumidas

Atualizado em 15/10/2026.

1. **Segurança:** Next.js atualizado de 16.3.6 para 16.3.8 para corrigir os avisos publicados. Restam cinco alertas altos derivados de uma única falha em braces, dependência indireta das ferramentas de lint, ainda sem versão corrigida. Não remover as regras de lint nem rebaixar Next.js para silenciar o relatório. Acompanhar a correção upstream; detalhes em SEGURANCA.md.
2. **Novo servidor:** configurar .env, domínio/proxy HTTPS e backups automáticos; testar restauração. Não há comprovação de configuração externa existente.
3. **Dados:** decidir entre instalação vazia e migração; para migrar, transferir backup atual separadamente e validar o destino. Nenhum dado ou senha real está no pacote.
4. **Publicação:** executar o build Docker e a implantação no destino. Após a atualização de segurança, o build local passou; a repetição em Docker ficou bloqueada pela indisponibilidade do Docker Desktop. Roboto administrativo e favicon estão validados na candidata, mas ainda não foram publicados na instalação antiga.
5. **Visual:** continuar a adaptação incremental Nova por componente, preservando customizações. Roboto administrativo e paletas separadas já estão prontos; o preset completo ainda não está aplicado. Revisão do catálogo/loja fica para a próxima etapa.

Aceite de navegador U4/U5 concluído para cenários representativos em celular/desktop, claro/escuro e teclado. Não há pendência de reimplementação desses módulos. Não houve push ou alteração da produção local nesta preparação.
