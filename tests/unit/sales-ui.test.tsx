// @vitest-environment jsdom
import { expect, it, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { InstallmentEditor } from "@/components/commerce/installment-editor";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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
