// @vitest-environment jsdom
import { expect, it, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  act,
} from "@testing-library/react";
import { ActionForm } from "@/components/finance/shared";
import { SettlementForm } from "@/components/finance/settlement-form";
import type { EntryDTO, AccountDTO } from "@/domain/finance/types";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("pending_action_submits_once", async () => {
  let finish!: () => void;
  const submit = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const { container } = render(
    <ActionForm title="Transferir" onSubmit={submit} onDone={() => {}}>
      <label>
        Valor
        <input name="amount" defaultValue="20.00" />
      </label>
    </ActionForm>,
  );
  fireEvent.submit(container.querySelector("form")!);
  fireEvent.submit(container.querySelector("form")!);
  expect(submit).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText("Valor").matches(":disabled")).toBe(true);
  await act(async () => finish());
  expect(screen.getByLabelText("Valor").matches(":disabled")).toBe(false);
});
it("keeps the financial draft and operation key on an identical retry", async () => {
  const submit = vi
    .fn()
    .mockRejectedValueOnce(new Error("Falha temporária"))
    .mockResolvedValue(undefined);
  render(
    <ActionForm title="Baixa" onSubmit={submit} onDone={vi.fn()}>
      <label>
        Valor
        <input name="amount" defaultValue="30.00" />
      </label>
    </ActionForm>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
  await screen.findByText("Falha temporária");
  expect((screen.getByLabelText("Valor") as HTMLInputElement).value).toBe(
    "30.00",
  );
  fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
  await vi.waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  expect(submit.mock.calls[0][1]).toBe(submit.mock.calls[1][1]);
});
it("explains internal payment recording, partial amounts and hides inactive accounts", () => {
  const entry = {
    id: "entry",
    kind: "RECEIVABLE",
    remainingAmount: "70.00",
    version: 1,
  } as EntryDTO;
  const accounts = [
    { id: "a", name: "Conta ativa", active: true, balance: "100.00" },
    { id: "b", name: "Conta inativa", active: false, balance: "0.00" },
  ] as AccountDTO[];
  render(
    <SettlementForm
      entry={entry}
      accounts={accounts}
      onDone={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  expect(
    screen.getByText(/não envia dinheiro nem emite cobrança/),
  ).toBeTruthy();
  expect(
    screen.getByText(/Você pode registrar uma baixa parcial/),
  ).toBeTruthy();
  expect(screen.queryByRole("option", { name: /Conta inativa/ })).toBeNull();
  expect((screen.getByLabelText("Valor (R$)") as HTMLInputElement).value).toBe(
    "70.00",
  );
});
