// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AuthForm } from "@/components/auth-form";
import { api } from "@/lib/client-api";
import { CatalogFilterForm } from "@/components/products/catalog-filter-form";
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/client-api", () => ({ api: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("keeps search accessible and all edited criteria in GET after closing filters", () => {
  render(
    <CatalogFilterForm
      context={{
        search: "vaso",
        collection: "c",
        order: "maior-preco",
        page: 3,
        priceMin: "0",
      }}
      collections={[{ id: "c", name: "Presentes" }]}
    />,
  );
  const search = screen.getByRole("searchbox", { name: "Buscar no catálogo" });
  const trigger = screen.getByRole("button", { name: "Filtrar produtos" });
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  fireEvent.change(search, { target: { value: "vaso azul" } });
  fireEvent.click(trigger);
  fireEvent.change(screen.getByLabelText("Preço máximo (R$)"), {
    target: { value: "60,50" },
  });
  fireEvent.click(trigger);
  const form = screen.getByRole("form", {
    name: "Filtrar produtos",
  }) as HTMLFormElement;
  const data = new FormData(form);
  expect(Object.fromEntries(data)).toMatchObject({
    busca: "vaso azul",
    colecao: "c",
    ordem: "maior-preco",
    precoMin: "0",
    precoMax: "60,50",
  });
  expect(data.has("pagina")).toBe(false);
  expect(form.method).toBe("get");
  fireEvent.click(trigger);
  expect(
    (screen.getByLabelText("Preço máximo (R$)") as HTMLInputElement).value,
  ).toBe("60,50");
});
it("announces login pending, blocks duplicate submission and keeps the existing destination", async () => {
  let finish!: () => void;
  vi.mocked(api).mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  render(<AuthForm />);
  fireEvent.change(screen.getByLabelText("E-mail"), {
    target: { value: "equipe@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Senha"), {
    target: { value: "senha-de-teste" },
  });
  const button = screen.getByRole("button", { name: "Entrar no sistema" });
  const form = button.closest("form")!;
  fireEvent.submit(form);
  expect(screen.getByRole("status").textContent).toContain(
    "Entrando no sistema",
  );
  expect(
    (screen.getByRole("button", { name: /Entrando/ }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.submit(form);
  expect(api).toHaveBeenCalledTimes(1);
  expect(api).toHaveBeenCalledWith("/api/auth/login", {
    email: "equipe@example.test",
    password: "senha-de-teste",
  });
  finish();
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith("/dashboard"),
  );
  expect(router.refresh).toHaveBeenCalledOnce();
});
it("retains credentials and allows retry after the safe API error", async () => {
  vi.mocked(api).mockRejectedValueOnce(new Error("E-mail ou senha inválidos."));
  render(<AuthForm />);
  fireEvent.change(screen.getByLabelText("E-mail"), {
    target: { value: "equipe@example.test" },
  });
  fireEvent.change(screen.getByLabelText("Senha"), {
    target: { value: "teste" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Entrar no sistema" }).closest("form")!,
  );
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "E-mail ou senha inválidos.",
    ),
  );
  expect((screen.getByLabelText("E-mail") as HTMLInputElement).value).toBe(
    "equipe@example.test",
  );
  expect(
    (
      screen.getByRole("button", {
        name: "Entrar no sistema",
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(false);
  expect(router.replace).not.toHaveBeenCalled();
});
it("keeps password confirmation and the existing password endpoint and redirect", async () => {
  vi.mocked(api).mockResolvedValueOnce({});
  render(<AuthForm mode="password" />);
  fireEvent.change(screen.getByLabelText("Senha atual"), {
    target: { value: "atual" },
  });
  fireEvent.change(screen.getByLabelText("Nova senha"), {
    target: { value: "nova-senha-segura" },
  });
  fireEvent.change(screen.getByLabelText("Repita a nova senha"), {
    target: { value: "diferente" },
  });
  const form = screen
    .getByRole("button", { name: "Atualizar senha" })
    .closest("form")!;
  fireEvent.submit(form);
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "As senhas não coincidem",
    ),
  );
  expect(api).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Repita a nova senha"), {
    target: { value: "nova-senha-segura" },
  });
  fireEvent.submit(form);
  await waitFor(() =>
    expect(router.replace).toHaveBeenCalledWith("/login?changed=1"),
  );
  expect(api).toHaveBeenCalledWith("/api/account/password", {
    current: "atual",
    next: "nova-senha-segura",
  });
});
