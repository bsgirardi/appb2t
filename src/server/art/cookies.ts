import { cookies } from "next/headers";
import { AppError } from "@/lib/errors";
export function artCookieName(revisionId: string): string {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(revisionId))
    throw new AppError("FORBIDDEN", "Acesso indisponível.");
  return `b2t_art_${revisionId}`;
}
export async function artSessionCookie(revisionId: string) {
  return (await cookies()).get(artCookieName(revisionId))?.value ?? "";
}
