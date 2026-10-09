"use client";
import type { ComponentProps } from "react";
import { ActionForm as BaseActionForm } from "@/components/finance/shared";
export function ActionForm(props: ComponentProps<typeof BaseActionForm>) {
  return <BaseActionForm {...props} preserveAmbiguous />;
}
import { Field } from "@/components/ui/field";
import { todaySaoPaulo } from "@/domain/commerce/dates";
export const text = (f: FormData, name: string) =>
  String(f.get(name) ?? "").trim();
export const optional = (f: FormData, name: string) =>
  text(f, name) || undefined;
export const decimal = (f: FormData, name: string) =>
  text(f, name).replace(",", ".") || null;
export const count = (f: FormData, name: string) => Number(text(f, name) || 0);
export const names: Record<string, string> = {
  RASCUNHO: "Rascunho",
  LIBERADA: "Liberada",
  EM_EXECUCAO: "Em execução",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
  SALE: "Para venda",
  STOCK: "Para estoque",
  REPORT: "Apontamento",
  CORRECTION: "Correção",
  UPDATE: "Atualização",
  CLOSE_REMAINDER: "Cancelamento do restante",
  COMPLETE: "Conclusão",
  OPENING: "Contagem inicial",
  LEGACY: "Reconhecimento legado",
  PRODUCTION: "Produção",
  ADJUSTMENT: "Ajuste",
};
export function DateReason({ required = false }: { required?: boolean }) {
  return (
    <>
      <Field
        label="Data efetiva"
        name="effectiveDate"
        type="date"
        required
        defaultValue={todaySaoPaulo(new Date())}
      />
      <Field
        label="Justificativa"
        name="reason"
        required={required}
        minLength={3}
        maxLength={2000}
        hint="Obrigatória para falhas, correções, falta de material e datas anteriores."
      />
    </>
  );
}
export function Toggle({
  name,
  label,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 py-2">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      {label}
    </label>
  );
}
