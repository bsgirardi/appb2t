// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { OrderSummary } from "@/components/production/order-summary";
import type { OrderDTO } from "@/domain/production/types";
afterEach(cleanup);
const order: OrderDTO = {
  id: "o",
  sequence: 1,
  version: 1,
  origin: "STOCK",
  saleId: null,
  status: "LIBERADA",
  responsibleId: "u",
  dueDate: "2026-11-07",
  notes: "",
  lines: [
    {
      id: "l",
      productId: null,
      saleLineKey: null,
      description: "Peça teste",
      technology: "FDM",
      targetUnits: 10,
      goodUnits: 3,
      failedUnits: 2,
      canceledUnits: 4,
      plannedPrinterId: "p",
    },
  ],
};
it("shows pending units excluding cancellations and failures without claiming machine availability", () => {
  render(
    <OrderSummary
      order={order}
      users={[{ id: "u", name: "Ana" }]}
      printers={[{ id: "p", name: "Máquina A" }]}
    />,
  );
  expect(screen.getByText("3 pendentes")).toBeTruthy();
  expect(screen.getByText(/3 boas · 2 falhas · 4 canceladas/)).toBeTruthy();
  expect(screen.getByText("Ana")).toBeTruthy();
  expect(screen.getByText("Máquina A")).toBeTruthy();
  expect(screen.getByText("07/11/2026")).toBeTruthy();
});
it("distinguishes a draft from finished work and handles undefined planning", () => {
  render(
    <OrderSummary
      order={{
        ...order,
        status: "RASCUNHO",
        responsibleId: null,
        dueDate: null,
        lines: [],
      }}
      users={[]}
      printers={[]}
    />,
  );
  expect(screen.getByText("Revisar e liberar a ordem")).toBeTruthy();
  expect(screen.getByText("Sem responsável")).toBeTruthy();
  expect(screen.getByText("Não definida")).toBeTruthy();
});
