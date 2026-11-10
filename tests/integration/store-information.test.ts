import { expect, it } from "vitest";
import { setupDatabase, seedUser } from "./setup";
import { saveAppearance, getPublicAppearance } from "@/server/appearance";
import { defaultAppearance } from "@/domain/appearance/validation";
import { defaultStorefront } from "@/domain/appearance/storefront";
import { storeInformation } from "@/server/store-information";
import { generateMetadata } from "@/app/catalogo/page";
import sitemap from "@/app/sitemap";
setupDatabase();
it("hides empty information pages and publishes metadata, sitemap and content after saving", async () => {
  await expect(storeInformation("sobre")).rejects.toThrow(
    "NEXT_HTTP_ERROR_FALLBACK;404",
  );
  await expect(storeInformation("ajuda")).rejects.toThrow(
    "NEXT_HTTP_ERROR_FALLBACK;404",
  );
  expect(
    (await sitemap()).some(
      (row) => row.url.endsWith("/ajuda") || row.url.endsWith("/sobre"),
    ),
  ).toBe(false);
  const actor = await seedUser();
  await saveAppearance(actor, {
    ...defaultAppearance,
    expectedVersion: 0,
    storefront: {
      ...defaultStorefront,
      seoTitle: "Loja de peças",
      seoDescription: "a".repeat(170),
      aboutTitle: "Nossa história",
      aboutText: "Conteúdo da empresa",
      faq: [
        {
          question: "Como pedir?",
          answer: "Escolha os produtos e entre em contato.",
        },
      ],
    },
  });
  const metadata = await generateMetadata({
    searchParams: Promise.resolve({}),
  });
  expect(metadata).toMatchObject({
    title: "Loja de peças",
    description: "a".repeat(170),
    robots: { index: true, follow: true },
    alternates: { canonical: "http://localhost:3000/catalogo" },
  });
  expect(
    (
      await generateMetadata({
        searchParams: Promise.resolve({ busca: "vaso" }),
      })
    ).robots,
  ).toEqual({ index: false, follow: true });
  expect((await storeInformation("sobre")).metadata).toMatchObject({
    title: "Nossa história | B2T Print Studio",
    alternates: { canonical: "http://localhost:3000/portfolio/sobre" },
  });
  expect((await storeInformation("ajuda")).config.faq[0].answer).toContain(
    "entre em contato",
  );
  expect(
    (await sitemap()).filter(
      (row) => row.url.endsWith("/sobre") || row.url.endsWith("/ajuda"),
    ),
  ).toHaveLength(2);
  await saveAppearance(actor, { ...defaultAppearance, expectedVersion: 1 });
  await expect(storeInformation("ajuda")).rejects.toThrow(
    "NEXT_HTTP_ERROR_FALLBACK;404",
  );
  expect((await getPublicAppearance()).storefront?.faq).toEqual([]);
});
