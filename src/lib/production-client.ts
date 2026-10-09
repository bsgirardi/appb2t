import { api } from "./client-api";
export function productionCommand(
  action: string,
  payload: unknown,
): Promise<unknown> {
  return api("/api/production/commands", { action, payload });
}
