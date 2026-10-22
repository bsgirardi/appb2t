"use client";
import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/client-api";
import type { KitDTO } from "@/domain/kits/types";
import { KitForm, type KitProductOption } from "./kit-form";
export function KitPanel({
  initialKits,
  products,
}: {
  initialKits: KitDTO[];
  products: KitProductOption[];
}) {
  const [kits, setKits] = useState(initialKits),
    [editing, setEditing] = useState<KitDTO | null | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState("");
  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      setKits(await api<KitDTO[]>("/api/kits"));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Kits</h1>
          <p>Escolha as peças permitidas e os descontos de cada conjunto.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            disabled={editing !== undefined || refreshing}
            onClick={refresh}
          >
            {refreshing ? "Atualizando…" : "Atualizar lista"}
          </Button>
          <Button
            className="min-h-11"
            disabled={editing !== undefined || refreshing}
            onClick={() => setEditing(null)}
          >
            Novo kit
          </Button>
        </div>
      </header>
      {error && <Alert role="alert">{error}</Alert>}
      {editing !== undefined ? (
        <Card>
          <KitForm
            kit={editing ?? undefined}
            products={products}
            onCancel={() => setEditing(undefined)}
            onSaved={(kit) => {
              setKits((old) =>
                old.some((k) => k.id === kit.id)
                  ? old.map((k) => (k.id === kit.id ? kit : k))
                  : [...old, kit],
              );
              setEditing(undefined);
            }}
          />
        </Card>
      ) : (
        <>
          {!kits.length && (
            <p>
              Nenhum kit cadastrado. Crie um conjunto com os produtos que sua
              equipe permite oferecer juntos.
            </p>
          )}
          {kits.map((kit) => (
            <Card key={kit.id}>
              <CardHeader>
                <CardTitle>{kit.name}</CardTitle>
                <CardDescription>
                  {kit.description || "Sem descrição adicional."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="secondary">
                      {kit.active ? "Publicado" : "Rascunho"}
                    </Badge>
                    <span>{kit.productIds.length} produtos permitidos</span>
                    <span>{kit.tiers.length} faixas de desconto</span>
                  </div>
                  <Button
                    variant="outline"
                    className="min-h-11"
                    onClick={() => setEditing(kit)}
                  >
                    Editar {kit.name}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </section>
  );
}
