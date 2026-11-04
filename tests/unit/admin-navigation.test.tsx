// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  AdminNavigation,
  navigationGroup,
  navigationTitle,
} from "@/components/shell/admin-navigation";

afterEach(cleanup);
it.each([true, false])(
  "keeps all shared destinations and the calculator shortcut for admin=%s",
  (admin) => {
    const navigate = vi.fn();
    render(
      <AdminNavigation path="/dashboard" admin={admin} onNavigate={navigate} />,
    );
    fireEvent.click(screen.getByRole("link", { name: "Calculadora" }));
    expect(navigate).toHaveBeenCalledOnce();
    for (const name of ["Comercial", "Catálogo", "Operação", "Parcerias"])
      fireEvent.click(screen.getByRole("button", { name }));
    const nav = within(screen.getByRole("navigation"));
    for (const href of [
      "/dashboard",
      "/calculadora",
      "/clientes",
      "/solicitacoes",
      "/negociacoes",
      "/orcamentos",
      "/vendas",
      "/produtos",
      "/kits",
      "/colecoes",
      "/anuncios",
      "/producao",
      "/planejamento",
      "/estoque",
      "/pontos-de-venda",
      "/atualizacoes",
      "/conta",
      "/",
    ])
      expect(
        nav
          .getAllByRole("link")
          .some((link) => link.getAttribute("href") === href),
      ).toBe(true);
    expect(screen.queryByRole("button", { name: "Financeiro" }) !== null).toBe(
      admin,
    );
    expect(
      screen.queryByRole("button", { name: "Configurações" }) !== null,
    ).toBe(admin);
  },
);

it.each([
  ["/financeiro/lancamentos/novo", "Financeiro", "Lançamentos"],
  ["/configuracoes/aparencia", "Configurações", "Aparência"],
  ["/produtos/produto-teste", "Catálogo", "Produtos"],
  ["/pontos-de-venda/parceiro/consignacao", "Parcerias", "Pontos de venda"],
])(
  "opens the active group and selects only the deepest destination: %s",
  (path, group, title) => {
    const { container, rerender } = render(
      <AdminNavigation path="/dashboard" admin onNavigate={() => {}} />,
    );
    rerender(<AdminNavigation path={path} admin onNavigate={() => {}} />);
    expect(
      screen.getByRole("button", { name: group }).getAttribute("aria-expanded"),
    ).toBe("true");
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: title }).getAttribute("aria-current"),
    ).toBe("page");
    expect(navigationGroup(path)).toBe(group);
    expect(navigationTitle(path)).toBe(title);
  },
);
