"use client";
import { useId } from "react";
import type { TaxRequest, PublicTaxProfile } from "@/domain/tax/types";
import { resolveTaxProfile } from "@/domain/tax/periods";
import { competenceSchema } from "@/domain/tax/validation";
import { Field, FieldGroup } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
export function TaxFields({
  value,
  regime: suppliedRegime,
  scope: suppliedScope,
  profiles,
  onChange,
}: {
  value: TaxRequest;
  regime?: "MEI" | "SIMPLES";
  scope?: string;
  profiles?: PublicTaxProfile[];
  onChange: (v: TaxRequest) => void;
}) {
  const id = useId();
  const profile =
    !profiles || !competenceSchema.safeParse(value.competence).success
      ? null
      : value.profileId === null
        ? null
        : value.profileId
          ? profiles.find((p) => p.id === value.profileId)
          : resolveTaxProfile(profiles, value.competence);
  const regime = profiles ? profile?.regime : suppliedRegime;
  const scope = profiles ? profile?.scope : suppliedScope;
  return (
    <div className="flex flex-col gap-3">
      <Alert>
        <AlertTitle>
          {regime === "MEI"
            ? "MEI: DAS fixo mensal"
            : regime === "SIMPLES"
              ? "Simples: alíquota informada"
              : "Tributação sem perfil vigente"}
        </AlertTitle>
        <AlertDescription>
          {regime === "MEI"
            ? "O DAS está na previsão de custos fixos do mês e não é deduzido por peça. Contribuição do lote antes dos custos fixos mensais."
            : "Estimativa gerencial para venda de produtos. Não substitui apuração fiscal."}
          {scope
            ? ` Cobertura declarada: ${scope}.`
            : " Configure o perfil para identificar o efeito tributário."}
        </AlertDescription>
      </Alert>
      <details>
        <summary>
          Competência e operação tributária · {value.competence}
        </summary>
        <FieldGroup>
          <Field
            label="Competência da estimativa"
            type="month"
            value={value.competence}
            onChange={(e) =>
              onChange({
                ...value,
                competence: e.target.value,
                profileId: undefined,
              })
            }
          />
          <Label htmlFor={id}>Operação para estimativa</Label>
          <NativeSelect
            id={id}
            value={value.operation}
            onChange={(e) =>
              onChange({
                ...value,
                operation: e.target.value as TaxRequest["operation"],
              })
            }
          >
            <option value="PRODUCT">Venda de produtos</option>
            <option value="OTHER">
              Serviço ou outra operação (fora do recorte)
            </option>
          </NativeSelect>
          <p className="text-sm text-muted-foreground">
            A classificação não é inferida pelo produto ou CNPJ. Taxas do canal
            devem estar livres de imposto duplicado. Atualizar referências
            substitui a premissa somente neste novo cálculo.
          </p>
        </FieldGroup>
      </details>
    </div>
  );
}
