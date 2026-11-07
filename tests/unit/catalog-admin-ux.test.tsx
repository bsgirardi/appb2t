// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ProductPanel } from "@/components/products/product-panel";
import { KitPanel } from "@/components/kits/kit-panel";
import { ProductForm } from "@/components/products/product-form";
import { KitForm } from "@/components/kits/kit-form";
import { calculatorData, productDTO } from "../fixtures/product";
import { pricingCatalog } from "../fixtures/pricing-catalog";
import { ProductPricingEditor } from "@/components/pricing/product-pricing-editor";
import { lotFixture } from "../fixtures/pricing";
import { calculateV2 } from "@/domain/pricing/calculate";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});
const kit = {
  id: "kit-a",
  name: "Kit Coração",
  description: "Presente",
  active: true,
  position: 0,
  version: 1,
  commercialRevision: 1,
  productIds: [productDTO.id],
  tiers: [],
};
function panel(kind: "product" | "kit") {
  return kind === "product" ? (
    <ProductPanel
      products={[
        { ...productDTO, name: "Coração" },
        { ...productDTO, id: "p2", name: "Vaso", active: false },
      ]}
      data={calculatorData}
      role="OPERATOR"
    />
  ) : (
    <KitPanel
      initialKits={[
        kit,
        { ...kit, id: "kit-b", name: "Kit Vaso", active: false },
      ]}
      products={[]}
    />
  );
}
it.each(["product", "kit"] as const)(
  "%s: combines name and state, clears no-results and restores applied URL",
  (kind) => {
    window.history.replaceState(
      { preserved: 1 },
      "",
      kind === "product" ? "/produtos?other=keep" : "/kits?other=keep",
    );
    const view = render(panel(kind));
    fireEvent.change(screen.getByLabelText("Buscar por nome"), {
      target: { value: "coracao" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Filtrar registros" }));
    expect(screen.queryByRole("heading", { name: /Vaso/ })).toBeNull();
    expect(window.location.search).toContain("search=coracao");
    expect(window.history.state).toEqual({ preserved: 1 });
    fireEvent.change(screen.getByLabelText("Estado no catálogo"), {
      target: { value: "inactive" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Filtrar registros" }));
    expect(
      screen.getByText("Nenhum resultado para estes filtros"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getByRole("heading", { name: /Vaso/ })).toBeTruthy();
    expect(window.location.search).toBe("?other=keep");
    view.unmount();
    window.history.replaceState(null, "", "?search=vaso&state=inactive");
    render(panel(kind));
    expect(screen.queryByRole("heading", { name: /Coração/ })).toBeNull();
    window.history.replaceState(null, "", "?search=coracao");
    fireEvent.popState(window);
    expect(screen.getByRole("heading", { name: /Coração/ })).toBeTruthy();
    expect(
      (screen.getByLabelText("Buscar por nome") as HTMLInputElement).value,
    ).toBe("coracao");
  },
);

it("product: protects pending batch cost edits before applying a snapshot", async () => {
  const cancel = vi.fn();
  vi.spyOn(window, "confirm").mockReturnValue(false);
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: pricingCatalog })),
  );
  render(
    <ProductForm
      product={productDTO}
      data={calculatorData}
      role="ADMIN"
      onSaved={vi.fn()}
      onCancel={cancel}
    />,
  );
  fireEvent.click(screen.getByText("Ficha de custo"));
  fireEvent.click(
    screen.getByRole("button", { name: "Preparar ficha por lote" }),
  );
  const quantity = await screen.findByLabelText(/Quantidade do lote/);
  fireEvent.change(quantity, { target: { value: "5" } });
  fireEvent.click(screen.getByRole("button", { name: "Voltar aos produtos" }));
  expect(cancel).not.toHaveBeenCalled();
  expect(
    (
      screen.getByRole("button", {
        name: "Salvar produto",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
});

it("kit: locks fields while a save is in flight, avoiding unsent edits", async () => {
  let resolve!: (value: Response) => void;
  vi.spyOn(globalThis, "fetch").mockReturnValue(
    new Promise<Response>((done) => {
      resolve = done;
    }),
  );
  const saved = vi.fn();
  render(
    <KitForm kit={kit} products={[]} onSaved={saved} onCancel={vi.fn()} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Salvar kit" }));
  expect(screen.getByLabelText("Nome do kit").matches(":disabled")).toBe(true);
  resolve(new Response(JSON.stringify({ data: kit })));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
});

it("cost editor: deduplicates catalog opening and locks cancellation during estimate application", async () => {
  let resolveCatalog!: (value: Response) => void;
  let resolveEstimate!: (value: Response) => void;
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockReturnValueOnce(
      new Promise<Response>((done) => {
        resolveCatalog = done;
      }),
    )
    .mockReturnValueOnce(
      new Promise<Response>((done) => {
        resolveEstimate = done;
      }),
    );
  const snapshot = {
    id: "snapshot",
    version: 2 as const,
    input: lotFixture,
    result: calculateV2(lotFixture),
    actorId: "a",
    actorName: "Equipe",
    createdAt: "2026-11-05T12:00:00Z",
  };
  const apply = vi.fn();
  render(
    <ProductPricingEditor
      snapshot={snapshot}
      legacy={productDTO.calculation}
      onApply={apply}
    />,
  );
  const open = screen.getByRole("button", { name: "Revisar ficha por lote" });
  fireEvent.click(open);
  fireEvent.click(open);
  expect(fetch).toHaveBeenCalledTimes(1);
  resolveCatalog(new Response(JSON.stringify({ data: pricingCatalog })));
  fireEvent.click(
    await screen.findByRole("checkbox", {
      name: "Conferi as referências atuais da ficha",
    }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Aplicar ficha revisada" }),
  );
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(
    (
      screen.getByRole("button", {
        name: "Cancelar revisão da ficha",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  resolveEstimate(new Response(JSON.stringify({ data: snapshot })));
  await waitFor(() => expect(apply).toHaveBeenCalledOnce());
});
it.each(["product", "kit"] as const)(
  "%s: failed refresh retains records",
  async (kind) => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Sem conexão"));
    render(panel(kind));
    fireEvent.click(screen.getByRole("button", { name: "Atualizar lista" }));
    await screen.findByText(/Não foi possível conectar/);
    expect(screen.getByRole("heading", { name: /Coração/ })).toBeTruthy();
  },
);
it.each(["product", "kit"] as const)(
  "%s: refuses cancel and reload with unsaved fields",
  (kind) => {
    const cancel = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      kind === "product" ? (
        <ProductForm
          product={productDTO}
          data={calculatorData}
          role="ADMIN"
          onSaved={vi.fn()}
          onCancel={cancel}
        />
      ) : (
        <KitForm kit={kit} products={[]} onSaved={vi.fn()} onCancel={cancel} />
      ),
    );
    const name = kind === "product" ? "Nome do produto" : "Nome do kit";
    fireEvent.change(screen.getByLabelText(name), {
      target: { value: "Rascunho preservado" },
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: kind === "product" ? "Voltar aos produtos" : "Cancelar",
      }),
    );
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    expect((screen.getByLabelText(name) as HTMLInputElement).value).toBe(
      "Rascunho preservado",
    );
    expect(
      window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
    ).toBe(false);
  },
);
it("kit: composition changes count as unsaved, failure retains selection", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(false);
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new Error("Não foi possível salvar"),
  );
  const cancel = vi.fn();
  render(
    <KitForm
      kit={kit}
      products={[
        { id: productDTO.id, name: "Peça original", active: true },
        { id: "p2", name: "Peça adicional", active: true },
      ]}
      onSaved={vi.fn()}
      onCancel={cancel}
    />,
  );
  fireEvent.click(screen.getByLabelText("Peça adicional"));
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(cancel).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Salvar kit" }));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "Não foi possível conectar",
    ),
  );
  expect(
    (screen.getByLabelText("Peça adicional") as HTMLInputElement).checked,
  ).toBe(true);
});

it("product: reordering the gallery protects navigation even without typing", () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const cancel = vi.fn();
  const first = productDTO.images[0];
  render(
    <ProductForm
      product={{
        ...productDTO,
        images: [first, { ...first, id: "second", url: "/second.png" }],
      }}
      data={calculatorData}
      role="ADMIN"
      onSaved={vi.fn()}
      onCancel={cancel}
    />,
  );
  fireEvent.click(screen.getByText("Fotos e coleções"));
  fireEvent.click(
    screen.getByRole("button", { name: "Mover foto 2 para antes" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Voltar aos produtos" }));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(cancel).not.toHaveBeenCalled();
  expect(
    screen.getByAltText("Prévia da foto 1 do produto").getAttribute("src"),
  ).toContain("second.png");
});

it("product: save failure preserves draft and success clears the exit guard", async () => {
  const saved = vi.fn();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: "CONFLICT",
            message: "Produto alterado por outra pessoa",
          },
        }),
        { status: 409 },
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ data: { ...productDTO, version: 2 } })),
    );
  const view = render(
    <ProductForm
      product={productDTO}
      data={calculatorData}
      role="ADMIN"
      onSaved={saved}
      onCancel={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Nome do produto"), {
    target: { value: "Meu produto revisado" },
  });
  fireEvent.submit(view.container.querySelector("form")!);
  await screen.findByText("Produto alterado por outra pessoa");
  expect(
    (screen.getByLabelText("Nome do produto") as HTMLInputElement).value,
  ).toBe("Meu produto revisado");
  expect(
    window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
  ).toBe(false);
  fireEvent.submit(view.container.querySelector("form")!);
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(
    window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
  ).toBe(true);
  expect(confirm).not.toHaveBeenCalled();
});

it("kit: an unchanged form leaves without a prompt and successful save clears protection", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
  const cancel = vi.fn(),
    saved = vi.fn();
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: { ...kit, version: 2 } })),
  );
  render(<KitForm kit={kit} products={[]} onSaved={saved} onCancel={cancel} />);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(cancel).toHaveBeenCalledOnce();
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Nome do kit"), {
    target: { value: "Kit revisado" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar kit" }));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(
    window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
  ).toBe(true);
});

