import { db } from "@/lib/db";
import { lockPlanning } from "@/server/planning/coordination";
/** Ensures both commands reach the real PostgreSQL lock before either commits. */
export async function raceUnderPlanningLock<A, B>(
  actions: readonly [() => Promise<A>, () => Promise<B>],
): Promise<[PromiseSettledResult<A>, PromiseSettledResult<B>]> {
  let release!: () => void,
    ready!: () => void,
    failReady!: (error: unknown) => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const readyPromise = new Promise<void>((resolve, reject) => {
    ready = resolve;
    failReady = reject;
  });
  const blocker = db.$transaction(
    async (tx) => {
      await lockPlanning(tx);
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
      const rows = await db.$queryRaw<
        { count: bigint }[]
      >`SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%PlanningState%'`;
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
    await blocker;
  }
  const results = await settled;
  if (failure) throw failure;
  return results as [PromiseSettledResult<A>, PromiseSettledResult<B>];
}
