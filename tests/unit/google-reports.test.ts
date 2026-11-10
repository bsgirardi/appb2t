import { afterEach, expect, it, vi } from "vitest";
import { loadGoogleReports } from "@/server/google/reports";
afterEach(() => vi.unstubAllGlobals());
it("distinguishes missing configuration from zero and does no network calls", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const data = await loadGoogleReports(
    "token",
    { measurementId: "", propertyId: "", searchConsoleSite: "" },
    7,
  );
  expect(data.ga4.status).toBe("not_configured");
  expect(data.searchConsole.status).toBe("not_configured");
  expect(fetcher).not.toHaveBeenCalled();
});
it("isolates source failures and preserves successful GA4 data and metadata", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) =>
      url.includes("analyticsdata")
        ? new Response(
            JSON.stringify({
              reports: Array.from({ length: 5 }, () => ({
                rows: [
                  {
                    metricValues: [
                      { value: "12" },
                      { value: "20" },
                      { value: "30" },
                    ],
                  },
                ],
                metadata: { timeZone: "America/Sao_Paulo" },
              })),
            }),
            { status: 200 },
          )
        : new Response("private error", { status: 403 }),
    ),
  );
  const data = await loadGoogleReports(
    "token-unique",
    {
      measurementId: "",
      propertyId: "123",
      searchConsoleSite: "sc-domain:b2t.test",
    },
    7,
  );
  expect(data.ga4.status).toBe("ready");
  expect(data.searchConsole.status).toBe("forbidden");
  expect(JSON.stringify(data)).not.toContain("private error");
  expect(data.period.days).toBe(7);
});
it("limits comparisons to totals so previous traffic cannot displace current breakdowns", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          reports: Array.from({ length: 5 }, () => ({ rows: [] })),
        }),
        { status: 200 },
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  await loadGoogleReports(
    "compare-isolation",
    { measurementId: "", propertyId: "456", searchConsoleSite: "" },
    28,
  );
  const body = JSON.parse(
    (fetcher.mock.calls[0] as unknown as [string, RequestInit])[1]
      .body as string,
  );
  expect(body.requests[0].dateRanges).toHaveLength(2);
  for (const report of body.requests.slice(1))
    expect(report.dateRanges).toEqual([
      { startDate: "28daysAgo", endDate: "yesterday" },
    ]);
});
