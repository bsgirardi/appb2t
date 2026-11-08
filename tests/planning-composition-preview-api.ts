export async function api() {
  throw new Error(
    "Prévia sintética: atualização indisponível. Nenhuma operação foi enviada.",
  );
}
export async function planningCommand() {
  throw new Error("Comandos bloqueados na prévia sintética.");
}
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
