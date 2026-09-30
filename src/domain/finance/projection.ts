import { FinanceDecimal as D } from "./balances";
import type { CashDay } from "./types";
export function projectCashFlow(
  balance: string,
  today: string,
  entries: {
    dueDate: string;
    kind: "RECEIVABLE" | "PAYABLE";
    remainingAmount: string;
  }[],
) {
  let overdue = new D(0);
  const days = new Map<
    string,
    { incoming: InstanceType<typeof D>; outgoing: InstanceType<typeof D> }
  >();
  days.set(today, { incoming: new D(0), outgoing: new D(0) });
  for (const entry of entries) {
    const amount = new D(entry.remainingAmount);
    if (amount.lte(0)) continue;
    if (entry.dueDate < today) {
      overdue = overdue.plus(
        entry.kind === "RECEIVABLE" ? amount : amount.negated(),
      );
      continue;
    }
    const day = days.get(entry.dueDate) ?? {
      incoming: new D(0),
      outgoing: new D(0),
    };
    if (entry.kind === "RECEIVABLE") day.incoming = day.incoming.plus(amount);
    else day.outgoing = day.outgoing.plus(amount);
    days.set(entry.dueDate, day);
  }
  let closing = new D(balance).plus(overdue);
  const projected: CashDay[] = [...days]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, day]) => {
      closing = closing.plus(day.incoming).minus(day.outgoing);
      return {
        date,
        incoming: day.incoming.toFixed(2),
        outgoing: day.outgoing.toFixed(2),
        transfersNet: "0.00",
        adjustmentsNet: "0.00",
        closingBalance: closing.toFixed(2),
      };
    });
  return { projected, overdueNet: overdue.toFixed(2) };
}
