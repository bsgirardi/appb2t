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
  for (const name of ["Financeiro", "Aparência", "Configurações"])
    expect(screen.queryByRole("link", { name })).toBeNull();
  expect(screen.getByRole("link", { name: "Calculadora" })).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Abrir loja" }).getAttribute("href"),
  ).toBe("/");
});
