export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "RATE_LIMIT"
  | "NOT_FOUND";
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
export const conflict = () =>
  new AppError(
    "CONFLICT",
    "Este registro foi alterado por outra pessoa. Atualize os dados antes de salvar novamente.",
  );
