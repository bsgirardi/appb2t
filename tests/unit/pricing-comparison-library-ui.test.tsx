// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ComparisonLibrary } from "@/components/pricing/comparisons/comparison-library";
import {
  fetchComparisons,
  fetchComparison,
} from "@/lib/pricing-comparisons-client";
import { previewComparison } from "@/domain/pricing/comparisons/calculate";
import { lotFixture } from "../fixtures/pricing";
import type { SavedComparison } from "@/domain/pricing/comparisons/types";
vi.mock("@/lib/pricing-comparisons-client", () => ({
  fetchComparisons: vi.fn(),
  fetchComparison: vi.fn(),
}));
afterEach(cleanup);
it("shows an empty library and searches explicitly", async () => {
  vi.mocked(fetchComparisons).mockResolvedValue({
    items: [
      {
        id: "one",
        name: "Oferta nomeada",
        actorName: "Equipe",
        createdAt: "2026-10-29T12:00:00Z",
        quantity: 10,
        count: 2,
      },
    ],
    nextCursor: null,
  });
  render(<ComparisonLibrary initial={{ items: [], nextCursor: null }} />);
  expect(screen.getByText("Nenhuma comparação encontrada.")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Buscar pelo nome"), {
    target: { value: "Oferta" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
  expect(await screen.findByText("Oferta nomeada")).toBeTruthy();
  expect(fetchComparisons).toHaveBeenCalledWith({
    search: "Oferta",
    cursor: undefined,
  });
});
it("limits selection to ten alternatives across memories without summing them", async () => {
  const channel = {
    ...lotFixture.channel,
    ...lotFixture.channel.ref,
    active: true,
  };
  const preview = previewComparison(
    lotFixture,
    [channel],
    { kind: "CHANNEL" },
    [{ channelRef: lotFixture.channel.ref, discountPercent: "0" }],
  ).alternatives[0];
  if (preview.status !== "VALID") throw Error("fixture");
  const value = preview.value;
  const a: SavedComparison = {
    id: "a",
    name: "Lote A",
    actorId: "actor",
    actorName: "Equipe",
    createdAt: "2026-10-29T12:00:00Z",
    contractVersion: 1,
    calculationVersion: 1,
    reference: { kind: "CHANNEL" },
    originalMode: "MARKUP",
    settingsVersion: 1,
    alternatives: Array.from({ length: 10 }, (_, i) => ({
      ...value,
      id: `a${i}`,
      snapshotId: `s${i}`,
      position: i,
      discountPercent: String(i),
    })),
  };
  const b: SavedComparison = {
    ...a,
    id: "b",
    name: "Lote B",
    alternatives: [
      {
        ...a.alternatives[0],
        id: "b0",
        input: { ...value.input, quantity: 20 },
      },
    ],
  };
  vi.mocked(fetchComparison).mockImplementation(async (id) =>
    id === "a" ? a : b,
  );
  render(
    <ComparisonLibrary
      initial={{
        items: [a, b].map((c) => ({
          id: c.id,
          name: c.name,
          actorName: c.actorName,
          createdAt: c.createdAt,
          quantity: 10,
          count: c.alternatives.length,
        })),
        nextCursor: null,
      }}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Ver alternativas de Lote A" }),
  );
  await screen.findByRole("button", { name: "Comparar Direto · 9%" });
  for (let i = 0; i < 10; i++)
    fireEvent.click(
      screen.getByRole("button", { name: `Comparar Direto · ${i}%` }),
    );
  fireEvent.click(
    screen.getByRole("button", { name: "Ver alternativas de Lote B" }),
  );
  const eleventh = await screen.findByRole("button", {
    name: "Comparar Direto · 0%",
  });
  expect((eleventh as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("10 de 10 alternativas selecionadas")).toBeTruthy();
  expect(screen.getByText(/não são somados/)).toBeTruthy();
});
