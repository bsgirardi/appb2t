import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  catalogCommercialErrors,
  catalogAvailability,
} from "@/domain/products/catalog-commercial-filters";
import {
  catalogContextPath,
  type CatalogFilters,
} from "@/domain/products/catalog-navigation";
export function CatalogFilterForm({
  context,
  collections,
}: {
  context: CatalogFilters;
  collections: { id: string; name: string }[];
}) {
  const errors = catalogCommercialErrors(context);
  return (
    <Accordion
      key={catalogContextPath(context)}
      type="single"
      collapsible
      defaultValue={Object.keys(errors).length > 0 ? "filters" : undefined}
      className="mb-6 rounded-xl border border-border bg-background px-4"
    >
      <AccordionItem value="filters" className="border-b-0">
        <AccordionTrigger className="min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          Filtrar produtos
        </AccordionTrigger>
        <AccordionContent>
          <form
            aria-label="Filtrar produtos"
            action="/"
            method="get"
            className="grid min-w-0 gap-4 border-t border-border p-4"
          >
            <div className="grid min-w-0 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="catalog-search">Buscar no catálogo</Label>
                <Input
                  id="catalog-search"
                  name="busca"
                  type="search"
                  maxLength={100}
                  defaultValue={context.search}
                  aria-describedby="catalog-search-help"
                />
                <p
                  id="catalog-search-help"
                  className="text-xs text-muted-foreground"
                >
                  Palavras em qualquer ordem, com ou sem acentos. Se não houver
                  resultados exatos, buscamos erros leves no nome. Códigos
                  permanecem exatos.
                </p>
              </div>
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="catalog-collection">Categoria</Label>
                <NativeSelect
                  id="catalog-collection"
                  name="colecao"
                  defaultValue={context.collection}
                >
                  <option value="">Todas as categorias</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="catalog-availability">Disponibilidade</Label>
                <NativeSelect
                  id="catalog-availability"
                  name="disponibilidade"
                  defaultValue={context.availability ?? ""}
                  aria-invalid={!!errors.availability}
                  aria-describedby={
                    errors.availability
                      ? "catalog-availability-error"
                      : undefined
                  }
                >
                  <option value="">Todas as disponibilidades</option>
                  {errors.availability && (
                    <option value={context.availability}>
                      Opção inválida — selecione outra
                    </option>
                  )}
                  {Object.entries(catalogAvailability).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </NativeSelect>
                {errors.availability && (
                  <p
                    id="catalog-availability-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {errors.availability}
                  </p>
                )}
              </div>
              {(["priceMin", "priceMax"] as const).map((key, index) => (
                <div key={key} className="grid min-w-0 gap-2">
                  <Label htmlFor={`catalog-${key}`}>
                    Preço {index === 0 ? "mínimo" : "máximo"} (R$)
                  </Label>
                  <Input
                    id={`catalog-${key}`}
                    name={index === 0 ? "precoMin" : "precoMax"}
                    inputMode="decimal"
                    maxLength={100}
                    defaultValue={context[key] ?? ""}
                    placeholder="Sem limite"
                    aria-invalid={!!errors[key]}
                    aria-describedby={`catalog-price-help${errors[key] ? ` catalog-${key}-error` : ""}`}
                  />
                  {errors[key] && (
                    <p
                      id={`catalog-${key}-error`}
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {errors[key]}
                    </p>
                  )}
                </div>
              ))}
              <div className="grid min-w-0 gap-2">
                <Label htmlFor="catalog-order">Ordenar por</Label>
                <NativeSelect
                  id="catalog-order"
                  name="ordem"
                  defaultValue={context.order}
                >
                  <option value="nome">Nome</option>
                  <option value="recentes">Mais recentes</option>
                  <option value="menor-preco">Menor preço</option>
                  <option value="maior-preco">Maior preço</option>
                </NativeSelect>
              </div>
            </div>
            <p
              id="catalog-price-help"
              className="text-sm leading-6 text-muted-foreground"
            >
              Preço-base de referência por unidade, sem adicionais, descontos
              por quantidade ou frete. Use vírgula ou ponto para centavos, sem
              separador de milhar. Produtos sob consulta não entram na faixa de
              preço.
            </p>
            <Button type="submit" className="w-full sm:w-fit">
              Aplicar filtros
            </Button>
          </form>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
