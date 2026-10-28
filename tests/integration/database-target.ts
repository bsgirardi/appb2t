export function assertTestDatabase(value: string | undefined, e3: boolean): void {
  let url: URL;
  try { url = new URL(value ?? ""); }
  catch { throw new Error("Tests require an explicit disposable database URL"); }
  if (!["postgresql:", "postgres:"].includes(url.protocol) ||
    url.pathname !== (e3 ? "/b2t_e3_test" : "/b2t_test") ||
    url.port !== (e3 ? "55433" : "55432") ||
    !["localhost", "127.0.0.1"].includes(url.hostname))
    throw new Error(e3 ? "E3 tests require exclusive localhost:55433/b2t_e3_test database" : "Tests require local b2t_test database");
}
