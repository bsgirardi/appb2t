import { z } from "zod";
import { endpoint, ok } from "@/lib/http";
import { requireAdmin } from "@/server/auth/guards";
import { getAppearance } from "@/server/appearance";
import { analyticsSchema } from "@/domain/marketing/analytics";
import {
  googleAccessToken,
  googleConfigured,
} from "@/server/google/connection";
import { loadGoogleReports } from "@/server/google/reports";
export async function GET(request: Request) {
  return endpoint(async () => {
    const actor = await requireAdmin();
    const days = Number(
      z
        .enum(["7", "28", "90"])
        .parse(new URL(request.url).searchParams.get("days") ?? "28"),
    ) as 7 | 28 | 90;
    if (!googleConfigured()) return ok({ status: "not_configured" });
    const token = await googleAccessToken(actor.id);
    if (!token) return ok({ status: "disconnected" });
    const identity = await getAppearance(actor);
    const settings = analyticsSchema.parse(
      identity.storefront?.analytics ?? {},
    );
    return ok({
      status: "connected",
      reports: await loadGoogleReports(token, settings, days),
    });
  });
}
