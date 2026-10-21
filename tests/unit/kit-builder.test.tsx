// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
