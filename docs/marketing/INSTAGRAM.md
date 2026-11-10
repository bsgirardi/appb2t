# Instagram @somosb2t na landing

## Direção autorizada

O usuário identificou @somosb2t como perfil oficial, autorizou fotos/vídeos (incluindo trabalhos para clientes) e pediu publicações recentes primeiro e importação automática. Não há autorização de merge, implantação ou alteração de permissões da conta Meta. Esta é continuidade da mesma entrega local 1.28.0, sem novo incremento por commit.

## Implementação

Seção “No Instagram da B2T” no início, entre abertura e processo, com seis publicações em ordem decrescente pela data original; posts fixados não recebem prioridade. Capas preservam proporção, data e descrição são texto HTML e links abrem a publicação original. Reels usam capa e ação explícita para assistir no Instagram, sem autoplay, embed ou script Meta no navegador. Não se apresenta render/arte como prova de entrega comercial.

A grade pública foi consultada pelo navegador sem login em 09/11/2026. Os detalhes individuais exigiram login; portanto não foram inventadas legendas ou horas. A seleção inicial usa datas visíveis na grade e descrições editoriais baseadas nas imagens. Inclui seis posts próprios da B2T de 30/09 a 05/11/2026. O post fixado de apresentação de 15/09 e um post de outra autora exibido na grade não foram usados. Capas autorizadas foram copiadas para public/instagram e convertidas para WebP, sem URLs temporárias de CDN no manifesto.

A sincronização usa Instagram API with Instagram Login, somente leitura instagram_business_basic, API v27.0 verificada no guia oficial. Consulta /me para validar username=somosb2t e o ID retornado; depois /ID/media. Ordena timestamps, deduplica pelo shortcode estável da publicação e importa até 24 itens dentre até 100 mídias recentes. Não lê comentários, mensagens, insights ou seguidores; não publica nem edita nada no Instagram.

Cache durável não secreto no JSON storefront existente, sem migração de schema. Credencial fica apenas no ambiente do servidor. A landing serve imediatamente os dados da última consulta válida (ou a seleção inicial autorizada) e agenda atualização após a resposta quando a cópia está vencida. Intervalo de 15 minutos, acionado pelos acessos; sem tráfego não há polling. Falha tem espera de cinco minutos e preserva a última cópia, sem afirmar sincronização bem-sucedida. Resposta vazia válida substitui a cópia por vazio, evitando reapresentar posts removidos.

ADMIN tem Configurações → Instagram, com estado de conexão/sincronização, última atualização, botão Atualizar agora, opção de exibir a seção e ocultar publicações. OPERATOR não tem acesso. Estado não configurado é explícito, nunca apresentado como conta conectada. Edições usam lock/versão de Aparência e preservam SEO, paletas e conteúdo. A gravação automática do cache usa o mesmo lock, mescla as preferências atuais e não incrementa a versão dos campos editáveis; assim não invalida rascunhos administrativos por atualizar apenas o cache. Clientes antigos que omitem Instagram não apagam a configuração; sincronização mescla com a configuração atual.

Imagens novas são entregues pelo servidor da aplicação por ID de uma publicação já importada. A rota valida host HTTPS de CDN Meta, rejeita redirecionamento, limita bytes/pixels, normaliza WebP e usa cache limitado. Não aceita URL remota arbitrária e não encaminha token ao CDN/navegador. Nenhuma chamada Instagram ocorre no navegador do visitante até ele abrir o link externo.

## Ativação pendente

1. Responsável autorizado configura app Meta e acesso à conta profissional @somosb2t. A leitura pública não prova que a conta já está conectada à API. Não criar app, aceitar termos ou conceder permissões automaticamente.
2. Obter token autorizado com instagram_business_basic no painel Meta ou fluxo oficial. Guardar em INSTAGRAM_ACCESS_TOKEN no ambiente protegido, nunca no chat, Git, configuração pública ou formulário do site. Tokens expiram e podem ser revogados; renovar no provedor e substituir com procedimento autorizado. Esta versão não cria OAuth Meta próprio nem renova tokens automaticamente.
3. Definir INSTAGRAM_SYNC_ENABLED=true. INSTAGRAM_API_VERSION usa v27.0 por padrão e pode ser ajustada para versão oficialmente suportada. Compose encaminha variáveis sem ativá-las por padrão.
4. Abrir Configurações → Instagram e atualizar. Conferir perfil, timestamps, imagens e estados com a conta real. Não foram enviados requests autenticados Meta nesta implementação.

Ocultar retira da landing; não transforma um post público em conteúdo privado nem exclui a publicação no Instagram. A seleção inicial permanece como fallback autorizado até a primeira sincronização válida. A sincronização passa a refletir o feed disponível na API, que pode diferir da grade/colaborações do aplicativo.

A cópia durável guarda datas, descrições e referências das capas, não os bytes das novas imagens. As seis capas iniciais são arquivos locais permanentes. Capas importadas posteriormente usam URL temporária Meta, com proxy e cache em memória: em falha prolongada, expiração da URL ou reinício, a capa pode ficar indisponível. Nesse caso, a interface mostra “Imagem temporariamente indisponível” e conserva a data, o texto e o link original. Não promete uma cópia offline permanente da mídia nem oculta a falha com imagem fictícia.

## Fontes

- Perfil e datas: https://www.instagram.com/somosb2t/
- Guia oficial: https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/get-started
- Permissões: https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login

Não foi feita publicação ou implantação. A validação local está registrada abaixo.

## Validação local da continuidade

- Compilação de produção concluída e verificação de tipos aprovada. Lint sem erros.
- 13 verificações HTTP em banco sintético exclusivo: autenticação, bloqueio de operador, origem, rejeição de campos de credencial, salvamento, conflito de versão, desativação/restauração da seção, consulta sem conexão e capa desconhecida. Todas aprovadas. Nenhuma credencial Meta foi usada.
- 13 testes específicos cobrem ordenação, deduplicação por shortcode estável, ocultação, validação de origem de mídia, conta correta, token fora de URLs, preservação de cache/preferências, primeira sincronização sem configuração prévia e estados da interface.
- Seção pública conferida visualmente em 1280 px, com seis capas carregadas. Evidência local ignorada: .superpowers/sdd/2026-11-09-landing-seo-analytics/instagram-landing-dark.png. A conferência visual administrativa posterior foi limitada por conexão recusada na aba do navegador; os controles foram verificados por testes de interface e HTTP.
- Artefatos de verificação ficam na mesma pasta ignorada; não contêm credenciais reais. Não há merge, Release ou implantação operacional desta continuidade.


Revisão independente das correções concluída sem novos achados no escopo: primeira sincronização, fallback de capas e identidade estável das publicações.

Suíte unitária completa final: 254 arquivos e 1.079 testes aprovados. A compilação de produção e o lint final também terminaram com código zero.
