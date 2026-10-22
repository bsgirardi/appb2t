import { ZodError } from "zod";
import { AppError } from "@/lib/errors";
import { calculatePreparedKitDiscount as calculate } from "@/domain/kits/document";
export function calculatePreparedKitDiscount(
  ...args: Parameters<typeof calculate>
): ReturnType<typeof calculate> {
  try {
    return calculate(...args);
  } catch (error) {
    if (error instanceof ZodError) throw error;
    throw new AppError(
      "VALIDATION",
      error instanceof Error ? error.message : "Revise os valores do kit.",
    );
  }
}
