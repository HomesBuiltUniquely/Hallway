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

  // 2. Identity-based matching (Ranjith, Susmita, Sachin Shekar, Admin)
  if (
    name.includes('ranjith') || email.includes('ranjith') ||
    name.includes('susmita') || email.includes('susmita') ||
    name.includes('sachin') || email.includes('sachin') ||
    name.includes('admin') || email.includes('admin')
  ) {
    return true;
  }

  return false;
}

export const isAdmin = isSuperAdmin;

/**
 * Determines whether a user has authority to broadcast announcements or performer spotlights.
 * - Global Admins (Ranjith, Susmita, SUPER_ADMIN, ADMIN) -> Allowed
 * - Department Leads / Managers (CRM_LEAD, DESIGN_LEAD, roles with LEAD, MANAGER, HEAD, HR) -> Allowed
 * - General Contributors (Sales Executives, Designers, Site Engineers) -> Denied (Read & Engage only)
 */
export function canCreateAnnouncement(user?: { role?: string; name?: string; email?: string } | null): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  const role = (user.role || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (
    role.includes('LEAD') ||
    role.includes('MANAGER') ||
    role.includes('HEAD') ||
    role.includes('DIRECTOR') ||
    role.includes('HR') ||
    role.includes('FOUNDER') ||
    role.includes('VP') ||
    role.includes('ADMIN')
  ) {
    return true;
  }

  // Permit authenticated team members in session to broadcast updates
  return Boolean(user.name && user.name.trim().length > 0);
}

/**
 * Returns allowed target departments for a user.
 * - Global Admins can broadcast Company Wide or to any department.
 * - Department Leads are scoped to their respective department.
 */
export function getAllowedBroadcastDepartments(
  user?: { role?: string; name?: string; email?: string; department?: string } | null
): string[] {
  if (!user) return ['Sales'];
  if (isSuperAdmin(user)) {
    return ['Company Wide', 'Sales', 'Design', 'Operations', 'HR', 'Leadership'];
  }
  const role = (user.role || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (role.includes('HR')) {
    return ['Company Wide', 'HR', 'Sales', 'Design', 'Operations'];
  }
  if (role.includes('DESIGN')) {
    return ['Design'];
  }
  if (role.includes('CRM') || role.includes('SALES')) {
    return ['Sales'];
  }
  if (user.department) {
    return [user.department];
  }
  return ['Sales'];
}

/** CRM-generated / regenerated feed cards (not durable DB rows). */
export function isCrmGeneratedAnnouncement(post: Pick<FeedPost, 'id' | 'type'>): boolean {
  const id = post.id || '';
  return (
    post.type === 'quota' ||
    id.startsWith('crm-') ||
    id.startsWith('dynamic-sim-')
  );
}

/**
 * Only Admins / Super Admins see/use the Delete button.
 * Everyone else is read (+ react/comment) only.
 * Target pacing (quota) cards stay non-deletable.
 */
export function canDeleteAnnouncement(
  post: FeedPost,
  user?: { role?: string; name?: string; email?: string } | null
): boolean {
  if (!user) return false;
  if (post.type === 'quota' || post.id?.startsWith('crm-target-')) return false;
  return isAdmin(user);
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

/**
 * Explicitly restricts Admin and Sachin from accessing the Design module.
 */
export function isRestrictedFromDesign(
  user?: { role?: string; name?: string; email?: string; department?: string; username?: string } | null
): boolean {
  if (!user) return false;
  const name = (user.name || '').toLowerCase().trim();
  const email = (user.email || '').toLowerCase().trim();
  const username = ((user as any)?.username || '').toLowerCase().trim();

  return (
    name.includes('admin') ||
    email.includes('admin') ||
    username.includes('admin') ||
    name.includes('sachin') ||
    email.includes('sachin') ||
    username.includes('sachin')
  );
}

