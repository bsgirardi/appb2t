// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { api } from "@/lib/client-api";
vi.mock("@/lib/client-api", () => ({ api: vi.fn() }));
import { KitBuilder } from "@/components/kits/kit-builder";
import { KitSummary } from "@/components/kits/kit-summary";
import {
  readKitSelection,
  writeKitSelection,
  resetInquiry,
} from "@/lib/inquiry-store";
import { parseKitSelection } from "@/domain/kits/selection";
import { productDTO } from "../fixtures/product";
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  resetInquiry();
});
afterEach(cleanup);
const kit = {
  id: "k",
  name: "Kit Ana",
  description: "Escolha",
  active: true,
  position: 0,
  version: 1,
  commercialRevision: 1,
  productIds: [productDTO.id],
  tiers: [{ minQuantity: 5, kind: "FIXED" as const, amount: "15.00" }],
};
it("moving_never_changes_price_and_zoom_is_not_saved_or_undone", () => {
  writeKitSelection(
    parseKitSelection({
      schemaVersion: 2,
      items: [
        {
          lineId: "l",
          productId: productDTO.id,
          quantity: 5,
          kitInstanceId: "g",
        },
      ],
      groups: [
        {
          instanceId: "g",
          kitId: "k",
          commercialRevision: 1,
          seenPrice: null,
          placements: [{ lineId: "l", x: 0.5, y: 0.5, z: 0 }],
        },
      ],
    }),
  );
  render(
    <KitBuilder
      kit={kit}
      products={[
        {
          ...productDTO,
          price: "20.00",
          quantityTiers: [{ minQuantity: 5, baseUnitPrice: "10.00" }],
        },
      ]}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Mover Vaso geométrico, 5 unidades" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Mover para a direita" }));
  expect(readKitSelection().groups[0].placements[0].x).toBe(0.52);
  expect(screen.getByText(/85,00/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Ampliar composição" }));
  expect(readKitSelection().groups[0].placements[0].x).toBe(0.52);
  fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));
  expect(readKitSelection().groups[0].placements[0].x).toBe(0.5);
  expect(readKitSelection().items[0].quantity).toBe(5);
});
it("consult_summary_never_looks_final", () => {
  render(
    <KitSummary
      review={{
        instanceId: "g",
        kitId: "k",
        name: "Kit",
        commercialRevision: 1,
        currentRevision: 1,
        placements: [],
        seenPrice: null,
        requiresConfirmation: false,
        problem: null,
        price: {
          kind: "CONSULT",
          quantity: 5,
          knownSubtotal: "60.00",
          subtotal: null,
          discount: null,
          total: null,
          tier: { kind: "FIXED", minQuantity: 5, amount: "15.00" },
        },
      }}
    />,
  );
  expect(screen.getByText(/Total do kit a confirmar/)).toBeTruthy();
  expect(screen.getByText(/não foi aplicado/)).toBeTruthy();
  expect(screen.queryByText("Total de referência do kit")).toBeNull();
});
it("url_cannot_adopt_a_group_belonging_to_another_kit", () => {
  writeKitSelection(
    parseKitSelection({
      schemaVersion: 2,
      items: [
        {
          productId: productDTO.id,
          lineId: "foreign-line",
          quantity: 1,
          kitInstanceId: "foreign",
        },
      ],
      groups: [
        {
          instanceId: "foreign",
          kitId: "another-kit",
          commercialRevision: 1,
          seenPrice: null,
          placements: [{ lineId: "foreign-line", x: 0.5, y: 0.5, z: 0 }],
        },
      ],
    }),
  );
  render(
    <KitBuilder
      kit={kit}
      products={[productDTO]}
      initialInstanceId="foreign"
    />,
  );
  expect(
    screen.queryByRole("button", { name: "Mover Vaso geométrico, 1 unidades" }),
  ).toBeNull();
  expect(readKitSelection().groups[0].kitId).toBe("another-kit");
});

it("ready_server_review_remains_authoritative_after_price_changes", async () => {
  writeKitSelection(
    parseKitSelection({
      schemaVersion: 2,
      items: [
        {
          lineId: "l",
          productId: productDTO.id,
          quantity: 5,
          kitInstanceId: "g",
        },
      ],
      groups: [
        {
          instanceId: "g",
          kitId: "k",
          commercialRevision: 1,
          seenPrice: null,
          placements: [{ lineId: "l", x: 0.5, y: 0.5, z: 0 }],
        },
      ],
    }),
  );
  const price = {
    kind: "REFERENCE",
    quantity: 5,
    knownSubtotal: "150.00",
    subtotal: "150.00",
    discount: "15.00",
    total: "135.00",
    tier: kit.tiers[0],
  };
  const group = {
    ...readKitSelection().groups[0],
    currentRevision: 1,
    name: kit.name,
    price,
    problem: null,
    requiresConfirmation: true,
  };
  const review = {
    ready: false,
    lines: [
      {
        lineId: "l",
        answers: [],
        answerLabels: [],
        currentRevision: 2,
        configuredPrice: {
          kind: "REFERENCE",
          unit: "30.00",

          subtotal: "150.00",
        },
        problem: null,
      },
    ],
    groups: [group],
    total: "135.00",
    message: "",
  };
  vi.mocked(api)
    .mockResolvedValueOnce(review)
    .mockResolvedValueOnce({
      ...review,
      ready: true,
      groups: [{ ...group, requiresConfirmation: false }],
    });
  render(
    <KitBuilder kit={kit} products={[{ ...productDTO, price: "20.00" }]} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Revisar conjunto" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Confirmar referências atuais" }),
    ).toBeTruthy(),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar referências atuais" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Revisar conjunto" }));
  await waitFor(() =>
    expect(
      screen.getByRole("link", { name: "Continuar para a lista" }),
    ).toBeTruthy(),
  );
  const summary = screen.getByRole("region", { name: "Resumo de Kit Ana" });
  expect(within(summary).getByText("R$ 135,00")).toBeTruthy();
  expect(within(summary).queryByText("R$ 85,00")).toBeNull();
  expect(readKitSelection().groups[0].seenPrice?.total).toBe("135.00");
  fireEvent.click(
    screen.getByRole("button", { name: "Mover Vaso geométrico, 5 unidades" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Mover para a direita" }));
  expect(
    within(screen.getByRole("region", { name: "Resumo de Kit Ana" })).getByText(
      "R$ 135,00",
    ),
  ).toBeTruthy();
  expect(readKitSelection().items[0].quantity).toBe(5);
});
