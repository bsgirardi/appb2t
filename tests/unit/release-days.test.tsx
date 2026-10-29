// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

vi.mock("@/lib/releases", () => ({
  releases: [
    {
      version: "1.9.0",
      date: "2026-10-29",
      title: "Primeira entrega",
      sections: [{ title: "Melhorias", items: ["Melhoria anterior"] }],
    },
    {
      version: "1.8.0",
      date: "2026-10-28",
      title: "Outro dia",
      sections: [{ title: "Correções", items: ["Correção anterior"] }],
    },
    {
      version: "1.10.0",
      date: "2026-10-29",
      title: "Entrega recente",
      sections: [
        { title: "Novidades", items: ["Novidade recente"] },
        { title: "Melhorias", items: ["Melhoria recente"] },
        { title: "Correções", items: ["Correção recente"] },
      ],
    },
  ],
}));
import Updates from "@/app/(private)/atualizacoes/page";
import { releases } from "@/lib/releases";

afterEach(cleanup);

it("combines each day's categories and uses the highest semantic version without rewriting history", () => {
  const original = JSON.stringify(releases);
  render(<Updates />);
  const cards = screen.getAllByRole("article");
  expect(cards).toHaveLength(2);
  expect(within(cards[0]).getByText("Versão 1.10.0")).toBeTruthy();
  expect(within(cards[0]).getByText("29/10/2026")).toBeTruthy();
  expect(
    within(cards[0]).getAllByRole("heading", { name: "Melhorias" }),
  ).toHaveLength(1);
  for (const text of [
    "Melhoria anterior",
    "Novidade recente",
    "Melhoria recente",
    "Correção recente",
  ]) {
    expect(within(cards[0]).getByText(text)).toBeTruthy();
  }
  expect(within(cards[1]).getByText("Correção anterior")).toBeTruthy();
  expect(JSON.stringify(releases)).toBe(original);
});