it.each(["product", "kit"] as const)(
  "%s: retains applied filters after cancelling the editor",
  (kind) => {
    window.history.replaceState(null, "", "?search=coracao&state=active");
    render(panel(kind));
    fireEvent.click(
      screen.getByRole("button", {
        name: kind === "product" ? "Editar" : "Editar Kit Coração",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: kind === "product" ? "Voltar aos produtos" : "Cancelar",
      }),
    );
    expect(
      (screen.getByLabelText("Buscar por nome") as HTMLInputElement).value,
    ).toBe("coracao");
    expect(screen.queryByRole("heading", { name: /Vaso/ })).toBeNull();
  },
);
it.each(["product", "kit"] as const)(
  "%s: keeps keyboard focus when applying filters and restores values from history",
  (kind) => {
    render(panel(kind));
    const search = screen.getByLabelText("Buscar por nome") as HTMLInputElement;
    search.focus();
    fireEvent.change(search, { target: { value: "coracao" } });
    fireEvent.submit(screen.getByRole("form", { name: "Filtrar registros" }));
    expect(document.activeElement).toBe(search);
    const apply = screen.getByRole("button", { name: "Aplicar filtros" });
    apply.focus();
    fireEvent.change(screen.getByLabelText("Estado no catálogo"), {
      target: { value: "inactive" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Filtrar registros" }));
    expect(document.activeElement).toBe(apply);
    expect(
      (screen.getByLabelText("Estado no catálogo") as HTMLSelectElement).value,
    ).toBe("inactive");
    window.history.replaceState(null, "", "?search=vaso&state=inactive");
    fireEvent.popState(window);
    expect(search.value).toBe("vaso");
    const clear = screen.getByRole("button", { name: "Limpar filtros" });
    clear.focus();
    fireEvent.click(clear);
    expect(document.activeElement).toBe(search);
    expect(search.value).toBe("");
  },
);
