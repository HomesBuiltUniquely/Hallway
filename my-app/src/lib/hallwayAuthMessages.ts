/** Short, enterprise login / module-availability copy. No URLs in user-facing text. */

export const LOGIN_INVALID_CREDENTIALS = 'Email or password is incorrect.';

export const LOGIN_DESIGN_UNAVAILABLE =
  'Design Studio is temporarily unavailable. Please try again in a few minutes.';

export const LOGIN_CRM_UNAVAILABLE =
  'CRM is temporarily unavailable. Please try again in a few minutes.';

export const LOGIN_BOTH_UNAVAILABLE =
  'Design Studio and CRM are temporarily unavailable. Please try again in a few minutes.';

export const LOGIN_TIMEOUT = 'Sign-in timed out. Please try again.';

export const LOGIN_GENERIC = 'Unable to sign in. Please try again.';

export const LOGIN_REQUIRED_FIELDS = 'Email and password are required.';

/** Designer admitted to Hallway while Design auth is down. */
export const LOGIN_DESIGN_LIMITED_NOTICE =
  "You're signed in. Some Design features may be limited until services recover.";

/** Strip legacy long/URL messages from older deploys before showing on the login card. */
export function sanitizeLoginErrorMessage(message: string | null | undefined): string {
  const raw = String(message || '').trim();
  if (!raw) return LOGIN_GENERIC;
  if (/https?:\/\//i.test(raw) || /design\.hubinterior\.com/i.test(raw)) {
    return LOGIN_DESIGN_UNAVAILABLE;
  }
  return raw;
}
