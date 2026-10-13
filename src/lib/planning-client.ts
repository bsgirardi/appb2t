import { api } from "./client-api";
export function planningCommand<T = unknown>(
  action: string,
  payload: unknown,
): Promise<T> {
  return api("/api/planning/commands", { action, payload });
}
