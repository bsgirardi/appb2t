/** Return only to this report; never accept an external or unrelated destination. */
export function profitabilityReturnHref(value: unknown): string {
  return typeof value === "string" &&
    (value === "/rentabilidade" || value.startsWith("/rentabilidade?"))
    ? value
    : "/rentabilidade";
}

export function profitabilitySaleHref(
  saleId: string,
  returnHref?: string,
): string {
  const path = `/rentabilidade/${encodeURIComponent(saleId)}`;
  return returnHref
    ? `${path}?${new URLSearchParams({ returnTo: profitabilityReturnHref(returnHref) })}`
    : path;
}
