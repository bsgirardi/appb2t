import { expect, it } from "vitest";
import {
  collectionLinks,
  resolveCollection,
} from "@/domain/collections/navigation";

it("uses readable normalized names and accepts existing ID links", () => {
  const collections = collectionLinks([
    { id: "old-id", name: "  Decoração & Corporativos  " },
  ]);
  expect(collections[0].slug).toBe("decoracao-corporativos");
  expect(resolveCollection(collections, "decoracao-corporativos")?.id).toBe(
    "old-id",
  );
  expect(resolveCollection(collections, "old-id")?.id).toBe("old-id");
  expect(resolveCollection(collections, "unknown")).toBeUndefined();
});

it("disambiguates equal names and tokens matching another collection ID", () => {
  const collections = collectionLinks([
    { id: "a", name: "Verão" },
    { id: "b", name: "Verao" },
    { id: "corporativos", name: "Outros" },
    { id: "c", name: "Corporativos" },
    { id: "d", name: "!!!" },
  ]);
  expect(collections.map((c) => c.slug)).toEqual([
    "verao-a",
    "verao-b",
    "outros",
    "corporativos-c",
    "colecao",
  ]);
  for (const collection of collections) {
    expect(resolveCollection(collections, collection.slug)?.id).toBe(
      collection.id,
    );
    expect(resolveCollection(collections, collection.id)?.id).toBe(
      collection.id,
    );
  }
  expect(
    collectionLinks([...collections].reverse())
      .map((c) => [c.id, c.slug])
      .sort(),
  ).toEqual(collections.map((c) => [c.id, c.slug]).sort());
});
