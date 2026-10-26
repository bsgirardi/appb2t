"use client";
import { AdminForm } from "@/components/admin/admin-form";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useRef, useState, type FormEvent } from "react";
import type {
  CollectionDTO,
  CollectionInput,
} from "@/domain/collections/types";
import type { ProductDTO } from "@/domain/products/types";
import { Field, Notice } from "@/components/ui/field";
import { collectionSchema } from "@/domain/collections/validation";
export function CollectionForm({
  collection,
  products,
  onSaved,
  onCancel,
}: {
  collection?: CollectionDTO;
  products: ProductDTO[];
  onSaved: (row: CollectionDTO) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<CollectionInput>(() =>
    collection
      ? {
          name: collection.name,
          description: collection.description,
          active: collection.active,
          position: collection.position,
          productIds: collection.productIds,
          expectedVersion: collection.version,
        }
      : {
          name: "",
          description: "",
          active: true,
          position: 0,
          productIds: [],
        },
  );
  const [photo, setPhoto] = useState<File>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (pending.current) return;
    setError("");
    const parsed = collectionSchema.safeParse(draft);
    if (!parsed.success) {
      setError("Confira os campos da coleção e selecione até 1000 produtos.");
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("data", JSON.stringify(parsed.data));
      if (photo) body.set("photo:cover", photo);
      const response = await fetch(
        collection ? `/api/collections/${collection.id}` : "/api/collections",
        { method: collection ? "PUT" : "POST", body },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "Não foi possível salvar.");
      onSaved(result.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Card asChild>
      <AdminForm onSubmit={save} className="product-form">
        {error && <Notice>{error}</Notice>}
        <fieldset disabled={busy}>
          <Field
            label="Nome da coleção"
            value={draft.name}
            maxLength={120}
            required
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <div className="field">
            <Label htmlFor="collection-description">Descrição da coleção</Label>
            <Textarea
              id="collection-description"
              value={draft.description}
              maxLength={2000}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </div>
          <Field
            label="Ordem de exibição"
            type="number"
            min={0}
            max={100000}
            value={draft.position}
            onChange={(e) =>
              setDraft({ ...draft, position: Number(e.target.value) })
            }
          />
          <Field
            label="Capa da coleção"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hint="Opcional · até 5 MiB. Sem capa, usamos a foto de um produto ativo."
            onChange={(e) => setPhoto(e.target.files?.[0])}
          />
          {collection?.imageUrl && (
            <Label className="product-checkbox">
              <Checkbox
                checked={draft.removeImage ?? false}
                onChange={(e) =>
                  setDraft({ ...draft, removeImage: e.target.checked })
                }
              />{" "}
              Remover capa atual
            </Label>
          )}
          <Label className="product-checkbox">
            <Checkbox
              checked={draft.active}
              onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
            />{" "}
            Coleção ativa no catálogo
          </Label>
          <h2>Produtos da coleção</h2>
          <p className="muted">
            Selecione até 1000 produtos. Produtos inativos ficam ocultos no
            catálogo.
          </p>
          <div className="selection-list">
            {products.map((p) => (
              <Label className="product-checkbox" key={p.id}>
                <Checkbox
                  checked={draft.productIds.includes(p.id)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      productIds: e.target.checked
                        ? [...draft.productIds, p.id]
                        : draft.productIds.filter((id) => id !== p.id),
                    })
                  }
                />
                {p.name}
                {p.active ? "" : " (inativo)"}
              </Label>
            ))}
          </div>
          <div className="product-actions">
            <Button variant="default" size="sm" className="" type="submit">
              {busy ? "Salvando…" : "Salvar coleção"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className=""
              type="button"
              onClick={onCancel}
            >
              Voltar
            </Button>
          </div>
        </fieldset>
      </AdminForm>
    </Card>
  );
}
