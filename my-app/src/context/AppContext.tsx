'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User,
  FeedPost,
  ActionItem,
  CrmLeadItem,
  DesignProject,
  ActiveCampaign,
  NotificationItem
} from '../types';
import {
  currentUserMock,
  alternateUserMock,
  designerUserMock,
  initialFeedPosts,
  actionItemsMock,
  crmLeadsMock,
  designProjectsMock
} from '../data/mockData';
import {
  fetchFeed,
  fetchTargets,
  clearCrmSession,
  fetchLeaderboard,
  fetchPeople,
  fetchRecords,
  fetchTodayEvents,
  fetchActions
} from '../lib/crmApi';
import { generateCrmAnnouncements, formatInrToLakhsOrCrores, createDynamicCrmAnnouncement } from '../lib/crmAnnouncementsGenerator';
import { clearDesignHandoff } from '../lib/modulePortals';
import {
  isTodayOrYesterday,
  cleanPostContent,
  getYesterdayYmd,
  formatPersonName,
  formatExactIstTimestamp
} from '../lib/hallwayDisplay';

/** Saved CRM cards from the old feed. They used the token amount and a lead id. */
function isLegacyCrmAnnouncement(post: { id?: string; title?: string; content?: string }): boolean {
  const id = String(post.id || '').toLowerCase();
  if (
    id.startsWith('crm-booking-') ||
    id.startsWith('crm-weekly-top-') ||
    id.startsWith('crm-monthly-top-') ||
    id.startsWith('crm-month-milestone-')
  ) {
    return false;
  }
  const title = String(post.title || '').toLowerCase();
  const content = String(post.content || '').toLowerCase();
  if (
    id.startsWith('crm-deal-') ||
    id.startsWith('crm-db-') ||
    id.startsWith('crm-announcement-') ||
    id.startsWith('crm-hat-') ||
    id.startsWith('crm-renova-') ||
    id.startsWith('crm-target-') ||
    id.startsWith('crm-token-') ||
    id.startsWith('crm-event-')
  ) {
    return true;
  }
  return (
    title.includes('spot closure') ||
    title.includes('new hub record') ||
    title.includes('hat-trick') ||
    title.includes('renova strikes') ||
    title.includes('top performer:') ||
    content.includes('project #') ||
    content.includes('hub crosses')
  );
}
import { isSuperAdmin } from '../lib/permissions';
import { getPersonalizedActions } from '../lib/hallwayPersonalization';

function reactionViewerKey(user?: { email?: string; id?: string | number; name?: string } | null) {
  return String(user?.email || user?.id || user?.name || '')
    .toLowerCase()
    .trim();
}

function withViewerReactionFlags(raw: any, userKey?: string) {
  const blank = {
    thumbsUp: 0,
    clap: 0,
    heart: 0,
    joy: 0,
    surprised: 0,
    pray: 0,
    fire: 0,
    party: 0,
    hundred: 0,
    rocket: 0,
    userThumbsUp: false,
    userClap: false,
    userHeart: false,
    userJoy: false,
    userSurprised: false,
    userPray: false,
    userFire: false,
    userParty: false,
    userHundred: false,
    userRocket: false,
    byUser: {} as Record<string, string>,
  };
  const base = { ...blank, ...(raw || {}) };
  const byUser = base.byUser && typeof base.byUser === 'object' ? base.byUser : {};
  base.byUser = byUser;
  const key = (userKey || '').toLowerCase().trim();
  const mine = key && byUser[key] ? String(byUser[key]) : null;
  const reactionKeys = [
    'thumbsUp', 'clap', 'heart', 'joy', 'surprised', 'pray',
    'fire', 'party', 'hundred', 'rocket',
  ] as const;
  for (const k of reactionKeys) {
    const userK = `user${k.charAt(0).toUpperCase()}${k.slice(1)}`;
    base[userK] = mine === k;
  }
  return base;
}

function mergeReactions(serverReactions?: any, localReactions?: any, userKey?: string) {
  const reactionKeys = [
    'thumbsUp', 'clap', 'heart', 'joy', 'surprised', 'pray',
    'fire', 'party', 'hundred', 'rocket',
  ] as const;
  const merged: any = {
    ...(serverReactions || {}),
    byUser: {
      ...(serverReactions?.byUser || {}),
      ...(localReactions?.byUser || {}),
    },
  };
  for (const k of reactionKeys) {
    merged[k] = Math.max(
      Number(serverReactions?.[k]) || 0,
      Number(localReactions?.[k]) || 0
    );
  }
  return withViewerReactionFlags(merged, userKey);
}

function mergeComments(serverComments?: any[], localComments?: any[]) {
  const sList = Array.isArray(serverComments) ? serverComments : [];
  const lList = Array.isArray(localComments) ? localComments : [];
  const map = new Map<string, any>();
  for (const c of sList) {
    if (c?.id) map.set(c.id, c);
  }
  for (const c of lList) {
    if (c?.id && !map.has(c.id)) {
      map.set(c.id, c);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tB - tA;
  });
}

interface AppContextType {
  currentUser: User;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isAuthenticated: boolean;
  authReady: boolean;
  loginPortal: 'crm' | 'design';
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  isSidebarHovered: boolean;
  setIsSidebarHovered: (hovered: boolean) => void;
  activeDepartment: string;
  setActiveDepartment: (dept: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  feedPosts: FeedPost[];
  announcementPosts: FeedPost[];
  announcementsLoading: boolean;
  addReaction: (postId: string, reactionType: string) => void;
  addComment: (
    postId: string,
    content: string,
    customAuthor?: { name: string; avatar: string; role: string; handle?: string }
  ) => Promise<void>;
  likeComment: (postId: string, commentId: string) => void;
  refreshFeed: () => Promise<void>;
  addNewPost: (
    title: string,
    content: string,
    type?: FeedPost['type'],
    department?: FeedPost['department'],
    quotaProgress?: FeedPost['quotaProgress'],
    author?: { name: string; avatar: string; team: string; role?: string; email?: string }
  ) => Promise<FeedPost | null>;
  deleteAnnouncement: (postId: string) => Promise<boolean>;
  deleteComment: (postId: string, commentId: string) => Promise<boolean>;
  actionItems: ActionItem[];
  toggleActionItem: (groupId: string, itemId: string) => void;
  crmLeads: CrmLeadItem[];
  addCrmLead: (lead: Omit<CrmLeadItem, 'id'>) => void;
  deleteCrmLead: (id: string) => void;
  designProjects: DesignProject[];
  addDesignProject: (project: Omit<DesignProject, 'id'>) => void;
  login: (email?: string, name?: string, role?: string, department?: User['department']) => void;
  logout: () => void;
  switchUser: (targetRole?: 'admin' | 'crm' | 'design') => void;
  notifications: NotificationItem[];
  notificationsCount: number;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  activeTimeframe: 'Today' | 'MTD' | 'QTD';
  setActiveTimeframe: (tf: 'Today' | 'MTD' | 'QTD') => void;
  activeLeaderboardView: 'Individual' | 'Team';
  setActiveLeaderboardView: (v: 'Individual' | 'Team') => void;
  simulateDynamicDeal: (params: {
    scenarioNumber: number;
    repName: string;
    branchName: string;
    amount: string;
    projectTag?: string;
    customDetails?: string;
  }) => Promise<FeedPost>;
  activeCampaign: ActiveCampaign;
  updateActiveCampaign: (
    campaign: Partial<ActiveCampaign>
  ) => Promise<{ ok: boolean; error?: string }>;
}

const HALLWAY_SESSION_KEY = 'hallway-auth';

const DESIGN_HANDOFF_API_BASES = new Set([
  'https://api.hubinterior.com',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
]);

async function readDesignUser(response: Response) {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.email) return null;
  return data as { email: string; name?: string; role?: string };
}

