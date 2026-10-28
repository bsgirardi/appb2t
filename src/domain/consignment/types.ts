export type CommissionModel = "RETIDA" | "SEPARADA";
export type CustodyStage = "outbound" | "partner" | "inbound" | "sold" | "lost";
export type CustodyBalance = Record<CustodyStage, number>;
export type CustodyFact = {
  from: CustodyStage | null;
  to: CustodyStage | null;
  units: number;
};
export type CommercialLineInput = {
  quantity: number;
  unitPrice: string;
  percent: string;
  model: CommissionModel;
};
export type CommercialLineTotals = CommercialLineInput & {
  gross: string;
  commission: string;
  net: string;
};
export type CommercialTotals = {
  gross: string;
  commission: string;
  receivable: string;
  payable: string;
  lines: CommercialLineTotals[];
};
