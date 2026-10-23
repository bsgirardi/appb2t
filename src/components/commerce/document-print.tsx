import Image from "next/image";
import type { DocumentSnapshot, DocumentTotals } from "@/domain/commerce/types";
const money = (value: string) => {
  const [integer, fraction = "00"] = value.split(".");
  return `R$ ${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${fraction.padEnd(2, "0")}`;
};
export function DocumentPrint({
  number,
  snapshot,
  totals,
  paymentTerms,
  validUntil,
}: {
  number: string;
  snapshot: DocumentSnapshot;
  totals: DocumentTotals;
  paymentTerms: string;
  validUntil?: string;
}) {
  return (
    <article className="commercial-print">
      <header>
        {snapshot.company.logoUrl && (
          <Image
            unoptimized
            src={snapshot.company.logoUrl}
            alt={`Logo ${snapshot.company.name}`}
            width={120}
            height={80}
            style={{ objectFit: "contain" }}
          />
        )}
        <h1>{snapshot.company.name}</h1>
        <p>{snapshot.company.address}</p>
        <p>
          {snapshot.company.email} {snapshot.company.phone}
        </p>
        <h2>{number}</h2>
        <p>
          Emissão:{" "}
          {new Date(snapshot.issuedAt).toLocaleDateString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          })}
          {validUntil &&
            ` · Validade: ${validUntil.split("-").reverse().join("/")}`}
        </p>
      </header>
      <section>
        <h3>Cliente</h3>
        <strong>{snapshot.customer.name}</strong>
        <p>{snapshot.customer.document}</p>
        <p>{snapshot.customer.address}</p>
        <p>
          {snapshot.customer.email} {snapshot.customer.phone}
        </p>
      </section>
      <div className="table-scroll">
        {!!snapshot.art?.length && (
          <section>
            <h3>Arte na emissão deste documento</h3>
            {snapshot.art.map((a) => (
              <p key={a.lineKey}>
                Linha {a.lineNumber ?? "—"}:{" "}
                {a.applicable
                  ? `aprovada, versão ${a.revisionNumber}`
                  : "pendente de aprovação aplicável"}
              </p>
            ))}
          </section>
        )}
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Qtd.</th>
              <th>Unitário</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.items.map((item, i) => (
              <tr key={i}>
                <td>
                  {item.name !== item.description && (
                    <strong>
                      {item.name}
                      <br />
                    </strong>
                  )}
                  {item.description}
                  {item.catalogOrigin &&
                    snapshot.catalogKits?.groups.find(
                      (group) =>
                        group.lineIds.includes(
                          item.catalogOrigin!.sourceLineId,
                        ) &&
                        item.catalogOrigin!.requestId ===
                          snapshot.catalogKits!.requestId,
                    ) && (
                      <p>
                        Conjunto:{" "}
                        {
                          snapshot.catalogKits.groups.find((group) =>
                            group.lineIds.includes(
                              item.catalogOrigin!.sourceLineId,
                            ),
                          )!.name
                        }
                      </p>
                    )}
                </td>
                <td>{item.quantity}</td>
                <td>{money(item.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl>
        <dt>Subtotal</dt>
        <dd>{money(totals.subtotal)}</dd>
        <dt>Desconto</dt>
        <dd>{money(totals.discount)}</dd>
        <dt>Frete</dt>
        <dd>{money(totals.shipping)}</dd>
        <dt>Total</dt>
        <dd>
          <strong>{money(totals.total)}</strong>
        </dd>
      </dl>
      <h3>Condições de pagamento</h3>
      <p className="preserve-lines">{paymentTerms}</p>
      <footer>{snapshot.company.footer}</footer>
    </article>
  );
}
