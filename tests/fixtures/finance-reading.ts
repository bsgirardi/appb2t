import type { TaxReport } from "@/server/tax/reports";
import type { AccountDTO, EntryDTO } from "@/domain/finance/types";
import { assessSaleTax } from "@/domain/tax/sale";

export const readingAccount: AccountDTO = {
  id: "account",
  name: "Conta sintética de projetos e personalizações",
  type: "BANK",
  openingBalance: "0.00",
  openingDate: "2026-11-01",
  active: true,
  version: 1,
  balance: "999999999.99",
  negative: false,
};
export const readingEntry: EntryDTO = {
  id: "entry",
  description:
    "Projeto sintético de personalização com descrição extensa para leitura da obrigação",
  counterparty: "Associação sintética de artesãos e projetos especiais",
  kind: "RECEIVABLE",
  amount: "999999999.99",
  dueDate: "2026-11-12",
  paidAmount: "0.00",
  remainingAmount: "999999999.99",
  state: "ABERTO",
  overdue: false,
  version: 1,
  categoryId: null,
  groupId: null,
  saleId: null,
  saleNumber: null,
  installmentNumber: null,
  customerId: null,
  saleInstallmentId: null,
  canceledAt: null,
};
export const readingReport: TaxReport = {
  algorithm: 1,
  fingerprint: "a".repeat(64),
  competence: "2026-11",
  readAt: "2026-11-08T12:00:00.000Z",
  profileVersion: 0,
  monthlyDas: null,
  monthlyProfile: null,
  knownSalesTax: "0.00",
  uncoveredBase: "100.00",
  completeSales: 0,
  partialSales: 1,
  unassignedSales: 2,
  rows: [
    {
      saleId: "sale",
      number: "VEN-000001",
      version: 1,
      costRevisionId: null,
      ...assessSaleTax(
        [{ key: "line", position: 0, gross: "100" }],
        "0",
        "0",
        "2026-11",
      ),
    },
  ],
};
