// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProductForm } from "@/components/products/product-form";
import { calculatorData, productDTO } from "../fixtures/product";
afterEach(cleanup);
it("keeps search details collapsed and preserves edits while toggling", () => {
  render(
    <ProductForm
      product={productDTO}
      data={calculatorData}
      role="ADMIN"
      onSaved={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  const section = screen
    .getByText("Busca e compartilhamento")
    .closest("details");
  expect(section).not.toBeNull();
  expect(section?.open).toBe(false);
  fireEvent.click(section!.querySelector("summary")!);
  fireEvent.change(screen.getByLabelText("Título para buscadores"), {
    target: { value: "Peça especial" },
  });
  fireEvent.click(section!.querySelector("summary")!);
  fireEvent.click(section!.querySelector("summary")!);
  expect(
    (screen.getByLabelText("Título para buscadores") as HTMLInputElement).value,
  ).toBe("Peça especial");
  expect(
    screen.getByRole("complementary", { name: "Resumo da tarefa" }),
  ).toBeTruthy();
});
