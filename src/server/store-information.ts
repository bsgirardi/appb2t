import { cache } from "react";
import { notFound } from "next/navigation";
import { getPublicAppearance } from "./appearance";
import { publicMetadata } from "./storefront";
import { defaultStorefront } from "@/domain/appearance/storefront";
import { summary } from "@/domain/products/storefront";
export const storeInformation = cache(async (kind: "sobre" | "ajuda") => {
  const identity = await getPublicAppearance();
  const config = identity.storefront ?? defaultStorefront;
  if (kind === "sobre" ? !config.aboutText : !config.faq.length) notFound();
  const title =
    kind === "sobre"
      ? config.aboutTitle || "Sobre a loja"
      : "Ajuda e perguntas frequentes";
  const description = summary(
    kind === "sobre"
      ? config.aboutText
      : config.faq.map((item) => item.question).join(" "),
  );
  return {
    identity,
    config,
    title,
    metadata: publicMetadata(
      `${title} | ${identity.name}`,
      description,
      `/portfolio/${kind}`,
      identity.logoUrl || undefined,
    ),
  };
});
