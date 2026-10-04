import { Card } from "@/components/ui/card";
import { requireActor } from "@/server/auth/guards";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireActor().catch((e) => {
    if (e instanceof AppError && e.code === "UNAUTHENTICATED")
      redirect("/login");
    throw e;
  });
  if (actor.role !== "ADMIN")
    return (
      <Card asChild>
        <section className="">
          <h1>Acesso restrito</h1>
          <p>
            As configurações são gerenciadas pelos administradores da equipe.
          </p>
        </section>
      </Card>
    );
  return children;
}
