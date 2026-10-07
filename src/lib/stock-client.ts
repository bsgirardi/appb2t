import { api } from "./client-api";
export function stockCommand(
  action: string,
  payload: unknown,
): Promise<unknown> {
  return api("/api/stock/commands", { action, payload });
}
