"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client-api";
import type { CommercialSettingsDTO } from "@/domain/opportunities/reply-tracking";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, Notice } from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
export function CommercialSettingsPanel({
  initial,
}: {
  initial: CommercialSettingsDTO;
}) {
  const [settings, setSettings] = useState(initial),
    [days, setDays] = useState(String(initial.replyWaitDays)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const saved = await api<CommercialSettingsDTO>(
        "/api/commercial-settings",
        { replyWaitDays: Number(days), expectedVersion: settings.version },
      );
      setSettings(saved);
      setDays(String(saved.replyWaitDays));
      setMessage(
        "Prazo comercial salvo. As esperas atuais usam esse prazo na próxima consulta.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas comerciais</CardTitle>
        <CardDescription>
          Sem retorno do cliente: dias corridos desde o primeiro envio
          registrado ainda sem resposta. Padrão: 14 dias. Lembretes não
          reiniciam a espera.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Notice>
            {error} Recarregue Configurações para consultar a versão atual antes
            de tentar novamente.
          </Notice>
        )}
        {message && <Notice kind="success">{message}</Notice>}
        <form onSubmit={save} className="flex flex-col gap-3">
          <FieldGroup>
            <Field
              label="Prazo sem retorno (dias corridos)"
              type="number"
              required
              min={1}
              max={365}
              step={1}
              value={days}
              disabled={busy}
              onChange={(e) => setDays(e.target.value)}
            />
          </FieldGroup>
          <p>
            Aplica-se também às esperas existentes. O painel depende dos
            registros manuais de envio e resposta; nenhuma mensagem é enviada
            automaticamente.
          </p>
          <Button disabled={busy}>Salvar prazo comercial</Button>
        </form>
      </CardContent>
    </Card>
  );
}
