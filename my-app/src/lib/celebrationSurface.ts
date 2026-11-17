export type CelebrationSurface = 'hallway' | 'crm' | 'design';

const SURFACE_KEY = 'hw-cele-surface';

export function setCelebrationSurface(surface: CelebrationSurface): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SURFACE_KEY, surface);
  } catch {
    /* ignore */
  }
}

export function getCelebrationSurface(): CelebrationSurface | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SURFACE_KEY);
    if (raw === 'hallway' || raw === 'crm' || raw === 'design') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function shouldRunCelebrationConsumer(expected: CelebrationSurface): boolean {
  const active = getCelebrationSurface();
  if (!active) return expected === 'hallway';
  return active === expected;
}