import { db } from "@/lib/db";
import { health } from "@/server/health";
export const dynamic = "force-dynamic";
export async function GET() {
  const result = await health(() => db.$queryRaw`SELECT 1`);
  return Response.json(result.body, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
