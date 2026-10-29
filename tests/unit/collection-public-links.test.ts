import { expect, it, vi } from "vitest";
import { listPublicCollections } from "@/server/collections";
import sitemap from "@/app/sitemap";
import { defaultAppearance } from "@/domain/appearance/validation";
const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: { collection: { findMany }, product: { findMany: async () => [] } },
}));
vi.mock("@/server/appearance", () => ({
  getPublicAppearance: async () => defaultAppearance,
}));
it("keeps links stable on activation and hides inactive collections from public data and sitemap", async () => {
  const row = (id: string, active: boolean) => ({
    id,
    name: "Verão",
    active,
    description: "",
    image: null,
    products: [],
  });
  findMany.mockResolvedValue([row("a", true), row("b", false)]);
  const initial = await listPublicCollections();
  expect(initial.map((c) => [c.id, c.slug])).toEqual([["a", "verao-a"]]);
  expect(initial[0]).not.toHaveProperty("active");
  const urls = (await sitemap()).map((entry) => new URL(entry.url).search);
  expect(urls).toContain("?colecao=verao-a");
  expect(urls).not.toContain("?colecao=verao-b");
  findMany.mockResolvedValue([row("b", true), row("a", true)]);
  expect((await listPublicCollections()).find((c) => c.id === "a")?.slug).toBe(
    "verao-a",
  );
});
