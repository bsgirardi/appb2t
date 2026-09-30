import Link from "next/link";
import { requireActor } from "@/server/auth/guards";
import { getQuote } from "@/server/quotes";
import { DocumentPrint } from "@/components/commerce/document-print";
export default async function PrintQuote({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireActor();
  const q = await getQuote(actor, (await params).id);
  return (
    <div className="print-page">
      <div className="no-print">
        <Link href={`/orcamentos/${q.id}`}>← Voltar ao orçamento</Link>
        <p>Use a impressão do navegador para imprimir ou salvar em PDF.</p>
      </div>
      {q.snapshot && q.totals ? (
        <DocumentPrint
          number={q.number}
          snapshot={q.snapshot}
          totals={q.totals}
          paymentTerms={q.input.paymentTerms ?? ""}
          validUntil={q.input.validUntil}
        />
      ) : (
        <p>Emita o orçamento para disponibilizar sua impressão.</p>
      )}
    </div>
  );
}
