import { beforeEach, afterAll } from "vitest";
import { db } from "@/lib/db";
import { hashPassword } from "@/server/auth/password";
import { assertTestDatabase } from "./database-target";
export const password = "Teste-interno-123!";
export function setupDatabase(target?: "e3") {
  beforeEach(async () => {
    assertTestDatabase(
      process.env.DATABASE_URL,
      target === "e3" || process.env.E3_TEST_DATABASE === "1",
    );
    await db.$executeRawUnsafe(
      'TRUNCATE "TaxReportMemory", "TaxProfileRevision", "TaxProfileState" CASCADE',
    );
    await db.$executeRawUnsafe('TRUNCATE "MonthlyGoal" CASCADE');
    await db.$executeRawUnsafe(
      'TRUNCATE "Checkout", "CheckoutSession", "CheckoutQuota" CASCADE',
    );
    await db.$executeRawUnsafe(
      'TRUNCATE "CatalogKit", "CatalogRequest", "CatalogRequestBrowser", "CatalogRequestQuota" CASCADE',
    );
    await db.$executeRawUnsafe(
      'TRUNCATE "PlanningCommand", "PlanningAudit", "PlanningState", "PlanningCalendar", "PlanningMachineSettings", "PlanningBatch" CASCADE',
    );
    await db.$executeRawUnsafe(
      'TRUNCATE "ProfitabilityCommand", "ProfitabilityState", "ProfitabilityRevision", "ProfitabilityAssessment" CASCADE',
    );
    await db.$executeRawUnsafe(
      'TRUNCATE "ProductionCommand", "ProductionOrder", "FinishedStock", "ProductionDelivery" CASCADE',
    );
    await db.$executeRawUnsafe(
      'TRUNCATE "StockCommand", "StockItem", "PurchaseReceipt" CASCADE',
    );
    await db.$executeRawUnsafe(
      'TRUNCATE "DocumentCostRevision", "ProductCalculationRevision", "PricingSnapshot", "PricingExtra", "PricingChannel", "PricingSettings" CASCADE',
    );
    await db.$executeRawUnsafe(
      'TRUNCATE "FinanceCommand", "FinancialAuditEvent", "CashMovement", "Settlement", "FinancialTransfer", "FinancialAccount", "FinancialCategory", "CommercialOperation", "FinancialEntry", "Sale", "CommerceEvent", "DocumentLogo", "Quote", "Customer", "CompanyAppearance", "Collection", "ProductImage", "Product", "Session", "CalculationSettings", "LoginAttempt", "Material", "Printer", "User" CASCADE',
    );
    await db.financialCategory.create({
      data: {
        id: "system-sale-revenue",
        name: "Receita de vendas",
        kind: "REVENUE",
        systemCode: "SALE_REVENUE",
      },
    });
  });
  afterAll(async () => {
    await db.$disconnect();
  });
}
export async function seedUser(
  role: "ADMIN" | "OPERATOR" = "ADMIN",
  email = "admin@example.test",
) {
  return db.user.create({
    data: {
      name: "Usuário de teste",
      email,
      role,
      passwordHash: await hashPassword(password),
    },
  });
}
