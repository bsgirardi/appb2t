// @vitest-environment jsdom
import { expect, it, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { InstallmentEditor } from "@/components/commerce/installment-editor";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("preserves the original month-end anchor after an upfront payment", () => {
  render(<InstallmentEditor total="100.00" onConfirm={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("Entrada opcional (R$)"), {
    target: { value: "10.00" },
  });
  fireEvent.change(screen.getByLabelText("Número de parcelas"), {
    target: { value: "3" },
  });
  fireEvent.change(screen.getByLabelText("Primeiro vencimento / entrada"), {
    target: { value: "2027-01-31" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Dividir valor" }));
  expect(
    [1, 2, 3, 4].map(
      (n) =>
        (
          screen.getByLabelText(
            `Vencimento da parcela ${n}`,
          ) as HTMLInputElement
        ).value,
    ),
  ).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
});
it("keeps the operation key for an identical retry and distributes cents", async () => {
  const confirm = vi
    .fn()
    .mockRejectedValueOnce(new Error("Falha temporária"))
    .mockResolvedValue(undefined);
  render(<InstallmentEditor total="100.00" onConfirm={confirm} />);
  fireEvent.change(screen.getByLabelText("Número de parcelas"), {
    target: { value: "3" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Dividir valor" }));
  expect(
    (screen.getByLabelText("Valor da parcela 1") as HTMLInputElement).value,
  ).toBe("33.34");
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar parcelamento" }),
  );
  await screen.findByText("Falha temporária");
  fireEvent.click(
    screen.getByRole("button", { name: "Confirmar parcelamento" }),
  );
  await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(2));
  expect(confirm.mock.calls[0][1]).toBe(confirm.mock.calls[1][1]);
});
