"use client";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { StorefrontConfig } from "@/domain/appearance/storefront";
export function StoreInformationEditor({
  value,
  onChange,
}: {
  value: StorefrontConfig;
  onChange: (value: StorefrontConfig) => void;
}) {
  return (
    <>
      <h3>Busca e compartilhamento do catálogo</h3>
      <p className="muted">
        Campos vazios usam o nome e o slogan da empresa. Os produtos mantêm seus
        próprios títulos e descrições.
      </p>
      <Field
        label="Título do catálogo para buscadores"
        maxLength={70}
        value={value.seoTitle}
        onChange={(e) => onChange({ ...value, seoTitle: e.target.value })}
        hint={`${value.seoTitle.length}/70 caracteres`}
      />
      <div className="field">
        <Label htmlFor="store-seo-description">
          Descrição do catálogo para buscadores
        </Label>
        <Textarea
          id="store-seo-description"
          maxLength={170}
          value={value.seoDescription}
          onChange={(e) =>
            onChange({ ...value, seoDescription: e.target.value })
          }
        />
        <small className="muted">
          {value.seoDescription.length}/170 caracteres
        </small>
      </div>
      <h3>Perguntas frequentes</h3>
      <p className="muted">
        Até 12 perguntas. Publique respostas reais sobre seus produtos,
        atendimento, produção ou entrega. A página Ajuda aparece quando houver
        conteúdo salvo.
      </p>
      {value.faq.map((item, index) => (
        <fieldset className="store-editor-item" key={index}>
          <legend>Pergunta {index + 1}</legend>
          <Field
            label={`Pergunta ${index + 1}`}
            value={item.question}
            required
            maxLength={160}
            onChange={(e) =>
              onChange({
                ...value,
                faq: value.faq.map((row, i) =>
                  i === index ? { ...row, question: e.target.value } : row,
                ),
              })
            }
          />
          <div className="field">
            <Label htmlFor={`faq-answer-${index}`}>Resposta {index + 1}</Label>
            <Textarea
              id={`faq-answer-${index}`}
              value={item.answer}
              required
              maxLength={2000}
              onChange={(e) =>
                onChange({
                  ...value,
                  faq: value.faq.map((row, i) =>
                    i === index ? { ...row, answer: e.target.value } : row,
                  ),
                })
              }
            />
          </div>
          <div className="store-editor-actions">
            {([-1, 1] as const).map((direction) => (
              <Button
                variant="outline"
                size="sm"
                type="button"
                className=""
                key={direction}
                disabled={
                  direction === -1
                    ? index === 0
                    : index === value.faq.length - 1
                }
                aria-label={`${direction === -1 ? "Subir" : "Descer"} pergunta ${index + 1}`}
                onClick={() => {
                  const faq = [...value.faq];
                  [faq[index], faq[index + direction]] = [
                    faq[index + direction],
                    faq[index],
                  ];
                  onChange({ ...value, faq });
                }}
              >
                {direction === -1 ? "↑" : "↓"}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              type="button"
              className=""
              onClick={() =>
                onChange({
                  ...value,
                  faq: value.faq.filter((_, i) => i !== index),
                })
              }
            >
              Remover pergunta {index + 1}
            </Button>
          </div>
        </fieldset>
      ))}
      <Button
        variant="outline"
        size="sm"
        type="button"
        className=""
        disabled={value.faq.length >= 12}
        onClick={() =>
          onChange({
            ...value,
            faq: [...value.faq, { question: "", answer: "" }],
          })
        }
      >
        Adicionar pergunta
      </Button>
    </>
  );
}
