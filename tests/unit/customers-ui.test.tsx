// @vitest-environment jsdom
import { expect, it, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CustomerForm } from "@/components/customers/customer-form";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("preserves customer data when the server reports a conflict", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        error: { message: "Cadastro alterado por outra pessoa" },
      }),
      { status: 409 },
    ),
  );
  render(<CustomerForm onSaved={vi.fn()} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Nome do cliente", { exact: true }), {
    target: { value: "Ana" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar cliente" }));
  await screen.findByText("Cadastro alterado por outra pessoa");
  expect(
    (screen.getByLabelText("Nome do cliente") as HTMLInputElement).value,
  ).toBe("Ana");
});
