/**
 * Celebration delivery is event-driven: CRM POSTs /api/celebrations when a booking is done.
 * Clients use one SSE per leader tab; no tight HTTP polling while idle.
 */
export const CELEBRATION_STREAM_DB_POLL_MS = 30_000;
export const CELEBRATION_HTTP_FALLBACK_MS = 60_000;
export const CELEBRATION_HTTP_FALLBACK_MAX_MS = 300_000;
export const CELEBRATION_LEADER_STALE_MS = 12_000;
