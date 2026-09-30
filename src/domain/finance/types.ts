export type FinancialEntryKind = "RECEIVABLE" | "PAYABLE";
export interface MovementTotals {
  incoming: string;
  outgoing: string;
  transfersNet: string;
  adjustmentsNet: string;
  net: string;
}
export interface CashDay {
  date: string;
  incoming: string;
  outgoing: string;
  transfersNet: string;
  adjustmentsNet: string;
  closingBalance: string | null;
}
export interface FinanceDashboardDTO {
  balance: string;
  receivablePending: string;
  receivableOverdue: string;
  payablePending: string;
  payableOverdue: string;
  realizedIn: string;
  realizedOut: string;
}
export interface TransferDTO {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  effectiveDate: string;
  description: string;
  reversed: boolean;
  movements: MovementDTO[];
}
export interface EntryDTO extends FinancialEntryDTO {
  categoryId: string | null;
  groupId: string | null;
  paidAmount: string;
  remainingAmount: string;
  state: "ABERTO" | "PARCIAL" | "LIQUIDADO" | "CANCELADO";
  overdue: boolean;
  saleId: string | null;
  saleNumber: string | null;
  installmentNumber: number | null;
}
export interface SettlementDTO {
  id: string;
  entryId: string;
  accountId: string;
  amount: string;
  method: "PIX" | "CASH" | "CARD" | "BOLETO" | "TRANSFER" | "OTHER";
  effectiveDate: string;
  notes: string;
  movementId: string | null;
  reversed: boolean;
  createdAt: string;
}
export interface FinancialEventDTO {
  id: string;
  action: string;
  reason: string;
  actorName: string;
  createdAt: string;
}
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
  reversed?: boolean;
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
