'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User,
  FeedPost,
  ActionItem,
  CrmLeadItem,
  DesignProject,
  ActiveCampaign
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
import { fetchFeed, fetchTargets, clearCrmSession, fetchLeaderboard, fetchPeople, fetchRecords } from '../lib/crmApi';
import { generateCrmAnnouncements, formatInrToLakhsOrCrores, createDynamicCrmAnnouncement } from '../lib/crmAnnouncementsGenerator';
import { clearDesignHandoff } from '../lib/modulePortals';
import { isTodayOrYesterday, cleanPostContent, getYesterdayYmd, formatPersonName } from '../lib/hallwayDisplay';

function mergeReactions(serverReactions?: any, localReactions?: any) {
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
  };
  const base = { ...blank, ...(serverReactions || {}) };
  if (!localReactions) return base;

  const reactionKeys = [
    'thumbsUp', 'clap', 'heart', 'joy', 'surprised', 'pray',
    'fire', 'party', 'hundred', 'rocket'
  ] as const;
  for (const k of reactionKeys) {
    const userK = `user${k.charAt(0).toUpperCase()}${k.slice(1)}`;
    if (localReactions[userK] !== undefined) {
      base[userK] = localReactions[userK];
    }
    base[k] = Math.max(Number(base[k]) || 0, Number(localReactions[k]) || 0);
  }
  return base;
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
  notificationsCount: number;
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
  updateActiveCampaign: (campaign: Partial<ActiveCampaign>) => void;
}

