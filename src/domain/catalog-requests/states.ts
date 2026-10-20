import type { CatalogRequestState, RequestChange } from "./types";
export function canChangeRequest(
  state: CatalogRequestState,
  change: RequestChange,
): boolean {
  switch (change.action) {
    case "START":
      return state === "RECEBIDA";
    case "REASSIGN":
      return state === "EM_ATENDIMENTO";
    case "REOPEN":
      return state === "ENCERRADA";
    case "CLOSE":
      return state === "RECEBIDA" || state === "EM_ATENDIMENTO";
    case "NOTE":
      return true;
  }
}
