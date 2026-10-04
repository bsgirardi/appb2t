"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <Card asChild>
      <section className="">
        <h1>Não foi possível carregar os dados.</h1>
        <p>Verifique sua conexão e tente novamente.</p>
        <Button className="" onClick={reset}>
          Tentar novamente
        </Button>
      </section>
    </Card>
  );
}
