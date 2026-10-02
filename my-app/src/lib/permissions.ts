import { User, FeedPost } from '../types';

/**
 * Checks if a user has Admin / Super Admin privileges.
 * Qualifies if:
 * 1. Role contains ADMIN, SUPER, or LEAD (e.g. SUPER_ADMIN, ADMIN, CRM_ADMIN, SALES_ADMIN, CRM_LEAD, DESIGN_LEAD).
 * 2. Name or email matches administrators (Ranjith, Susmita, Admin).
 */
export function isSuperAdmin(user?: { role?: string; name?: string; email?: string } | null): boolean {
  if (!user) return false;
  const role = (user.role || '').toUpperCase().replace(/[\s-]+/g, '_');
  const name = (user.name || '').toLowerCase().trim();
  const email = (user.email || '').toLowerCase().trim();

  // 1. Role-based matching
  if (
    role.includes('ADMIN') ||
    role.includes('SUPER') ||
    role === 'CRM_LEAD' ||
    role === 'DESIGN_LEAD' ||
    role.includes('LEAD')
  ) {
    return true;
  }

  // 2. Identity-based matching (Ranjith, Susmita, Admin)
  if (
    name.includes('ranjith') || email.includes('ranjith') ||
    name.includes('susmita') || email.includes('susmita') ||
    name.includes('admin') || email.includes('admin')
  ) {
    return true;
  }

  return false;
}

export const isAdmin = isSuperAdmin;

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
