import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Queue } from "@/components/planning/queue";
import { QueueCalendar } from "@/components/planning/queue-calendar";
import { QueueSimulationPanel } from "@/components/planning/queue-simulation";
import { Button } from "@/components/ui/button";
import type { PlanningData } from "@/components/planning/shared";
import { simulateQueue, type QueuePreview } from "@/domain/planning/scenario";
import { scenarioBatch, scenarioInput } from "./fixtures/planning-scenario";
import "@/app/design.css";
const input = scenarioInput();
input.machines[0].batches[0].durationMinutes = "900";
input.machines[0].batches[0].participants.push({ ...input.machines[0].batches[0].participants[0], id: "mixed", lineId: "mixed", orderSequence: 201, description: "Peça de outro pedido" });
input.machines[0].batches.push(scenarioBatch("missing", { state: "PENDING", position: 3, blockers: ["Reserva insuficiente para o lote"] }));
const scenario = { printerId: "p", batchIds: ["b", "a", "missing"] }, simulation = simulateQueue(input, scenario);
const data = { asOf: input.asOf, revision: 4, batches: input.machines.flatMap(m => m.batches), printers: [{ id: "p", name: "FDM · Impressora A" }, { id: "q", name: "FDM · Impressora B" }], forecast: simulation.before } as unknown as PlanningData;
const preview: QueuePreview = { ...simulation, asOf: input.asOf, revision: 4, expiresAt: "2026-10-27T11:01:00Z", fingerprint: "f".repeat(64) };
function Preview() {
  const [view, setView] = useState("Calendário"), [selected, setSelected] = useState("");
  return <main style={{ maxWidth: 1280, margin: "0 auto", padding: 16, minWidth: 0 }}>
    <h1>Planejamento de produção · prévia E3</h1><p>Dados sintéticos. Sem conexão com a instalação operacional.</p>
    <div className="my-4 flex flex-wrap gap-2">{["Calendário", "Simulação", "Lista"].map(v => <Button key={v} variant={v === view ? "default" : "outline"} onClick={() => setView(v)}>{v}</Button>)}
      <Button variant="outline" onClick={() => { document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; }}>Alternar tema</Button>
    </div>
    {selected && <p role="status">Lote selecionado: {selected}</p>}
    {view === "Calendário" && <QueueCalendar data={data} batches={data.batches} onSelect={setSelected} />}
    {view === "Simulação" && <QueueSimulationPanel data={data} preview={preview} busy={false} error="" expired={false} ready={false} uncertain={false} onCancel={() => setView("Lista")} onRefresh={() => {}} onConfirm={() => {}} />}
    {view === "Lista" && <Queue data={data} batches={data.batches} onSelect={setSelected} onDone={() => {}} />}
  </main>;
}
createRoot(document.getElementById("root")!).render(<Preview />);
