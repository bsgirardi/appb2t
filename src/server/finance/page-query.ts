import { financeFilterSchema } from "@/domain/finance/validation";
export function financePageQuery(
  raw: Record<string, string | string[] | undefined>,
) {
  const query = Object.fromEntries(
    Object.entries(raw).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && entry[1] !== "",
    ),
  );
  const parsed = financeFilterSchema.safeParse(query);
  if (
    !parsed.success ||
    (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo)
  )
    return { query: {}, filter: financeFilterSchema.parse({}), invalid: true };
  return { query, filter: parsed.data, invalid: false };
}
