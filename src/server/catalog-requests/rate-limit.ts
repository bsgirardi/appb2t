import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
export async function consumeRequestQuota(
  browserId: string,
  now = new Date(),
): Promise<void> {
  await db.$transaction((tx) =>
    consumeRequestQuotaWithClient(tx, browserId, now),
  );
}
export async function consumeRequestQuotaWithClient(
  tx: Prisma.TransactionClient,
  browserId: string,
  now = new Date(),
): Promise<void> {
  const hour = Math.floor(now.getTime() / 3600000);
  const quarter = Math.floor(now.getTime() / 900000);
  const browser = await tx.catalogRequestBrowser.findUnique({
    where: { id: browserId },
  });
  if (!browser || browser.expiresAt <= now)
    throw new AppError("FORBIDDEN", "Atualize a página para iniciar o envio.");
  const counters = [
    {
      key: `global:${hour}`,
      limit: 300,
      expiresAt: new Date((hour + 1) * 3600000),
    },
    {
      key: `browser:${browserId}:${quarter}`,
      limit: 10,
      expiresAt: new Date((quarter + 1) * 900000),
    },
  ];
  for (const counter of counters) {
    const row = await tx.catalogRequestQuota.upsert({
      where: { key: counter.key },
      create: { key: counter.key, attempts: 1, expiresAt: counter.expiresAt },
      update: { attempts: { increment: 1 } },
    });
    if (row.attempts > counter.limit)
      throw new AppError(
        "RATE_LIMIT",
        "Muitas tentativas. Aguarde e tente novamente, mantendo sua seleção.",
      );
  }
}
