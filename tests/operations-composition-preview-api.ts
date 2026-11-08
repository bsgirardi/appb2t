import { operationOrder, operationStock } from "./fixtures/operations";
export { ApiError } from "../src/lib/client-api";
export async function api<T>(url: string, body?: unknown): Promise<T> {
  if (!body && url.startsWith("/api/production/orders/"))
    return structuredClone(operationOrder) as T;
  if (!body && url.startsWith("/api/stock/items/"))
    return structuredClone(operationStock) as T;
  throw new Error(
    "Prévia sintética: operação não persistida. Nenhuma conexão com banco.",
  );
}
