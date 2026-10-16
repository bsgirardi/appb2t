# appb2t — pendências resumidas

Atualizado em 16/10/2026.

1. **Segurança:** Next.js atualizado de 16.3.6 para 16.3.8 para corrigir os avisos publicados. Restam cinco alertas altos derivados de uma única falha em braces, dependência indireta das ferramentas de lint, ainda sem versão corrigida. Não remover as regras de lint nem rebaixar Next.js para silenciar o relatório. Acompanhar a correção upstream; detalhes em SEGURANCA.md.
2. **Novo servidor:** configurar .env, domínio/proxy HTTPS e backups automáticos; testar restauração. Não há comprovação de configuração externa existente.
3. **Dados:** decidir entre instalação vazia e migração; para migrar, transferir backup atual separadamente e validar o destino. Nenhum dado ou senha real está no pacote.
4. **Publicação local:** concluída em 16/10, com a candidata validada, backup atual e ensaio de restauração aprovado. Instalação em http://localhost:3000 saudável, preservando o volume b2t-calculadora_postgres_data. Roboto, favicon, atualização de segurança e ajustes Nova publicados. Código consolidado em Git e pacote de entrega atualizado. Publicação externa ainda depende do servidor/domínio descritos acima. Registro: docs/superpowers/2026-10-16-nova-publicacao.md.
5. **Visual:** adaptação local de Button/Input/NativeSelect/Card/Badge e catálogo validada, incluindo 48 cenários integrados e fluxo da lista de orçamento. O preset completo não foi aplicado; configuração do gerador e Sheet/menu permanecem preservados. Não há pendência do aceite integrado representativo desta etapa. Registro: docs/superpowers/2026-10-16-catalogo-integrado.md.

Aceite de navegador U4/U5 concluído para cenários representativos em celular/desktop, claro/escuro e teclado. Não há pendência de reimplementação desses módulos. Não há remoto Git configurado para push; commits permanecem locais.
