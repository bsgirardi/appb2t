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
      ],
    },
    sitemap: new URL("/sitemap.xml", appUrl()).href,
  };
}
