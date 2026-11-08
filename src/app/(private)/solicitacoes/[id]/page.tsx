import { notFound } from "next/navigation";
import { requireActor } from "@/server/auth/guards";
import {
  getCatalogRequest,
  findRequestCustomers,
} from "@/server/catalog-requests/queries";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { RequestDetail } from "@/components/catalog-requests/request-detail";
export const metadata = {
  title: "Atendimento da solicitação",
  robots: { index: false, follow: false },
};
export default async function RequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const actor = await requireActor();
  const { id } = await params;
  const { returnTo } = await searchParams;
  const data = await (async () => {
    try {
      return await Promise.all([
        getCatalogRequest(actor, id),
        findRequestCustomers(actor, id, ""),
        db.user.findMany({
          where: { active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      ]);
    } catch (error) {
      if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
      throw error;
    }
  })();
  const [initial, customers, users] = data;
  return (
    <RequestDetail
      key={initial.id}
      initial={initial}
      users={users}
      actorId={actor.id}
      customers={customers}
      returnTo={typeof returnTo === "string" ? returnTo : undefined}
    />
  );
}
