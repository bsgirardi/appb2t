// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { mergeInquiryItem } from "@/domain/products/inquiry";
import type { InquiryReview } from "@/domain/products/inquiry";
import { InquiryPanel } from "@/components/products/inquiry-panel";
import { InquiryLink } from "@/components/products/inquiry-link";
import { ProductContact } from "@/components/products/product-contact";
import { writeInquiry } from "@/lib/inquiry-store";
import { api } from "@/lib/client-api";
import { productDTO } from "../fixtures/product";
vi.mock("@/lib/client-api", () => ({ api: vi.fn() }));
beforeEach(() => {
  localStorage.clear();
  writeInquiry([]);
  vi.clearAllMocks();
});
afterEach(cleanup);
const item = { productId: "p", color: "Azul", size: "P", quantity: 1 };
const review: InquiryReview = {
  lines: [
    {
      ...item,
      answers: [],
      commercialRevision: null,
      seenPrice: null,
      answerLabels: [],
      name: "Vaso",
      sku: "V1",
      path: "/portfolio/produto/p/vaso",
      imageUrl: "/api/products/p/image",
      price: "10.00",
      subtotal: "10.00",
      problem: null,
    },
  ],
  total: "10.00",
  ready: true,
  message: "Orçamento conferido",
  contact: "https://wa.me/5511999999999?text=Orcamento",
  channel: "whatsapp",
};
it("merges only identical options and enforces line/quantity limits", () => {
  expect(mergeInquiryItem([item], item)[0].quantity).toBe(2);
  expect(mergeInquiryItem([item], { ...item, color: "Branco" })).toHaveLength(
    2,
  );
  expect(() => mergeInquiryItem([{ ...item, quantity: 99 }], item)).toThrow();
  expect(() =>
    mergeInquiryItem(
      Array.from({ length: 20 }, (_, i) => ({ ...item, productId: String(i) })),
      item,
    ),
  ).toThrow();
});
it("adds selected options, updates the header and persists only identifiers and quantities", () => {
  render(
    <>
      <InquiryLink />
      <ProductContact
        product={{ ...productDTO, colors: ["Azul"], sizes: ["P"] }}
        phone=""
        email=""
        url="https://example.com/p"
      />
    </>,
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Adicionar à lista de orçamento",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.change(screen.getByLabelText("Cor"), { target: { value: "Azul" } });
  fireEvent.change(screen.getByLabelText("Tamanho"), {
    target: { value: "P" },
  });
  fireEvent.change(screen.getByLabelText("Quantidade para orçamento"), {
    target: { value: "2" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Adicionar à lista de orçamento" }),
  );
  expect(screen.getByRole("link", { name: "Minha lista (2)" })).toBeTruthy();
  expect(
    JSON.parse(localStorage.getItem("b2t:inquiry:v2")!).items,
  ).toMatchObject([{ ...item, productId: productDTO.id, quantity: 2 }]);
});
it("rechecks before contact and invalidates prepared contact when quantity changes", async () => {
  writeInquiry([item]);
  vi.mocked(api).mockResolvedValue(review);
  render(<InquiryPanel />);
  await screen.findByText("Vaso");
  expect(screen.queryByRole("link", { name: "Abrir WhatsApp ↗" })).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Conferir e preparar contato" }),
  );
  await screen.findByRole("link", { name: "Abrir WhatsApp ↗" });
  expect(api).toHaveBeenCalledTimes(2);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
  expect(screen.queryByRole("link", { name: "Abrir WhatsApp ↗" })).toBeNull();
  await waitFor(() => expect(api).toHaveBeenCalledTimes(3));
  fireEvent.click(screen.getByRole("button", { name: "Remover item 1" }));
  expect(screen.getByText("Sua lista está vazia")).toBeTruthy();
});
it("keeps the list after network failure and allows retry", async () => {
  writeInquiry([item]);
  vi.mocked(api)
    .mockRejectedValueOnce(new Error("Sem conexão"))
    .mockResolvedValue(review);
  render(<InquiryPanel />);
  await screen.findByText(/Sem conexão/);
  expect(localStorage.getItem("b2t:inquiry:v2")).toContain('"quantity":1');
  fireEvent.click(
    screen.getByRole("button", { name: "Conferir e preparar contato" }),
  );
  await screen.findByRole("link", { name: "Abrir WhatsApp ↗" });
});
