export type FinancialEntryKind = "RECEIVABLE" | "PAYABLE";
export interface AccountDTO {
  id: string;
  name: string;
  type: "CASH" | "BANK" | "OTHER";
  openingBalance: string;
  openingDate: string;
  active: boolean;
  version: number;
  balance: string | null;
  negative: boolean;
}
export interface CategoryDTO {
  id: string;
  name: string;
  kind: "REVENUE" | "EXPENSE";
  active: boolean;
  version: number;
  systemCode: string | null;
}
export interface MovementDTO {
  id: string;
  accountId: string;
  categoryId: string | null;
  amount: string;
  effectiveDate: string;
  kind: "RECEIPT" | "PAYMENT" | "TRANSFER" | "ADJUSTMENT" | "REVERSAL";
  description: string;
  actorName: string;
  settlementId: string | null;
  transferId: string | null;
  reversalOfId: string | null;
  createdAt: string;
}
export interface FinancialEntryDTO {
  id: string;
  kind: FinancialEntryKind;
  amount: string;
  dueDate: string;
  description: string;
  counterparty: string;
  customerId: string | null;
  saleInstallmentId: string | null;
  canceledAt: string | null;
  version: number;
}