const HALLWAY_SESSION_KEY = 'hallway-auth';
const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours shift expiry
const HALLWAY_LOCAL_API = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/$/, '');

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
  const announcementPostsRef = useRef<FeedPost[]>(announcementPosts);
  announcementPostsRef.current = announcementPosts;
  const [actionItems, setActionItems] = useState<ActionItem[]>(actionItemsMock);
  const [crmLeads, setCrmLeads] = useState<CrmLeadItem[]>(crmLeadsMock);
  const [designProjects, setDesignProjects] = useState<DesignProject[]>(designProjectsMock);
  const [notificationsCount, setNotificationsCount] = useState<number>(0);
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

  // Restore Hallway session before showing corridors
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        // Purge legacy persistent localStorage sessions to prevent unauthenticated direct entry
        window.localStorage.removeItem(HALLWAY_SESSION_KEY);
        window.localStorage.removeItem('hallway_session');

        const raw = window.sessionStorage.getItem(HALLWAY_SESSION_KEY);
        if (raw) {
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

          if (!isExpired && (saved.email || saved.name)) {
            setCurrentUser(userFromSession(saved.email, saved.name, saved.role, saved.department));
            setLoginPortal(saved.portal || (saved.department === 'Design' ? 'design' : 'crm'));
            setIsAuthenticated(true);
          } else {
            window.sessionStorage.removeItem(HALLWAY_SESSION_KEY);
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      }
    } catch {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(HALLWAY_SESSION_KEY);
      }
      setIsAuthenticated(false);
    } finally {
      setAuthReady(true);
    }
  }, []);

  // Fetch announcements and live CRM targets / bookings
  const refreshFeed = async () => {
    try {
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

      const [
        announcementsData,
        crmItems,
        overallTargetsData,
        leaderboardData,
        crmPeopleData,
        crmRecordsData,
        ...branchTargetsArrays
      ] = await Promise.all([
        announcementsPromise,
        crmFeedPromise,
        crmTargetsPromise,
        crmLeaderboardPromise,
        crmPeoplePromise,
        crmRecordsPromise,
        ...branchTargetPromises,
      ]);

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

      // 1. Target Data Processing:
      // a. Company-wide "All Hubs (Overall)" target data first
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
      } else {
        // Resilient fallback for All Hubs pacing
        overallTargets.push({
          branchId: 'all',
          branchName: 'All Hubs (Overall)',
          team: 'Operations HQ',
          title: 'Monthly Target',
          current: '₹1.48 Cr',
          target: '₹6.60 Cr',
          progress: 22.4,
          currentInr: 14800000,
          targetInr: 66000000,
        });
      }

      // b. Out of 3 branches (Sarjapura, JP Nagar, HBR), order by achieved target descending
      const branchTargets: any[] = [];
      for (const list of branchTargetsArrays) {
        if (Array.isArray(list)) branchTargets.push(...list);
      }
      if (branchTargets.length === 0) {
        branchTargets.push(
          {
            branchId: 'SARJAPUR',
            branchName: 'Sarjapura',
            team: 'Sarjapura Hub',
            title: 'Monthly Target',
            current: '₹55.40L',
            target: '₹1.20 Cr',
            progress: 46.2,
            currentInr: 5540000,
            targetInr: 12000000,
          },
          {
            branchId: 'JP_NAGAR',
            branchName: 'JP Nagar',
            team: 'JP Nagar Hub',
            title: 'Monthly Target',
            current: '₹48.77L',
            target: '₹2.40 Cr',
            progress: 20.3,
            currentInr: 4877000,
            targetInr: 24000000,
          },
          {
            branchId: 'HBR',
            branchName: 'HBR Layout',
            team: 'HBR Layout Hub',
            title: 'Monthly Target',
            current: '₹36.95L',
            target: '₹2.40 Cr',
            progress: 15.4,
            currentInr: 3695000,
            targetInr: 24000000,
          }
        );
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
              reactions: mergeReactions(prev?.reactions, p.reactions),
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
              reactions: mergeReactions(a.reactions, prev?.reactions),
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
        const reactions = mergeReactions(existing?.reactions, existingLocal?.reactions);
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

        const branchPrefix = target.branchName ? `${target.branchName}: ` : '';
        const title = `${branchPrefix}${target.title}: ${currentFormatted} achieved (${target.progress}%)`;
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
          timestamp: 'Live Pacing',
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

      // Dynamic CRM Snippets Engine (All 13 Dynamic Enterprise CRM Scenarios)
      const dynamicCrmSnippets = generateCrmAnnouncements({
        crmFeedItems: Array.isArray(crmItems) ? crmItems : [],
        overallTargets,
        branchTargets,
        topPerformers: Array.isArray(leaderboardData) ? leaderboardData : [],
        people: Array.isArray(crmPeopleData) ? crmPeopleData : [],
        records: Array.isArray(crmRecordsData) ? crmRecordsData : ((crmRecordsData as any)?.individualRecords || []),
        teamRecords: (crmRecordsData as any)?.teamRecords || [],
        existingPostsMap: currentPostsMap,
      });

      // 3. Announcements Page Feed (HUB Live Feed Snippets Engine)
      // Excludes repeating raw target cards (crm-target-*) and legacy mock bookings, displaying rich dynamic CRM announcement snippets!
      const announcementBroadcasts: FeedPost[] = [];
      if (Array.isArray(announcementsData)) {
        for (const post of announcementsData) {
          const pId = String(post.id || '').toLowerCase();
          const pTitle = String(post.title || '').toLowerCase();
          const pContent = String(post.content || '').toLowerCase();

          // Reject legacy dummy/mock posts
          if (
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
          const reactions = mergeReactions(post.reactions, existingLocal?.reactions);
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
      }

      // Merge broadcast announcements + CRM snippet engine
      const announcementPostsMap = new Map<string, FeedPost>();

      // 1. Dynamic CRM Snippets (Priti Dutta, milestones, records): preserve rich generated copy while merging DB and in-memory reactions/comments
      for (const s of dynamicCrmSnippets) {
        const dbPost = announcementsMap.get(s.id);
        const localPost = currentPostsMap.get(s.id);
        const reactions = mergeReactions(s.reactions, mergeReactions(dbPost?.reactions, localPost?.reactions));
        const comments = mergeComments(s.comments, mergeComments(dbPost?.comments, localPost?.comments));
        announcementPostsMap.set(s.id, {
          ...s,
          reactions,
          comments,
          commentsCount: Math.max(s.commentsCount || 0, comments.length),
        });
      }

      // 2. User broadcast announcements from database
      for (const b of announcementBroadcasts) {
        if (announcementPostsMap.has(b.id)) {
          const existing = announcementPostsMap.get(b.id)!;
          announcementPostsMap.set(b.id, {
            ...existing,
            reactions: mergeReactions(existing.reactions, b.reactions),
            comments: mergeComments(existing.comments, b.comments),
            commentsCount: Math.max(existing.commentsCount, b.comments?.length || 0),
          });
        } else {
          announcementPostsMap.set(b.id, b);
        }
      }

      // 3. Preserve any in-memory newly created broadcast posts
      if (Array.isArray(announcementPostsRef.current)) {
        for (const p of announcementPostsRef.current) {
          if (p?.id && !announcementPostsMap.has(p.id)) {
            announcementPostsMap.set(p.id, p);
          }
        }
      }

      const combinedAnnouncements = Array.from(announcementPostsMap.values()).sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        return tB - tA;
      });

      setAnnouncementPosts(combinedAnnouncements);
    } catch {
      // Offline fallback preserved in state
    }
  };

  // Initial load, periodic background polling (every 25s), and tab focus re-sync
  useEffect(() => {
    void refreshFeed();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refreshFeed();
      }
    }, 25000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshFeed();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

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

    // Optimistic UI update for both feeds
    const updatePost = (post: FeedPost) => {
      if (post.id !== postId) return post;
      const userKey = 'user' + reactionType.charAt(0).toUpperCase() + reactionType.slice(1);
      const alreadyReacted = Boolean(post.reactions[userKey]);
      const currentCount = post.reactions[reactionType] || 0;

      return {
        ...post,
        reactions: {
          ...post.reactions,
          [reactionType]: Math.max(0, currentCount + (alreadyReacted ? -1 : 1)),
          [userKey]: !alreadyReacted,
        },
      };
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
              reactions: {
                ...post.reactions,
                ...data.reactions,
              },
            };
          };
          setFeedPosts((prev) => prev.map(syncReactionPost));
          setAnnouncementPosts((prev) => prev.map(syncReactionPost));
        }
      }
    } catch {
      // Silent catch for offline
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
      }
    } catch {
      // Offline fallback preserved in state
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
      performer: '#F59E0B',
      announcement: '#EF4444',
      general: '#3B82F6'
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

    const apiUrl = HALLWAY_LOCAL_API || '/api';
    try {
      const res = await fetch(`${apiUrl}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          type,
          department,
          author,
          quotaProgress: quotaProgress || null
        })
      });
      if (res.ok) {
        const created: FeedPost = await res.json();
        const postWithDate: FeedPost = {
          ...created,
          createdAt: created.createdAt || nowIso
        };
        setFeedPosts((prev) => [postWithDate, ...prev.filter((p) => p.id !== newPost.id && p.id !== created.id)]);
        setAnnouncementPosts((prev) => [postWithDate, ...prev.filter((p) => p.id !== newPost.id && p.id !== created.id)]);
        return postWithDate;
      }
    } catch (err) {
      console.error('Failed to post announcement to server:', err);
    }
    return newPost;
  };

  const deleteAnnouncement = async (postId: string): Promise<boolean> => {
    setFeedPosts((prev) => prev.filter((p) => p.id !== postId));
    setAnnouncementPosts((prev) => prev.filter((p) => p.id !== postId));

    try {
      const res = await fetch(`${HALLWAY_LOCAL_API}/announcements/${postId}`, {
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
        window.sessionStorage.setItem(
          HALLWAY_SESSION_KEY,
          JSON.stringify({
            email: nextUser.email,
            name: nextUser.name,
            role: nextUser.role,
            department: nextUser.department,
            portal,
            timestamp: Date.now(),
          })
        );
        // Ensure localStorage is cleared of persistent sessions
        window.localStorage.removeItem(HALLWAY_SESSION_KEY);
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

  const [activeCampaign, setActiveCampaign] = useState<ActiveCampaign>({
    id: 'camp-indiranagar-launch',
    title: 'Indiranagar Launch Boost',
    branchName: 'Indiranagar Branch',
    description: 'Exclusive limited-time discount for all new client deals closed in the new Indiranagar branch before Sunday night.',
    voucherCode: 'INDIRA10',
    discountPercent: '10% OFF',
    targetDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000).toISOString(),
    isActive: true,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hallway_active_campaign');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.title) {
            setActiveCampaign(parsed);
          }
        } catch {
          // fallback to default
        }
      }
    }
  }, []);

  const updateActiveCampaign = (updated: Partial<ActiveCampaign>) => {
    setActiveCampaign((prev) => {
      const next = { ...prev, ...updated };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('hallway_active_campaign', JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  };

  const clearNotifications = () => {
    setNotificationsCount(0);
  };

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
        notificationsCount,
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
