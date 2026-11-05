// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { OperationResults } from "@/components/admin/operation-results";
afterEach(cleanup);
const href = (page: number) =>
  `/estoque?view=receipts&query=Teste&receiptId=r&page=${page}`;
it("distinguishes filtered emptiness and clears filters within the current view", () => {
  render(
    <OperationResults
      total={0}
      page={1}
      pageSize={20}
      filtered
      href={href}
      clearHref="/estoque?view=receipts"
    />,
  );
  expect(screen.getByText("Nenhum resultado para estes filtros")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Limpar filtros" }).getAttribute("href"),
  ).toBe("/estoque?view=receipts");
});
it("recovers an out-of-range page with its original filters", () => {
  render(
    <OperationResults
      total={2}
      page={3}
      pageSize={20}
      filtered
      href={href}
      clearHref="/estoque?view=receipts"
    />,
  );
  expect(screen.getByText("Esta página não tem registros")).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Primeira página" }).getAttribute("href"),
  ).toBe(href(1));
  expect(screen.queryByRole("link", { name: "Próxima" })).toBeNull();
});
