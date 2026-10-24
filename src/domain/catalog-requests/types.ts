import type { InquiryItem } from "@/domain/products/inquiry";
import type { ConfigurationAnswer } from "@/domain/products/configuration";
import type { QuoteInput } from "@/domain/commerce/types";
export interface CatalogContact {
  name: string;
  preferredChannel: "whatsapp" | "email";
  phone: string;
  email: string;
}
export interface CatalogSubmission {
  schemaVersion?: 2;
  groups?: import("@/domain/kits/types").KitGroupInput[];
  attemptKey: string;
  contact: CatalogContact;
  items: InquiryItem[];
}
export interface CatalogReceipt {
  protocol: string;
  acceptedAt: string;
  received: true;
}
export type CatalogRequestState =
  "RECEBIDA" | "EM_ATENDIMENTO" | "ORCAMENTO_PREPARADO" | "ENCERRADA";
export interface CatalogLineSnapshot {
  kitInstanceId?: string;
  schemaVersion: 1;
  lineId: string;
  productId: string;
  commercialRevision: number;
  name: string;
  sku: string;
  color: string;
  size: string;
  answers: ConfigurationAnswer[];
  answerLabels: { fieldId: string; label: string; valueLabel: string }[];
  quantity: number;
  priceKind: "REFERENCE" | "CONSULT";
  unitPrice: string | null;
  subtotal: string | null;
  included: string;
  leadTimeCondition: string;
  productionLeadDays: number | null;
  paymentTerms: string;
}
export interface CatalogLineOrigin {
  schemaVersion: 1;
  requestId: string;
  sourceLineId: string;
  snapshot: CatalogLineSnapshot;
}
export interface CatalogRequestSummaryDTO {
  id: string;
  protocol: string;
  state: CatalogRequestState;
  version: number;
  name: string;
  preferredChannel: CatalogContact["preferredChannel"];
  createdAt: string;
  lineCount: number;
  consultCount: number;
  assigneeId: string | null;
  assigneeName: string | null;
  quoteId: string | null;
}
export interface CatalogRequestDTO extends CatalogRequestSummaryDTO {
  checkoutId?: string;
  currentKits?: import("@/domain/kits/types").KitDTO[];
  groups?: import("@/domain/kits/types").KitGroupSnapshot[];
  contact: CatalogContact;
  lines: CatalogLineSnapshot[];
  knownTotal: string | null;
  events: {
    id: string;
    action: string;
    note: string;
    actorName: string;
    createdAt: string;
  }[];
  currentProducts: {
    id: string;
    name: string;
    active: boolean;
    availability: string;
    commercialRevision: number;
  }[];
}
export type RequestChange =
  | {
      action: "START" | "REASSIGN" | "REOPEN";
      expectedVersion: number;
      assigneeId: string;
    }
  | { action: "NOTE" | "CLOSE"; expectedVersion: number; note: string };
export interface RequestQuoteInput {
  additionalDiscount?: string;
  kitReviewFingerprint?: string;
  expectedVersion: number;
  document: QuoteInput;
  sources: { lineId: string; sourceLineId: string; standalone: boolean }[];
}
