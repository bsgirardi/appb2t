export async function health(query: () => Promise<unknown>) {
  try {
    await query();
    return { status: 200, body: { status: "ok" } };
  } catch {
    return { status: 503, body: { status: "unavailable" } };
  }
}
