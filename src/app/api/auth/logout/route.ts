import { cookies } from "next/headers";
import { endpoint, jsonBody, ok } from "@/lib/http";
import { logout, SESSION_COOKIE } from "@/server/auth/session";
export async function POST(request: Request) {
  return endpoint(async () => {
    await jsonBody(request);
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) await logout(token);
    const res = ok(true);
    res.cookies.delete(SESSION_COOKIE);
    return res;
  });
}
