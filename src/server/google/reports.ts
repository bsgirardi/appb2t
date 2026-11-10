import { createHash } from "node:crypto";
import type { AnalyticsSettings } from "@/domain/marketing/analytics";
import type {
  GAReport,
  GoogleReports,
  SearchRow,
  SourceResult,
} from "@/domain/marketing/reports";
// Bounded per-process cache, keyed by credential digest, source, property and closed window.
const cache = new Map<string, { until: number; value: Promise<unknown> }>();
class GoogleReportError extends Error {
  constructor(public status: number) {
    super("Google report unavailable");
  }
}
async function post<T>(url: string, token: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new GoogleReportError(response.status);
  return response.json() as Promise<T>;
}
async function cached<T>(
  token: string,
  key: string,
  read: () => Promise<T>,
): Promise<T> {
  const id = createHash("sha256").update(token).update(key).digest("hex");
  const prior = cache.get(id);
  if (prior && prior.until > Date.now()) return prior.value as Promise<T>;
  if (cache.size >= 60) cache.delete(cache.keys().next().value!);
  const value = read().catch((e) => {
    cache.delete(id);
    throw e;
  });
  cache.set(id, { until: Date.now() + 300000, value });
  return value;
}
async function source<T>(
  configured: boolean,
  read: () => Promise<T>,
): Promise<SourceResult<T>> {
  if (!configured)
    return {
      status: "not_configured",
      message:
        "Informe a propriedade e salve as configurações para consultar esta fonte.",
    };
  try {
    return { status: "ready", data: await read() };
  } catch (e) {
    const status = e instanceof GoogleReportError ? e.status : 0;
    if (status === 401 || status === 403)
      return {
        status: "forbidden",
        message:
          "A conta não tem acesso a esta propriedade ou a autorização expirou. Verifique o acesso e conecte novamente.",
      };
    if (status === 429)
      return {
        status: "rate_limited",
        message:
          "O limite de consultas do Google foi atingido. Aguarde antes de atualizar.",
      };
    return {
      status: "unavailable",
      message: "Esta fonte está indisponível. Tente novamente mais tarde.",
    };
  }
}
export async function loadGoogleReports(
  token: string,
  settings: AnalyticsSettings,
  days: 7 | 28 | 90,
): Promise<GoogleReports> {
  // Relative GA4 dates use the property's own timezone. Explicit labels below use UTC only
  // for Search Console, whose reporting dates are Pacific time (provided separately in UI).
  const todayPacific = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const date = (offset: number) => {
    const d = new Date(todayPacific + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - offset);
    return d.toISOString().slice(0, 10);
  };
  const period = {
    days,
    startDate: date(days),
    endDate: date(1),
    previousStart: date(days * 2),
    previousEnd: date(days + 1),
  };
  const ranges = [
    { startDate: `${days}daysAgo`, endDate: "yesterday" },
    { startDate: `${days * 2}daysAgo`, endDate: `${days + 1}daysAgo` },
  ];
  const [ga4, searchConsole] = await Promise.all([
    source(!!settings.propertyId, () =>
      cached(
        token,
        `ga4:${settings.propertyId}:${period.endDate}:${days}`,
        async () => {
          const report = (
            dimensions: string[],
            metrics: string[],
            extra = {},
          ) => ({
            dateRanges: [ranges[0]],
            dimensions: dimensions.map((name) => ({ name })),
            metrics: metrics.map((name) => ({ name })),
            limit: 20,
            returnPropertyQuota: true,
            ...extra,
          });
          const result = await post<{ reports: GAReport[] }>(
            `https://analyticsdata.googleapis.com/v1beta/properties/${settings.propertyId}:batchRunReports`,
            token,
            {
              requests: [
                report([], ["activeUsers", "sessions", "screenPageViews"], {
                  dateRanges: ranges,
                }),
                report(["pagePath"], ["screenPageViews"], {
                  orderBys: [
                    { metric: { metricName: "screenPageViews" }, desc: true },
                  ],
                }),
                report(["sessionSourceMedium"], ["sessions"], {
                  orderBys: [
                    { metric: { metricName: "sessions" }, desc: true },
                  ],
                }),
                report(["deviceCategory"], ["sessions"]),
                report(["eventName"], ["eventCount"], {
                  dimensionFilter: {
                    filter: {
                      fieldName: "eventName",
                      inListFilter: {
                        values: [
                          "contact_click",
                          "catalog_open",
                          "generate_lead",
                          "purchase",
                        ],
                      },
                    },
                  },
                }),
              ],
            },
          );
          if (!Array.isArray(result.reports) || result.reports.length !== 5)
            throw new Error("Invalid report");
          return { propertyId: settings.propertyId, reports: result.reports };
        },
      ),
    ),
    source(!!settings.searchConsoleSite, () =>
      cached(
        token,
        `gsc:${settings.searchConsoleSite}:${period.endDate}:${days}`,
        async () => {
          const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(settings.searchConsoleSite)}/searchAnalytics/query`;
          const request = (startDate: string, endDate: string) =>
            post<{ rows?: SearchRow[] }>(url, token, {
              startDate,
              endDate,
              type: "web",
              dataState: "final",
              rowLimit: 1,
            });
          const [current, previous] = await Promise.all([
            request(period.startDate, period.endDate),
            request(period.previousStart, period.previousEnd),
          ]);
          return { site: settings.searchConsoleSite, current, previous };
        },
      ),
    ),
  ]);
  return { period, updatedAt: new Date().toISOString(), ga4, searchConsole };
}
