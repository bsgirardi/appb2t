import { Prisma, type Customer } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/server/auth/session";
import type { Page } from "@/domain/shared/pagination";
import type { CustomerDTO } from "@/domain/customers/types";
import type {
  CatalogContact,
  CatalogLineSnapshot,
  CatalogRequestDTO,
  CatalogRequestSummaryDTO,
} from "@/domain/catalog-requests/types";
import { receiptOf } from "./receive";
const include = {
  assignee: { select: { name: true } },
  _count: { select: { lines: true } },
} satisfies Prisma.CatalogRequestInclude;
type SummaryRow = Prisma.CatalogRequestGetPayload<{ include: typeof include }>;
function summary(row: SummaryRow): CatalogRequestSummaryDTO {
  return {
    id: row.id,
    protocol: receiptOf(row).protocol,
    state: row.state,
    version: row.version,
    name: row.name,
    preferredChannel:
      row.preferredChannel as CatalogContact["preferredChannel"],
    createdAt: row.createdAt.toISOString(),
    lineCount: row._count.lines,
    consultCount: row.consultCount,
    assigneeId: row.assigneeId,
    assigneeName: row.assignee?.name ?? null,
    quoteId: row.quoteId,
  };
}
export async function getCatalogRequestWithClient(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<CatalogRequestDTO> {
  const row = await tx.catalogRequest.findUnique({
    where: { id },
    include: {
      ...include,
      lines: { orderBy: { position: "asc" } },
      events: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
  });
  if (!row) throw new AppError("NOT_FOUND", "Solicitação não encontrada.");
  const lines = row.lines.map(
    (line) => line.snapshot as unknown as CatalogLineSnapshot,
  );
  const currentProducts = await tx.product.findMany({
    where: { id: { in: lines.map((line) => line.productId) } },
    select: {
      id: true,
      name: true,
      active: true,
      availability: true,
      commercialRevision: true,
    },
  });
  return {
    ...summary(row),
    contact: row.contact as unknown as CatalogContact,
    lines,
    knownTotal: row.knownTotal?.toFixed(2) ?? null,
    currentProducts,
    events: row.events.map((event) => ({
      id: event.id,
      action: event.action,
      note: event.note,
      actorName: event.actorName,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}
export async function getCatalogRequest(
  _actor: Actor,
  id: string,
): Promise<CatalogRequestDTO> {
  return db.$transaction((tx) => getCatalogRequestWithClient(tx, id), {
    isolationLevel: "RepeatableRead",
  });
}
export async function listCatalogRequests(
  _actor: Actor,
  raw: unknown = {},
): Promise<Page<CatalogRequestSummaryDTO>> {
  const f = z
    .object({
      page: z.coerce.number().int().min(1).max(1000000).default(1),
      search: z.string().trim().max(160).default(""),
      state: z
        .enum([
          "all",
          "RECEBIDA",
          "EM_ATENDIMENTO",
          "ORCAMENTO_PREPARADO",
          "ENCERRADA",
        ])
        .default("all"),
    })
    .strict()
    .parse(raw);
  const sequence = /^SOL-\d+$/i.test(f.search)
    ? Number(f.search.slice(4))
    : null;
  const where: Prisma.CatalogRequestWhereInput = {
    ...(f.state === "all" ? {} : { state: f.state }),
    ...(f.search
      ? {
          OR: [
            { name: { contains: f.search, mode: "insensitive" } },
            ...(sequence && Number.isSafeInteger(sequence)
              ? [{ sequence }]
              : []),
          ],
        }
      : {}),
  };
  const [rows, total] = await db.$transaction(
    [
      db.catalogRequest.findMany({
        where,
        include,
        orderBy: { sequence: "desc" },
        skip: (f.page - 1) * 20,
        take: 20,
      }),
      db.catalogRequest.count({ where }),
    ],
    { isolationLevel: "RepeatableRead" },
  );
  return { items: rows.map(summary), total, page: f.page, pageSize: 20 };
}
export async function findRequestCustomers(
  actor: Actor,
  id: string,
  rawSearch: string,
): Promise<CustomerDTO[]> {
  const search = z.string().trim().max(160).parse(rawSearch);
  const request = await getCatalogRequest(actor, id);
  const name = search || request.contact.name;
  const email = search || request.contact.email;
  const phone = (search || request.contact.phone).replace(/\D/g, "");
  const national =
    phone.startsWith("55") && [12, 13].includes(phone.length)
      ? phone.slice(2)
      : phone;
  const international =
    !search || phone.startsWith("55")
      ? phone
      : [10, 11].includes(phone.length)
        ? `55${phone}`
        : phone;
  const rows = await db.$queryRaw<
    Customer[]
  >`SELECT * FROM "Customer" WHERE active = true AND (name ILIKE ${`%${name}%`} OR (${email} <> '' AND lower(email) = lower(${email})) OR (${phone} <> '' AND regexp_replace(phone,'[^0-9]','','g') IN (${phone}, ${national}, ${international}))) ORDER BY name,id LIMIT 20`;
  return rows.map((row) => ({
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
  }));
}
