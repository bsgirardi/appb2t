import type { DocumentCostsDTO } from "@/domain/pricing/types";
import type { CompanyIdentityDTO } from "@/domain/appearance/types";
export type QuoteStatus =
  "RASCUNHO" | "ENVIADO" | "APROVADO" | "REJEITADO" | "EXPIRADO" | "CONVERTIDO";
export type SaleStatus =
  | "RASCUNHO"
  | "CONFIRMADA"
  | "EM_PRODUCAO"
  | "PRONTA"
  | "ENTREGUE"
  | "CANCELADA";
export interface DocumentItemInput {
  lineId?: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: string;
}
export interface DocumentInput {
  customerId: string;
  items: DocumentItemInput[];
  discount: string;
  shipping: string;
  paymentTerms: string;
  internalNotes: string;
}
export interface DocumentTotals {
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
}
export interface InstallmentInput {
  number: number;
  amount: string;
  dueDate: string;
}
export interface CustomerSnapshot {
  name: string;
  type: "PERSON" | "COMPANY";
  document: string;
  email: string;
  phone: string;
  address: string;
}
export interface DocumentItemSnapshot extends DocumentItemInput {
  name: string;
}
export interface DocumentSnapshot {
  company: CompanyIdentityDTO;
  customer: CustomerSnapshot;
  items: DocumentItemSnapshot[];
  issuedAt: string;
}
export interface QuoteInput extends DocumentInput {
  validUntil: string;
}
export type QuoteDraftInput = Partial<QuoteInput>;
export interface CommerceEventDTO {
  id: string;
  action: string;
  reason: string;
  actorName: string;
  createdAt: string;
}
export interface QuoteDTO {
  costs?: DocumentCostsDTO | null;
  id: string;
  number: string;
  status: QuoteStatus;
  version: number;
  input: QuoteDraftInput;
  totals: DocumentTotals | null;
  snapshot: DocumentSnapshot | null;
  events: CommerceEventDTO[];
  createdAt: string;
  saleId: string | null;
}
export interface ReceiptSummary {
  total: string;
  received: string;
  pending: string;
  overdue: string;
}
export interface SaleDTO {
  costs?: DocumentCostsDTO | null;
  id: string;
  number: string;
  quoteId: string | null;
  status: SaleStatus;
  version: number;
  document: DocumentInput;
  totals: DocumentTotals;
  snapshot: DocumentSnapshot | null;
  installments: InstallmentInput[];
  receiptSummary: ReceiptSummary;
  expectedDeliveryDate: string | null;
  operationalNotes: string;
  events: CommerceEventDTO[];
  createdAt: string;
}
