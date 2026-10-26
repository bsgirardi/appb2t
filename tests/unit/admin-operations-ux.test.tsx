// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { DateReason } from "@/components/production/shared";
import { ActionForm } from "@/components/finance/shared";
import { MovementForm } from "@/components/stock/movement-form";
import type { StockItemDTO } from "@/server/stock/queries";
afterEach(cleanup);
it("requires a reason before a consumption makes stock negative, including kg conversion", () => {
  const item: StockItemDTO = {
    id: "m",
    name: "PLA",
    unit: "G",
    active: true,
    version: 1,
    inventoriedAt: "2026-01-01",
    physical: "2000",
    reserved: "1000",
    available: "1000",
    shortage: "0",
    identities: [],
    movements: [],
    materialId: null,
    extraId: null,
    method: undefined,
    manualUnitCost: undefined,
    valuation: undefined,
  };
  render(
    <MovementForm
      item={item}
      admin={false}
      onDone={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  const reason = screen.getByLabelText("Justificativa") as HTMLInputElement;
  fireEvent.change(screen.getByLabelText("Quantidade"), {
    target: { value: "2" },
  });
  expect(reason.required).toBe(false);
  fireEvent.change(screen.getByLabelText("Unidade"), {
    target: { value: "KG" },
  });
  expect(reason.required).toBe(true);
  fireEvent.change(screen.getByLabelText("Quantidade"), {
    target: { value: "0,5" },
  });
  expect(reason.required).toBe(false);
});
it("marks reason required for an earlier production date without losing it", () => {
  render(<DateReason />);
  const reason = screen.getByLabelText("Justificativa") as HTMLInputElement;
  expect(reason.required).toBe(false);
  fireEvent.change(reason, { target: { value: "Conferência" } });
  fireEvent.change(screen.getByLabelText("Data efetiva"), {
    target: { value: "2020-01-01" },
  });
  expect(reason.required).toBe(true);
  expect(reason.value).toBe("Conferência");
});
it("keeps the contextual summary and rejects duplicate submissions", async () => {
  let finish!: () => void;
  const send = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  render(
    <ActionForm
      title="Receber compra"
      summary={<p>Material disponível após confirmar</p>}
      onSubmit={send}
      onDone={vi.fn()}
    >
      <input name="supplier" defaultValue="Ana" />
    </ActionForm>,
  );
  expect(
    screen.getByRole("complementary", { name: "Resumo da tarefa" }),
  ).toBeTruthy();
  const form = document.querySelector("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(send).toHaveBeenCalledOnce();
  finish();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Salvar" }).hasAttribute("disabled"),
    ).toBe(false),
  );
});
