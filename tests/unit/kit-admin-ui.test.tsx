// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
