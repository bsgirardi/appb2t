import type { OrderDTO } from "@/domain/production/types";

/** Recorded output is distinct from the target and from delivery. */
export function OrderQuantities({ order }: { order: OrderDTO }) {
  return (
    <section
      aria-label={`Quantidades da ordem OP-${String(order.sequence).padStart(6, "0")}`}
      className="operation-quantities"
    >
      <ul className="operation-lines">
        {order.lines.map((line) => (
          <li key={line.id}>
            <p className="operation-line-name">{line.description}</p>
            <dl className="operation-balances">
              <div>
                <dt>Meta planejada</dt>
                <dd>{line.targetUnits} un</dd>
              </div>
              <div>
                <dt>Boas registradas</dt>
                <dd>{line.goodUnits} un</dd>
              </div>
              <div>
                <dt>Pendente da meta</dt>
                <dd>
                  {Math.max(
                    0,
                    line.targetUnits - line.goodUnits - line.canceledUnits,
                  )}{" "}
                  un
                </dd>
              </div>
              <div>
                <dt>Falhas registradas</dt>
                <dd>{line.failedUnits} un</dd>
              </div>
              <div>
                <dt>Canceladas</dt>
                <dd>{line.canceledUnits} un</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground">
        Peças boas não confirmam entrega. A saída para o cliente é registrada na
        venda.
      </p>
    </section>
  );
}
