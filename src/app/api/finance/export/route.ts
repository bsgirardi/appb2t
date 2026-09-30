import { endpoint } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { exportFinanceCsv } from "@/server/finance/reports";
export async function GET(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    return new Response(
      await exportFinanceCsv(
        actor,
        Object.fromEntries(new URL(request.url).searchParams),
      ),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="movimentos-financeiros.csv"',
          "Cache-Control": "no-store",
        },
      },
    );
  });
}
