import { api } from "./client-api";
export type ConsignmentArea = "partners" | "shipments" | "sales" | "statements";
export function consignmentCommand<T>(
  area: ConsignmentArea,
  payload: Record<string, unknown>,
) {
  return api<T>("/api/consignment/commands", { area, payload });
}
