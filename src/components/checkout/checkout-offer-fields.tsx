"use client";
import { useId } from "react";
import { Field } from "@/components/ui/field";
import type {
  CheckoutOfferPolicy,
  DeliveryMode,
} from "@/domain/checkout/types";
export function CheckoutOfferFields({
  value,
  onChange,
}: {
  value: CheckoutOfferPolicy;
  onChange: (v: CheckoutOfferPolicy) => void;
}) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-3">
      <legend>Checkout do catálogo</legend>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={value.directEnabled}
          onChange={(e) =>
            onChange({ ...value, directEnabled: e.target.checked })
          }
        />
        Habilitar compra direta
      </label>
      <p>
        Ative somente quando os preços, faixas e adicionais existentes cobrirem
        as configurações permitidas. Opções sob consulta seguem para
        conferência.
      </p>
      {(
        [
          ["PICKUP", "Retirada"],
          ["TEAM_SHIPPING", "Frete pela equipe"],
          ["AUTOMATIC", "Cálculo automático"],
        ] as [DeliveryMode, string][]
      ).map(([mode, label]) => (
        <label key={mode} className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={value.deliveryModes.includes(mode)}
            onChange={(e) =>
              onChange({
                ...value,
                deliveryModes: e.target.checked
                  ? [...value.deliveryModes, mode]
                  : value.deliveryModes.filter((m) => m !== mode),
              })
            }
          />
          {label}
        </label>
      ))}
      <small>
        Cálculo automático indisponível até configurar uma integração real.
        Retirada exige endereço cadastrado da loja.
      </small>
      <Field
        id={`${id}-instructions`}
        label="Instruções públicas de pagamento externo"
        value={value.externalPaymentInstructions}
        maxLength={2000}
        onChange={(e) =>
          onChange({ ...value, externalPaymentInstructions: e.target.value })
        }
      />
      <small>
        Compra direta em parcela única, vencendo no dia da confirmação. Nenhum
        pagamento será registrado automaticamente.
      </small>
    </fieldset>
  );
}
