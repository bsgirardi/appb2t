export type Instant = string;
export type CivilDate = string;
export type Minutes = string;
export type Interval = { start: Instant; end: Instant };
export type PlanningMeta = {
  operationKey: string;
  expectedVersion: number;
  expectedRevision: number;
  reason?: string;
};
export type CalendarDTO = {
  id: string;
  version: number;
  weekly: { weekday: number; startMinute: number; endMinute: number }[];
  exceptions: {
    date: CivilDate;
    intervals: { startMinute: number; endMinute: number }[];
  }[];
};
export type BatchState =
  | "DRAFT"
  | "PENDING"
  | "SCHEDULED"
  | "PREPARING"
  | "PRINTING"
  | "AWAITING_REMOVAL"
  | "CLOSED"
  | "CANCELED";
export type BatchDTO = {
  id: string;
  version: number;
  sequence: number;
  printerId: string;
  state: BatchState;
  position: number;
  materialItemId: string;
  colorLabel: string;
  colorKey: string;
  profileConfirmed: boolean;
  fitConfirmed: boolean;
  colorAvailabilityConfirmed: boolean;
  durationMinutes: Minutes | null;
  durationConfirmedAt: Instant | null;
  prepareMinutes: Minutes;
  removeMinutes: Minutes;
  remainingMinutes: Minutes | null;
  remainingAsOf: Instant | null;
  participants: {
    id: string;
    lineId: string;
    units: number;
    settledUnits: number;
    needQuantity: string;
    dueDate: CivilDate | null;
    responsibleId: string | null;
    description: string;
    orderSequence: number;
  }[];
  coverage: {
    id: string;
    participationId: string;
    allocationId: string;
    quantity: string;
  }[];
  milestones: {
    id: string;
    kind: string;
    instant: Instant;
    sourceId: string | null;
  }[];
  blockers: string[];
};
export type Candidate = {
  lineId: string;
  printerId: string | null;
  technology: string;
  materialItemId: string | null;
  colorKey: string | null;
  dueDate: CivilDate | null;
  units: number;
  orderSequence: number;
};
export type Suggestion = {
  printerId: string;
  materialItemId: string;
  colorKey: string;
  candidates: Candidate[];
};
export type PlanningInput = {
  asOf: Instant;
  revision: number;
  team: CalendarDTO | null;
  machines: { id: string; calendar: CalendarDTO | null; batches: BatchDTO[] }[];
};
export type BatchForecast = {
  batchId: string;
  printerId: string;
  prepare: Interval | null;
  print: Interval | null;
  removal: Interval | null;
  waitingRemoval: Interval | null;
  dueDate: CivilDate | null;
  late: boolean;
  reason:
    | "MISSING_DATA"
    | "NO_WINDOW"
    | "UNCONFIRMED_END"
    | "MATERIAL_PENDING"
    | null;
};
export type Forecast = {
  asOf: Instant;
  revision: number;
  batches: BatchForecast[];
  totals: {
    printerId: string;
    availableMinutes: number;
    printMinutes: number;
    serviceMinutes: number;
    waitingMinutes: number;
  }[];
};
