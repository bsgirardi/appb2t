import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { searchTerms, typoDistance } from "@/domain/products/catalog-search";
import type { parseCatalogCommercialFilters } from "@/domain/products/catalog-commercial-filters";
import { publicProductSelect, toPublicProduct } from "./product-public";

type Criteria = ReturnType<typeof parseCatalogCommercialFilters>;

export async function searchCatalog(
  collectionId: string | undefined,
  search: string,
  order: string,
  page: number,
  criteria: Criteria,
) {
  // PostgreSQL text cannot contain NUL; an invalid term must not turn into browse.
  if (search.includes("\0"))
    return { products: [], total: 0, pages: 0, approximate: false };
  const terms = searchTerms(search);
  const filters = [Prisma.sql`p.active = true`];
  if (criteria.availability)
    filters.push(Prisma.sql`p.availability = ${criteria.availability}`);
  if (criteria.priceMin !== undefined || criteria.priceMax !== undefined)
    filters.push(Prisma.sql`p."publicPriceMode" = 'REFERENCE'`);
  if (criteria.priceMin !== undefined)
    filters.push(Prisma.sql`p.price >= ${criteria.priceMin}::numeric`);
  if (criteria.priceMax !== undefined)
    filters.push(Prisma.sql`p.price <= ${criteria.priceMax}::numeric`);
  if (collectionId)
    filters.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "CollectionProduct" cp JOIN "Collection" c ON c.id = cp."collectionId"
      WHERE cp."productId" = p.id AND c.id = ${collectionId} AND c.active = true
    )`);
  // Normalize fields once per filtered product. strpos keeps %, _, quotes and
  // backslashes literal; neither the query nor the sort becomes SQL syntax.
  const base = Prisma.sql`WITH base AS MATERIALIZED (
    SELECT p.id, p.name, p.price, p."publicPriceMode", p."createdAt",
      lower(public.unaccent(p.name)) AS n,
      lower(public.unaccent(coalesce(p.sku, ''))) AS s,
      lower(public.unaccent(p.description)) AS d
    FROM "Product" p WHERE ${Prisma.join(filters, " AND ")}
  )`;
  const conditions = (approximate: boolean) =>
    Prisma.join(
      terms.map((term) => {
        const normalized = Prisma.sql`lower(public.unaccent(${term}::text))`;
        const exact = Prisma.sql`(${normalized} <> '' AND (strpos(n, ${normalized}) > 0 OR strpos(s, ${normalized}) > 0 OR strpos(d, ${normalized}) > 0))`;
        const distance = typoDistance(term);
        if (!approximate || !distance) return exact;
        return Prisma.sql`(${exact} OR EXISTS (
      SELECT 1 FROM regexp_split_to_table(n, '[^[:alpha:]]+') AS words(word)
      WHERE CASE WHEN char_length(word) BETWEEN 1 AND 255
        AND char_length(${normalized}) BETWEEN 1 AND 255 THEN
        public.levenshtein_less_equal(word, ${normalized}, ${distance}::int) <= ${distance}::int
        ${
          distance === 1
            ? Prisma.sql`OR EXISTS (
          SELECT 1 FROM generate_series(1, char_length(${normalized}) - 1) AS positions(i)
          WHERE word = substr(${normalized}, 1, i - 1) || substr(${normalized}, i + 1, 1)
            || substr(${normalized}, i, 1) || substr(${normalized}, i + 2)
        )`
            : Prisma.empty
        }
      ELSE false END
    ))`;
      }),
      " AND ",
    );
  const ordering =
    order === "recentes"
      ? Prisma.sql`"createdAt" DESC, id ASC`
      : order === "menor-preco" || order === "maior-preco"
        ? Prisma.sql`CASE WHEN "publicPriceMode" = 'REFERENCE' THEN 0 ELSE 1 END ASC,
        CASE WHEN "publicPriceMode" = 'REFERENCE' THEN price END ${order === "menor-preco" ? Prisma.sql`ASC` : Prisma.sql`DESC`}, name ASC, id ASC`
        : Prisma.sql`name ASC, id ASC`;
  return db.$transaction(
    async (tx) => {
      const count = async (approximate: boolean) => {
        const [row] = await tx.$queryRaw<{ total: number }[]>(Prisma.sql`${base}
        SELECT count(*)::int AS total FROM base WHERE ${conditions(approximate)}`);
        return row.total;
      };
      const exactTotal = await count(false);
      const approximate =
        exactTotal === 0 && terms.some((term) => typoDistance(term) > 0);
      const total = approximate ? await count(true) : exactTotal;
      const ids = total
        ? await tx.$queryRaw<{ id: string }[]>(Prisma.sql`${base}
      SELECT id FROM base WHERE ${conditions(approximate)} ORDER BY ${ordering}
      LIMIT 12 OFFSET ${(page - 1) * 12}`)
        : [];
      const rows = ids.length
        ? await tx.product.findMany({
            where: { id: { in: ids.map((row) => row.id) } },
            select: publicProductSelect,
          })
        : [];
      const byId = new Map(rows.map((row) => [row.id, row]));
      return {
        products: ids.map(({ id }) => toPublicProduct(byId.get(id)!)),
        total,
        pages: Math.ceil(total / 12),
        approximate: approximate && total > 0,
      };
    },
    { isolationLevel: "RepeatableRead" },
  );
}
