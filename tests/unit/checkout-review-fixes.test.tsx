// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { CheckoutContinuation } from "@/components/checkout/checkout-continuation";
import { api, ApiError } from "@/lib/client-api";
import { writeInquiry } from "@/lib/inquiry-store";
import {
  clearCheckoutAttempt,
  saveCheckoutAttempt,
} from "@/domain/checkout/attempt";
vi.mock("@/lib/client-api", async (original) => ({
  ...(await original<typeof import("@/lib/client-api")>()),
  api: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  clearCheckoutAttempt();
  history.replaceState(null, "", "/");
});
const contact = {
  name: "Ana",
  phone: "5511999999999",
  email: "",
  preferredChannel: "whatsapp",
};
const review = {
  id: "original",
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
  contact,
};
const receipt = (id: string) => ({
  checkoutId: id,
  protocol: `PED-${id}`,
  acceptedAt: "2026-10-23T12:00:00Z",
  state: "CONFIRMED",
  saleNumber: "VEN-1",
});
it.each(["recover", "retry"])(
  "pins %s to the original checkout after another tab changes the draft session",
  async (action) => {
    writeInquiry([{ productId: "p", lineId: "a", quantity: 1 }]);
    let confirmations = 0;
    let reviewed = false;
    vi.mocked(api).mockImplementation(async (url) => {
      const u = new URL(url, "http://localhost:3000");
      const original = u.searchParams.get("checkoutId") === "original";
      if (u.pathname.endsWith("/detail")) {
        if (!reviewed) throw new ApiError("Sem pedido", "NOT_FOUND");
        return {
          review,
          receipt: receipt(original ? "original" : "another"),
          cancellation: null,
        };
      }
      if (u.pathname.endsWith("/review")) {
        reviewed = true;
        return review;
      }
      if (u.pathname.endsWith("/confirm")) {
        confirmations++;
        if (confirmations === 1)
          throw new ApiError("Resposta perdida", "NETWORK");
        return receipt(original ? "original" : "another");
      }
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
    await screen.findByText(/Não sabemos se a confirmação/);
    fireEvent.click(
      screen.getByRole("button", {
        name:
          action === "recover"
            ? "Consultar resultado"
            : "Repetir a mesma tentativa",
      }),
    );
    await screen.findByText(/PED-original/);
    expect(screen.queryByText(/PED-another/)).toBeNull();
  },
);
it("starts a new acceptance phase after recovering a prior review submission", async () => {
  saveCheckoutAttempt({
    checkoutId: "original",
    operationKey: "c".repeat(64),
    expectedVersion: 1,
    fingerprint: review.fingerprint,
  });
  history.replaceState(null, "", "/portfolio/compra?checkoutId=original");
  let confirmed = false;
  vi.mocked(api).mockImplementation(async (url, body) => {
    if (url.includes("/accept")) {
      if ((body as { operationKey: string }).operationKey === "c".repeat(64))
        throw new ApiError("Chave da fase anterior", "CONFLICT");
      confirmed = true;
      return receipt("original");
    }
    return {
      review: { ...review, version: 3 },
      receipt: {
        ...receipt("original"),
        state: confirmed ? "CONFIRMED" : "OFFERED",
      },
      cancellation: null,
    };
  });
  render(<CheckoutContinuation />);
  await screen.findByRole("button", {
    name: "Confirmar compra pelo orçamento",
  });
  fireEvent.change(screen.getByLabelText("Nome de quem confirma a compra"), {
    target: { value: "Ana" },
  });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar compra pelo orçamento" }),
  );
  await screen.findByText(/Compra confirmada/);
});
it("keeps recovered checkout identity when the form reloads after another purchase changed the global cookie", async () => {
  saveCheckoutAttempt({
    checkoutId: "original",
    operationKey: "c".repeat(64),
    expectedVersion: 1,
    fingerprint: review.fingerprint,
  });
  vi.mocked(api).mockImplementation(async (url) => ({
    review,
    receipt: receipt(
      url.includes("checkoutId=original") ? "original" : "another",
    ),
    cancellation: null,
  }));
  render(<CheckoutForm />);
  await screen.findByText(/PED-original/);
  expect(screen.queryByText(/PED-another/)).toBeNull();
});
