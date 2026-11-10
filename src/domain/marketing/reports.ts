export type ReportRow = {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
};
export type GAReport = {
  rows?: ReportRow[];
  rowCount?: number;
  metadata?: {
    timeZone?: string;
    subjectToThresholding?: boolean;
    dataLossFromOtherRow?: boolean;
  };
  propertyQuota?: unknown;
};
export type SearchRow = {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};
export type SourceResult<T> =
  | { status: "ready"; data: T }
  | {
      status: "not_configured" | "forbidden" | "rate_limited" | "unavailable";
      message: string;
    };
export type GoogleReports = {
  period: {
    days: number;
    startDate: string;
    endDate: string;
    previousStart: string;
    previousEnd: string;
  };
  updatedAt: string;
  ga4: SourceResult<{ propertyId: string; reports: GAReport[] }>;
  searchConsole: SourceResult<{
    site: string;
    current: { rows?: SearchRow[] };
    previous: { rows?: SearchRow[] };
  }>;
};
