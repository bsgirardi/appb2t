export type FinancialEntryKind = "RECEIVABLE" | "PAYABLE";
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
