"use client";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
export type SeoImageOption = { value: string; label: string };
export const brandSeoImages: SeoImageOption[] = [
  { value: "/brand/b2t-logo.png", label: "Logotipo oficial B2T" },
  { value: "/brand/b2t-mascote.png", label: "Mascote oficial B2T" },
];
export function SeoImageSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: SeoImageOption[];
  onChange: (value: string) => void;
}) {
  const choices = [...brandSeoImages, ...options];
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Usar imagem herdada</option>
        {value && !choices.some((choice) => choice.value === value) && (
          <option value={value}>Imagem anteriormente selecionada</option>
        )}
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </NativeSelect>
      <small>
        Escolha uma imagem já cadastrada. Produtos e coleções mantêm suas
        imagens específicas.
      </small>
    </div>
  );
}
