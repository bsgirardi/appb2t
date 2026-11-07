import { requireAdmin } from "@/server/auth/guards";
import {
  getTaxReport,
  getTaxMemory,
  listTaxMemories,
} from "@/server/tax/reports";
import { TaxReportPanel } from "@/components/finance/tax-report";
import { todaySaoPaulo } from "@/domain/commerce/dates";
import { competenceSchema } from "@/domain/tax/validation";
import { Notice } from "@/components/ui/field";
export default async function TaxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireAdmin(),
    query = await searchParams;
  const memory =
    typeof query.memory === "string"
      ? await getTaxMemory(actor, query.memory)
      : undefined;
  const parsed = competenceSchema.safeParse(
    query.competence ?? todaySaoPaulo(new Date()).slice(0, 7),
  );
  const competence =
    memory?.result.competence ??
    (parsed.success ? parsed.data : todaySaoPaulo(new Date()).slice(0, 7));
  const [report, memories] = await Promise.all([
    memory ? Promise.resolve(memory.result) : getTaxReport(actor, competence),
    listTaxMemories(actor, competence),
  ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Previsão tributária</h1>
          <p>Premissas, custos fixos e cobertura dos registros comerciais.</p>
        </div>
      </div>
      {!parsed.success && (
        <Notice>Competência inválida. Exibindo o mês atual.</Notice>
      )}
      <TaxReportPanel
        key={memory?.id ?? report.readAt}
        report={report}
        memories={memories}
        memory={memory}
      />
    </>
  );
}
