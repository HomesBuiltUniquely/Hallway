/**
 * One celebration consumer per browser tab group (same origin).
 * Cross-tab leader election complements per-tab hw-cele-leader in BookingCelebration.
 */

const BROADCAST_CHANNEL = 'hw-celebration-coord-v1';
const HEARTBEAT_MS = 3000;
const STALE_MS = 12_000;

export type CelebrationCoordinatorRole = 'leader' | 'follower';

type LeaderMessage =
  | { type: 'claim'; tabId: string; ts: number; app: string }
  | { type: 'release'; tabId: string };

function randomTabId(): string {
  return `tab-${Math.random().toString(36).slice(2)}`;
}

export function createCelebrationCoordinator(app: string): {
  tabId: string;
  subscribe: (onRole: (role: CelebrationCoordinatorRole) => void) => () => void;
} {
  const tabId = randomTabId();
  let channel: BroadcastChannel | null = null;
  let heartbeatTimer: number | null = null;
  let role: CelebrationCoordinatorRole = 'follower';
  let lastLeader: { tabId: string; ts: number } | null = null;

  const claim = () => {
    const now = Date.now();
    const stale = !lastLeader || now - lastLeader.ts > STALE_MS;
    const mine = lastLeader?.tabId === tabId;
    if (mine || stale) {
      lastLeader = { tabId, ts: now };
      role = 'leader';
      try {
        channel?.postMessage({ type: 'claim', tabId, ts: now, app } satisfies LeaderMessage);
      } catch {
        /* ignore */
      }
    } else {
      role = 'follower';
    }
  };

  const subscribe = (onRole: (role: CelebrationCoordinatorRole) => void) => {
    if (typeof window === 'undefined') {
      onRole('leader');
      return () => undefined;
    }

    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL);
    } catch {
      onRole('leader');
      return () => undefined;
    }

    const onMessage = (event: MessageEvent<LeaderMessage>) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'claim') {
        lastLeader = { tabId: data.tabId, ts: data.ts };
        claim();
        onRole(role);
      } else if (data.type === 'release' && data.tabId === lastLeader?.tabId) {
        lastLeader = null;
        claim();
        onRole(role);
      }
    };

    channel.addEventListener('message', onMessage);
    claim();
    onRole(role);
    heartbeatTimer = window.setInterval(claim, HEARTBEAT_MS);

    return () => {
      if (heartbeatTimer != null) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
      try {
        if (role === 'leader') {
          channel?.postMessage({ type: 'release', tabId } satisfies LeaderMessage);
        }
        channel?.removeEventListener('message', onMessage);
        channel?.close();
      } catch {
        /* ignore */
      }
      channel = null;
    };
  };

  return { tabId, subscribe };
}

/** Embedded CRM/Design hosts defer when Hallway recently registered as primary (same registrable domain). */
export function shouldEmbedCelebrationDefer(embedApp: 'crm' | 'design'): boolean {
  if (typeof window === 'undefined') return false;
  if (embedApp !== 'crm' && embedApp !== 'design') return false;
  try {
    const primary = localStorage.getItem('hw-cele-primary-app');
    const ts = Number(localStorage.getItem('hw-cele-primary-ts') || 0);
    if (primary === 'hallway' && Date.now() - ts < 90_000) return true;
  } catch {
    /* ignore */
  }
  return false;
}

export function pingHallwayCelebrationPrimary(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('hw-cele-primary-app', 'hallway');
    localStorage.setItem('hw-cele-primary-ts', String(Date.now()));
  } catch {
    /* ignore */
  }
}