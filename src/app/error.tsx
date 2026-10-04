"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

export default function StoreError({ reset }: { reset: () => void }) {
  return (
    <main className="storefront flex min-h-screen items-center justify-center p-6">
      <Alert
        role="alert"
        className="max-w-lg rounded-3xl border border-border bg-background p-8 text-center"
      >
        <h1 className="text-2xl font-bold">
          Não foi possível carregar esta página.
        </h1>
        <p className="my-5 text-muted-foreground">
          Tente novamente em alguns instantes.
        </p>
        <Button onClick={reset} className="rounded-full">
          Tentar novamente
        </Button>
        <Link href="/" className="mt-6 block text-sm text-primary">
          Voltar à loja
        </Link>
      </Alert>
    </main>
  );
}
