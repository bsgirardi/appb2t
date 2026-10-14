import Decimal from "decimal.js";
export function summarizeTimes(
  actualMachineMinutes: string | null,
  quantitiesSettled: boolean,
  reports: {
    eventId: string;
    machineMinutes: string | null;
    exclusive: boolean;
  }[],
) {
  const unique = [...new Map(reports.map((e) => [e.eventId, e])).values()];
  const known =
    unique.length > 0 &&
    unique.every((e) => e.exclusive) &&
    unique.some((e) => e.machineMinutes !== null);
  const reportedMachineMinutes = known
    ? unique
        .reduce((n, e) => n.plus(e.machineMinutes ?? 0), new Decimal(0))
        .toFixed()
    : null;
  const differenceMinutes =
    actualMachineMinutes !== null && reportedMachineMinutes !== null
      ? new Decimal(reportedMachineMinutes)
          .minus(actualMachineMinutes)
          .toFixed()
      : null;
  return {
    actualMachineMinutes,
    reportedMachineMinutes,
    differenceMinutes,
    complete: quantitiesSettled && differenceMinutes === "0",
  };
}
