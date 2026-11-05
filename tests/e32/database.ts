export function assertE32Database(
  raw: string | undefined,
  marker: string | undefined,
): URL {
  const url = new URL(raw ?? "");
  if (
    marker !== "1" ||
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    url.port !== "55439" ||
    url.pathname !== "/b2t_e32_test" ||
    url.search ||
    url.hash
  )
    throw Error(
      "E32 exige marcador explícito e banco descartável exclusivo loopback:55439/b2t_e32_test.",
    );
  return url;
}
