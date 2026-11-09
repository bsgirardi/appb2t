"use client";

import { useState } from "react";
import type { PricingChannelDTO } from "@/domain/pricing/types";
import { Button } from "@/components/ui/button";
import { ContextEditor } from "@/components/admin/context-editor";
import { PricingReferenceEditor } from "./pricing-settings-panel";

export function ChannelRegistration({
  allowed,
  onSaved,
}: {
  allowed?: boolean;
  onSaved: (channel: PricingChannelDTO) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!allowed)
    return (
      <p className="text-sm text-muted-foreground">
        Para cadastrar um novo canal, solicite ao administrador.
      </p>
    );
  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Cadastrar canal
      </Button>
      <ContextEditor
        open={open}
        onOpenChange={setOpen}
        title="Cadastrar canal de venda"
        description="Informe os custos e taxas. O canal será selecionado no cálculo ao salvar."
      >
        {open && (
          <PricingReferenceEditor
            kind="channels"
            rows={[]}
            onSaved={(row) => {
              onSaved(row as PricingChannelDTO);
              setOpen(false);
            }}
          />
        )}
      </ContextEditor>
    </>
  );
}
