"use client";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { Field, Notice } from "@/components/ui/field";
import { Brand } from "@/components/shell/brand";
import type { AppearanceDTO } from "@/domain/appearance/types";
import { appearanceSchema } from "@/domain/appearance/validation";
import { readableText } from "@/domain/appearance/colors";
const texts = [
  ["name", "Nome da empresa", 120],
  ["shortName", "Nome curto", 30],
  ["slogan", "Slogan", 160],
  ["email", "E-mail público", 254],
  ["phone", "Telefone público", 80],
  ["address", "Endereço público", 500],
  ["footer", "Texto do rodapé", 300],
] as const;
const colors = [
  ["lightPrimary", "Cor principal · tema claro"],
  ["lightAccent", "Cor de destaque · tema claro"],
  ["darkPrimary", "Cor principal · tema escuro"],
  ["darkAccent", "Cor de destaque · tema escuro"],
] as const;
export function AppearancePanel({ initial }: { initial: AppearanceDTO }) {
  const [draft, setDraft] = useState(initial),
    [photo, setPhoto] = useState<File>(),
    [preview, setPreview] = useState<string>(),
    [removeLogo, setRemoveLogo] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false),
    router = useRouter();
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function save(e: FormEvent) {
    e.preventDefault();
    if (pending.current) return;
    setError("");
    setMessage("");
    const { logoUrl, version, ...fields } = draft;
    void logoUrl;
    const parsed = appearanceSchema.safeParse({
      ...fields,
      expectedVersion: version,
      removeLogo,
    });
    if (!parsed.success) {
      setError(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join(" · "),
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const body = new FormData();
      body.set("data", JSON.stringify(parsed.data));
      if (photo) body.set("photo:logo", photo);
      const response = await fetch("/api/appearance", { method: "PUT", body });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "Não foi possível salvar.");
      setDraft(result.data);
      setPhoto(undefined);
      setPreview(undefined);
      setRemoveLogo(false);
      setMessage("Identidade da empresa atualizada.");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const identity = {
    ...draft,
    logoUrl: preview ?? (removeLogo ? null : draft.logoUrl),
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">IDENTIDADE DA EMPRESA</div>
          <h1>Aparência</h1>
          <p>
            Personalize a marca e as cores. As alterações são publicadas ao
            salvar.
          </p>
        </div>
      </div>
      <form onSubmit={save} className="product-edit-grid">
        {" "}
        <section className="card">
          {error && <Notice>{error}</Notice>}
          {message && <Notice kind="success">{message}</Notice>}
          <fieldset disabled={busy}>
            {texts.map(([key, label, max]) => (
              <Field
                key={key}
                label={label}
                value={draft[key]}
                maxLength={max}
                type={key === "email" ? "email" : "text"}
                required={key === "name"}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            ))}
            <Field
              label="Logo da empresa"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hint="JPEG, PNG ou WebP · até 2 MiB"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                  setError("O logo deve ter até 2 MiB.");
                  return;
                }
                setPhoto(file);
                setPreview(URL.createObjectURL(file));
                setRemoveLogo(false);
              }}
            />
            <label className="product-checkbox">
              <input
                type="checkbox"
                checked={removeLogo}
                onChange={(e) => {
                  setRemoveLogo(e.target.checked);
                  if (e.target.checked) {
                    setPhoto(undefined);
                    setPreview(undefined);
                  }
                }}
              />{" "}
              Remover logo
            </label>
            <h2>Cores dos temas</h2>
            <p className="muted">
              O tema acompanha automaticamente a preferência do dispositivo.
            </p>
            <div className="form-grid">
              {colors.map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  type="color"
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                />
              ))}
            </div>
            <button type="submit" className="button primary">
              {busy ? "Salvando…" : "Salvar aparência"}
            </button>
          </fieldset>
        </section>
        <aside className="appearance-preview card">
          <h2>Prévia da marca</h2>
          <Brand identity={identity} />
          <h3>{draft.name}</h3>
          {draft.slogan && <p>{draft.slogan}</p>}
          {draft.email && <p>{draft.email}</p>}
          {draft.phone && <p>{draft.phone}</p>}
          {draft.address && <p>{draft.address}</p>}
          <div className="preview-swatches">
            {colors.map(([key, label]) => {
              let color = "#111827";
              try {
                color = readableText(draft[key]);
              } catch {}
              return (
                <div
                  key={key}
                  style={
                    {
                      background: draft[key],
                      color,
                      padding: 16,
                      borderRadius: 10,
                    } as CSSProperties
                  }
                >
                  {label}
                </div>
              );
            })}
          </div>
          <small>{draft.footer}</small>
        </aside>
      </form>
    </>
  );
}
