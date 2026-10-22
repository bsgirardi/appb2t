// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AppShell } from "@/components/shell/app-shell";
vi.mock("next/navigation", () => ({
  usePathname: () => "/configuracoes/aparencia",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
afterEach(cleanup);
it("groups operations into collapsible menus and exposes the dashboard", () => {
  render(
    <AppShell actor={actor}>
      <h1>Conteúdo</h1>
    </AppShell>,
  );
  expect(
    screen.getByRole("link", { name: "Dashboard" }).getAttribute("href"),
  ).toBe("/dashboard");
  for (const name of ["Vendas", "Produção", "Financeiro"]) {
    const trigger = screen.getByRole("button", { name });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  }
  expect(screen.getByRole("link", { name: "Clientes" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Estoque" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Rentabilidade" })).toBeTruthy();
});
const actor = {
  id: "u",
  name: "Equipe B2T",
  email: "test@example.com",
  role: "ADMIN" as const,
};
it("closes the menu with Escape and restores trigger focus", async () => {
  render(
    <AppShell actor={actor}>
      <h1>Conteúdo</h1>
    </AppShell>,
  );
  const trigger = screen.getByRole("button", { name: "Menu" });
  trigger.focus();
  fireEvent.click(trigger);
  expect(screen.getByRole("dialog")).toBeTruthy();
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});
it("opens and closes the mobile navigation without hiding account actions", () => {
  render(
    <AppShell actor={actor}>
      <h1>Conteúdo</h1>
    </AppShell>,
  );
  const menu = screen.getByRole("button", { name: "Menu" });
  expect(menu.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(menu);
  expect(menu.getAttribute("aria-expanded")).toBe("true");
  fireEvent.click(screen.getByRole("link", { name: "Aparência" }));
  expect(menu.getAttribute("aria-expanded")).toBe("false");
  expect(
    screen
      .getByRole("link", { name: "Aparência" })
      .getAttribute("aria-current"),
  ).toBe("page");
  expect(
    screen.getByRole("link", { name: "Configurações" }).getAttribute("class"),
  ).not.toContain("active");
  expect(screen.getByRole("button", { name: "Sair da conta" })).toBeTruthy();
});
it("preserves operator navigation restrictions", () => {
  render(
    <AppShell actor={{ ...actor, role: "OPERATOR" }}>
      <h1>Conteúdo</h1>
    </AppShell>,
  );
  for (const name of [
    "Financeiro",
    "Rentabilidade",
    "Aparência",
    "Configurações",
  ])
    expect(screen.queryByRole("link", { name })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Produção" }));
  expect(screen.getByRole("link", { name: "Calculadora" })).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Abrir loja" }).getAttribute("href"),
  ).toBe("/");
});

it("carries the administrative palette into the mobile portal", () => {
  const { container } = render(
    <AppShell
      actor={actor}
      palette={{
        lightPrimary: "#224455",
        lightAccent: "#b68b39",
        darkPrimary: "#6cdbc0",
        darkAccent: "#eac473",
      }}
    >
      <h1>Conteúdo</h1>
    </AppShell>,
  );
  expect(
    (
      container.querySelector(".app-shell") as HTMLElement
    ).style.getPropertyValue("--light-primary"),
  ).toBe("#224455");
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  expect(
    screen.getByRole("dialog").style.getPropertyValue("--light-primary"),
  ).toBe("#224455");
  expect(screen.getByRole("dialog").className).toContain("admin-theme");
});

it("keeps_catalog_requests_and_kits_in_the_grouped_sales_navigation", () => {
  render(
    <AppShell actor={actor}>
      <h1>Conteúdo</h1>
    </AppShell>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Vendas" }));
  expect(
    screen.getByRole("link", { name: "Solicitações" }).getAttribute("href"),
  ).toBe("/solicitacoes");
  expect(screen.getByRole("link", { name: "Kits" }).getAttribute("href")).toBe(
    "/kits",
  );
});
