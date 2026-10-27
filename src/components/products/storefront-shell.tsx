import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import Link from "next/link";
import { Search, MessageCircle, ArrowUpRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type {
  CompanyIdentityDTO,
  PublicAppearanceDTO,
} from "@/domain/appearance/types";
import { whatsappLink } from "@/domain/products/storefront";
import { Button } from "@/components/ui/button";
import { siteThemeVariables } from "@/domain/appearance/theme";
import type { SiteColors } from "@/domain/appearance/site-colors";
import { InquiryLink } from "./inquiry-link";
import { ThemeToggle } from "@/components/theme-toggle";

export function StorefrontShell({
  identity,
  children,
  search = "",
  collection = "",
  order = "nome",
}: {
  identity: CompanyIdentityDTO &
    Pick<PublicAppearanceDTO, "storefront"> &
    Partial<SiteColors>;
  children: ReactNode;
  search?: string;
  collection?: string;
  order?: string;
}) {
  const contact = whatsappLink(
    identity.phone,
    `Olá! Gostaria de saber mais sobre os produtos da ${identity.name}.`,
  );
  return (
    <div
      className="storefront min-h-screen"
      style={siteThemeVariables(identity) as CSSProperties}
    >
      <a className="store-skip" href="#catalog-content">
        Pular para o conteúdo
      </a>
      <div className="bg-b2t-navy px-4 py-2 text-center text-xs tracking-wide text-white">
        B2T · Ideias em 3D. Criatividade que conecta pessoas.
      </div>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-4 px-4 py-4 md:gap-8 md:px-12">
          <Link
            href="/"
            aria-label={`${identity.name} — início`}
            className="shrink-0 rounded-xl bg-white px-3 py-1"
          >
            <Image
              src="/brand/b2t-logo.png"
              alt="B2T — Ideias em 3D"
              width={1448}
              height={1086}
              className="block h-12 w-24 object-contain"
            />
          </Link>
          <form
            action="/"
            className="order-3 flex w-full items-center gap-2 rounded-full border border-border bg-background px-4 md:order-none md:ml-auto md:w-auto md:flex-1 md:max-w-xl"
            role="search"
          >
            <Search
              size={18}
              aria-hidden="true"
              className="shrink-0 text-muted-foreground"
            />
            <Label className="sr-only" htmlFor="store-search">
              Buscar produtos
            </Label>
            {order !== "nome" && (
              <input type="hidden" name="ordem" value={order} />
            )}
            {collection && (
              <input type="hidden" name="colecao" value={collection} />
            )}
            <Input
              key={`${search}:${collection}`}
              id="store-search"
              name="busca"
              type="search"
              defaultValue={search}
              placeholder="Que ideia você procura?"
              maxLength={100}
              className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm text-foreground"
            />
            <Button type="submit" variant="ghost" className="rounded-full px-3">
              Buscar
            </Button>
          </form>
          <div className="ml-auto flex max-w-full flex-wrap items-center gap-3 md:ml-0">
            <ThemeToggle />
            <InquiryLink />
            {contact && (
              <Button
                asChild
                variant="ghost"
                className="hidden rounded-full lg:inline-flex"
              >
                <a href={contact} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden="true" /> Fale conosco
                </a>
              </Button>
            )}
          </div>
        </div>
        <nav
          aria-label="Navegação da loja"
          className="mx-auto flex max-w-[1320px] flex-wrap gap-x-7 gap-y-2 px-4 pb-2 text-sm font-semibold md:px-12"
        >
          <Link href="/#all-products" className="py-2 hover:text-primary">
            Explorar produtos
          </Link>
          <Link href="/portfolio/orcamento" className="py-2 hover:text-primary">
            Meu orçamento
          </Link>
          {identity.storefront?.aboutText && (
            <Link href="/portfolio/sobre" className="py-2 hover:text-primary">
              Sobre a B2T
            </Link>
          )}
          {!!identity.storefront?.faq.length && (
            <Link href="/portfolio/ajuda" className="py-2 hover:text-primary">
              Como funciona
            </Link>
          )}
        </nav>
      </header>
      <main id="catalog-content" className="store-main">
        {children}
      </main>
      <footer className="mt-12 border-t border-border bg-background">
        <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-12 md:grid-cols-3 md:px-12">
          <div>
            <strong className="text-xl">{identity.name}</strong>
            <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
              {identity.footer}
            </p>
            <p className="mt-3 text-sm font-semibold">Do imaginado ao real.</p>
          </div>
          <div className="grid content-start gap-3 text-sm">
            <strong>Explore a loja</strong>
            <Link href="/#all-products">Todos os produtos</Link>
            <Link href="/portfolio/orcamento">Lista de orçamento</Link>
            {identity.storefront?.aboutText && (
              <Link href="/portfolio/sobre">Sobre a loja</Link>
            )}
            {!!identity.storefront?.faq.length && (
              <Link href="/portfolio/ajuda">Ajuda e perguntas frequentes</Link>
            )}
          </div>
          <div className="grid min-w-0 content-start gap-3 text-sm">
            <strong>Vamos conversar?</strong>
            {identity.email && (
              <a className="break-words" href={`mailto:${identity.email}`}>
                {identity.email}
              </a>
            )}
            {identity.phone && <p>{identity.phone}</p>}
            {identity.address && <p>{identity.address}</p>}
            {contact && (
              <a
                className="flex items-center gap-2 font-semibold text-primary"
                href={contact}
                target="_blank"
                rel="noopener noreferrer"
              >
                Fale com a B2T <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            )}
            <span className="text-muted-foreground">
              Preços em reais · orçamento sujeito a confirmação
            </span>
            <Link href="/login" className="mt-3 text-xs text-muted-foreground">
              Área da equipe
            </Link>
          </div>
        </div>
        <div aria-hidden="true" className="grid h-2 grid-cols-3">
          <span className="bg-primary" />
          <span className="bg-secondary" />
          <span className="bg-b2t-green" />
        </div>
      </footer>
    </div>
  );
}
