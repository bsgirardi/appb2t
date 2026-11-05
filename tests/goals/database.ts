export function assertGoalsDatabase(raw: string) {
  const u = new URL(raw);
  if (
    !["postgres:", "postgresql:"].includes(u.protocol) ||
    u.hostname !== "127.0.0.1" ||
    u.port !== "55439" ||
    u.pathname !== "/appb2t_goals_test" ||
    u.search ||
    u.hash
  )
    throw Error(
      "Use exclusivamente o banco descartável de metas em 127.0.0.1:55439/appb2t_goals_test.",
    );
  return u.toString();
}
