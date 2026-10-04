"use client";
import { Alert } from "@/components/ui/alert";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default function PortfolioError({ reset }: { reset: () => void }) {
  return (
    <main className="portfolio-main">
      <Card asChild>
        <Alert className="catalog-empty" role="alert">
          <h1>Não foi possível carregar o catálogo.</h1>
          <p>Tente novamente em alguns instantes.</p>
          <Button className="" onClick={reset}>
            Tentar novamente
          </Button>
        </Alert>
      </Card>
    </main>
  );
}
