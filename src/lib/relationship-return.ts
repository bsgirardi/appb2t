/** Accept only the exact local list route, with its query left intact. */
export function relationshipReturn(
  value: unknown,
  route: "/negociacoes" | "/solicitacoes",
) {
  if (typeof value !== "string" || /[\\\r\n\t#]/.test(value)) return route;
  return value === route || value.startsWith(`${route}?`) ? value : route;
}