/** Confirm the Design session, then stay on the home feed instead of /login. */
async function verifyDesignHandoff(sessionId: string, apiBase?: string) {
  try {
    const proxied = await fetch('/api/design-module/auth/session', {
      headers: { Authorization: `Bearer ${sessionId}` },
      cache: 'no-store',
    });
    const fromProxy = await readDesignUser(proxied);
    if (fromProxy) return fromProxy;
  } catch {
    // The Hallway server cannot reach a session that lives on this machine.
  }

  const base = (apiBase || '').replace(/\/$/, '');
  if (!DESIGN_HANDOFF_API_BASES.has(base)) return null;
  try {
    const direct = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${sessionId}` },
      cache: 'no-store',
    });
    return await readDesignUser(direct);
  } catch {
    return null;
  }
}
const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours shift expiry

/**
 * Announcements/comments live on this Next.js app at /api/*.
 * Never call a cross-origin NEXT_PUBLIC_API_URL from the browser — that causes
 * CORS "Failed to fetch" when developing on localhost against a remote host.
 */
function resolveHallwayLocalApi(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || '/api').trim().replace(/\/$/, '');
  if (!raw || raw === '/api') return '/api';
  if (raw.startsWith('/')) return raw;
  if (typeof window !== 'undefined') {
    try {
      const remote = new URL(raw);
      if (remote.origin !== window.location.origin) return '/api';
      return `${remote.pathname.replace(/\/$/, '') || '/api'}`;
    } catch {
      return '/api';
    }
  }
  // SSR / build: prefer same-app path
  return '/api';
}
const HALLWAY_LOCAL_API = resolveHallwayLocalApi();

function userFromSession(
  email?: string,
  name?: string,
  role?: string,
  department: User['department'] = 'Sales'
): User {
  const display = formatPersonName(name || email || 'User');
  const initials = display
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  if (department === 'Design' || email?.toLowerCase().includes('maya')) {
    return {
      ...designerUserMock,
      id: 'u-design-session',
      name: display,
      role: role || 'DESIGNER',
      initials: initials || 'DS',
      email: email || designerUserMock.email,
      department: 'Design',
    };
  }
  if (email?.toLowerCase().includes('ranjith') || name?.toLowerCase().includes('ranjith')) {
    return {
      ...alternateUserMock,
      name: display || alternateUserMock.name,
      role: role || 'ADMIN',
      email: email || alternateUserMock.email,
    };
  }
  if (email?.toLowerCase().includes('sachin') || name?.toLowerCase().includes('sachin')) {
    return {
      ...currentUserMock,
      id: 'u-sachin',
      name: display || 'Sachin Shekar',
      role: role || 'ADMIN',
      email: email || 'sachin@hubinterior.com',
      department: 'Sales',
    };
  }
  return {
    id: 'u-session',
    name: display,
    role: role || 'SALES',
    initials: initials || 'U',
    avatar: currentUserMock.avatar,
    email: email || '',
    department,
    isOnline: true,
  };
}

function formatBranchName(raw?: string): string {
  if (!raw) return 'Hub Sales';
  const clean = raw.trim().toUpperCase();
  if (clean === 'JP_NAGAR' || clean === 'JP NAGAR') return 'JP Nagar Hub';
  if (clean === 'SARJAPURA' || clean === 'SARJAPUR') return 'Sarjapura Hub';
  if (clean === 'HBR' || clean === 'HBR_LAYOUT') return 'HBR Layout Hub';
  return `${raw} Hub`;
}

const BRANCH_TARGET_CONFIGS = [
  { id: 'JP_NAGAR', name: 'JP Nagar', team: 'JP Nagar Hub' },
  { id: 'SARJAPUR', name: 'Sarjapura', team: 'Sarjapura Hub' },
  { id: 'HBR', name: 'HBR Layout', team: 'HBR Layout Hub' },
];

function resolveCrmAvatar(_name?: string): string {
  return '';
}

/**
 * Notifications are ephemeral views of live Hallway CRM data (meetings, deals,
 * actions, targets). They are NOT persisted as rows — after the user reads one
 * we dismiss it (local dismiss set only) so it leaves the inbox.
 */
function buildDynamicNotifications(params: {
  currentUser: User;
  todayEvents: any[];
  actions: any[];
  announcements: FeedPost[];
  branchTargets: any[];
  overallTargets: any[];
  dismissedIds: Set<string>;
}): NotificationItem[] {
  const notifs: NotificationItem[] = [];
  const { currentUser, todayEvents, actions, announcements, branchTargets, dismissedIds } =
    params;

  const roleLower = (currentUser?.role || '').toLowerCase();
  const deptLower = (currentUser?.department || '').toLowerCase();
  const nameLower = (currentUser?.name || '').toLowerCase();
  const isDesigner = deptLower === 'design' || roleLower.includes('design');
  const isSales = deptLower === 'sales' || roleLower.includes('sales') || roleLower.includes('crm');
  const isAdmin = isSuperAdmin(currentUser);

  const firstName = nameLower.split(' ')[0] || '';
  const eventMentionsUser = (event: any) => {
    const crm = String(event.crmPersonName || '').toLowerCase();
    const des = String(event.designerName || '').toLowerCase();
    const tit = String(event.title || '').toLowerCase();
    return (
      (nameLower && (crm.includes(nameLower) || des.includes(nameLower) || tit.includes(nameLower))) ||
      (firstName.length > 2 &&
        (crm.includes(firstName) || des.includes(firstName) || tit.includes(firstName)))
    );
  };

  const pushIfActive = (item: NotificationItem) => {
    if (dismissedIds.has(item.id)) return;
    notifs.push({ ...item, read: false });
  };

  // 1. Live meetings
  if (Array.isArray(todayEvents)) {
    for (const event of todayEvents) {
      const isRelevant = isAdmin || eventMentionsUser(event);
      if (!isRelevant) continue;

      const client = event.clientName ? event.clientName : 'Client';
      const designerStr = event.designerName ? ` · Designer ${event.designerName}` : '';
      const id = `notif-evt-${event.id}`;
      const timeIso = event.startAt || new Date().toISOString();

      pushIfActive({
        id,
        type: 'meeting',
        title: event.title || 'Showroom consultation',
        subtitle: `${client}${designerStr} · Showroom Consultation`,
        message: `Consultation with ${client} scheduled for ${event.time || 'today'}.`,
        categoryTag: 'Meeting',
        timestamp: timeIso,
        exactIstTime: formatExactIstTimestamp(timeIso),
        read: false,
      });
    }
  }

  // 2. Live bookings from announcements feed
  if (Array.isArray(announcements) && (isSales || isAdmin)) {
    for (const post of announcements) {
      if (post.type !== 'booking') continue;
      const id = `notif-deal-${post.id}`;
      const timeIso = post.createdAt || new Date().toISOString();
      pushIfActive({
        id,
        type: 'deal',
        title: post.title.replace(/^[🎯🚀🔥👏🎉🏡📢]+\s*/u, '').slice(0, 42),
        subtitle: `Verified Booking · Accounts confirmed advance receipt`,
        message: post.content,
        categoryTag: 'Deal',
        timestamp: timeIso,
        exactIstTime: formatExactIstTimestamp(timeIso),
        read: false,
      });
    }
  }

  // 3. Live action items for this user
  const personalizedActions = getPersonalizedActions(
    Array.isArray(actions) ? actions : [],
    currentUser,
    'my'
  );
  for (const group of personalizedActions) {
    const items = Array.isArray(group.items) ? group.items : [];
    for (const item of items.slice(0, 5)) {
      const id = `notif-act-${item.id}`;
      const isUrgent = group.urgent || Boolean(item.xpPenaltyWarning);
      const timeIso =
        typeof item.dueTime === 'string' && item.dueTime.includes('T')
          ? item.dueTime
          : new Date().toISOString();
      pushIfActive({
        id,
        type: isUrgent ? 'urgent' : isDesigner ? 'task' : 'lead',
        title: isUrgent ? `Urgent Action: ${item.name}` : item.name || 'Pipeline action',
        subtitle: item.detail || `${item.name} · Action required`,
        message: item.detail || 'Pipeline action required in active corridor.',
        categoryTag: isUrgent ? 'Urgent' : isDesigner ? 'Task' : 'Lead',
        timestamp: timeIso,
        exactIstTime: formatExactIstTimestamp(timeIso),
        read: false,
      });
    }
  }

  // 4. Live branch pacing milestones
  if (Array.isArray(branchTargets) && (isAdmin || isSales)) {
    for (const target of branchTargets) {
      if (Number(target.progress) < 20) continue;
      const id = `notif-target-${target.branchId || 'overall'}-${target.yearMonth || 'current'}`;
      const timeIso = new Date().toISOString();
      pushIfActive({
        id,
        type: 'milestone',
        title: `${target.branchName} Corridor Milestone`,
        subtitle: `${target.branchName} Hub · ${target.progress}% achieved towards quota`,
        message: `${target.branchName} Hub pacing reached ${target.progress}%.`,
        categoryTag: 'Milestone',
        timestamp: timeIso,
        exactIstTime: formatExactIstTimestamp(timeIso),
        read: false,
      });
    }
  }

  // Deduplicate + newest first. No fake/sample fallbacks — empty inbox is fine.
  const seen = new Set<string>();
  const deduped: NotificationItem[] = [];
  for (const n of notifs) {
    if (!seen.has(n.id)) {
      seen.add(n.id);
      deduped.push(n);
    }
  }

  return deduped.sort((a, b) => {
    const tA = new Date(a.timestamp).getTime() || 0;
    const tB = new Date(b.timestamp).getTime() || 0;
    return tB - tA;
  });
}

const DISMISSED_NOTIFS_KEY = 'hub_dismissed_notifications';
const LEGACY_READ_NOTIFS_KEY = 'hub_read_notifications';

function loadDismissedNotificationIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const primary = localStorage.getItem(DISMISSED_NOTIFS_KEY);
    if (primary) return new Set(JSON.parse(primary));
    // Migrate older "read" set → dismissed (same intent: leave the inbox)
    const legacy = localStorage.getItem(LEGACY_READ_NOTIFS_KEY);
    if (legacy) {
      const set = new Set<string>(JSON.parse(legacy));
      localStorage.setItem(DISMISSED_NOTIFS_KEY, JSON.stringify(Array.from(set)));
      return set;
    }
  } catch {}
  return new Set();
}

function persistDismissedNotificationIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DISMISSED_NOTIFS_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(currentUserMock);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loginPortal, setLoginPortal] = useState<'crm' | 'design'>('crm');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);
  const [activeDepartment, setActiveDepartment] = useState<string>('All Departments');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>(initialFeedPosts);
  const feedPostsRef = useRef<FeedPost[]>(feedPosts);
  feedPostsRef.current = feedPosts;
  const [announcementPosts, setAnnouncementPosts] = useState<FeedPost[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const announcementPostsRef = useRef<FeedPost[]>(announcementPosts);
  announcementPostsRef.current = announcementPosts;
  const feedRefreshGen = useRef(0);
  const [actionItems, setActionItems] = useState<ActionItem[]>(actionItemsMock);
  const [crmLeads, setCrmLeads] = useState<CrmLeadItem[]>(crmLeadsMock);
  const [designProjects, setDesignProjects] = useState<DesignProject[]>(designProjectsMock);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<Set<string>>(() =>
    loadDismissedNotificationIds()
  );
  const dismissedNotificationIdsRef = useRef<Set<string>>(dismissedNotificationIds);
  dismissedNotificationIdsRef.current = dismissedNotificationIds;

  /** Admin-deleted CRM snippet IDs — persist so regenerating feed does not bring them back */
  const [suppressedAnnouncementIds, setSuppressedAnnouncementIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('hub_suppressed_announcements');
        if (stored) return new Set(JSON.parse(stored));
      } catch {}
    }
    return new Set();
  });
  const suppressedAnnouncementIdsRef = useRef<Set<string>>(suppressedAnnouncementIds);
  suppressedAnnouncementIdsRef.current = suppressedAnnouncementIds;
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    buildDynamicNotifications({
      currentUser: currentUserMock,
      todayEvents: [],
      actions: [],
      announcements: [],
      branchTargets: [],
      overallTargets: [],
      dismissedIds: dismissedNotificationIdsRef.current,
    })
  );
  // Inbox only holds active (undismissed) live alerts
  const notificationsCount = notifications.length;
  const [activeTimeframe, setActiveTimeframe] = useState<'Today' | 'MTD' | 'QTD'>('Today');
  const [activeLeaderboardView, setActiveLeaderboardView] = useState<'Individual' | 'Team'>('Individual');

  // Initialize theme from localStorage without effect warning
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('hub-theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Restore Hallway session before showing corridors.
  // A Design app-switcher click arrives as #hub= so a new tab can open home instead of login.
  useEffect(() => {
    let cancelled = false;
    const stripHubHash = () => {
      if (!window.location.hash.includes('hub=')) return;
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    };
    const applySaved = (raw: string) => {
      const saved = JSON.parse(raw) as {
        email?: string;
        name?: string;
        role?: string;
        department?: User['department'];
        portal?: 'crm' | 'design';
        timestamp?: number;
      };
      const isExpired = saved.timestamp
        ? Date.now() - saved.timestamp > SESSION_EXPIRY_MS
        : false;
      if (isExpired || (!saved.email && !saved.name)) {
        window.sessionStorage.removeItem(HALLWAY_SESSION_KEY);
        window.localStorage.removeItem(HALLWAY_SESSION_KEY);
        return false;
      }
      setCurrentUser(userFromSession(saved.email, saved.name, saved.role, saved.department));
      setLoginPortal(saved.portal || (saved.department === 'Design' ? 'design' : 'crm'));
      setIsAuthenticated(true);
      window.sessionStorage.setItem(HALLWAY_SESSION_KEY, raw);
      window.localStorage.setItem(HALLWAY_SESSION_KEY, raw);
      return true;
    };

    (async () => {
      try {
        window.localStorage.removeItem('hallway_session');
        const raw =
          window.sessionStorage.getItem(HALLWAY_SESSION_KEY) ||
          window.localStorage.getItem(HALLWAY_SESSION_KEY);
        if (raw && applySaved(raw)) {
          stripHubHash();
          return;
        }

        const hub = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('hub');
        if (hub) {
          let handoff: { sessionId?: string; apiBase?: string } | null = null;
          try {
            handoff = JSON.parse(hub);
          } catch {
            handoff = JSON.parse(decodeURIComponent(hub));
          }
          if (handoff?.sessionId) {
            const data = await verifyDesignHandoff(handoff.sessionId, handoff.apiBase);
            if (!cancelled && data?.email) {
              const nextUser = userFromSession(data.email, data.name, data.role, 'Design');
              const savedSession = JSON.stringify({
                email: nextUser.email,
                name: nextUser.name,
                role: nextUser.role,
                department: 'Design',
                portal: 'design',
                timestamp: Date.now(),
              });
              setCurrentUser(nextUser);
              setLoginPortal('design');
              setIsAuthenticated(true);
              window.sessionStorage.setItem(HALLWAY_SESSION_KEY, savedSession);
              window.localStorage.setItem(HALLWAY_SESSION_KEY, savedSession);
              stripHubHash();
              return;
            }
          }
          stripHubHash();
        }
        if (!cancelled) setIsAuthenticated(false);
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const publishLiveAnnouncements = (input: {
    announcementsData: any;
    crmItems: any[];
    overallTargets?: any[];
    branchTargets?: any[];
    leaderboardData?: any[];
    crmPeopleData?: any[];
    crmRecordsData?: any;
  }): FeedPost[] => {
    const viewerKey = reactionViewerKey(currentUser);
    const announcementsData = Array.isArray(input.announcementsData) ? input.announcementsData : [];
    const overallTargets = input.overallTargets || [];
    const branchTargets = input.branchTargets || [];
    const leaderboardData = input.leaderboardData || [];
    const crmPeopleData = input.crmPeopleData || [];
    const crmRecordsData = input.crmRecordsData || { individualRecords: [], teamRecords: [] };

    const announcementsMap = new Map<string, FeedPost>();
    for (const a of announcementsData) {
      if (a?.id) announcementsMap.set(a.id, a);
    }

    const currentPostsMap = new Map<string, FeedPost>();
    if (Array.isArray(feedPostsRef.current)) {
      for (const p of feedPostsRef.current) {
        if (p?.id) currentPostsMap.set(p.id, p);
      }
    }
    if (Array.isArray(announcementPostsRef.current)) {
      for (const p of announcementPostsRef.current) {
        if (p?.id) {
          const prev = currentPostsMap.get(p.id);
          currentPostsMap.set(p.id, {
            ...p,
            reactions: mergeReactions(prev?.reactions, p.reactions, viewerKey),
            comments: mergeComments(prev?.comments, p.comments),
          });
        }
      }
    }
    for (const a of announcementsData) {
      if (a?.id) {
        const prev = currentPostsMap.get(a.id);
        currentPostsMap.set(a.id, {
          ...a,
          reactions: mergeReactions(a.reactions, prev?.reactions, viewerKey),
          comments: mergeComments(a.comments, prev?.comments),
        });
      }
    }

    const dynamicCrmSnippets = generateCrmAnnouncements({
      crmFeedItems: Array.isArray(input.crmItems) ? input.crmItems : [],
      overallTargets,
      branchTargets,
      topPerformers: Array.isArray(leaderboardData) ? leaderboardData : [],
      people: Array.isArray(crmPeopleData) ? crmPeopleData : [],
      records: Array.isArray(crmRecordsData) ? crmRecordsData : (crmRecordsData?.individualRecords || []),
      teamRecords: crmRecordsData?.teamRecords || [],
      existingPostsMap: currentPostsMap,
    });

    const announcementBroadcasts: FeedPost[] = [];
    for (const post of announcementsData) {
      const pId = String(post.id || '').toLowerCase();
      const pTitle = String(post.title || '').toLowerCase();
      const pContent = String(post.content || '').toLowerCase();

      if (
        isLegacyCrmAnnouncement(post) ||
        pId === 'post-1' ||
        pId === 'post-2' ||
        pId === 'post-3' ||
        pId === 'post-1789470715315' ||
        pId === 'post-1790950160406' ||
        pId === 'announcement-yesterday-1' ||
        pId === 'performer-yesterday-1' ||
        pId === 'crm-announcement-official-corridor-broadcast' ||
        pId.startsWith('crm-token-') ||
        pId.startsWith('crm-event-') ||
        pId.startsWith('deal-yesterday-') ||
        pId.startsWith('crm-target-') ||
        pId.startsWith('crm-month-milestone-') ||
        pTitle === 'hello' ||
        pContent === 'hello hub' ||
        pTitle.includes('sarah jenkins') ||
        pContent.includes('sarah jenkins') ||
        pContent.includes('deal #4828') ||
        pContent.includes('sarjapura phase 2') ||
        pTitle.includes('jp nagar hit 80%') ||
        pContent.includes('on track to smash this month') ||
        pTitle.startsWith('new token') ||
        pTitle.includes('client consultation') ||
        pTitle.includes('virtual meeting') ||
        pTitle.includes('quarterly operating corridor') ||
        pTitle.includes('townhall scheduled') ||
        pTitle.includes('gross booking · ₹90,259') ||
        pTitle.includes('gross booking · ₹54,329') ||
        pTitle.includes('gross booking · ₹18,717') ||
        pContent.includes('sreeraj alakkassery') ||
        pContent.includes('nagaraju nalam') ||
        pContent.includes('thesnim')
      ) {
        continue;
      }
      const existingLocal = currentPostsMap.get(post.id);
      const reactions = mergeReactions(post.reactions, existingLocal?.reactions, viewerKey);
      const comments = mergeComments(post.comments, existingLocal?.comments);
      const commentsCount = Math.max(post.comments?.length || post.commentsCount || 0, comments.length, existingLocal?.commentsCount || 0);

      announcementBroadcasts.push({
        ...post,
        content: cleanPostContent(post.content),
        reactions,
        commentsCount,
        comments,
      });
    }

    const announcementPostsMap = new Map<string, FeedPost>();
    for (const s of dynamicCrmSnippets) {
      const dbPost = announcementsMap.get(s.id);
      const localPost = currentPostsMap.get(s.id);
      const reactions = mergeReactions(
        s.reactions,
        mergeReactions(dbPost?.reactions, localPost?.reactions, viewerKey),
        viewerKey
      );
      const comments = mergeComments(s.comments, mergeComments(dbPost?.comments, localPost?.comments));
      announcementPostsMap.set(s.id, {
        ...s,
        reactions,
        comments,
        commentsCount: Math.max(s.commentsCount || 0, comments.length),
      });
    }

    for (const b of announcementBroadcasts) {
      if (announcementPostsMap.has(b.id)) {
        const existing = announcementPostsMap.get(b.id)!;
        announcementPostsMap.set(b.id, {
          ...existing,
          reactions: mergeReactions(existing.reactions, b.reactions, viewerKey),
          comments: mergeComments(existing.comments, b.comments),
          commentsCount: Math.max(existing.commentsCount, b.comments?.length || 0),
        });
      } else {
        announcementPostsMap.set(b.id, b);
      }
    }

    if (Array.isArray(announcementPostsRef.current)) {
      for (const p of announcementPostsRef.current) {
        if (p?.id && !announcementPostsMap.has(p.id) && !String(p.id).startsWith('crm-')) {
          announcementPostsMap.set(p.id, p);
        }
      }
    }

    const suppressed = suppressedAnnouncementIdsRef.current;
    return Array.from(announcementPostsMap.values())
      .filter((p) => !suppressed.has(p.id))
      .sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        const safeA = Number.isFinite(tA) ? tA : 0;
        const safeB = Number.isFinite(tB) ? tB : 0;
        if (safeB !== safeA) return safeB - safeA;
        const rank = (p: FeedPost) => {
          if (p.id.startsWith('crm-weekly-top-')) return 5;
          if (p.id.startsWith('crm-monthly-top-')) return 4;
          if (p.id.startsWith('crm-month-milestone-')) return 3;
          if (p.type === 'booking') return 2;
          return 0;
        };
        return rank(b) - rank(a);
      });
  };

  // Fetch announcements and live CRM targets / bookings
  const refreshFeed = async () => {
    const gen = ++feedRefreshGen.current;
    const stale = () => gen !== feedRefreshGen.current;
    try {
      if (announcementPostsRef.current.length === 0) setAnnouncementsLoading(true);
      const apiUrl = HALLWAY_LOCAL_API || '/api';
      const announcementsPromise = fetch(`${apiUrl}/announcements`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

      const crmFeedPromise = fetchFeed('', { limit: 50 })
        .then((res) => res?.feed || [])
        .catch(() => []);

      const crmTargetsPromise = fetchTargets('', {})
        .then((res) => res?.cards || [])
        .catch(() => []);

      const crmLeaderboardPromise = fetchLeaderboard('', { period: 'mtd' })
        .then((res) => res?.individuals || [])
        .catch(() => []);

      const crmPeoplePromise = fetchPeople('', {})
        .then((res) => res?.people || [])
        .catch(() => []);

      const crmRecordsPromise = fetchRecords('', '')
        .then((res) => res || { individualRecords: [], teamRecords: [] })
        .catch(() => ({ individualRecords: [], teamRecords: [] }));

      const todayEventsPromise = fetchTodayEvents('')
        .then((res) => res?.events || [])
        .catch(() => []);

      const crmActionsPromise = fetchActions('')
        .then((res) => res?.actions || [])
        .catch(() => []);

      const branchTargetPromises = BRANCH_TARGET_CONFIGS.map(async (b) => {
        try {
          const res = await fetchTargets('', { branchId: b.id });
          return (res?.cards || []).map((card) => ({
            ...card,
            branchId: b.id,
            branchName: b.name,
            team: b.team,
          }));
        } catch {
          return [];
        }
      });

      let partialAnnouncements: any = undefined;
      let partialFeed: any[] | undefined;
      let partialTargets: any[] | undefined;
      let partialLeaderboard: any[] | undefined;
      let sealed = false;
      const paintPartial = () => {
        if (stale() || sealed) return;
        const feedSettled = partialFeed !== undefined;
        const broadcasts = Array.isArray(partialAnnouncements) ? partialAnnouncements : [];
        if (!feedSettled && broadcasts.length === 0) return;
        // Paint as soon as feed lands; upgrade again when leaderboard / overall targets arrive
        // so Top Performer + Milestones appear without waiting on branch/people/records fan-out.
        const early = publishLiveAnnouncements({
          announcementsData: broadcasts,
          crmItems: partialFeed || [],
          overallTargets: partialTargets || [],
          leaderboardData: partialLeaderboard || [],
        });
        if (early.length > 0 || feedSettled) {
          setAnnouncementPosts(early);
          setAnnouncementsLoading(false);
        }
      };
      void announcementsPromise.then((data) => {
        partialAnnouncements = data;
        paintPartial();
      });
      void crmFeedPromise.then((items) => {
        partialFeed = items;
        paintPartial();
      });
      void crmTargetsPromise.then((cards) => {
        partialTargets = Array.isArray(cards)
          ? cards.map((card) => ({
              ...card,
              branchId: 'all',
              branchName: 'All Hubs (Overall)',
              team: 'Operations HQ',
            }))
          : [];
        paintPartial();
      });
      void crmLeaderboardPromise.then((rows) => {
        partialLeaderboard = Array.isArray(rows) ? rows : [];
        paintPartial();
      });

      // Critical path: feed now carries weekly/monthly/milestone board cards — paint as soon as
      // announcements + feed land. Targets/leaderboard only refine fallbacks if board cards missing.
      const [announcementsData, crmItems] = await Promise.all([
        announcementsPromise,
        crmFeedPromise,
      ]);
      if (stale()) return;

      const combinedAnnouncementsEarly = publishLiveAnnouncements({
        announcementsData,
        crmItems: Array.isArray(crmItems) ? crmItems : [],
        overallTargets: partialTargets || [],
        leaderboardData: partialLeaderboard || [],
      });
      if (!stale()) {
        sealed = true;
        setAnnouncementPosts(combinedAnnouncementsEarly);
        setAnnouncementsLoading(false);
      }

      const [overallTargetsData, leaderboardData] = await Promise.all([
        crmTargetsPromise,
        crmLeaderboardPromise,
      ]);
      if (stale()) return;

      const overallTargets: any[] = [];
      if (Array.isArray(overallTargetsData) && overallTargetsData.length > 0) {
        for (const card of overallTargetsData) {
          overallTargets.push({
            ...card,
            branchId: 'all',
            branchName: 'All Hubs (Overall)',
            team: 'Operations HQ',
          });
        }
      }

      // Soft upgrade if feed lacked board cards and targets/leaderboard filled gaps
      const upgraded = publishLiveAnnouncements({
        announcementsData,
        crmItems: Array.isArray(crmItems) ? crmItems : [],
        overallTargets,
        leaderboardData,
      });
      if (!stale()) {
        setAnnouncementPosts(upgraded);
      }

      const [
        crmPeopleData,
        crmRecordsData,
        todayEventsData,
        crmActionsData,
        ...branchTargetsArrays
      ] = await Promise.all([
        crmPeoplePromise,
        crmRecordsPromise,
        todayEventsPromise,
        crmActionsPromise,
        ...branchTargetPromises,
      ]);
      if (stale()) return;

      // Sync verified profile details from active live CRM directory
      if (Array.isArray(crmPeopleData) && crmPeopleData.length > 0 && currentUser?.name) {
        const rawTarget = (currentUser.email || currentUser.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const match = crmPeopleData.find((p) => {
          const pCleanName = (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const pCleanEmail = (p.email || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return (
            pCleanName === rawTarget ||
            pCleanEmail === rawTarget ||
            (pCleanEmail && rawTarget.includes(pCleanEmail)) ||
            (pCleanName && rawTarget.includes(pCleanName))
          );
        });
        if (match && match.name) {
          const matchedFormatted = formatPersonName(match.name);
          setCurrentUser((prev) => {
            if (prev.name === matchedFormatted) return prev;
            return {
              ...prev,
              name: matchedFormatted,
              avatar: match.avatar || prev.avatar,
              role: match.role || prev.role,
            };
          });
        }
      }

      // Branch targets for dashboard pacing cards (announcements already painted above)
      const branchTargets: any[] = [];
      for (const list of branchTargetsArrays) {
        if (Array.isArray(list)) branchTargets.push(...list);
      }

      // Sort branches: whichever branch has achieved more target is displayed first, then 2nd highest, then 3rd.
      // (Do not mention 1st, 2nd, and 3rd in titles or text)
      branchTargets.sort((a, b) => {
        const pA = Number(a.progress) || 0;
        const pB = Number(b.progress) || 0;
        if (pB !== pA) return pB - pA;
        const cA = Number(a.currentInr) || 0;
        const cB = Number(b.currentInr) || 0;
        return cB - cA;
      });

      const viewerKey = reactionViewerKey(currentUser);
      const announcementsMap = new Map<string, FeedPost>();
      if (Array.isArray(announcementsData)) {
        for (const a of announcementsData) {
          if (a?.id) announcementsMap.set(a.id, a);
        }
      }

      const currentPostsMap = new Map<string, FeedPost>();
      if (Array.isArray(feedPostsRef.current)) {
        for (const p of feedPostsRef.current) {
          if (p?.id) currentPostsMap.set(p.id, p);
        }
      }
      if (Array.isArray(announcementPostsRef.current)) {
        for (const p of announcementPostsRef.current) {
          if (p?.id) {
            const prev = currentPostsMap.get(p.id);
            currentPostsMap.set(p.id, {
              ...p,
              reactions: mergeReactions(prev?.reactions, p.reactions, viewerKey),
              comments: mergeComments(prev?.comments, p.comments),
            });
          }
        }
      }
      if (Array.isArray(announcementsData)) {
        for (const a of announcementsData) {
          if (a?.id) {
            const prev = currentPostsMap.get(a.id);
            currentPostsMap.set(a.id, {
              ...a,
              reactions: mergeReactions(a.reactions, prev?.reactions, viewerKey),
              comments: mergeComments(a.comments, prev?.comments),
            });
          }
        }
      }

      const seenIds = new Set<string>();
      const targetPosts: FeedPost[] = [];

      // Add All Hubs target card first, then highest achieved branch, 2nd highest, then 3rd
      const targetCardsOrdered = [...overallTargets, ...branchTargets];
      for (const target of targetCardsOrdered) {
        const id = `crm-target-${target.branchId || 'overall'}-${target.yearMonth || 'current'}`;
        if (seenIds.has(id)) continue;
        const existing = announcementsMap.get(id);
        const existingLocal = currentPostsMap.get(id);
        const reactions = mergeReactions(existing?.reactions, existingLocal?.reactions, viewerKey);
        const comments = mergeComments(existing?.comments, existingLocal?.comments);
        const commentsCount = Math.max(existing?.commentsCount || 0, comments.length, existingLocal?.commentsCount || 0);

        const currentFormatted = target.currentInr
          ? formatInrToLakhsOrCrores(target.currentInr)
          : (target.current || '₹0')
              .replace(/[¹]/g, '1')
              .replace(/[²]/g, '2')
              .replace(/[\u20B9â‚¹]/g, '₹');
        const targetFormatted = target.targetInr
          ? formatInrToLakhsOrCrores(target.targetInr)
          : (target.target || '₹0')
              .replace(/[¹]/g, '1')
              .replace(/[²]/g, '2')
              .replace(/[\u20B9â‚¹]/g, '₹');

        const isOverall = target.branchId === 'all' || target.branchName?.includes('Overall');
        const branchPrefix = target.branchName
          ? isOverall
            ? `${target.branchName} : `
            : `${target.branchName}: `
          : '';
        const targetTitle = target.title || 'Monthly gross booking';
        const title = `${branchPrefix}${targetTitle}: ${currentFormatted} achieved (${target.progress}%)`;
        const content =
          target.branchName && target.branchId !== 'all'
            ? `${target.branchName} Hub monthly gross booking pacing is at ${currentFormatted} towards the ${targetFormatted} branch target (${target.progress}% achieved).`
            : `Monthly gross booking pacing across all corridors is at ${currentFormatted} towards the ${targetFormatted} target (${target.progress}% achieved).`;

        targetPosts.push({
          id,
          type: 'quota',
          categoryColor: '#8B5CF6',
          iconEmoji: '🎯',
          title,
          timestamp: 'Just now',
          createdAt: new Date().toISOString(),
          author: {
            name:
              target.branchName && target.branchId !== 'all'
                ? `${target.branchName} Operations`
                : 'Hub Operations',
            avatar: '',
            team: target.team || 'Operations HQ',
          },
          content,
          quotaProgress: {
            current: target.currentInr || target.progress,
            target: target.targetInr || 100,
            label: target.branchName ? `${target.branchName} Target` : target.title,
            percentage: target.progress,
            currentFormatted,
            targetFormatted,
          },
          reactions,
          commentsCount,
          comments,
          department: 'Sales',
        });
        seenIds.add(id);
      }

      // Dashboard Feed strictly contains the 4 Monthly Target cards (All Hubs -> sorted branches descending by %)
      setFeedPosts(targetPosts);
      if (stale()) return;

      const combinedAnnouncements = publishLiveAnnouncements({
        announcementsData,
        crmItems: Array.isArray(crmItems) ? crmItems : [],
        overallTargets,
        branchTargets,
        leaderboardData,
        crmPeopleData,
        crmRecordsData,
      });
      sealed = true;
      if (stale()) return;
      setAnnouncementPosts(combinedAnnouncements);
      setAnnouncementsLoading(false);

      const liveNotifs = buildDynamicNotifications({
        currentUser,
        todayEvents: Array.isArray(todayEventsData) ? todayEventsData : [],
        actions: Array.isArray(crmActionsData) ? crmActionsData : [],
        announcements: combinedAnnouncements,
        branchTargets,
        overallTargets,
        dismissedIds: dismissedNotificationIdsRef.current,
      });
      setNotifications(liveNotifs);

      // Keep dismiss IDs only while the live source still exists (no permanent notif store)
      const liveSourceIds = new Set<string>();
      for (const e of Array.isArray(todayEventsData) ? todayEventsData : []) {
        if (e?.id) liveSourceIds.add(`notif-evt-${e.id}`);
      }
      for (const p of combinedAnnouncements) {
        if (p?.type === 'booking' && p.id) liveSourceIds.add(`notif-deal-${p.id}`);
      }
      for (const a of Array.isArray(crmActionsData) ? crmActionsData : []) {
        const items = Array.isArray(a?.items) ? a.items : [];
        for (const item of items) {
          if (item?.id) liveSourceIds.add(`notif-act-${item.id}`);
        }
      }
      for (const t of branchTargets) {
        liveSourceIds.add(
          `notif-target-${t.branchId || 'overall'}-${t.yearMonth || 'current'}`
        );
      }
      setDismissedNotificationIds((prev) => {
        const pruned = new Set<string>();
        for (const id of prev) {
          if (liveSourceIds.has(id)) pruned.add(id);
        }
        if (pruned.size !== prev.size) persistDismissedNotificationIds(pruned);
        return pruned.size !== prev.size ? pruned : prev;
      });

      // Keep company campaign in sync for every member (not device-local)
      void loadActiveCampaign();
    } catch {
      if (!stale()) setAnnouncementsLoading(false);
    }
  };

  const refreshFeedRef = useRef(refreshFeed);
  refreshFeedRef.current = refreshFeed;

  // Load once the person is signed in, then keep the live feed fresh.
  useEffect(() => {
    if (!authReady || !isAuthenticated) return;
    void refreshFeedRef.current();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refreshFeedRef.current();
      }
    }, 25000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshFeedRef.current();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      feedRefreshGen.current += 1;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [authReady, isAuthenticated]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('hub-theme', nextTheme);
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch {
        // ignore
      }
      return nextTheme;
    });
  };

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  const addReaction = async (postId: string, reactionType: string) => {
    const targetPost =
      feedPosts.find((p) => p.id === postId) || announcementPosts.find((p) => p.id === postId);
    const viewerKey = reactionViewerKey(currentUser);

    // WhatsApp-style optimistic update: one reaction per user (keyed in byUser)
    const updatePost = (post: FeedPost) => {
      if (post.id !== postId) return post;
      const prev = (post.reactions || {}) as any;
      const byUser: Record<string, string> = { ...(prev.byUser || {}) };
      const current = viewerKey && byUser[viewerKey] ? byUser[viewerKey] : null;
      const next: any = { ...prev, byUser };
      if (current === reactionType) {
        next[reactionType] = Math.max(0, (Number(next[reactionType]) || 0) - 1);
        if (viewerKey) delete byUser[viewerKey];
      } else {
        if (current) {
          next[current] = Math.max(0, (Number(next[current]) || 0) - 1);
        }
        next[reactionType] = (Number(next[reactionType]) || 0) + 1;
        if (viewerKey) byUser[viewerKey] = reactionType;
      }
      next.byUser = byUser;
      return { ...post, reactions: withViewerReactionFlags(next, viewerKey) };
    };

    setFeedPosts((prev) => prev.map(updatePost));
    setAnnouncementPosts((prev) => prev.map(updatePost));

    const apiUrl = HALLWAY_LOCAL_API || '/api';
    try {
      const res = await fetch(`${apiUrl}/announcements/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reactionType,
          userKey: viewerKey,
          userEmail: currentUser?.email,
          postMetadata: targetPost
            ? {
                title: targetPost.title,
                type: targetPost.type,
                categoryColor: targetPost.categoryColor,
                content: targetPost.content,
                authorName: targetPost.author?.name,
                authorAvatar: targetPost.author?.avatar,
                authorTeam: targetPost.author?.team,
                department: targetPost.department,
                quotaProgress: targetPost.quotaProgress,
              }
            : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.reactions) {
          const syncReactionPost = (post: FeedPost) => {
            if (post.id !== postId) return post;
            return {
              ...post,
              reactions: withViewerReactionFlags(
                { ...(post.reactions || {}), ...data.reactions },
                viewerKey
              ),
            };
          };
          setFeedPosts((prev) => prev.map(syncReactionPost));
          setAnnouncementPosts((prev) => prev.map(syncReactionPost));
        }
      } else {
        void refreshFeed();
      }
    } catch {
      void refreshFeed();
    }
  };

  const likeComment = async (postId: string, commentId: string) => {
    const updateComments = (post: FeedPost) => {
      if (post.id !== postId) return post;
      const updatedComments = post.comments.map((comm) => {
        if (comm.id !== commentId) return comm;
        const nextLiked = !comm.userLiked;
        return {
          ...comm,
          userLiked: nextLiked,
          likes: Math.max(0, (comm.likes || 0) + (nextLiked ? 1 : -1)),
        };
      });
      return {
        ...post,
        comments: updatedComments,
      };
    };

    setFeedPosts((prev) => prev.map(updateComments));
    setAnnouncementPosts((prev) => prev.map(updateComments));

    const apiUrl = HALLWAY_LOCAL_API || '/api';
    try {
      await fetch(`${apiUrl}/announcements/${postId}/comments/${commentId}/like`, {
        method: 'POST'
      });
    } catch {
      // Silent catch
    }
  };

  const addComment = async (
    postId: string,
    content: string,
    customAuthor?: { name: string; avatar: string; role: string; handle?: string }
  ) => {
    if (!content.trim()) return;

    const targetPost =
      feedPosts.find((p) => p.id === postId) || announcementPosts.find((p) => p.id === postId);
    const authorName = customAuthor?.name || currentUser.name;
    const authorRole = customAuthor?.role || currentUser.role;
    const authorAvatar = customAuthor?.avatar || currentUser.avatar;
    const authorHandle = customAuthor?.handle || authorName.toLowerCase().replace(/\s+/g, '.');

    const newComment = {
      id: 'comm-' + Date.now(),
      authorName,
      authorHandle,
      authorAvatar,
      authorRole,
      content: content.trim(),
      timestamp: 'Just now',
      createdAt: new Date().toISOString(),
      likes: 0,
      userLiked: false
    };

    // Optimistic UI update for both feeds
    const updatePostComments = (post: FeedPost) => {
      if (post.id !== postId) return post;
      return {
        ...post,
        commentsCount: (post.commentsCount || 0) + 1,
        comments: [newComment, ...(post.comments || [])],
      };
    };

    setFeedPosts((prev) => prev.map(updatePostComments));
    setAnnouncementPosts((prev) => prev.map(updatePostComments));

    const apiUrl = HALLWAY_LOCAL_API || '/api';
    try {
      const res = await fetch(`${apiUrl}/announcements/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          authorName,
          authorHandle,
          authorAvatar,
          authorRole,
          postMetadata: targetPost
            ? {
                title: targetPost.title,
                type: targetPost.type,
                categoryColor: targetPost.categoryColor,
                content: targetPost.content,
                authorName: targetPost.author?.name,
                authorAvatar: targetPost.author?.avatar,
                authorTeam: targetPost.author?.team,
                department: targetPost.department,
                quotaProgress: targetPost.quotaProgress,
              }
            : undefined,
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.announcement) {
          const syncCommentPost = (p: FeedPost) => {
            if (p.id !== postId) return p;
            return {
              ...p,
              ...data.announcement,
              comments: data.announcement.comments || p.comments,
              commentsCount: data.announcement.commentsCount ?? data.announcement.comments?.length ?? p.commentsCount,
            };
          };
          setFeedPosts((prev) => prev.map(syncCommentPost));
          setAnnouncementPosts((prev) => prev.map(syncCommentPost));
        }
      } else {
        void refreshFeed();
      }
    } catch {
      void refreshFeed();
    }
  };

  const addNewPost = async (
    title: string,
    content: string,
    type: FeedPost['type'] = 'announcement',
    department: FeedPost['department'] = 'Sales',
    quotaProgress?: FeedPost['quotaProgress'],
    customAuthor?: { name: string; avatar: string; team: string }
  ): Promise<FeedPost | null> => {
    const colors: Record<string, string> = {
      booking: '#10B981',
      quota: '#8B5CF6',
      performer: '#EBD457',
      announcement: '#EF0101',
      general: '#00B0ED',
    };

    const author = {
      name: customAuthor?.name || currentUser.name,
      avatar: customAuthor?.avatar || currentUser.avatar,
      team: customAuthor?.team || `${currentUser.department || 'Sales'} Hub`,
      role: (customAuthor as any)?.role || currentUser.role,
      email: (customAuthor as any)?.email || currentUser.email,
    };

    const nowIso = new Date().toISOString();

    const newPost: FeedPost = {
      id: 'post-' + Date.now(),
      type,
      categoryColor: colors[type] || '#3B82F6',
      title: title.trim(),
      timestamp: 'Just Now',
      createdAt: nowIso,
      author,
      content: content.trim(),
      quotaProgress: quotaProgress || undefined,
      reactions: {
        thumbsUp: 0,
        clap: 0,
        heart: 0,
        joy: 0,
        surprised: 0,
        pray: 0
      },
      commentsCount: 0,
      comments: [],
      department
    };

    // Optimistically insert after targets, at the top of the news posts
    setFeedPosts((prev) => {
      const targets = prev.filter((p) => p.type === 'quota');
      const news = [newPost, ...prev.filter((p) => p.type !== 'quota' && p.id !== newPost.id)];
      return [...targets, ...news];
    });
    setAnnouncementPosts((prev) => [newPost, ...prev.filter((p) => p.id !== newPost.id)]);

    const apiUrl = resolveHallwayLocalApi();
    try {
      const res = await fetch(`${apiUrl}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          type,
          categoryColor: newPost.categoryColor,
          department,
          author,
          quotaProgress: quotaProgress || null,
        }),
      });
      if (res.ok) {
        const created: FeedPost = await res.json();
        const postWithDate: FeedPost = {
          ...created,
          createdAt: created.createdAt || nowIso,
        };
        setFeedPosts((prev) => [
          postWithDate,
          ...prev.filter((p) => p.id !== newPost.id && p.id !== created.id),
        ]);
        setAnnouncementPosts((prev) => [
          postWithDate,
          ...prev.filter((p) => p.id !== newPost.id && p.id !== created.id),
        ]);
        return postWithDate;
      }
      const errBody = await res.text().catch(() => '');
      console.error('Announcement POST failed:', res.status, errBody);
    } catch (err) {
      console.error('Failed to post announcement to server:', err);
    }
    // Optimistic local post still visible if API is unavailable
    return newPost;
  };

  const deleteAnnouncement = async (postId: string): Promise<boolean> => {
    // Only admins may delete
    if (!isSuperAdmin(currentUser)) {
      return false;
    }

    setFeedPosts((prev) => prev.filter((p) => p.id !== postId));
    setAnnouncementPosts((prev) => prev.filter((p) => p.id !== postId));

    // CRM / dynamic snippets: suppress so refreshFeed does not recreate them
    if (postId.startsWith('crm-') || postId.startsWith('dynamic-sim-')) {
      setSuppressedAnnouncementIds((prev) => {
        const next = new Set(prev);
        next.add(postId);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('hub_suppressed_announcements', JSON.stringify(Array.from(next)));
          } catch {}
        }
        return next;
      });
      return true;
    }

    try {
      const res = await fetch(`${resolveHallwayLocalApi()}/announcements/${postId}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch (err) {
      console.error('Failed to delete announcement from server:', err);
      return false;
    }
  };

  const deleteComment = async (postId: string, commentId: string): Promise<boolean> => {
    setFeedPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const filteredComments = (post.comments || []).filter((c) => c.id !== commentId);
        return {
          ...post,
          comments: filteredComments,
          commentsCount: Math.max(0, (post.commentsCount || filteredComments.length + 1) - 1),
        };
      })
    );
    setAnnouncementPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const filteredComments = (post.comments || []).filter((c) => c.id !== commentId);
        return {
          ...post,
          comments: filteredComments,
          commentsCount: Math.max(0, (post.commentsCount || filteredComments.length + 1) - 1),
        };
      })
    );

    try {
      const res = await fetch(
        `${HALLWAY_LOCAL_API}/announcements/${postId}/comments/${commentId}`,
        {
          method: 'DELETE',
        }
      );
      return res.ok;
    } catch (err) {
      console.error('Failed to delete comment from server:', err);
      return false;
    }
  };

  const toggleActionItem = (groupId: string, itemId: string) => {
    setActionItems((prev) =>
      prev.map((group) => {
        if (group.id !== groupId) return group;
        const updatedItems = group.items.map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item
        );
        const remainingCount = updatedItems.filter((i) => !i.done).length;
        return {
          ...group,
          items: updatedItems,
          count: remainingCount
        };
      })
    );
  };

  const addCrmLead = (lead: Omit<CrmLeadItem, 'id'>) => {
    const newLead: CrmLeadItem = {
      ...lead,
      id: 'lead-' + Date.now()
    };
    setCrmLeads((prev) => [newLead, ...prev]);
  };

  const deleteCrmLead = (id: string) => {
    setCrmLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const addDesignProject = (project: Omit<DesignProject, 'id'>) => {
    const newProj: DesignProject = {
      ...project,
      id: 'des-' + Date.now()
    };
    setDesignProjects((prev) => [newProj, ...prev]);
  };

  const login = (
    email?: string,
    name?: string,
    role?: string,
    department: User['department'] = 'Sales'
  ) => {
    const nextUser = userFromSession(email, name, role, department);
    const portal: 'crm' | 'design' = department === 'Design' ? 'design' : 'crm';
    setCurrentUser(nextUser);
    setLoginPortal(portal);
    setIsAuthenticated(true);
    try {
      if (typeof window !== 'undefined') {
        const savedSession = JSON.stringify({
          email: nextUser.email,
          name: nextUser.name,
          role: nextUser.role,
          department: nextUser.department,
          portal,
          timestamp: Date.now(),
        });
        window.sessionStorage.setItem(HALLWAY_SESSION_KEY, savedSession);
        window.localStorage.setItem(HALLWAY_SESSION_KEY, savedSession);
        window.localStorage.removeItem('hallway_session');
      }
    } catch {
      // ignore
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setLoginPortal('crm');
    setCurrentUser(currentUserMock);
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(HALLWAY_SESSION_KEY);
        window.localStorage.removeItem(HALLWAY_SESSION_KEY);
        window.localStorage.removeItem('hallway_session');
      }
    } catch {
      // ignore
    }
    clearCrmSession();
    clearDesignHandoff();
  };

  const switchUser = (target?: 'admin' | 'crm' | 'design') => {
    if (target === 'design') {
      setCurrentUser(designerUserMock);
      setLoginPortal('design');
    } else if (target === 'crm') {
      setCurrentUser(alternateUserMock);
      setLoginPortal('crm');
    } else {
      if (currentUser.id === 'u1') {
        setCurrentUser(alternateUserMock);
        setLoginPortal('crm');
      } else if (currentUser.id === 'u2') {
        setCurrentUser(designerUserMock);
        setLoginPortal('design');
      } else {
        setCurrentUser(currentUserMock);
        setLoginPortal('crm');
      }
    }
  };

  const simulateDynamicDeal = async (params: {
    scenarioNumber: number;
    repName: string;
    branchName: string;
    amount: string;
    projectTag?: string;
    customDetails?: string;
  }): Promise<FeedPost> => {
    const post = createDynamicCrmAnnouncement({
      scenarioNumber: params.scenarioNumber,
      repName: params.repName,
      branch: params.branchName,
      amount: params.amount,
      projectTag: params.projectTag,
      customDetails: params.customDetails,
    });

    try {
      const apiUrl = HALLWAY_LOCAL_API || '/api';
      await fetch(`${apiUrl}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: post.title,
          content: post.content,
          type: post.type,
          department: 'Sales',
          quotaProgress: post.quotaProgress,
          author: {
            ...post.author,
            role: currentUser.role || 'CRM_LEAD',
          },
          iconEmoji: post.iconEmoji,
          categoryColor: post.categoryColor,
        }),
      });
    } catch (err) {
      console.warn('Could not persist simulated deal to backend DB:', err);
    }

    setAnnouncementPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
    setFeedPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
    return post;
  };

  const emptyCampaign = (): ActiveCampaign => ({
    id: '',
    title: '',
    branchName: '',
    description: '',
    voucherCode: '',
    discountPercent: '',
    targetDate: '',
    isActive: false,
  });

  const sameCampaign = (a: ActiveCampaign, b: ActiveCampaign) =>
    a.id === b.id &&
    a.title === b.title &&
    a.branchName === b.branchName &&
    a.description === b.description &&
    a.voucherCode === b.voucherCode &&
    a.discountPercent === b.discountPercent &&
    a.targetDate === b.targetDate &&
    a.isActive === b.isActive;

  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaign>(emptyCampaign);
  const campaignLoadGen = useRef(0);

  /** Company-wide campaign from hallway_db — same for every member/device. */
  const loadActiveCampaign = async () => {
    const gen = campaignLoadGen.current;
    const apiUrl = HALLWAY_LOCAL_API || '/api';
    try {
      const res = await fetch(`${apiUrl}/campaign`, { cache: 'no-store' });
      if (!res.ok || gen !== campaignLoadGen.current) return;
      const data = await res.json();
      if (gen !== campaignLoadGen.current) return;
      const next: ActiveCampaign =
        !data?.title || data.isActive === false
          ? emptyCampaign()
          : {
              id: data.id || 'camp-company-active',
              title: data.title,
              branchName: data.branchName || '',
              description: data.description || '',
              voucherCode: data.voucherCode || '',
              discountPercent: data.discountPercent || '',
              targetDate: data.targetDate || '',
              isActive: true,
            };
      setActiveCampaign((prev) => (sameCampaign(prev, next) ? prev : next));
    } catch {
      // keep current state if offline
    }
  };

  useEffect(() => {
    void loadActiveCampaign();
  }, []);

  const updateActiveCampaign = async (
    updated: Partial<ActiveCampaign>
  ): Promise<{ ok: boolean; error?: string }> => {
    const gen = ++campaignLoadGen.current;
    const apiUrl = HALLWAY_LOCAL_API || '/api';
    try {
      const res = await fetch(`${apiUrl}/campaign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'camp-company-active',
          title: updated.title,
          branchName: updated.branchName,
          description: updated.description,
          voucherCode: updated.voucherCode,
          discountPercent: updated.discountPercent,
          targetDate: updated.targetDate,
          isActive: true,
          actor: {
            name: currentUser?.name,
            email: currentUser?.email,
            role: currentUser?.role,
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.campaign?.title) {
        campaignLoadGen.current = gen + 1;
        void loadActiveCampaign();
        return {
          ok: false,
          error: data?.error || 'Could not save the campaign.',
        };
      }
      campaignLoadGen.current = gen + 1;
      setActiveCampaign({
        id: data.campaign.id || 'camp-company-active',
        title: data.campaign.title,
        branchName: data.campaign.branchName || '',
        description: data.campaign.description || '',
        voucherCode: data.campaign.voucherCode || '',
        discountPercent: data.campaign.discountPercent || '',
        targetDate: data.campaign.targetDate || '',
        isActive: data.campaign.isActive !== false,
      });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Could not save the campaign.' };
    }
  };

  /** Read = dismiss: drop from inbox. Source data stays on Hallway; notif is not stored. */
  const markNotificationRead = (id: string) => {
    setDismissedNotificationIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      persistDismissedNotificationIds(next);
      return next;
    });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllNotificationsRead = () => {
    setDismissedNotificationIds((prev) => {
      const next = new Set(prev);
      for (const n of notifications) next.add(n.id);
      persistDismissedNotificationIds(next);
      return next;
    });
    setNotifications([]);
  };

  const clearNotifications = markAllNotificationsRead;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        theme,
        toggleTheme,
        isAuthenticated,
        authReady,
        loginPortal,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        isSidebarHovered,
        setIsSidebarHovered,
        activeDepartment,
        setActiveDepartment,
        searchQuery,
        setSearchQuery,
        feedPosts,
        announcementPosts,
        announcementsLoading,
        addReaction,
        addComment,
        likeComment,
        refreshFeed,
        addNewPost,
        deleteAnnouncement,
        deleteComment,
        actionItems,
        toggleActionItem,
        crmLeads,
        addCrmLead,
        deleteCrmLead,
        designProjects,
        addDesignProject,
        login,
        logout,
        switchUser,
        notifications,
        notificationsCount,
        markAllNotificationsRead,
        markNotificationRead,
        clearNotifications,
        activeTimeframe,
        setActiveTimeframe,
        activeLeaderboardView,
        setActiveLeaderboardView,
        simulateDynamicDeal,
        activeCampaign,
        updateActiveCampaign
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
