// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { KitPanel } from "@/components/kits/kit-panel";
import { KitForm } from "@/components/kits/kit-form";
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const kit = {
  id: "k",
  name: "Kit Ana",
  description: "Escolha",
  active: true,
  position: 0,
  version: 2,
  commercialRevision: 1,
  productIds: ["p"],
  tiers: [],
};
it("preserves_inputs_and_expected_version_after_conflict", async () => {
  const calls: unknown[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    calls.push(JSON.parse(String(init?.body)));
    return new Response(
      JSON.stringify({
        error: {
          code: "CONFLICT",
          message:
            "Outra pessoa alterou este kit. Atualize antes de tentar novamente.",
        },
      }),
      { status: 409 },
    );
  });
  const view = render(
    <KitForm
      kit={kit}
      products={[
        { id: "p", name: "Peça", active: true, availability: "AVAILABLE" },
      ]}
      onSaved={() => {}}
      onCancel={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText("Nome do kit"), {
    target: { value: "Kit Ana revisado" },
  });
  fireEvent.submit(view.container.querySelector("form")!);
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("Outra pessoa"),
  );
  expect((screen.getByLabelText("Nome do kit") as HTMLInputElement).value).toBe(
    "Kit Ana revisado",
  );
  expect(calls[0]).toMatchObject({
    expectedVersion: 2,
    name: "Kit Ana revisado",
    productIds: ["p"],
  });
});
it("requires_allowed_products_before_publishing", async () => {
  const view = render(
    <KitForm products={[]} onSaved={() => {}} onCancel={() => {}} />,
  );
  fireEvent.change(screen.getByLabelText("Nome do kit"), {
    target: { value: "Kit novo" },
  });
  fireEvent.click(screen.getByLabelText("Publicado no catálogo"));
  fireEvent.submit(view.container.querySelector("form")!);
  expect(screen.getByRole("alert").textContent).toContain("produto permitido");
});

it("reloads_the_current_kit_version_after_an_edit_conflict", async () => {
  const calls: unknown[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    if (init?.method === "PATCH") {
      calls.push(JSON.parse(String(init.body)));
      return new Response(
        JSON.stringify({
          error: {
            code: "CONFLICT",
            message: "Outra pessoa alterou este kit.",
          },
        }),
        { status: 409 },
      );
    }
    return new Response(
      JSON.stringify({ data: [{ ...kit, name: "Kit atual", version: 3 }] }),
      { status: 200 },
    );
  });
  const view = render(
    <KitPanel
      initialKits={[kit]}
      products={[
        { id: "p", name: "Peça", active: true, availability: "AVAILABLE" },
      ]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Editar Kit Ana" }));
  fireEvent.change(screen.getByLabelText("Nome do kit"), {
    target: { value: "Meu rascunho" },
  });
  fireEvent.submit(view.container.querySelector("form")!);
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain("Outra pessoa"),
  );
  expect((screen.getByLabelText("Nome do kit") as HTMLInputElement).value).toBe(
    "Meu rascunho",
  );
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  fireEvent.click(screen.getByRole("button", { name: "Atualizar lista" }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Editar Kit atual" }),
    ).toBeTruthy(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Editar Kit atual" }));
  fireEvent.submit(view.container.querySelector("form")!);
  await waitFor(() => expect(calls).toHaveLength(2));
  expect(calls[1]).toMatchObject({ expectedVersion: 3, name: "Kit atual" });
});
