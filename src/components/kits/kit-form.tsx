"use client";
import { useId, useRef, useState, type FormEvent } from "react";
import { Field, Notice } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { KitTierEditor } from "./kit-tier-editor";
import { kitDefinitionSchema } from "@/domain/kits/validation";
import type { KitDTO, KitDefinitionInput } from "@/domain/kits/types";
import { api, ApiError } from "@/lib/client-api";
export type KitProductOption = {
  id: string;
  name: string;
  active: boolean;
  availability?: string;
};
export function KitForm({
  kit,
  products,
  onSaved,
  onCancel,
}: {
  kit?: KitDTO;
  products: KitProductOption[];
  onSaved: (kit: KitDTO) => void;
  onCancel: () => void;
}) {
  const id = useId(),
    form = useRef<HTMLFormElement>(null),
    pending = useRef(false);
  const [draft, setDraft] = useState<KitDefinitionInput>(() =>
    kit
      ? {
          name: kit.name,
          description: kit.description,
          active: kit.active,
          position: kit.position,
          productIds: kit.productIds,
          tiers: kit.tiers,
        }
      : {
          name: "",
          description: "",
          active: false,
          position: 0,
          productIds: [],
          tiers: [],
        },
  );
  const [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [conflict, setConflict] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending.current || conflict) return;
    setError("");
    setFields({});
    const parsed = kitDefinitionSchema.safeParse(draft);
    if (!parsed.success) {
      const issues = Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message]),
      );
      setFields(issues);
      setError(parsed.error.issues[0].message);
      const first = form.current?.elements.namedItem(
        parsed.error.issues[0].path.join("."),
      );
      if (first instanceof HTMLElement) first.focus();
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      onSaved(
        await api<KitDTO>(
          kit ? `/api/kits/${kit.id}` : "/api/kits",
          { ...parsed.data, ...(kit ? { expectedVersion: kit.version } : {}) },
          kit ? "PATCH" : "POST",
        ),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível salvar o kit.",
      );
      if (e instanceof ApiError) {
        setFields(e.fields ?? {});
        if (e.code === "CONFLICT") setConflict(true);
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      ref={form}
      onSubmit={save}
      noValidate
      className="flex min-w-0 flex-col gap-4"
    >
      <h2>{kit ? "Editar kit" : "Novo kit"}</h2>
      {error && <Notice>{error}</Notice>}
      {conflict && (
        <p>
          Seu preenchimento foi preservado. Copie as alterações antes de
          cancelar e abrir a versão atual.
        </p>
      )}
      <Field
        name="name"
        label="Nome do kit"
        maxLength={160}
        className="min-h-11"
        value={draft.name}
        aria-invalid={!!fields.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <div className="field">
        <Label htmlFor={`${id}-description`}>Descrição do kit</Label>
        <Textarea
          id={`${id}-description`}
          name="description"
          maxLength={2000}
          value={draft.description}
          aria-invalid={!!fields.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </div>
      <Field
        name="position"
        label="Posição no catálogo"
        type="number"
        min={0}
        max={99999}
        step={1}
        className="min-h-11"
        value={Number.isNaN(draft.position) ? "" : draft.position}
        onChange={(e) =>
          setDraft({ ...draft, position: e.target.valueAsNumber })
        }
      />
      <label className="flex min-h-11 items-center gap-3">
        <Checkbox
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
        />
        Publicado no catálogo
      </label>
      <fieldset
        className="flex min-w-0 flex-col gap-2"
        aria-invalid={!!fields.productIds}
      >
        <legend>Produtos permitidos</legend>
        <p className="muted">
          O visitante poderá escolher somente estas peças quando estiverem
          disponíveis.
        </p>
        {products.length === 0 && (
          <p>Cadastre produtos antes de publicar um kit.</p>
        )}
        {products.map((product) => (
          <label key={product.id} className="flex min-h-11 items-center gap-3">
            <Checkbox
              name="productIds"
              value={product.id}
              checked={draft.productIds.includes(product.id)}
              disabled={
                (!product.active || product.availability === "UNAVAILABLE") &&
                !draft.productIds.includes(product.id)
              }
              onChange={(e) =>
                setDraft({
                  ...draft,
                  productIds: e.target.checked
                    ? [...draft.productIds, product.id]
                    : draft.productIds.filter((p) => p !== product.id),
                })
              }
            />
            <span>
              {product.name}
              {!product.active || product.availability === "UNAVAILABLE"
                ? " (indisponível)"
                : ""}
            </span>
          </label>
        ))}
      </fieldset>
      <KitTierEditor
        value={draft.tiers}
        disabled={busy}
        onChange={(tiers) => setDraft({ ...draft, tiers })}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="min-h-11" disabled={busy || conflict}>
          {busy ? "Salvando…" : "Salvar kit"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
