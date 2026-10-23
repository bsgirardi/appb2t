// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { api, ApiError } from "@/lib/client-api";
import { writeInquiry, readInquiry } from "@/lib/inquiry-store";
vi.mock("@/lib/client-api", async (original) => ({
  ...(await original<typeof import("@/lib/client-api")>()),
  api: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("keeps the selection and offers recovery when the confirmation response is lost", async () => {
  writeInquiry([{ productId: "p", lineId: "a", quantity: 1 }]);
  const v = {
    id: "c",
    version: 1,
    fingerprint: "a".repeat(64),
    route: "DIRECT",
    lines: [],
    groups: [],
    delivery: { mode: "PICKUP" },
    pickupAddress: "Loja",
    shipping: "0.00",
    discount: "0.00",
    total: "75.00",
    paymentTerms: "Externo",
    installments: [],
    reasons: [],
    deliveryModes: ["PICKUP"],
    contact: {
      name: "Ana",
      phone: "5511999999999",
      email: "",
      preferredChannel: "whatsapp",
    },
  };
  vi.mocked(api).mockImplementation(async (url) => {
    if (url.endsWith("detail")) throw new ApiError("Sem pedido", "NOT_FOUND");
    if (url.endsWith("review")) return v;
    if (url.endsWith("confirm"))
      throw new ApiError("Conexão perdida", "NETWORK");
    return {};
  });
  render(<CheckoutForm />);
  fireEvent.change(screen.getByLabelText("Seu nome"), {
    target: { value: "Ana" },
  });
  fireEvent.change(screen.getByLabelText("Seu WhatsApp"), {
    target: { value: "11999999999" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Revisar condições" }));
  await screen.findByText("Total: R$ 75,00", { exact: false });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar compra" }));
  await screen.findByText(/Não sabemos se a confirmação foi concluída/);
  expect(
    screen.getByRole("button", { name: "Consultar resultado" }),
  ).toBeTruthy();
  expect(readInquiry()).toHaveLength(1);
  expect((screen.getByLabelText("Seu nome") as HTMLInputElement).value).toBe(
    "Ana",
  );
});
