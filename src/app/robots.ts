import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/api/products/*/image",
        "/api/appearance/logo",
        "/api/collections/*/image",
        "/api/instagram/media/*",
      ],
      disallow: [
        "/api/",
        "/calculadora",
        "/login",
        "/financeiro",
        "/configuracoes",
        "/clientes",
        "/orcamentos",
        "/vendas",
        "/produtos",
        "/colecoes",
        "/dashboard",
        "/seo-analytics",
        "/solicitacoes",
        "/negociacoes",
        "/pdv",
        "/kits",
        "/anuncios",
        "/producao",
        "/planejamento",
        "/estoque",
        "/pontos-de-venda",
        "/rentabilidade",
        "/conta",
        "/atualizacoes",
        "/portfolio/orcamento",
        "/portfolio/arte",
        "/portfolio/compra",
        "/portfolio/checkout",
        "/portfolio/conjuntos",
      ],
    },
    sitemap: new URL("/sitemap.xml", appUrl()).href,
  };
}
