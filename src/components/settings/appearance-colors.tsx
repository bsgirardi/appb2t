"use client";
import { Field } from "@/components/ui/field";
import { siteThemeVariables } from "@/domain/appearance/theme";
import { readableText } from "@/domain/appearance/colors";
import { defaultSiteColors } from "@/domain/appearance/site-colors";
import type { AppearanceDTO } from "@/domain/appearance/types";

const palettes = [
  {
    name: "Site",
    description: "Cores do catálogo e das páginas públicas.",
    fields: [
      ["siteLightPrimary", "Cor principal · tema claro"],
      ["siteLightAccent", "Cor de destaque · tema claro"],
      ["siteDarkPrimary", "Cor principal · tema escuro"],
      ["siteDarkAccent", "Cor de destaque · tema escuro"],
    ],
  },
  {
    name: "Administrativo",
    description: "Cores da área da equipe, do login e do menu móvel.",
    fields: [
      ["lightPrimary", "Cor principal · tema claro"],
      ["lightAccent", "Cor de destaque · tema claro"],
      ["darkPrimary", "Cor principal · tema escuro"],
      ["darkAccent", "Cor de destaque · tema escuro"],
    ],
  },
] as const;
export function AppearanceColors({
  value,
  onChange,
}: {
  value: AppearanceDTO;
  onChange: (value: AppearanceDTO) => void;
}) {
  const colors = { ...defaultSiteColors, ...value };
  return (
    <>
      <p className="muted">
        Cada área tem sua própria paleta. O tema claro ou escuro acompanha a
        preferência do dispositivo.
      </p>
      {palettes.map((palette) => (
        <fieldset key={palette.name} className="appearance-palette">
          <legend>Cores do {palette.name.toLowerCase()}</legend>
          <p className="muted">{palette.description}</p>
          <div className="form-grid">
            {palette.fields.map(([key, label]) => (
              <Field
                key={key}
                label={palette.name + " · " + label}
                type="color"
                value={colors[key]}
                onChange={(event) =>
                  onChange({ ...value, [key]: event.target.value })
                }
              />
            ))}
          </div>
        </fieldset>
      ))}
    </>
  );
}
export function AppearanceColorPreviews({ value }: { value: AppearanceDTO }) {
  const colors = { ...defaultSiteColors, ...value };
  let siteText: Record<string, string> = {};
  try {
    const variables = siteThemeVariables(colors);
    siteText = {
      siteLightPrimary: variables["--site-light-on-primary"],
      siteLightAccent: variables["--site-light-on-accent"],
      siteDarkPrimary: variables["--site-dark-on-primary"],
      siteDarkAccent: variables["--site-dark-on-accent"],
    };
  } catch {
    /* Validation explains invalid contrast on save. */
  }
  return (
    <>
      {palettes.map((palette) => (
        <section
          key={palette.name}
          aria-label={"Prévia de cores · " + palette.name}
        >
          <h3>{"Prévia · " + palette.name}</h3>
          <div className="preview-swatches">
            {palette.fields.map(([key, label]) => {
              let foreground = "#111827";
              try {
                foreground = siteText[key] ?? readableText(colors[key]);
              } catch {
                /* Validation explains invalid contrast on save. */
              }
              return (
                <div
                  key={key}
                  className="appearance-swatch"
                  style={{ background: colors[key], color: foreground }}
                >
                  {label}
                  <br />
                  <code>{colors[key]}</code>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
