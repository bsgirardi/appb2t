import { StoreBreadcrumb } from "@/components/products/store-breadcrumb";
import { StoreFaq } from "./store-faq";
import Link from "next/link";
import { storeInformation } from "@/server/store-information";
import { StorefrontShell } from "./storefront-shell";
export async function StoreInformationPage({
  kind,
}: {
  kind: "sobre" | "ajuda";
}) {
  const { identity, config, title } = await storeInformation(kind);
  return (
    <StorefrontShell identity={identity}>
      <StoreBreadcrumb title={title} />
      <article className="store-information">
        <span className="store-kicker">{identity.name}</span>
        <h1>{title}</h1>
        {kind === "sobre" ? (
          <p className="store-information-text">{config.aboutText}</p>
        ) : (
          <StoreFaq items={config.faq} />
        )}
        <Link className="store-back" href="/">
          Explorar produtos →
        </Link>
      </article>
    </StorefrontShell>
  );
}
