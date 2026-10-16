# Nova incremental e catálogo — 15/10/2026

Complemento em 16/10: build Docker e aceite integrado do catálogo concluídos. Consulte `2026-10-16-catalogo-integrado.md`; os limites abaixo descrevem a rodada inicial.

Direção aprovada neste chat: adaptar componentes mantendo identidade B2T, Poppins público, Roboto administrativo, cores editáveis e ações móveis de 44 px. Sem reaplicar preset ou instalar dependências.

## Entrega

- Button: cantos de 8 px, outline sem sombra e estados expandidos; tamanhos, quebra de texto e asChild preservados.
- Input/NativeSelect: cantos, foco e erro consistentes; sem sombra permanente. Mantidos ref, required, FormData e disabled nativos.
- Card: removidos os 24 px internos que se somavam aos 16 px do contêiner; títulos com entrelinha confortável, rodapé com separação. asChild e conteúdo direto permanecem compatíveis.
- Badge: formato arredondado, largura limitada e quebra, sem sombra; outline explicitamente visível sem Preflight. Variantes existentes preservadas.
- Catálogo: fotos sem zoom/corte no hover; disponibilidade com Badge; descrições e filtros extensos quebram. Ordenação agrupada em superfície neutra. Estado vazio distingue busca, coleção e catálogo e oferece recuperação quando há filtros.
- Corrigida prioridade CSS que reduzia ações públicas a 38 px no desktop. Regra pública de 44 px agora prevalece sobre tamanhos responsivos.
- Documento de identidade atualizado para Roboto administrativo e paletas editáveis independentes.

## Verificação

300 testes unitários em 71 arquivos passaram; dois novos testes de estados vazios falharam antes da implementação e passaram depois. Lint e build local com tipos passaram. A checagem visual inicialmente detectou ações de 38 px no desktop, corrigidas e medidas novamente.

Revisão independente do diff não encontrou achados concretos; verificou consumidores de Card, variantes de Badge, prioridade da regra de 44 px e preservação dos contratos nativos.

Fixture renderizada com os componentes React reais e CSS do projeto: Chrome, claro/escuro, 320/390/1440 px. Sem transbordamento horizontal mesmo com nomes/filtros extensos; foco visível, ações públicas de 44 px, Poppins e Roboto nos respectivos escopos. Capturas inspecionadas. Scripts, HTML, CSS, capturas e resultado em `test-results/nova-catalog/` (ignorados pelo Git). Imagem da marca usada apenas como dado de demonstração, sem cadastro de produto.

## Limites

A fixture é estática: não certifica navegação Next, hidratação, API ou banco. O aceite integrado U4/U5 anterior não foi repetido. Docker e servidores não foram iniciados; não houve publicação, push, alteração de volumes, dados ou cópias de entrega. Pacote e ZIP anteriores não incluem esta etapa.

Não se declara equivalência integral ao preset: `components.json` continua new-york/slate, bibliotecas Radix individuais e ausência de Preflight são preservadas. Sheet/menu não foram redesenhados, e confirmações existentes continuam inline. Paletas salvas não foram substituídas por indigo.
