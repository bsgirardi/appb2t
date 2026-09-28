import { cookies } from "next/headers";
import { getSession, SESSION_COOKIE, type Actor } from "./session";
import { assertAdmin } from "./authorization";
import { AppError } from "@/lib/errors";
export async function requireActor(): Promise<Actor> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const actor = token ? await getSession(token) : null;
  if (!actor)
    throw new AppError("UNAUTHENTICATED", "Entre na sua conta para continuar.");
  return actor;
}
export async function requireAdmin(): Promise<Actor> {
  const actor = await requireActor();
  assertAdmin(actor);
  return actor;
}
