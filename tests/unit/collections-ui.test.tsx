// @vitest-environment jsdom
import { expect, it, afterEach, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { CollectionForm } from "@/components/collections/collection-form";
import { productDTO } from "../fixtures/product";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("sends selected products and keeps draft on save error", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "Conflito de edição" } }),
        { status: 409 },
      ),
    );
  render(
    <CollectionForm
      products={[productDTO]}
      onSaved={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Nome da coleção"), {
    target: { value: "Minha coleção" },
  });
  fireEvent.click(screen.getByLabelText(productDTO.name));
  fireEvent.click(screen.getByRole("button", { name: "Salvar coleção" }));
  await screen.findByText("Conflito de edição");
  const body = fetch.mock.calls[0][1]?.body as FormData;
  expect(JSON.parse(body.get("data") as string).productIds).toEqual([
    "product",
  ]);
  expect(
    (screen.getByLabelText("Nome da coleção") as HTMLInputElement).value,
  ).toBe("Minha coleção");
});
