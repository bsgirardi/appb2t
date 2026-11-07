import {
  emptyPosDraft,
  type PosOrderDTO,
  type PosProduct,
} from "@/domain/pos/types";
import { calculateDocumentTotals } from "@/domain/commerce/totals";
import { calculatePosPayment } from "@/domain/pos/validation";
export const previewProducts: PosProduct[] = [
  {
    id: "key",
    name: "Chaveiro geométrico",
    sku: "CHV-01",
    price: "12.00",
    commercialRevision: 1,
    minimumQuantity: 1,
    quantityTiers: [{ minQuantity: 5, baseUnitPrice: "10.00" }],
    available: 24,
    reason: null,
  },
  {
    id: "support",
    name: "Suporte de celular",
    sku: "SUP-02",
    price: "35.00",
    commercialRevision: 1,
    minimumQuantity: 1,
    quantityTiers: [],
    available: 8,
    reason: null,
  },
  {
    id: "vase",
    name: "Vaso espiral",
    sku: "VAS-03",
    price: "48.00",
    commercialRevision: 1,
    minimumQuantity: 1,
    quantityTiers: [],
    available: 3,
    reason: null,
  },
  {
    id: "custom",
    name: "Placa personalizada",
    sku: "PLC-04",
    price: "40.00",
    commercialRevision: 1,
    minimumQuantity: 1,
    quantityTiers: [],
    available: 0,
    reason: "Configure este produto no fluxo comercial.",
  },
];
let current: PosOrderDTO | null = null;
export async function api<T>(url: string, body?: unknown): Promise<T> {
  const data = body as
    { input?: PosOrderDTO["input"]; expectedVersion?: number } | undefined;
  if (url.includes("catalog")) return structuredClone(previewProducts) as T;
  if (url.includes("customers"))
    return {
      items: [
        { id: "customer", name: "Maria — cliente sintética", version: 1 },
      ],
    } as T;
  if (url.endsWith("complete") && current) {
    const total = calculateDocumentTotals(
      current.input.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        description: "Sintético",
      })),
      current.input.discount,
      "0.00",
    ).total;
    current = {
      ...current,
      version: current.version + 1,
      receipt: {
        saleId: "synthetic-sale",
        number: "VEN-PRÉVIA",
        status: "ENTREGUE",
        total,
        customerName:
          current.input.newCustomer?.name ??
          (current.input.customerId
            ? "Maria — cliente sintética"
            : "Consumidor não identificado"),
        payment: calculatePosPayment(
          total,
          current.input.method,
          current.input.tendered,
        ),
        received: "0.00",
        pending: total,
      },
    };
  } else if (data?.input && current)
    current = { ...current, input: data.input, version: current.version + 1 };
  else if (url === "/api/pos" && body) {
    if (!current || current.receipt)
      current = {
        id: "synthetic-order",
        version: 1,
        input: structuredClone(emptyPosDraft),
        updatedAt: "2026-11-06T12:00:00Z",
        receipt: null,
      };
  }
  return structuredClone(current) as T;
}
