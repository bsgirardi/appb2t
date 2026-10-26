import { D, sum } from "@/server/dashboard/shared";
type StockInput = {
  id: string;
  unit: string;
  inventoried: boolean;
  physical: string;
  events: { kind: string; quantity: string }[];
  need: string;
  covered: string;
};
export function summarizeStock(input: StockInput[]) {
  const items = input.map((i) => {
    const reserved = sum(
      i.events.map((e) =>
        new D(e.quantity).times(e.kind === "RESERVE" ? 1 : -1).toFixed(),
      ),
    );
    const available = i.inventoried ? new D(i.physical).minus(reserved) : null;
    const uncovered = D.max(0, new D(i.need).minus(D.min(reserved, i.covered)));
    return {
      ...i,
      physical: i.inventoried ? i.physical : null,
      reserved: reserved.toFixed(),
      available: available?.toFixed() ?? null,
      uncovered: uncovered.toFixed(),
      purchase:
        available === null
          ? null
          : D.max(0, uncovered.minus(available)).toFixed(),
    };
  });
  const units = [...new Set(items.map((i) => i.unit))].map((unit) => {
    const group = items.filter((i) => i.unit === unit),
      complete = group.every((i) => i.inventoried);
    return {
      unit,
      physical: complete ? sum(group.map((i) => i.physical!)).toFixed() : null,
      reserved: sum(group.map((i) => i.reserved)).toFixed(),
      available: complete
        ? sum(group.map((i) => i.available!)).toFixed()
        : null,
      need: sum(group.map((i) => i.need)).toFixed(),
      purchase: complete ? sum(group.map((i) => i.purchase!)).toFixed() : null,
    };
  });
  return { items, units };
}
