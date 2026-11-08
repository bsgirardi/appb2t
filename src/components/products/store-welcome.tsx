import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Box, Gift, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StoreWelcome() {
  return (
    <section
      aria-labelledby="store-welcome"
      className="store-welcome my-6 grid overflow-hidden rounded-[32px] border border-border bg-card lg:my-8 lg:grid-cols-[1.15fr_1fr]"
    >
      <div className="flex flex-col justify-center p-6 text-foreground sm:p-10 lg:p-12">
        <span className="mb-5 flex items-center gap-2 text-sm font-semibold">
          <span className="size-2 rounded-full bg-b2t-green" /> Bem-vindo à B2T
        </span>
        <h1
          id="store-welcome"
          className="max-w-xl text-4xl leading-[1.12] font-bold tracking-tight sm:text-5xl lg:text-6xl"
        >
          Sua ideia.
          <br />
          Nosso jeito de
          <br />
          dar forma.
        </h1>
        <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
          Produtos personalizados, presentes e soluções em 3D para conectar
          pessoas. Do imaginado ao real, com a sua personalidade.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="h-auto min-h-12 rounded-full px-6 font-semibold"
          >
            <Link href="#all-products">
              Explorar produtos <ArrowDown aria-hidden="true" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-auto min-h-12 rounded-full border-border bg-background px-6 text-foreground hover:bg-accent"
          >
            <Link href="/portfolio/orcamento">
              Meu orçamento <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-border pt-5 text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-2">
            <Lightbulb size={17} className="text-primary" aria-hidden="true" />{" "}
            Sua ideia em 3D
          </span>
          <span className="flex items-center gap-2">
            <Gift size={17} className="text-primary" aria-hidden="true" />{" "}
            Presentes com significado
          </span>
          <span className="flex items-center gap-2">
            <Box size={17} className="text-primary" aria-hidden="true" /> Feito
            para conectar
          </span>
        </div>
      </div>
      <div className="store-welcome-art">
        <Image
          src="/brand/b2t-mascote.png"
          alt="Mascote B2T com cabelos cacheados, moletom e um gesto de boas-vindas"
          width={1122}
          height={1402}
          sizes="(max-width: 767px) 200px, (max-width: 1023px) 300px, 400px"
          loading="eager"
          className="store-welcome-mascot"
        />
        <span className="store-welcome-caption">
          Pequenas ideias. Grandes conexões.
        </span>
      </div>
    </section>
  );
}
