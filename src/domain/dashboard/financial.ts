import { D, sum, ratio } from "@/server/dashboard/shared";
import { shiftDay } from "./filters";
import { projectCashFlow } from "@/domain/finance/projection";
export type OutstandingEntry = {
  id: string;
  kind: "RECEIVABLE" | "PAYABLE";
  due: string;
  remaining: string;
};
export function summarizeFinance(
  entries: OutstandingEntry[],
  balance: string | null,
  today: string,
) {
  const pending = entries.filter((e) => new D(e.remaining).gt(0));
  const total = (
    kind: OutstandingEntry["kind"],
    test: (e: OutstandingEntry) => boolean = () => true,
  ) =>
    sum(
      pending.filter((e) => e.kind === kind && test(e)).map((e) => e.remaining),
    ).toFixed(2);
  const receivable = total("RECEIVABLE"),
    overdueReceivable = total("RECEIVABLE", (e) => e.due < today);
  const projection = projectCashFlow(
    balance ?? "0",
    today,
    pending
      .filter((e) => e.due <= shiftDay(today, 30))
      .map((e) => ({
        dueDate: e.due,
        kind: e.kind,
        remainingAmount: e.remaining,
      })),
  );
  const projected = projection.projected.map((d) => ({
    ...d,
    closingBalance: balance === null ? null : d.closingBalance,
  }));
  return {
    receivable,
    overdueReceivable,
    payable: total("PAYABLE"),
    overduePayable: total("PAYABLE", (e) => e.due < today),
    receivable7: total(
      "RECEIVABLE",
      (e) => e.due >= today && e.due <= shiftDay(today, 7),
    ),
    payable7: total(
      "PAYABLE",
      (e) => e.due >= today && e.due <= shiftDay(today, 7),
    ),
    receivable30: total(
      "RECEIVABLE",
      (e) => e.due >= today && e.due <= shiftDay(today, 30),
    ),
    payable30: total(
      "PAYABLE",
      (e) => e.due >= today && e.due <= shiftDay(today, 30),
    ),
    delinquency: ratio(overdueReceivable, receivable),
    minimum:
      balance === null
        ? null
        : D.min(balance, ...projected.map((d) => d.closingBalance!)).toFixed(2),
    projected,
    overdueNet: projection.overdueNet,
  };
}
export function hourlyResult(
  contribution: string | null,
  machineMinutes: string | null,
  coverage: string,
) {
  return contribution === null ||
    machineMinutes === null ||
    coverage !== "COMPLETE" ||
    new D(machineMinutes).lte(0)
    ? null
    : new D(contribution).div(new D(machineMinutes).div(60)).toFixed(2);
}
export function measuredMachineMinutes(event: {
  timeComplete: boolean;
  machineMinutes: string | null;
  premises: unknown;
  corrections: { machineMinutes: string | null }[];
}) {
  if (!event.timeComplete) return null;
  const manual =
    event.premises !== null &&
    typeof event.premises === "object" &&
    "manualStage" in event.premises &&
    event.premises.manualStage === true;
  if (manual) return "0";
  if (event.machineMinutes === null) return null;
  return new D(event.machineMinutes)
    .plus(sum(event.corrections.map((c) => c.machineMinutes ?? "0")))
    .toFixed();
}
