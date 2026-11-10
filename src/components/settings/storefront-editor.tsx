"use client";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  sectionNames,
  type StorefrontConfig,
} from "@/domain/appearance/storefront";
import type { CollectionDTO } from "@/domain/collections/types";
import { StoreInformationEditor } from "./store-information-editor";
function move<T>(items: T[], index: number, direction: number): T[] {
  const next = [...items];
  [next[index], next[index + direction]] = [
    next[index + direction],
    next[index],
  ];
  return next;
}
function OrderButtons({
  label,
  index,
  count,
  onMove,
}: {
  label: string;
  index: number;
  count: number;
  onMove: (direction: number) => void;
}) {
  return (
    <span className="store-editor-actions">
      <Button
        variant="outline"
        size="sm"
        type="button"
        className=""
        aria-label={`Subir ${label}`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        ↑
      </Button>
      <Button
        variant="outline"
        size="sm"
        type="button"
        className=""
        aria-label={`Descer ${label}`}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        ↓
      </Button>
    </span>
  );
}
export function StorefrontEditor({
  value,
  collections,
  onChange,
}: {
  value: StorefrontConfig;
  collections: CollectionDTO[];
  onChange: (value: StorefrontConfig) => void;
}) {
  return (
    <div className="store-editor">
      <h2>Página inicial institucional</h2>
      <p className="muted">
        Organize os destaques do início da loja. O catálogo tem busca e produtos no topo, sem banner grande. As alterações são publicadas ao salvar
        aparência.
      </p>
      <Label className="flex items-center gap-2">
        <Checkbox
          checked={value.showHero}
          onChange={(event) =>
            onChange({ ...value, showHero: event.target.checked })
          }
          aria-describedby="store-hero-help"
        />
        Exibir banner inicial
      </Label>
      <p id="store-hero-help">
        Desative para ocultar o destaque do início da loja, incluindo a mensagem
        de boas-vindas.
      </p>
      <h3>Banners</h3>
      <p className="muted">
        Até 3 banners. A imagem vem da capa da coleção ou de um produto ativo
        dela. Edite a capa em Coleções. Coleções inativas não aparecem na loja.
      </p>
      {value.banners.map((banner, index) => (
        <fieldset className="store-editor-item" key={index}>
          <legend>Banner {index + 1}</legend>
          <Field
            label={`Título do banner ${index + 1}`}
            value={banner.title}
            maxLength={100}
            required
            onChange={(e) =>
              onChange({
                ...value,
                banners: value.banners.map((b, i) =>
                  i === index ? { ...b, title: e.target.value } : b,
                ),
              })
            }
          />
          <Field
            label={`Texto do banner ${index + 1}`}
            value={banner.text}
            maxLength={300}
            onChange={(e) =>
              onChange({
                ...value,
                banners: value.banners.map((b, i) =>
                  i === index ? { ...b, text: e.target.value } : b,
                ),
              })
            }
          />
          <div className="field">
            <Label htmlFor={`banner-collection-${index}`}>
              Coleção do banner {index + 1}
            </Label>
            <NativeSelect
              id={`banner-collection-${index}`}
              value={banner.collectionId}
              onChange={(e) =>
                onChange({
                  ...value,
                  banners: value.banners.map((b, i) =>
                    i === index ? { ...b, collectionId: e.target.value } : b,
                  ),
                })
              }
            >
              <option value="">Todos os produtos · sem imagem</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.active ? "" : " (inativa)"}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Field
            label={`Texto do botão ${index + 1}`}
            value={banner.buttonText}
            required
            maxLength={40}
            onChange={(e) =>
              onChange({
                ...value,
                banners: value.banners.map((b, i) =>
                  i === index ? { ...b, buttonText: e.target.value } : b,
                ),
              })
            }
          />
          <div className="store-editor-actions">
            <OrderButtons
              label={`banner ${index + 1}`}
              index={index}
              count={value.banners.length}
              onMove={(direction) =>
                onChange({
                  ...value,
                  banners: move(value.banners, index, direction),
                })
              }
            />
            <Button
              variant="outline"
              size="sm"
              type="button"
              className=""
              onClick={() =>
                onChange({
                  ...value,
                  banners: value.banners.filter((_, i) => i !== index),
                })
              }
            >
              Remover banner {index + 1}
            </Button>
          </div>
        </fieldset>
      ))}
      <Button
        variant="outline"
        size="sm"
        type="button"
        className=""
        disabled={value.banners.length >= 3}
        onClick={() =>
          onChange({
            ...value,
            banners: [
              ...value.banners,
              {
                title: "",
                text: "",
                collectionId: "",
                buttonText: "Ver coleção",
              },
            ],
          })
        }
      >
        Adicionar banner
      </Button>
      <h3>Coleções em destaque</h3>
      <p className="muted">
        Escolha até 4 coleções. Cada vitrine mostra até 4 produtos ativos;
        coleções vazias ficam ocultas.
      </p>
      {collections.map((c) => (
        <Label className="product-checkbox" key={c.id}>
          <Checkbox
            checked={value.featuredCollectionIds.includes(c.id)}
            disabled={
              !value.featuredCollectionIds.includes(c.id) &&
              (!c.active || value.featuredCollectionIds.length >= 4)
            }
            onChange={(e) =>
              onChange({
                ...value,
                featuredCollectionIds: e.target.checked
                  ? [...value.featuredCollectionIds, c.id]
                  : value.featuredCollectionIds.filter((id) => id !== c.id),
              })
            }
          />
          {c.name}
          {c.active ? "" : " (inativa)"}
        </Label>
      ))}
      {value.featuredCollectionIds.map((id, index) => (
        <div className="store-editor-row" key={id}>
          <span>
            {collections.find((c) => c.id === id)?.name ??
              "Coleção indisponível"}
          </span>
          <OrderButtons
            label={`destaque ${index + 1}`}
            index={index}
            count={value.featuredCollectionIds.length}
            onMove={(direction) =>
              onChange({
                ...value,
                featuredCollectionIds: move(
                  value.featuredCollectionIds,
                  index,
                  direction,
                ),
              })
            }
          />
        </div>
      ))}
      {!collections.length && (
        <p className="muted">Cadastre coleções para organizar suas vitrines.</p>
      )}
      <h3>Sobre a loja</h3>
      <p className="muted">
        O texto também será publicado na página Sobre a loja, com link no
        rodapé. Deixe vazio para ocultar essa página.
      </p>
      <Field
        label="Título sobre a loja"
        value={value.aboutTitle}
        maxLength={100}
        onChange={(e) => onChange({ ...value, aboutTitle: e.target.value })}
      />
      <div className="field">
        <Label htmlFor="store-about">Texto sobre a loja</Label>
        <Textarea
          id="store-about"
          maxLength={2000}
          value={value.aboutText}
          onChange={(e) => onChange({ ...value, aboutText: e.target.value })}
        />
      </div>
      <StoreInformationEditor value={value} onChange={onChange} />
      <h3>Ordem das seções</h3>
      <p className="muted">
        Seções sem conteúdo ficam ocultas. Busca e categorias mostram
        diretamente os produtos.
      </p>
      {value.sectionOrder.map((section, index) => (
        <div className="store-editor-row" key={section}>
          <span>{sectionNames[section]}</span>
          <OrderButtons
            label={sectionNames[section]}
            index={index}
            count={value.sectionOrder.length}
            onMove={(direction) =>
              onChange({
                ...value,
                sectionOrder: move(value.sectionOrder, index, direction),
              })
            }
          />
        </div>
      ))}
    </div>
  );
}
