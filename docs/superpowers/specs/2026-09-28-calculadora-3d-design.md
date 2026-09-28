# B2T Calculadora — especificação da primeira versão

## Objetivo e decisões confirmadas

Criar uma ferramenta interna de precificação de impressão 3D, inspirada em https://www.3dkprint.com.br/calculadora, com uma tela de cálculo e um painel separado de configurações. A equipe deve acessar os mesmos dados em diferentes dispositivos, usando contas individuais.

Decisões confirmadas pelo usuário: aplicação Next.js, PostgreSQL, execução em Docker Compose, dois perfis (administrador e operador), cadastro fechado e preparação para um futuro catálogo em página própria. Supabase não será utilizado.

Esta especificação detalha as regras propostas para a implementação. As fórmulas abaixo são explícitas para evitar ambiguidades; a equivalência integral com as fórmulas internas do site de referência não foi verificada.

## Escopo

- Login e logout, com sessões persistidas no servidor.
- Calculadora para filamento (gramas) e resina (mililitros).
- Cadastro de materiais e impressoras por administradores.
- Configuração compartilhada dos custos e percentuais por administradores.
- Gestão de usuários, incluindo ativação, desativação e redefinição administrativa de senha.
- Interface em português brasileiro, valores em reais e layout responsivo.
- Build da aplicação por Dockerfile e execução com PostgreSQL por Docker Compose.

O catálogo, cadastro de produtos, fotos, publicação de preços, histórico de orçamentos e integrações de venda serão etapas futuras. A primeira versão mantém o motor de cálculo independente das telas para permitir seu reaproveitamento.

## Arquitetura

Uma aplicação Next.js com TypeScript atende interface e operações no servidor. PostgreSQL é a fonte central dos dados. Prisma organiza o modelo de dados e as migrações. Um módulo de domínio puro implementa as fórmulas, sem dependência da interface, autenticação ou banco.

O navegador recebe os cadastros ativos e parâmetros necessários para exibir uma simulação imediata. O servidor valida e autoriza todas as leituras e alterações persistentes. O cálculo também pode ser executado no servidor com o mesmo módulo quando o catálogo for implementado.

Estrutura lógica: interface, autenticação/autorização, cadastros/configurações, motor de cálculo e persistência. Não haverá serviços separados para cada módulo.

## Acesso e permissões

Todos os dados pertencem a uma única equipe. Não há isolamento por empresa nesta versão.

| Operação | Administrador | Operador |
| --- | --- | --- |
| Consultar calculadora e custos detalhados | Sim | Sim |
| Selecionar materiais e impressoras ativos | Sim | Sim |
| Alterar dados temporários da peça | Sim | Sim |
| Alterar materiais, impressoras e parâmetros | Sim | Não |
| Gerenciar usuários | Sim | Não |
| Alterar a própria senha | Sim | Sim |

O percentual de lucro é definido no painel administrativo. Operadores não alteram parâmetros globais nem substituem preços cadastrados durante uma simulação.

Autenticação por e-mail e senha, sem inscrição pública. Senhas são armazenadas apenas como hash com salt. Sessões usam tokens aleatórios, hash do token no banco e cookies HttpOnly, SameSite e Secure em produção HTTPS. Rotas privadas e operações administrativas verificam a sessão e o perfil no servidor. Login deve ter limitação de tentativas e erros que não revelem se um e-mail existe.

Desativar usuário ou redefinir sua senha revoga suas sessões. A aplicação impede a desativação ou remoção de privilégios do último administrador ativo. O primeiro administrador é criado por comando de inicialização documentado, com credenciais fornecidas pelo responsável e sem senha padrão no repositório.

## Telas e fluxos

### Login

E-mail e senha, mensagens de erro claras e redirecionamento para a calculadora. Acesso sem sessão válida redireciona ao login.

### Calculadora

O usuário seleciona filamento ou resina, material e impressora compatíveis; informa consumo e tempo em horas/minutos. A simulação representa uma peça ou um trabalho completo, conforme o consumo e tempo informados; não existe multiplicação automática por quantidade nesta versão.

O resultado mostra material, energia, depreciação, manutenção, provisão para falhas, acabamento, fixação, custo total, lucro em reais e preço sugerido. Exibe também o percentual de acréscimo sobre o custo. Campos vazios ou inválidos não geram um preço aparentemente válido.

Materiais e impressoras inativos não podem ser selecionados em novos cálculos. Se faltarem cadastros, o administrador recebe um atalho para configurar; o operador recebe uma orientação para contatar o administrador.

### Configurações

Área exclusiva para administradores, organizada em materiais, impressoras, custos/taxas e usuários. Alterações ficam em rascunho até salvar. Uma gravação válida mostra confirmação; falhas preservam os valores preenchidos.

Materiais: nome, tecnologia, preço por kg (filamento) ou litro (resina), estado ativo. Não será exigida densidade, pois as entradas já usam gramas ou mililitros, sem conversão entre massa e volume.

Impressoras: nome, tecnologia, valor de aquisição, meses para amortização, dias de uso por mês, horas de uso por dia, potência média em watts e estado ativo. O painel mostra o custo horário de amortização calculado.

Custos/taxas: tarifa de energia em R$/kWh, manutenção (%), provisão de falhas (%), acabamento (%), fixação por trabalho (R$) e acréscimo desejado sobre custo (%). São parâmetros compartilhados da equipe.

