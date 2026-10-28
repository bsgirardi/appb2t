import { db } from "@/lib/db";

/** Ensures both commands reach the real PostgreSQL lock before either commits. */
export async function raceUnderEntryLock<A, B>(
  entryId: string,
  actions: readonly [() => Promise<A>, () => Promise<B>],
): Promise<[PromiseSettledResult<A>, PromiseSettledResult<B>]> {
  let release!: () => void,
    ready!: () => void,
    failReady!: (error: unknown) => void;
  let observeWaiters!: () => Promise<{ count: bigint }[]>;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const readyPromise = new Promise<void>((resolve, reject) => {
    ready = resolve;
    failReady = reject;
  });
  const blocker = db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "FinancialEntry" WHERE id=${entryId} FOR UPDATE`;
      // The holder plus two contenders can fill a small Prisma pool. Observe
      // through the already-held connection instead of waiting for a fourth.
      observeWaiters = async () => {
        // PostgreSQL otherwise reuses this transaction's first activity snapshot.
        await tx.$executeRaw`SELECT pg_stat_clear_snapshot()`;
        return tx.$queryRaw<
          { count: bigint }[]
        >`SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FinancialEntry%'`;
      };
      ready();
      await held;
    },
    { timeout: 10000 },
  );
  void blocker.catch(failReady);
  await readyPromise;
  const settled = Promise.allSettled(
    actions.map((action) => Promise.resolve().then<unknown>(() => action())),
  );
  let failure: unknown;
  try {
    const deadline = Date.now() + 5000;
    let count = 0;
    do {
      const rows = await observeWaiters();
      count = Number(rows[0].count);
      if (count >= actions.length) break;
      await new Promise((resolve) => setTimeout(resolve, 10));
    } while (Date.now() < deadline);
    if (count < actions.length)
      throw new Error(
        `Expected ${actions.length} contending commands, observed ${count}`,
      );
  } catch (error) {
    failure = error;
  } finally {
    release();
    try {
      await blocker;
    } catch (error) {
      failure ??= error;
    }
  }
  // Always drain both commands before the next test can truncate its tables.
  const results = await settled;
  if (failure) throw failure;
  return results as [PromiseSettledResult<A>, PromiseSettledResult<B>];
}
