# Identidade B2T — aplicação digital

Versão 1.0 · 02/10/2026

## Fonte e precedência

Este documento transcreve e organiza as referências fornecidas em `docs/identidade`. O manual de marca de **14/09/2026, 09:43:35** é a fonte principal para cores, tipografia e regras do logotipo. As decisões de interface abaixo são adaptações digitais, identificadas como tal. Os originais devem permanecer intactos.

## Essência e linguagem

- Nome: **B2T**. Assinatura: **Ideias em 3D**.
- Posicionamento: **Criatividade que conecta pessoas**.
- Expressões presentes nas referências: “Do imaginado ao real” e “Pequenas ideias, grandes conexões”.
- Universo: produtos personalizados, brindes corporativos, soluções para empresas, presentes, decoração criativa e universo infantil.
- Tom: próximo, criativo, acolhedor e claro. Explicar o processo e convidar à criação sem prometer prazo, estoque ou características não cadastradas.
- Referências de campanhas são exemplos visuais: depoimentos, seguidores, descontos, URLs e produtos ilustrados não comprovam dados comerciais. Não publicá-los automaticamente como fatos.

## Cores oficiais

| Cor | HEX | Papel na marca |
| --- | --- | --- |
| Azul B2T | `#0066CC` | Confiança; letra B |
| Laranja B2T | `#FF7A00` | Energia; número 2 |
| Verde B2T | `#4CAF33` | Criatividade; letra T |
| Azul-escuro | `#0D2B52` | Texto, apoio e contraste |
| Cinza | `#E9EDF2` | Superfícies de apoio |
| Off-white | `#F8FAFC` | Fundo |
| Amarelo | `#FFC107` | Apoio pontual |
| Aqua | `#00BCD4` | Apoio pontual |
| Rosa | `#E91E63` | Apoio pontual |

Adaptação para a loja: azul nas ações principais e links; laranja no convite principal da home; verde como detalhe. Usar azul-escuro sobre o laranja, evitando texto branco pequeno sobre laranja/verde. Superfícies neutras dão espaço ao produto. Estados de erro e sucesso devem incluir texto/ícone, além da cor.

## Tipografia

**Poppins**, conforme o manual: Bold em títulos, Semibold em destaques, Regular em textos e Light em informações auxiliares. A implementação web carrega localmente Regular 400, Semibold 600 e Bold 700 por `@fontsource/poppins`; usa Regular em textos auxiliares para legibilidade. Fallback: Arial/sans-serif. Não há requisição a Google Fonts durante a visita.

Adaptação digital: título principal fluido de 36 a 60 px, títulos de seção de 24 a 36 px, corpo de 14 a 16 px e informações auxiliares a partir de 12 px. Evitar parágrafos longos em caixa alta.

## Logotipo

Manter a sequência B azul, 2 laranja e T verde e a assinatura original. O manual apresenta versões horizontal, quadrada, monocromática, negativa, avatar e micro. Não deformar, trocar cores, adicionar sombra, contorno ou efeitos. Manter o respiro indicado no manual, equivalente à altura da letra B. O tamanho mínimo indicado é 20 mm para impressão e 60 px no digital; a assinatura precisa continuar legível.

Arquivo principal disponível: `ChatGPT Image 14 de set. de 2026, 11_19_02.png`. A cópia usada pela loja está em `public/brand/b2t-logo.png`, sem alteração dos pixels. O PNG contém margem própria e não é um arquivo vetorial. Para futuras aplicações pequenas, obter uma versão vetorial oficial em vez de redesenhar o logotipo com texto.

O logo editorial da loja usa esta referência B2T; o logo cadastrado em Aparência permanece preservado para a identidade administrativa/documentos. Uma troca futura de marca na loja exige atualizar o ativo e este guia.

## Mascote

Personagem de estética toy/colecionável 3D, expressão amigável, olhos grandes, cabelo cacheado volumoso em tons quentes, moletom escuro, calça cargo e tênis. Pode segurar B2T e fazer gesto de boas-vindas. Não atribuir nome próprio, idade, biografia ou alegações de segurança de brinquedo não fornecidos.

A prancha `14/09/2026, 15:06:02` reúne vistas e orientação de impressão; `14/09/2026, 16:32:59` apresenta a versão isolada. Esta última foi copiada integralmente para `public/brand/b2t-mascote.png` e aparece na abertura da loja. Usar de forma pontual; fotos reais continuam sendo a principal informação nas ofertas.

