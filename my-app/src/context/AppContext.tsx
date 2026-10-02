'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User,
  FeedPost,
  ActionItem,
  CrmLeadItem,
  DesignProject
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
import { fetchFeed, fetchTargets, clearCrmSession, fetchLeaderboard, fetchPeople } from '../lib/crmApi';
import { generateCrmAnnouncements, formatInrToLakhsOrCrores } from '../lib/crmAnnouncementsGenerator';
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
    userThumbsUp: false,
    userClap: false,
    userHeart: false,
    userJoy: false,
    userSurprised: false,
    userPray: false,
  };
  const base = { ...blank, ...(serverReactions || {}) };
  if (!localReactions) return base;

  const reactionKeys = ['thumbsUp', 'clap', 'heart', 'joy', 'surprised', 'pray'] as const;
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
    author?: { name: string; avatar: string; team: string }
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

function resolveCrmAvatar(name?: string): string {
  if (!name) return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80';
  const lower = name.toLowerCase();
  if (lower.includes('meghana')) return 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80';
  if (lower.includes('shaddisha')) return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  if (lower.includes('aman')) return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80';
  if (lower.includes('sharanya')) return 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80';
  if (lower.includes('danush')) return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80';
  if (lower.includes('jayashree')) return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80';
  if (lower.includes('somashekar')) return 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80';
  if (lower.includes('bilal')) return 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80';
  return 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
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

      // Non-blocking pre-warm for People & Operating Directory and sync verified profile details
      fetchPeople('', {})
        .then((res) => {
          if (res?.people?.length && currentUser?.name) {
            const rawTarget = (currentUser.email || currentUser.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const match = res.people.find((p) => {
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
        })
        .catch(() => null);

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

      const [announcementsData, crmItems, overallTargetsData, leaderboardData, ...branchTargetsArrays] = await Promise.all([
        announcementsPromise,
        crmFeedPromise,
        crmTargetsPromise,
        crmLeaderboardPromise,
        ...branchTargetPromises,
      ]);

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
            avatar:
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
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

      // 2. Latest News items:
      const newsPosts: FeedPost[] = [];

      // a. Broadcast announcements (filtered to today and 1 day before)
      if (Array.isArray(announcementsData)) {
        for (const post of announcementsData) {
          if (!seenIds.has(post.id)) {
            if (
              post.id?.startsWith('crm-token-') ||
              post.id?.startsWith('crm-event-') ||
              post.title?.toLowerCase().startsWith('new token') ||
              post.title?.toLowerCase().includes('client consultation') ||
              post.title?.toLowerCase().includes('virtual meeting') ||
              post.title?.toLowerCase().includes('showroom visit') ||
              post.id === 'announcement-yesterday-1' ||
              post.id === 'performer-yesterday-1' ||
              post.title?.toLowerCase().includes('townhall scheduled') ||
              post.title?.toLowerCase().includes('sarah jenkins')
            ) {
              continue;
            }
            if (!isTodayOrYesterday(post.createdAt, post.timestamp)) {
              continue;
            }
            const existingLocal = currentPostsMap.get(post.id);
            const reactions = mergeReactions(post.reactions, existingLocal?.reactions);
            const comments = mergeComments(post.comments, existingLocal?.comments);
            const commentsCount = Math.max(post.comments?.length || post.commentsCount || 0, comments.length, existingLocal?.commentsCount || 0);

            newsPosts.push({
              ...post,
              content: cleanPostContent(post.content),
              reactions,
              commentsCount,
              comments,
            });
            seenIds.add(post.id);
          }
        }
      }

      // 2. Dashboard News items (Live CRM bookings today/yesterday + yesterday's seed + broadcasts)
      const dashboardNewsPosts: FeedPost[] = [];

      // a. Broadcast announcements (filtered to today and 1 day before)
      if (Array.isArray(announcementsData)) {
        for (const post of announcementsData) {
          if (!seenIds.has(post.id)) {
            if (
              post.id?.startsWith('crm-token-') ||
              post.id?.startsWith('crm-event-') ||
              post.title?.toLowerCase().startsWith('new token') ||
              post.title?.toLowerCase().includes('client consultation') ||
              post.title?.toLowerCase().includes('virtual meeting') ||
              post.title?.toLowerCase().includes('showroom visit') ||
              post.id === 'announcement-yesterday-1' ||
              post.id === 'performer-yesterday-1' ||
              post.title?.toLowerCase().includes('townhall scheduled') ||
              post.title?.toLowerCase().includes('sarah jenkins')
            ) {
              continue;
            }
            if (!isTodayOrYesterday(post.createdAt, post.timestamp)) {
              continue;
            }
            const existingLocal = currentPostsMap.get(post.id);
            const reactions = mergeReactions(post.reactions, existingLocal?.reactions);
            const comments = mergeComments(post.comments, existingLocal?.comments);
            const commentsCount = Math.max(post.comments?.length || post.commentsCount || 0, comments.length, existingLocal?.commentsCount || 0);

            dashboardNewsPosts.push({
              ...post,
              content: cleanPostContent(post.content),
              reactions,
              commentsCount,
              comments,
            });
            seenIds.add(post.id);
          }
        }
      }

      // b. Real Live CRM Closed Deal Bookings for Dashboard (formatted as standard gross booking)
      if (Array.isArray(crmItems) && crmItems.length > 0) {
        for (const item of crmItems) {
          if (
            item.type === 'token' ||
            item.id?.startsWith('token-') ||
            item.title?.toLowerCase().includes('token')
          ) {
            continue;
          }

          if (!isTodayOrYesterday(item.createdAt, item.timestamp)) {
            continue;
          }

          const id = `crm-${item.id}`;
          if (seenIds.has(id)) continue;
          const existing = announcementsMap.get(id);
          const existingLocal = currentPostsMap.get(id);
          const reactions = mergeReactions(existing?.reactions, existingLocal?.reactions);
          const comments = mergeComments(existing?.comments, existingLocal?.comments);
          const commentsCount = Math.max(existing?.commentsCount || 0, comments.length, existingLocal?.commentsCount || 0);

          const authorName = item.author?.name || 'Sales Executive';
          const authorTeam = formatBranchName(item.author?.team);
          const avatar = item.author?.avatar || resolveCrmAvatar(authorName);

          dashboardNewsPosts.push({
            id,
            type: item.type === 'quota' ? 'quota' : item.type === 'performer' ? 'performer' : 'booking',
            categoryColor:
              item.type === 'quota'
                ? '#8B5CF6'
                : item.type === 'performer'
                ? '#F59E0B'
                : '#10B981',
            title: item.title ? item.title.replace(/^New booking/i, 'Gross booking') : item.title,
            timestamp: item.timestamp || 'Recent deal',
            createdAt: item.createdAt || new Date().toISOString(),
            author: {
              name: authorName,
              avatar,
              team: authorTeam,
            },
            content: cleanPostContent(item.content),
            reactions,
            commentsCount,
            comments,
            department: (item.department as any) || 'Sales',
          });
          seenIds.add(id);
        }
      }

      // c. Yesterday's dynamic CRM gross bookings seed for Dashboard
      const yesterdayDateStr = getYesterdayYmd();
      const yesterdayNewsSeed = [
        {
          id: 'deal-yesterday-1',
          type: 'booking' as const,
          categoryColor: '#10B981',
          title: 'Gross booking · ₹90,259 · Jayashree',
          timestamp: 'Yesterday',
          createdAt: `${yesterdayDateStr}T17:45:00.000Z`,
          author: {
            name: 'Jayashree',
            avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
            team: 'Sarjapura',
          },
          content: 'Sreeraj Alakkassery · handled by Jayashree',
          department: 'Sales' as const,
        },
        {
          id: 'deal-yesterday-2',
          type: 'booking' as const,
          categoryColor: '#10B981',
          title: 'Gross booking · ₹54,329 · Jayashree',
          timestamp: 'Yesterday',
          createdAt: `${yesterdayDateStr}T15:20:00.000Z`,
          author: {
            name: 'Jayashree',
            avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
            team: 'Sarjapura',
          },
          content: 'Nagaraju Nalam · handled by Jayashree',
          department: 'Sales' as const,
        },
        {
          id: 'deal-yesterday-3',
          type: 'booking' as const,
          categoryColor: '#10B981',
          title: 'Gross booking · ₹18,717 · Akhil Issac',
          timestamp: 'Yesterday',
          createdAt: `${yesterdayDateStr}T12:10:00.000Z`,
          author: {
            name: 'Akhil Issac',
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
            team: 'HBR',
          },
          content: 'Thesnim · handled by Akhil Issac',
          department: 'Sales' as const,
        },
      ];

      for (const item of yesterdayNewsSeed) {
        if (!seenIds.has(item.id)) {
          const existing = announcementsMap.get(item.id);
          const existingLocal = currentPostsMap.get(item.id);
          const reactions = mergeReactions(existing?.reactions, existingLocal?.reactions);
          const comments = mergeComments(existing?.comments, existingLocal?.comments);
          const commentsCount = Math.max(existing?.commentsCount || 0, comments.length, existingLocal?.commentsCount || 0);

          dashboardNewsPosts.push({
            ...item,
            reactions,
            commentsCount,
            comments,
          });
          seenIds.add(item.id);
        }
      }

      // Sort dashboard news posts strictly in descending order
      dashboardNewsPosts.sort((a, b) => {
        const getTime = (p: FeedPost) => {
          if (p.createdAt) {
            const t = new Date(p.createdAt).getTime();
            if (!isNaN(t)) return t;
          }
          if (p.timestamp) {
            const t = new Date(p.timestamp).getTime();
            if (!isNaN(t)) return t;
          }
          if (p.id?.startsWith('post-')) {
            const num = Number(p.id.replace('post-', ''));
            if (!isNaN(num)) return num;
          }
          return 0;
        };
        return getTime(b) - getTime(a);
      });

      // Dashboard gets targets first (All Hubs -> sorted branches), then dashboard news
      setFeedPosts([...targetPosts, ...dashboardNewsPosts]);

      // 3. Announcements Page Feed (HUB Live Feed Snippets Engine)
      // Excludes repeating raw target cards (crm-target-*), and displays rich dynamic CRM announcement snippets!
      const announcementBroadcasts: FeedPost[] = [];
      if (Array.isArray(announcementsData)) {
        for (const post of announcementsData) {
          if (
            post.id?.startsWith('crm-token-') ||
            post.id?.startsWith('crm-event-') ||
            post.title?.toLowerCase().startsWith('new token') ||
            post.title?.toLowerCase().includes('client consultation') ||
            post.title?.toLowerCase().includes('virtual meeting') ||
            post.title?.toLowerCase().includes('showroom visit') ||
            post.id === 'announcement-yesterday-1' ||
            post.id === 'performer-yesterday-1' ||
            post.title?.toLowerCase().includes('townhall scheduled') ||
            post.title?.toLowerCase().includes('sarah jenkins')
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

      // Dynamic CRM Snippets Engine (Scenario 1, 2, 3, 4, 5, 6, 7, 9, 10, 16, 23)
      const dynamicCrmSnippets = generateCrmAnnouncements({
        crmFeedItems: Array.isArray(crmItems) ? crmItems : [],
        overallTargets,
        branchTargets,
        topPerformers: Array.isArray(leaderboardData) ? leaderboardData : [],
        existingPostsMap: currentPostsMap,
      });

      // Merge broadcast announcements + CRM snippet engine
      const announcementPostsMap = new Map<string, FeedPost>();
      for (const b of announcementBroadcasts) {
        announcementPostsMap.set(b.id, b);
      }
      for (const s of dynamicCrmSnippets) {
        if (!announcementPostsMap.has(s.id)) {
          announcementPostsMap.set(s.id, s);
        }
      }

      const combinedAnnouncements = Array.from(announcementPostsMap.values()).sort((a, b) => {
        // Broadcasts (created via modal) take top priority
        const isBroadcastA = a.id?.startsWith('post-');
        const isBroadcastB = b.id?.startsWith('post-');
        if (isBroadcastA && !isBroadcastB) return -1;
        if (!isBroadcastA && isBroadcastB) return 1;

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
    if (!isAuthenticated) return;
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
  }, [isAuthenticated]);

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
          setFeedPosts((prev) =>
            prev.map((post) => {
              if (post.id !== postId) return post;
              return {
                ...post,
                reactions: {
                  ...post.reactions,
                  ...data.reactions,
                },
              };
            })
          );
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

    const targetPost = feedPosts.find((p) => p.id === postId);
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
          setFeedPosts((prev) =>
            prev.map((p) => (p.id === postId ? data.announcement : p))
          );
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
        setActiveLeaderboardView
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
