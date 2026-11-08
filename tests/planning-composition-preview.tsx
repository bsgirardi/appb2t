import { createRoot } from "react-dom/client";
import { PlanningPanel } from "@/components/planning/planning-panel";
import { BatchDetail } from "@/components/planning/batch-detail";
import { QueueSimulationPanel } from "@/components/planning/queue-simulation";
import type { PlanningData } from "@/components/planning/shared";
import { simulateQueue } from "@/domain/planning/scenario";
import { scenarioInput, scenarioBatch } from "./fixtures/planning-scenario";
import "@/app/design.css";
const input = scenarioInput();
input.machines[0].batches[0].participants[0].description =
  "Suporte personalizado com identificação extensa para conferência de composição e acabamento";
input.machines[0].batches.push(
  scenarioBatch("missing", {
    state: "PENDING",
    position: 3,
    durationMinutes: null,
    blockers: [
      "Reserva insuficiente para o lote. Revise a cobertura de material antes de programar.",
    ],
  }),
);
const simulation = simulateQueue(input, {
  printerId: "p",
  batchIds: ["b", "a", "missing"],
});
const params = new URLSearchParams(location.search);
document.documentElement.dataset.theme = params.get("theme") ?? "light";
const data = {
  asOf: input.asOf,
  revision: 4,
  role: "OPERATOR",
  warnings: [],
  issues: [],
  users: [],
  calendars: [],
  lines: [],
  suggestions: [],
  allocations: [],
  reports: [],
  timeSummaries: [],
  materials: [{ id: "m", name: "PLA para composição", unit: "G" }],
  batches: params.has("empty") ? [] : input.machines.flatMap((m) => m.batches),
  printers: [
    { id: "p", name: "FDM · Impressora A com identificação extensa" },
    { id: "q", name: "FDM · Impressora B" },
  ],
  forecast: simulation.before,
} as unknown as PlanningData;
createRoot(document.getElementById("root")!).render(
  <main
    className="admin-theme admin-ui"
    style={{
      fontFamily: "var(--font-admin)",
      maxWidth: 1280,
      margin: "0 auto",
      padding: 16,
      minWidth: 0,
    }}
  >
    <h1>Planejamento das máquinas</h1>
    <p>Prévia com dados sintéticos. Sem conexão operacional.</p>
    {params.has("detail") ? (
      <div className="planning-composition">
        <BatchDetail
          data={data}
          batch={data.batches[0]}
          onDone={() => {}}
          onClose={() => {}}
        />
      </div>
    ) : params.has("simulation") ? (
      <QueueSimulationPanel
        data={data}
        preview={{
          ...simulation,
          asOf: input.asOf,
          revision: 4,
          expiresAt: "2026-10-27T11:01:00Z",
          fingerprint: "f",
        }}
        busy={false}
        error=""
        expired={false}
        ready={false}
        uncertain={false}
        onRefresh={() => {}}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    ) : (
      <PlanningPanel initial={data} />
    )}
  </main>,
);
