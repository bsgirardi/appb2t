// @vitest-environment jsdom
import { expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { KitBuilder } from "@/components/kits/kit-builder";
import { productDTO } from "../fixtures/product";
it("invalid_saved_draft_shows_recovery_without_overwriting_raw_data", () => {
  const raw = "{broken-v3";
  localStorage.clear();
  localStorage.setItem("b2t:inquiry:v3", raw);
  render(
    <KitBuilder
      kit={{
        id: "k",
        name: "Kit",
        description: "",
        active: true,
        position: 0,
        version: 1,
        commercialRevision: 1,
        productIds: [productDTO.id],
        tiers: [],
      }}
      products={[productDTO]}
    />,
  );
  expect(
    screen.getByRole("link", { name: "Abrir recuperação da lista" }),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Revisar conjunto" })).toBeNull();
  expect(localStorage.getItem("b2t:inquiry:v3")).toBe(raw);
});
