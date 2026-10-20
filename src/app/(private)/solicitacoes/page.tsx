import { z } from "zod";
import { requireActor } from "@/server/auth/guards";
import { listCatalogRequests } from "@/server/catalog-requests/queries";
import { RequestPanel } from "@/components/catalog-requests/request-panel";
export const metadata = {
  title: "Solicitações",
  robots: { index: false, follow: false },
};
export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireActor();
  let raw = Object.fromEntries(
    Object.entries(await searchParams).filter(([, value]) => value !== ""),
  );
  let initial;
  try {
    initial = await listCatalogRequests(actor, raw);
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    raw = {};
    initial = await listCatalogRequests(actor);
  }
  return (
    <RequestPanel
      initial={initial}
      filters={{
        search: typeof raw.search === "string" ? raw.search : "",
        state: typeof raw.state === "string" ? raw.state : "all",
      }}
    />
  );
}
