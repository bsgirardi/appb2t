// @vitest-environment jsdom
import { useState } from "react";
import { expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CheckoutOfferFields } from "@/components/checkout/checkout-offer-fields";
import { readCheckoutPolicy } from "@/domain/checkout/policy";
it("leaves legacy checkout disabled and lets the team explicitly choose delivery and payment", () => {
  function Form() {
    const [value, onChange] = useState(readCheckoutPolicy(null));
    return <CheckoutOfferFields value={value} onChange={onChange} />;
  }
  render(<Form />);
  const direct = screen.getByLabelText(
    "Habilitar compra direta",
  ) as HTMLInputElement;
  expect(direct.checked).toBe(false);
  fireEvent.click(direct);
  expect(direct.checked).toBe(true);
  expect(
    screen.getByLabelText("Instruções públicas de pagamento externo"),
  ).toBeTruthy();
  expect(screen.getByText(/integração real/i)).toBeTruthy();
});
