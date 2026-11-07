import { useState } from "react";
import { createRoot } from "react-dom/client";
import { PriorityTable } from "@/components/dashboard/priority-table";
import { Button } from "@/components/ui/button";
import { commercialAlerts } from "@/domain/dashboard/commercial-alerts";
import "@/app/design.css";
function Preview() {
  const [empty, setEmpty] = useState(false);
  const data = commercialAlerts(
    empty
      ? []
      : [
          {
            id: "quote-demo",
            sequence: 42,
            status: "ENVIADO",
            validUntil: "2026-11-09",
            opportunityId: "opportunity-demo",
          },
          {
            id: "standalone-demo",
            sequence: 43,
            status: "APROVADO",
            validUntil: "2026-11-07",
            opportunityId: null,
          },
        ],
    empty
      ? []
      : [
          {
            id: "opportunity-demo",
            title: "Proposta de organizadores personalizados",
            stage: "PROPOSTA",
            principalQuoteId: "quote-demo",
            nextContactDate: "2026-11-05",
            nextAction:
              "Confirmar as medidas com o cliente e combinar a próxima conversa",
            ownerName: "Responsável de teste",
            waitingSince: "2026-10-24",
          },
        ],
    "2026-11-07",
  );
  return (
    <main className="admin-ui mx-auto flex min-w-0 max-w-5xl flex-col gap-4 p-4">
      <h1>Alertas comerciais · dados fictícios</h1>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() =>
            (document.documentElement.dataset.theme =
              document.documentElement.dataset.theme === "dark"
                ? "light"
                : "dark")
          }
        >
          Alternar tema
        </Button>
        <Button variant="outline" onClick={() => setEmpty(!empty)}>
          Alternar ausência de registros
        </Button>
      </div>
      <PriorityTable
        priorities={data.priorities}
        context={
          empty
            ? "Nenhuma negociação aberta ou proposta vigente registrada para acompanhamento comercial. Ausência de alerta não comprova todos os contatos em dia."
            : "Posição atual: propostas vigentes até 7 dias e contatos agendados antes de hoje. Uma proposta sem validade e uma negociação sem próximo contato precisam de dados. Ausência de alerta não comprova que todos os contatos estejam em dia. Sem retorno exige envio explícito da versão atual sem resposta registrada por 14 dias corridos; lembretes não reiniciam a espera."
        }
      />
      <p>
        Prévia sintética. Os links representam os destinos reais; estes
        registros fictícios não existem no sistema.
      </p>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Preview />);
