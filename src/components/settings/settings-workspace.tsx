"use client";

import { useState } from "react";
import type { PricingCatalogDTO } from "@/domain/pricing/types";
import type { CommercialSettingsDTO } from "@/domain/opportunities/reply-tracking";
import type { TaxProfilesDTO } from "@/domain/tax/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  PricingSettingsProvider,
  PricingRatesPanel,
  PricingReferencesPanel,
} from "@/components/pricing/pricing-settings-panel";
import { SettingsPanel, type AdminData } from "./settings-panel";
import { CommercialSettingsPanel } from "./commercial-settings-panel";
import { TaxSettingsPanel } from "./tax-settings-panel";

const areas = [
  ["production", "Produção"],
  ["pricing", "Precificação"],
  ["references", "Canais e complementos"],
  ["tax", "Tributação"],
  ["commercial", "Alertas comerciais"],
  ["team", "Equipe"],
] as const;
export function SettingsWorkspace({
  initialData,
  catalog,
  commercial,
  tax,
}: {
  initialData: AdminData;
  catalog: PricingCatalogDTO;
  commercial: CommercialSettingsDTO;
  tax: TaxProfilesDTO;
}) {
  const [area, setArea] = useState("production");
  return (
    <PricingSettingsProvider initialCatalog={catalog}>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONTROLE DA OPERAÇÃO</div>
          <h1>Configurações</h1>
          <p>Custos, preços e preferências organizados por assunto.</p>
        </div>
        <span className="admin-label">Acesso de administrador</span>
      </div>
      <Tabs value={area} onValueChange={setArea}>
        <TabsList
          aria-label="Áreas de configuração"
          className="h-auto flex-wrap justify-start"
        >
          {areas.map(([key, label]) => (
            <TabsTrigger key={key} value={key}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent
          value="production"
          forceMount
          hidden={area !== "production"}
        >
          <div className="flex flex-col gap-5">
            <SettingsPanel
              initialData={initialData}
              availableTabs={["materials", "printers"]}
              embedded
            />
            <PricingRatesPanel section="production" />
          </div>
        </TabsContent>
        <TabsContent value="pricing" forceMount hidden={area !== "pricing"}>
          <PricingRatesPanel section="pricing" />
        </TabsContent>
        <TabsContent
          value="references"
          forceMount
          hidden={area !== "references"}
        >
          <PricingReferencesPanel />
        </TabsContent>
        <TabsContent value="tax" forceMount hidden={area !== "tax"}>
          <TaxSettingsPanel initial={tax} />
        </TabsContent>
        <TabsContent
          value="commercial"
          forceMount
          hidden={area !== "commercial"}
        >
          <CommercialSettingsPanel initial={commercial} />
        </TabsContent>
        <TabsContent value="team" forceMount hidden={area !== "team"}>
          <SettingsPanel
            initialData={initialData}
            availableTabs={["users"]}
            embedded
          />
        </TabsContent>
      </Tabs>
    </PricingSettingsProvider>
  );
}
