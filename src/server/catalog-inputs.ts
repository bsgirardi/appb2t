import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import { lockOperation } from "./commerce/locks";
import { lockPlanning } from "./planning/coordination";
import { reconcilePlanningTx } from "./planning/invariants";
import {
  decimalSchema,
  printerValuesSchema,
} from "@/domain/calculation/validation";
import type {
  CalculatorData,
  MaterialDTO,
  PrinterDTO,
} from "@/domain/calculation/types";
import type { Actor } from "./auth/session";
import { assertAdmin } from "./auth/authorization";
import { settingsDTO } from "./settings";
const base = z.object({
  id: z.string().min(1).optional(),
  expectedVersion: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(100),
  technology: z.enum(["FDM", "RESIN"]),
  active: z.boolean(),
});
const materialSchema = base.extend({ price: decimalSchema }).strict();
const printerSchema = base.extend(printerValuesSchema.shape).strict();
export async function saveMaterial(
  actor: Actor,
  input: unknown,
): Promise<MaterialDTO> {
  assertAdmin(actor);
  const { id, expectedVersion, ...data } = materialSchema.parse(input);
  const row = await db.$transaction(async (tx) => {
    await lockOperation(tx, "stock:catalog");
    if (!id) return tx.material.create({ data });
    const stock = await tx.stockItem.findUnique({ where: { materialId: id } });
    if (stock && stock.unit !== (data.technology === "FDM" ? "G" : "ML"))
      throw new AppError(
        "VALIDATION",
        "A tecnologia não pode mudar enquanto houver estoque vinculado.",
      );
    if (!expectedVersion) throw conflict();
    const updated = await tx.material.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (!updated.count) throw conflict();
    return tx.material.findUniqueOrThrow({ where: { id } });
  });
  return { ...row, price: row.price.toString() };
}
export async function savePrinter(
  actor: Actor,
  input: unknown,
): Promise<PrinterDTO> {
  assertAdmin(actor);
  const { id, expectedVersion, ...data } = printerSchema.parse(input);
  const row = await db.$transaction(async (tx) => {
    await lockPlanning(tx);
    if (!id) return tx.printer.create({ data });
    if (!expectedVersion) throw conflict();
    const updated = await tx.printer.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (!updated.count) throw conflict();
    await reconcilePlanningTx(tx);
    await tx.planningState.update({
      where: { id: 1 },
      data: { revision: { increment: 1 } },
    });
    return tx.printer.findUniqueOrThrow({ where: { id } });
  });
  return printerDTO(row);
}
export function printerDTO(
  row: Awaited<ReturnType<typeof db.printer.findFirstOrThrow>>,
): PrinterDTO {
  return {
    ...row,
    acquisitionCost: row.acquisitionCost.toString(),
    hoursPerDay: row.hoursPerDay.toString(),
    watts: row.watts.toString(),
  };
}
export async function getCalculatorData(
  _actor: Actor,
): Promise<CalculatorData> {
  void _actor;
  const [materials, printers, settings] = await db.$transaction(
    [
      db.material.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      }),
      db.printer.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      }),
      db.calculationSettings.findUnique({ where: { id: 1 } }),
    ],
    { isolationLevel: "RepeatableRead" },
  );
  return {
    materials: materials.map((m) => ({ ...m, price: m.price.toString() })),
    printers: printers.map(printerDTO),
    settings: settings ? settingsDTO(settings) : null,
    loadedAt: new Date().toISOString(),
  };
}
