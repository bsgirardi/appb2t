import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { stockEndpoint, stockBody } from "@/server/stock/http";
export const consignmentBody = stockBody;
export function consignmentEndpoint(
  fn: () => Promise<Response>,
  query = false,
) {
  return stockEndpoint(async () => {
    try {
      return await fn();
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2003"].includes(e.code)
      )
        throw new AppError(
          "CONFLICT",
          "O registro conflita com uma operação existente. Atualize os dados.",
        );
      throw e;
    }
  }, query);
}
