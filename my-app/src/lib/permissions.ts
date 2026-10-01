import { User, FeedPost } from '../types';

/**
 * Checks if a user has Super Admin privileges.
 * Qualifies if:
 * 1. Role is SUPER_ADMIN or ADMIN (from CRM or Design).
 * 2. Name or email matches "susmita" (from CRM or Design, as requested by user).
 * 3. Name or email contains "admin" (e.g. admin@hows.internal).
 */
export function isSuperAdmin(user?: { role?: string; name?: string; email?: string } | null): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase().replace(/[\s-]+/g, '_');
  const name = (user.name || '').toLowerCase().trim();
  const email = (user.email || '').toLowerCase().trim();

  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;
  if (name.includes('susmita') || email.includes('susmita')) return true;
  if (name.includes('super admin') || email.startsWith('admin@')) return true;

  return false;
}

/**
 * Super admin can delete ANY announcement.
 * Individuals can delete their own announcements.
 */
export function canDeleteAnnouncement(
  post: FeedPost,
  user?: { role?: string; name?: string; email?: string } | null
): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  const uName = (user.name || '').toLowerCase().trim();
  const uEmail = (user.email || '').toLowerCase().trim();
  const pAuthor = (post.author?.name || '').toLowerCase().trim();

  if (!pAuthor) return false;
  return Boolean(
    (uName && uName === pAuthor) ||
    (uEmail && (uEmail === pAuthor || uEmail.startsWith(pAuthor)))
  );
}

/**
 * Super admin can delete ANY comment.
 * Individuals can delete their own comments.
 */
export function canDeleteComment(
  comment: { authorName?: string; authorHandle?: string },
  user?: { role?: string; name?: string; email?: string } | null
): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  const uName = (user.name || '').toLowerCase().trim();
  const uEmail = (user.email || '').toLowerCase().trim();
  const uHandle = uName.replace(/\s+/g, '.');

  const cName = (comment.authorName || '').toLowerCase().trim();
  const cHandle = (comment.authorHandle || '').toLowerCase().trim();

  return Boolean(
    (uName && cName && uName === cName) ||
    (uEmail && cName && uEmail === cName) ||
    (uHandle && cHandle && uHandle === cHandle)
  );
}
