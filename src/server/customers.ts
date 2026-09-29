import type { Customer, Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError, conflict } from "@/lib/errors";
import type { Actor } from "./auth/session";
import type { CustomerDTO } from "@/domain/customers/types";
import type { Page } from "@/domain/shared/pagination";
import {
  customerSchema,
  customerFilterSchema,
  customerStateSchema,
} from "@/domain/customers/validation";
function dto(row: Customer): CustomerDTO {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    document: row.document,
    email: row.email,
    phone: row.phone,
    address: row.address,
    notes: row.notes,
    active: row.active,
    version: row.version,
  };
}
export async function getCustomer(
  _actor: Actor,
  id: string,
): Promise<CustomerDTO> {
  const row = await db.customer.findUnique({ where: { id } });
  if (!row) throw new AppError("NOT_FOUND", "Cliente não encontrado.");
  return dto(row);
}
export async function saveCustomer(
  _actor: Actor,
  id: string | undefined,
  raw: unknown,
): Promise<CustomerDTO> {
  if (!id)
    return dto(await db.customer.create({ data: customerSchema.parse(raw) }));
  const { expectedVersion, ...data } = customerSchema
    .extend({ expectedVersion: z.number().int().positive() })
    .parse(raw);
  return db.$transaction(async (tx) => {
    const result = await tx.customer.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (!result.count) throw conflict();
    return dto(await tx.customer.findUniqueOrThrow({ where: { id } }));
  });
}
export async function setCustomerActive(
  _actor: Actor,
  id: string,
  active: boolean,
  expectedVersion: number,
): Promise<CustomerDTO> {
  customerStateSchema.parse({ active, expectedVersion });
  return db.$transaction(async (tx) => {
    const result = await tx.customer.updateMany({
      where: { id, version: expectedVersion },
      data: { active, version: { increment: 1 } },
    });
    if (!result.count) throw conflict();
    return dto(await tx.customer.findUniqueOrThrow({ where: { id } }));
  });
}
export async function listCustomers(
  _actor: Actor,
  raw: unknown = {},
): Promise<Page<CustomerDTO>> {
  const f = customerFilterSchema.parse(raw);
  const documentSearch = f.search.replace(/[^a-zA-Z0-9]/g, "");
  const where: Prisma.CustomerWhereInput = {
    ...(f.active !== "all" ? { active: f.active === "true" } : {}),
    ...(f.search
      ? {
          OR: [
            { name: { contains: f.search, mode: "insensitive" } },
            ...(documentSearch
              ? [
                  {
                    document: {
                      contains: documentSearch,
                      mode: "insensitive" as const,
                    },
                  },
                ]
              : []),
          ],
        }
      : {}),
  };
  const [rows, total] = await db.$transaction(
    [
      db.customer.findMany({
        where,
        skip: (f.page - 1) * f.pageSize,
        take: f.pageSize,
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
      db.customer.count({ where }),
    ],
    { isolationLevel: "RepeatableRead" },
  );
  return { items: rows.map(dto), total, page: f.page, pageSize: f.pageSize };
}
