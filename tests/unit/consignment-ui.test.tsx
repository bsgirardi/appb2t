// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import {
  CommissionSummary,
  CommandForm,
} from "@/components/consignment/shared";
import { Field } from "@/components/ui/field";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("explains retained commission without showing a fictitious payable", () => {
  render(
    <CommissionSummary
      model="RETIDA"
      lines={[
        { quantity: 1, unitPrice: "100.00", percent: "20", model: "RETIDA" },
      ]}
    />,
  );
  expect(screen.getByText(/Repasse a receber: R\$ 80,00/)).toBeTruthy();
  expect(screen.queryByText(/Comissão a pagar/)).toBeNull();
});
it("shows full collection and commission payable separately", () => {
  render(
    <CommissionSummary
      model="SEPARADA"
      lines={[
        { quantity: 1, unitPrice: "100.00", percent: "20", model: "SEPARADA" },
      ]}
    />,
  );
  expect(screen.getByText(/Repasse a receber: R\$ 100,00/)).toBeTruthy();
  expect(screen.getByText(/Comissão a pagar: R\$ 20,00/)).toBeTruthy();
});
it("preserves edits and retry key on network failure without issuing overlapping commands", async () => {
  const bodies: Record<string, unknown>[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    throw new Error("offline");
  });
  render(
    <CommandForm
      area="partners"
      build={(d) => ({ type: "CREATE", location: String(d.get("location")) })}
      onSaved={() => {}}
      label="Salvar teste"
    >
      <Field name="location" label="Local" defaultValue="Loja" />
    </CommandForm>,
  );
  fireEvent.change(screen.getByLabelText("Local"), {
    target: { value: "Loja alterada" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar teste" }));
  await screen.findByRole("alert");
  expect((screen.getByLabelText("Local") as HTMLInputElement).value).toBe(
    "Loja alterada",
  );
  fireEvent.click(screen.getByRole("button", { name: "Salvar teste" }));
  await waitFor(() => expect(bodies.length).toBe(2));
  expect((bodies[0].payload as Record<string, unknown>).operationKey).toBe(
    (bodies[1].payload as Record<string, unknown>).operationKey,
  );
});
