import { z } from "zod";
import {
  queryDestination,
  type CatalogQuery,
} from "@/domain/products/catalog-navigation";

export const seoPages = {
  "/": "Início",
  "/catalogo": "Catálogo",
  "/portfolio/sobre": "Sobre a B2T",
  "/portfolio/ajuda": "Ajuda",
} as const;
export type SeoPage = keyof typeof seoPages;
export function isPublicSeoPath(path: string) {
  return (
    Object.hasOwn(seoPages, path) ||
    /^\/portfolio\/produto\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/.test(path) ||
    /^\/portfolio\/conjuntos\/[a-zA-Z0-9_-]+$/.test(path)
  );
}
// Assets are served locally; avoid external tracking pixels and private API paths.
const image = z
  .string()
  .trim()
  .max(500)
  .refine(
    (s) =>
      s === "" ||
      /^\/(?:brand\/[a-zA-Z0-9_.-]+|api\/(?:products|collections)\/[a-zA-Z0-9_-]+\/image)$/.test(
        s,
      ),
    "Use uma imagem pública local da marca, produto ou coleção, sem parâmetros.",
  );
const pageSchema = z
  .object({
    title: z.string().trim().max(70).default(""),
    description: z.string().trim().max(170).default(""),
    image: image.default(""),
    index: z.boolean().default(true),
  })
  .strict();
// Custom redirects only claim unknown paths. Known route namespaces cannot be shadowed.
const reserved = new Set([
  "api",
  "portfolio",
  "catalogo",
  "login",
  "dashboard",
  "calculadora",
  "configuracoes",
  "clientes",
  "solicitacoes",
  "negociacoes",
  "orcamentos",
  "vendas",
  "pdv",
  "produtos",
  "kits",
  "colecoes",
  "anuncios",
  "producao",
  "planejamento",
  "estoque",
  "pontos-de-venda",
  "financeiro",
  "rentabilidade",
  "atualizacoes",
  "conta",
  "brand",
  "_next",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
]);
export const seoSchema = z
  .object({
    title: z.string().trim().max(70).default(""),
    description: z.string().trim().max(170).default(""),
    image: image.default(""),
    indexPublic: z.boolean().default(true),
    pages: z
      .object({
        "/": pageSchema.optional(),
        "/catalogo": pageSchema
          .omit({ title: true, description: true })
          .optional(),
        "/portfolio/sobre": pageSchema.optional(),
        "/portfolio/ajuda": pageSchema.optional(),
      })
      .strict()
      .default({}),
    redirects: z
      .array(
        z
          .object({
            from: z
              .string()
              .max(160)
              .regex(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/)
              .refine(
                (s) => !reserved.has(s.split("/")[1]),
                "Este caminho pertence ao sistema.",
              ),
            to: z
              .string()
              .max(300)
              .refine(
                isPublicSeoPath,
                "Escolha uma página pública, sem parâmetros.",
              ),
          })
          .strict(),
      )
      .max(30)
      .refine(
        (rows) => new Set(rows.map((r) => r.from)).size === rows.length,
        "Caminhos antigos repetidos.",
      )
      .default([]),
  })
  .strict();
export type SeoSettings = z.infer<typeof seoSchema>;
export function resolveSeo(
  raw: SeoSettings | undefined,
  path: string,
  title: string,
  description: string,
  image = "",
) {
  const seo = raw ?? seoSchema.parse({});
  const pathname = path.split("?")[0];
  const page = seo.pages[pathname as SeoPage] as
    | { title?: string; description?: string; image?: string; index?: boolean }
    | undefined;
  // Dynamic product/collection titles retain their specific identity.
  const generic = pathname === "/";
  const specificCollection =
    pathname === "/catalogo" &&
    new URLSearchParams(path.split("?")[1]).has("colecao");
  const sitePage = Object.hasOwn(seoPages, pathname) && !specificCollection;
  return {
    title:
      (!specificCollection && page?.title) || (generic && seo.title) || title,
    description:
      (!specificCollection && page?.description) ||
      (generic && seo.description) ||
      description,
    image:
      (!specificCollection && page?.image) ||
      (sitePage && seo.image) ||
      image ||
      seo.image ||
      "/brand/b2t-logo.png",
    index:
      isPublicSeoPath(pathname) && seo.indexPublic && page?.index !== false,
  };
}
export function redirectDestination(
  seo: SeoSettings | undefined,
  path: string,
  query: CatalogQuery,
) {
  const target = seo?.redirects.find((r) => r.from === path)?.to;
  return target && isPublicSeoPath(target)
    ? queryDestination(target, query)
    : null;
}
