// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EntryForm } from "@/components/finance/entry-form";
afterEach(cleanup);
it("explains financial effect alongside fields and keeps required semantics", () => {
  render(<EntryForm categories={[]} onDone={vi.fn()} onCancel={vi.fn()} />);
  const summary = screen.getByRole("complementary", {
    name: "Resumo da tarefa",
  });
  expect(summary.textContent).toContain("saldo");
  expect(
    (screen.getByLabelText("Categoria") as HTMLSelectElement).required,
  ).toBe(true);
  expect(
    (screen.getByLabelText("Descrição") as HTMLInputElement).required,
  ).toBe(true);
  expect(
    screen.getByRole("button", { name: "Salvar lançamento" }),
  ).toBeTruthy();
});
