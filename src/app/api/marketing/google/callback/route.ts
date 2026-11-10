import { NextResponse } from "next/server";
import { appUrl } from "@/lib/env";
import { requireAdmin } from "@/server/auth/guards";
import { finishGoogleConnection } from "@/server/google/connection";
export async function GET(request: Request) {
  const destination = new URL("/configuracoes/seo-analytics", appUrl());
  try {
    const actor = await requireAdmin();
    await finishGoogleConnection(actor.id, new URL(request.url));
    destination.searchParams.set("google", "connected");
  } catch {
    destination.searchParams.set("google", "error");
  }
  return NextResponse.redirect(destination, {
    status: 303,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
