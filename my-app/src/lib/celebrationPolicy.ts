/** Server-side celebration delivery policy (never trust client clocks). */

export function celebrationRecencyHours(): number {
  const raw = Number(process.env.CELEBRATION_RECENCY_HOURS ?? 24);
  if (!Number.isFinite(raw) || raw <= 0) return 24;
  return Math.min(Math.max(Math.floor(raw), 1), 168);
}

export function celebrationMaxPopups(): number {
  const raw = Number(process.env.CELEBRATION_MAX_POPUPS ?? 3);
  if (!Number.isFinite(raw) || raw <= 0) return 3;
  return Math.min(Math.max(Math.floor(raw), 1), 10);
}

export function celebrationSoundEnabled(): boolean {
  const raw = String(process.env.CELEBRATION_SOUND_ENABLED || '')
    .trim()
    .toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

/** Bookings before this instant are never celebrated (rollout / backfill). ISO or unset. */
export function celebrationRolloutBaseline(): Date | null {
  const raw = String(
    process.env.HALLWAY_CELEBRATION_ROLLOUT_AT ||
      process.env.CELEBRATION_ROLLOUT_AT ||
      ''
  ).trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}