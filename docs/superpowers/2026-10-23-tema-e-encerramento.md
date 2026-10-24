# Tema manual e encerramento das pendências C5

Solicitação do usuário em 23/10/2026: criar administrador, permitir escolha explícita de tema e atualizar a documentação. Alteração pequena no layout existente, sem novas dependências ou migração.

## Comportamento e escolhas

Botão com texto e ícone percorre Automático → Claro → Escuro → Automático na loja, login, administrativo e páginas privadas de compra/arte. Preferência por navegador, sem alteração da paleta global ou do perfil do usuário. Automático acompanha o sistema; abas da mesma origem sincronizam. Armazenamento bloqueado mantém a troca em memória.

Button local reutilizado com área mínima de 44 px e nome acessível informando estado e próxima opção. Menu acrescentaria interação para apenas três estados; alternar somente claro/escuro retiraria o retorno ao automático. A escolha dos três estados é de implementação, sem atribuir ao usuário detalhes que ele não definiu.

Script fixo no head resolve a preferência antes da primeira pintura, sem interpolar dados do visitante. suppressHydrationWarning no html cobre os atributos alterados. Controlador cliente acompanha sistema/armazenamento; layouts de servidor preservados. CSS conserva as paletas e fallback automático sem JavaScript. Sem sessão ou dado comercial para trocar tema.

## Verificação

Quatro regressões novas: ciclo/persistência/controles simultâneos; automático versus escolha manual e outra aba; restauração antes da pintura e valor inválido; armazenamento bloqueado. Falha inicial antes da implementação e testes focados aprovados depois. Tipagem e lint aprovados.

Navegador no banco descartável: checkout/recibo claro e escuro, preferência após recarga, entrada por teclado, login e dashboard. Em 320 px sem overflow horizontal; botão de 44 px. Capturas em backups/tema-manual-20261023/ no worktree, fora do Git.

Suíte Linux/Node 22 corrigida: **719/719 testes em 231 arquivos**, saída 0, 196,80 s. Uma preparação inicial do contêiner copiou pastas para dentro delas mesmas; a execução foi interrompida, as duplicatas removidas do contêiner descartável e a fonte correta copiada antes de reiniciar. Nenhum dado operacional afetado.

Revisão independente sem achados importantes; um achado menor apontou variantes dark do Tailwind ainda vinculadas ao sistema. Corrigido com variante baseada no atributo resolvido e fallback sem JavaScript; CSS compilado inspecionado no navegador. Testes focados, tipagem e lint novamente verificados após o ajuste. Nenhum achado adiado.

Checkout/recibo e dashboard inspecionados em claro/escuro; sincronização entre abas confirmada também pela interface. Build corrigido aprovado com dois workers: compilação 9,0 s, tipagem 25,1 s e 63 páginas geradas, saída 0. Imagem `appb2t:c5-theme-20261023`, manifest `sha256:376a42bf0f7e21ab49428da2f603669e8663cbb43d2255446b3fdfc0fa06cdd4`.

Primeiro build cancelado após falta de memória global no Docker (aproximadamente 2 GiB), confirmada pelos eventos OOM do kernel às 01:57–01:58 UTC de 24/10. A etapa usava 19 workers e causou reinício da aplicação e do PostgreSQL; o banco concluiu recuperação automática e HTTP voltou a 200. Foi corrigido o limite de processos de páginas para dois em experimental.cpus, opção confirmada no código e tipos locais do Next 16.4.2. Bancos de teste parados antes da nova tentativa. Não houve downgrade, restauração sobre dados existentes ou intervenção no WAL.

O controle nativo de data não atualizou o estado via fill na automação anterior; isso não comprova falha no preenchimento humano. Tema claro/escuro agora é inspecionável sem emulação. Movimento reduzido continua respeitado pelo CSS existente; nenhuma animação adicionada ao botão e nenhuma certificação visual sob emulação indisponível.

## Administração e continuidade

Primeiro administrador criado pelo script oficial, com validação de senha, hash scrypt, trava transacional e ADMIN ativo. Senha fora de arquivo, commit e relatório. Configuração comercial será feita pelo usuário. PENDENCIAS.md mantém explícitos domínio/HTTPS, backups externos automáticos e ingresso confiável conforme volume. Frete automático e gateway continuam expansões opcionais, fora do C5 aprovado.

## Publicação concluída

[PR #6](https://github.com/bsgirardi/appb2t/pull/6) integrado em main pelo merge `311cda6f9655f5ac778602952028ee280c4f04e8`; árvore idêntica à implementação `49b11ab2bcde0dfc8222098df37dbad8ac10561b`. Checkout operacional sincronizado por fast-forward, sem alterar .agents/, skills-lock.json ou stash. Nenhuma migração nesta entrega.

Backup atualizado com aplicação parada, incluindo a conta administrativa: `X:/codex/appb2t/backups/tema-manual-20261023/final.dump`, 252757 bytes, SHA-256 `82F195174F244CB0F1CF76AF323ADB7CBD8921001E1D571C0249ED1AD7D971B2`. Arquivo custom validado com pg_restore --list. As 103 projeções completas ficaram idênticas antes/depois da troca da imagem. A imagem anterior permanece também em `appb2t:before-theme-20261023`; o volume e as chaves C4/C5 foram preservados. Override em backups/tema-manual-20261023/ fixa a nova imagem; tag padrão appb2t-app também atualizada. Tools/admin mantêm a imagem C5 anterior, pois seus scripts e migrações não mudaram.

Aplicação e banco healthy em http://localhost:3000. HTTP de saúde, catálogo, login, checkout e acompanhamento 200; API administrativa sem sessão 401, consulta por protocolo e origem externa 403. Login efetivo do administrador concluído pelo navegador. Claro, Escuro e retorno a Automático conferidos na imagem publicada; preferência deixada no automático. Capturas em `backups/tema-manual-20261023/admin-claro-publicado.png` e `admin-escuro-publicado.png`. Nenhuma compra ou fixture criada na operação; os testes de acesso criaram apenas sessões técnicas/autenticadas.

Pendências de implementação do C5 encerradas. Permanecem as configurações manuais e externas explicitadas em PENDENCIAS.md; os limites de automação acima são preservados como evidência, sem declarar validação que não foi executada.
