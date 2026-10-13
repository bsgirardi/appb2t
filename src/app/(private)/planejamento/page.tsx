import Link from "next/link";
import { requireActor } from "@/server/auth/guards";
import { getPlanning } from "@/server/planning/queries";
import { PlanningPanel } from "@/components/planning/planning-panel";
export default async function PlanningPage() {
  const initial = await getPlanning(await requireActor());
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div className="page-heading">
        <div>
          <h1>Planejamento das máquinas</h1>
          <p>Filas, material e disponibilidade da equipe.</p>
        </div>
        <Link href="/producao">Ordens de produção</Link>
      </div>
      <p>
        A previsão termina na retirada das peças. Não inclui acabamento,
        embalagem ou entrega ao cliente.
      </p>
      <PlanningPanel initial={initial} />
    </section>
  );
}
