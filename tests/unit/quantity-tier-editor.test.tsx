// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QuantityTierEditor } from "@/components/products/quantity-tier-editor";
import { KitTierEditor } from "@/components/kits/kit-tier-editor";
import type { QuantityTier, KitDiscountTier } from "@/domain/kits/types";
afterEach(cleanup);
it("edits_individual_threshold_and_base_price_then_removes_it", () => {
  function Form() {
    const [value, onChange] = useState<QuantityTier[]>([]);
    return (
      <>
        <QuantityTierEditor value={value} onChange={onChange} />
        <output>{JSON.stringify(value)}</output>
      </>
    );
  }
  const view = render(<Form />);
  fireEvent.click(
    screen.getByRole("button", { name: "Adicionar faixa de quantidade" }),
  );
  fireEvent.change(screen.getByLabelText("Quantidade mínima da faixa 1"), {
    target: { value: "10" },
  });
  fireEvent.change(screen.getByLabelText("Preço-base unitário da faixa 1"), {
    target: { value: "18.00" },
  });
  expect(
    JSON.parse(view.container.querySelector("output")!.textContent!),
  ).toEqual([{ minQuantity: 10, baseUnitPrice: "18.00" }]);
  fireEvent.click(screen.getByRole("button", { name: "Remover faixa 1" }));
  expect(view.container.querySelector("output")!.textContent).toBe("[]");
});
it("changing_discount_kind_removes_incompatible_value", () => {
  function Form() {
    const [value, onChange] = useState<KitDiscountTier[]>([
      { minQuantity: 5, kind: "PERCENT", percent: "10.00" },
    ]);
    return (
      <>
        <KitTierEditor value={value} onChange={onChange} />
        <output>{JSON.stringify(value)}</output>
      </>
    );
  }
  const view = render(<Form />);
  fireEvent.change(screen.getByLabelText("Tipo de desconto da faixa 1"), {
    target: { value: "FIXED" },
  });
  fireEvent.change(screen.getByLabelText("Desconto fixo da faixa 1 (R$)"), {
    target: { value: "15.00" },
  });
  expect(
    JSON.parse(view.container.querySelector("output")!.textContent!),
  ).toEqual([{ minQuantity: 5, kind: "FIXED", amount: "15.00" }]);
  expect(screen.queryByLabelText("Percentual da faixa 1 (%)")).toBeNull();
});
