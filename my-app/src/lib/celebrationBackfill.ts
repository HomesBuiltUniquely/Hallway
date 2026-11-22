import { celebrationRolloutBaseline } from './celebrationPolicy';
import { ensureHallwaySchema, getPool } from './db';

export type CelebrationBackfillDryRun = {
  rolloutBaseline: string | null;
  eventsBeforeRollout: number;
  eventsInLast30Days: number;
  totalReceipts: number;
  suggestedEnv: string;
  note: string;
};

/** Counts only — safe to run without approval. */
export async function celebrationBackfillDryRun(): Promise<CelebrationBackfillDryRun> {
  await ensureHallwaySchema();
  const pool = getPool();
  const rollout = celebrationRolloutBaseline();

  const [[{ total30 = 0 } = {}]] = await pool.query<any[]>(
    `SELECT COUNT(*) AS total30 FROM celebration_events
      WHERE suppressed = 0 AND occurred_at >= (NOW() - INTERVAL 30 DAY)`
  );
  const eventsBeforeRollout = rollout
    ? (
        await pool.query<any[]>(
          `SELECT COUNT(*) AS c FROM celebration_events
           WHERE suppressed = 0 AND occurred_at < ?`,
          [rollout]
        )
      )[0][0]?.c ?? 0
    : 0;
  const [[{ receipts = 0 } = {}]] = await pool.query<any[]>(
    `SELECT COUNT(*) AS receipts FROM celebration_receipts`
  );

  const rolloutIso = rollout ? rollout.toISOString() : null;
  return {
    rolloutBaseline: rolloutIso,
    eventsBeforeRollout: Number(eventsBeforeRollout) || 0,
    eventsInLast30Days: Number(total30) || 0,
    totalReceipts: Number(receipts) || 0,
    suggestedEnv: rolloutIso
      ? `HALLWAY_CELEBRATION_ROLLOUT_AT=${rolloutIso}`
      : 'Set HALLWAY_CELEBRATION_ROLLOUT_AT to deploy time (ISO UTC) before enabling pop-ups',
    note:
      'No rows are modified by dry-run. Set rollout env to hide all pre-deploy bookings for every viewer. Per-user baseline is set server-side on first login.',
  };
}

/**
 * Optional: mark pre-rollout events suppressed (reversible).
 * Requires explicit approve flag — does not delete CRM/booking data.
 */
export async function celebrationBackfillSuppressPreRollout(dryRun: boolean): Promise<{
  dryRun: boolean;
  rolloutBaseline: string | null;
  affectedRows: number;
}> {
  const rollout = celebrationRolloutBaseline();
  if (!rollout) {
    return { dryRun, rolloutBaseline: null, affectedRows: 0 };
  }
  await ensureHallwaySchema();
  const pool = getPool();
  if (dryRun) {
    const [[{ c = 0 } = {}]] = await pool.query<any[]>(
      `SELECT COUNT(*) AS c FROM celebration_events
       WHERE suppressed = 0 AND occurred_at < ?`,
      [rollout]
    );
    return { dryRun: true, rolloutBaseline: rollout.toISOString(), affectedRows: Number(c) || 0 };
  }
  const [result] = await pool.query<any>(
    `UPDATE celebration_events SET suppressed = 1
     WHERE suppressed = 0 AND occurred_at < ?`,
    [rollout]
  );
  return {
    dryRun: false,
    rolloutBaseline: rollout.toISOString(),
    affectedRows: Number(result?.affectedRows) || 0,
  };
}