## Composição e imagens

- Formas arredondadas e geométricas simples: círculos, quartos de círculo e arcos nas cores da marca.
- Layout arejado, títulos fortes, fundo claro e fotografia/ilustração com volume.
- Imagens de produto devem preservar proporção e mostrar o item inteiro; contexto de uso pode complementar a galeria.
- Não usar uma peça de rede social inteira como interface: títulos, CTAs e preços devem ser texto HTML acessível.
- Não reproduzir identidade, mascotes ou humor da Juliette 3D. Ela orienta a experiência comercial, não a marca B2T.

## Interface da loja

- Tailwind CSS 4 e componentes shadcn/ui de código local; configuração em `components.json`.
- `src/app/design.css` organiza as camadas CSS e os tokens da vitrine. Tailwind Preflight global não é ativado para evitar mudanças involuntárias na gestão.
- Tokens públicos ficam em `.storefront`; a gestão mantém o tema existente. O tema escuro da loja usa derivados de contraste, não altera as cores dos ativos oficiais.
- Componentes devem ter foco visível, rótulos, navegação por teclado, áreas de ação com pelo menos 44 px e adaptação móvel.
- Fotos e títulos abrem o produto. CTA explícito: “Ver produto”, “Adicionar à lista de orçamento”, “Preparar contato”. Não chamar a lista de checkout.
- A home está em `/`; `/portfolio` e `/catalogo` redirecionam permanentemente preservando filtros. Produtos, orçamento e informações mantêm os caminhos existentes.
- `/calculadora` pertence à área autenticada da equipe. ADMIN e OPERATOR mantêm suas permissões atuais; “administrativo” não implica retirar acesso dos operadores.

## Inventário das referências

Todos os nomes abaixo têm o prefixo `ChatGPT Image ` e a extensão `.png`:

| Data/hora no nome | Conteúdo |
| --- | --- |
| 14 de set. de 2026, 08_31_29 | Media kit, modelos de posts e linguagem comercial |
| 14 de set. de 2026, 09_43_35 | Brand book, paleta, Poppins e regras de logo |
| 14 de set. de 2026, 11_19_02 | Logotipo principal com assinatura |
| 14 de set. de 2026, 14_51_13 | Boas-vindas em composição vertical |
| 14 de set. de 2026, 15_06_02 | Prancha do mascote e vistas |
| 14 de set. de 2026, 16_32_59 | Mascote isolado em fundo claro |
| 15 de set. de 2026, 08_44_14 | Avatar circular com mascote |
| 15 de set. de 2026, 09_08_24 | Avatar circular com logo |
| 15 de set. de 2026, 09_53_26 | Direção de redes sociais e exemplos de posts |
| 15 de set. de 2026, 09_59_14 | Boas-vindas em composição quadrada |

## Manutenção

Registrar mudanças de identidade neste arquivo antes de espalhar novos valores pelo código. Novas campanhas devem respeitar a marca e os dados cadastrados. A documentação oficial usada para a base técnica é [Tailwind para Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs) e [instalação shadcn/ui](https://ui.shadcn.com/docs/installation/manual).


## Aplicação administrativa compacta

A adoção completa dos componentes compartilhados está registrada na [revisão shadcn](REVISAO-SHADCN.md). Sidebar/Sheet, Tabs, Table, Card e controles usam os tokens B2T em ambos os temas. No celular, tabelas preservam a largura de leitura com rolagem interna acessível por teclado; o menu fecha com Escape e devolve o foco. FAQ usa Accordion. Impressão, marca e dois painéis details/summary mantêm sua composição específica.

O painel usa Poppins e a base Tailwind/shadcn compartilhada. O tema administrativo respeita as cores e o logo já configurados em Aparência, incluindo modo escuro; a paleta fixa da vitrine continua isolada. Navegação lateral de 216 px, cartões com 16 px de preenchimento, campos de 36 px, botões de pelo menos 34 px e células com 9 px verticais no desktop. No celular, campos e ações têm pelo menos 44 px e o menu pode ser recolhido; acesso ao perfil e saída permanecem disponíveis. Densidade compacta não deve ocultar rótulos, mensagens de erro, permissões ou ações. Os estilos de impressão continuam próprios para documentos comerciais.
