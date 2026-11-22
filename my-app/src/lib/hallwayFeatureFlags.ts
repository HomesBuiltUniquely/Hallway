/** Design Home Feed (Today + My Actions via Design `/api/hallway/*`). Default off in prod. */
export function isDesignHomeFeedEnabled(): boolean {
  const raw = String(process.env.FEATURE_DESIGN_HOME_FEED || '')
    .trim()
    .toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}