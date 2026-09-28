import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth/guards";
import { AppError } from "@/lib/errors";
import { AppShell } from "@/components/shell/app-shell";
export const dynamic = "force-dynamic";
export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireActor().catch((e) => {
    if (e instanceof AppError && e.code === "UNAUTHENTICATED")
      redirect("/login");
    throw e;
  });
  return <AppShell actor={actor}>{children}</AppShell>;
}