Ao abrir ou atualizar a calculadora, os dados são lidos do banco sem cache desatualizado. Um botão para atualizar parâmetros permite carregar alterações feitas por outro dispositivo; não há sincronização em tempo real nesta versão. Simulações já abertas mantêm os parâmetros carregados até essa atualização.

## Regras de cálculo propostas

Entradas: consumo q, tempo t em horas, preço do material p, potência w, tarifa e, valor da máquina v, meses m, dias por mês d e horas por dia h. Percentuais são convertidos em frações antes de aplicar.

1. Material = q / 1000 × p, tanto para g/kg quanto para ml/litro.
2. Energia = t × w / 1000 × e.
3. Amortização por hora = v / (m × d × h).
4. Custo de máquina = t × amortização por hora.
5. Manutenção = (material + energia) × percentual de manutenção.
6. Subtotal operacional = material + energia + máquina + manutenção.
7. Provisão de falhas = subtotal operacional × percentual de falhas.
8. Acabamento = subtotal operacional × percentual de acabamento.
9. Custo total = subtotal operacional + falhas + acabamento + fixação.
10. Lucro = custo total × percentual de acréscimo.
11. Preço sugerido = custo total + lucro.

Falhas representam uma reserva percentual simples, não uma estimativa probabilística de reimpressões. O lucro usa acréscimo sobre o custo (markup), como indicado pela referência; não é margem sobre o preço de venda. Por exemplo, custo de R$ 10,00 e acréscimo de 200% resultam em R$ 30,00 de venda e R$ 20,00 de lucro.

Exemplo de aceitação: 100 g a R$ 100/kg, 2 horas, 100 W, energia a R$ 1/kWh, máquina de R$ 2.400 amortizada em 12 meses × 25 dias × 8 horas, manutenção de 10%, falhas de 10%, acabamento de 10%, fixação de R$ 0,20 e acréscimo de 200%. Material = 10; energia = 0,20; máquina = 2; manutenção = 1,02; subtotal = 13,22; falhas = 1,322; acabamento = 1,322; total = 16,064; preço = 48,192. Exibição final: custo R$ 16,06 e venda R$ 48,19.

Usar aritmética decimal e preservar precisão intermediária. Arredondar valores exibidos para dois decimais; informar que componentes arredondados podem diferir em um centavo da soma exibida.

Consumo e tempo precisam ser positivos. Preços, potência, tarifa, valor da máquina e taxas precisam ser finitos e não negativos. Meses e dias são inteiros positivos; dias não podem exceder 31 e horas por dia precisam estar entre 0 (exclusivo) e 24. Minutos ficam entre 0 e 59. Percentuais de manutenção, falhas e acabamento ficam entre 0 e 100; acréscimo pode superar 100%. Validar limites numéricos compatíveis com o banco e impedir divisão por zero, Infinity e NaN.

## Dados

- User: id, nome, e-mail único normalizado, hash de senha, perfil, ativo e timestamps.
- Session: hash de token único, usuário, criação e expiração.
- Material: id, nome, tecnologia, preço por unidade de compra, ativo e timestamps.
- Printer: id, nome, tecnologia, aquisição, meses, dias/mês, horas/dia, watts, ativo e timestamps.
- CalculationSettings: registro único da equipe, tarifa, percentuais, fixação, data e usuário da última alteração.

Valores decimais usam campos Numeric/Decimal no PostgreSQL. Alterações de um formulário são atômicas. Configurações e cadastros usam versão para detectar gravações concorrentes: caso outro administrador tenha alterado o registro, pedir atualização em vez de sobrescrever silenciosamente.

## Docker e operação

Dockerfile com build em múltiplas etapas e usuário sem privilégios no contêiner da aplicação. Docker Compose inclui aplicação, PostgreSQL com volume persistente e execução de migrações antes da aplicação. Healthchecks verificam disponibilidade dos serviços.

Configurações de ambiente são documentadas em .env.example sem segredos reais. O banco permanece na rede interna do Compose, sem porta pública por padrão. A aplicação expõe uma porta HTTP configurável. Para acesso remoto em produção, usar domínio e HTTPS no proxy reverso da infraestrutura escolhida pelo responsável.

O README explica build, subida, migrações, criação do primeiro administrador, backup com pg_dump e restauração. Volume persistente não substitui backup. A entrega prepara execução local e instalação em servidor; escolha/provisionamento de hospedagem e publicação externa não fazem parte desta etapa.

## Verificação e critérios de aceitação

- Testes unitários do motor para filamento/resina, exemplo numérico, taxas zeradas, acréscimo acima de 100%, arredondamento e entradas inválidas.
- Testes de integração para login, expiração/revogação de sessões, permissões e proteção do último administrador.
- Verificar que acesso direto a operações administrativas por operador é recusado no servidor.
- Verificar persistência das configurações após reinício e leitura dos mesmos dados em sessões distintas.
- Verificar tratamento de conflito entre edições administrativas concorrentes.
- Verificar fluxo no navegador em computador e celular, incluindo estados vazios, erros e salvamento.
- Executar análise de tipos, verificações estáticas, testes e build de produção.
- Verificar build e inicialização Docker quando o Docker estiver disponível; relatar explicitamente se isso não puder ser executado no ambiente.

## Evolução para catálogo

O futuro cadastro de produto poderá registrar material, impressora, consumo e tempo, chamando o mesmo motor. Regras de publicação e atualização de preços serão definidas nessa etapa, para que uma alteração de custos não publique preços novos sem uma política explícita. Dados internos e funções administrativas continuarão protegidos.
