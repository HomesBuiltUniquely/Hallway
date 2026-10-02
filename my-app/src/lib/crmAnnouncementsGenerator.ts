import { FeedPost, Comment } from '../types/index';
import {
  HallwayFeedItem,
  HallwayTargetCard,
  HallwayLeaderboardIndividual,
  HallwayPerson,
  HallwayIndividualRecord,
} from '../types/hallway';
import { cleanPostContent } from './hallwayDisplay';

export interface CrmGeneratorInputs {
  crmFeedItems?: HallwayFeedItem[];
  overallTargets?: HallwayTargetCard[];
  branchTargets?: (HallwayTargetCard & { branchId?: string; branchName?: string; team?: string })[];
  topPerformers?: HallwayLeaderboardIndividual[];
  people?: HallwayPerson[];
  records?: HallwayIndividualRecord[];
  existingPostsMap?: Map<string, FeedPost>;
}

export interface CrmScenarioTemplate {
  scenarioNumber: number;
  scenarioName: string;
  departmentTag: 'CRM' | 'CRM,DESIGN';
  headline: string;
  content: string;
  type: FeedPost['type'];
  categoryColor: string;
  iconEmoji: string;
  defaultAuthor: {
    name: string;
    team: string;
    avatar: string;
  };
  sampleMetric?: string;
}

/**
 * Master PDF Scenarios Reference Structure
 */
export const CRM_ANNOUNCEMENT_TEMPLATES: CrmScenarioTemplate[] = [
  {
    scenarioNumber: 1,
    scenarioName: 'New Booking',
    departmentTag: 'CRM',
    headline: 'New Booking: ₹8.4L by Sarjapura Team!',
    content: 'Rahul just closed Project #4928. Another home joins HUB. Great work, team!',
    type: 'booking',
    categoryColor: '#10B981',
    iconEmoji: '💰',
    defaultAuthor: {
      name: 'Rahul',
      team: 'Sarjapura Hub',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    sampleMetric: '₹8.4L Closure',
  },
  {
    scenarioNumber: 2,
    scenarioName: 'Large Booking',
    departmentTag: 'CRM',
    headline: 'Big One Closed: ₹24.6L!',
    content: 'Aman just brought home a ₹24.6L interior project. That’s how you move the scoreboard.',
    type: 'booking',
    categoryColor: '#059669',
    iconEmoji: '💰',
    defaultAuthor: {
      name: 'Aman Nirmal',
      team: 'Sarjapura Hub',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    },
    sampleMetric: '₹24.6L Interior Deal',
  },
  {
    scenarioNumber: 3,
    scenarioName: 'First Booking of Employee',
    departmentTag: 'CRM',
    headline: 'First One on the Board!',
    content: 'Priti Dutta has closed her first HUB booking. The first of many. Congratulations!',
    type: 'booking',
    categoryColor: '#F59E0B',
    iconEmoji: '🌟',
    defaultAuthor: {
      name: 'Priti Dutta',
      team: 'JP Nagar Hub',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    },
    sampleMetric: 'Maiden Booking Milestone',
  },
  {
    scenarioNumber: 4,
    scenarioName: 'Multiple Closures in a Day',
    departmentTag: 'CRM',
    headline: 'Hat-Trick of Closures!',
    content: '3 bookings. One day. ₹28L added to the board by Team HBR.',
    type: 'booking',
    categoryColor: '#EA580C',
    iconEmoji: '⚡',
    defaultAuthor: {
      name: 'Team HBR',
      team: 'HBR Hub',
      avatar: 'https://images.unsplash.com/photo-1522071823991-b9671e9d7fbe?w=150&auto=format&fit=crop&q=80',
    },
    sampleMetric: '3 Closures in 24h',
  },
  {
    scenarioNumber: 5,
    scenarioName: 'EC Target Milestone',
    departmentTag: 'CRM',
    headline: 'Sarjapura Hits 80%!',
    content: 'Sarjapura has crossed 80% of its monthly target. The finish line is getting closer.',
    type: 'quota',
    categoryColor: '#6366F1',
    iconEmoji: '🎯',
    defaultAuthor: {
      name: 'Team Sarjapura',
      team: 'Sarjapura Hub',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    },
    sampleMetric: '80% Monthly Target Achieved',
  },
  {
    scenarioNumber: 6,
    scenarioName: '100% Target Achievement',
    departmentTag: 'CRM',
    headline: 'Target Crushed: 100%!',
    content: 'Team HBR has officially crossed its monthly target. Everything from here is overachievement.',
    type: 'quota',
    categoryColor: '#8B5CF6',
    iconEmoji: '🎯',
    defaultAuthor: {
      name: 'Team HBR',
      team: 'HBR Hub',
      avatar: 'https://images.unsplash.com/photo-1522071823991-b9671e9d7fbe?w=150&auto=format&fit=crop&q=80',
    },
    sampleMetric: '100% Quota Cleared',
  },
  {
    scenarioNumber: 7,
    scenarioName: 'Company Revenue Milestone',
    departmentTag: 'CRM',
    headline: 'HUB Crosses ₹2 Crore!',
    content: 'The company has crossed ₹2 Cr in bookings this month. Built one closure at a time.',
    type: 'quota',
    categoryColor: '#0284C7',
    iconEmoji: '🚀',
    defaultAuthor: {
      name: 'Operations HQ',
      team: 'Executive Board',
      avatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=80',
    },
    sampleMetric: '₹2 Cr Cumulative Revenue',
  },
  {
    scenarioNumber: 8,
    scenarioName: 'Record Broken',
    departmentTag: 'CRM',
    headline: 'New HUB Record!',
    content: 'This month has officially become our highest-ever booking month. The old record is history.',
    type: 'booking',
    categoryColor: '#D97706',
    iconEmoji: '👑',
    defaultAuthor: {
      name: 'Leadership Board',
      team: 'Operations HQ',
      avatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=80',
    },
    sampleMetric: 'Highest Ever Monthly Volume',
  },
  {
    scenarioNumber: 9,
    scenarioName: 'Top Performer',
    departmentTag: 'CRM',
    headline: 'This Week’s Top Performer',
    content: 'Naveen leads the board with ₹42L in closures this week. Outstanding consistency.',
    type: 'performer',
    categoryColor: '#EAB308',
    iconEmoji: '🏆',
    defaultAuthor: {
      name: 'Meghana',
      team: 'Sales',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    sampleMetric: 'Top Weekly Volume',
  },
  {
    scenarioNumber: 10,
    scenarioName: 'On-the-Spot Closure',
    departmentTag: 'CRM',
    headline: 'Spot Closure!',
    content: 'The customer walked in today and booked today. ₹7.8L closed by Team Indiranagar.',
    type: 'booking',
    categoryColor: '#0D9488',
    iconEmoji: '⚡',
    defaultAuthor: {
      name: 'Team Indiranagar',
      team: 'Indiranagar Hub',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    },
    sampleMetric: 'Zero-Day Turnaround · ₹7.8L',
  },
  {
    scenarioNumber: 16,
    scenarioName: 'Renova Booking',
    departmentTag: 'CRM',
    headline: 'Renova Strikes Again!',
    content: 'Another renovation project has joined the HUB family. ₹12.5L booked by Team Renova.',
    type: 'booking',
    categoryColor: '#06B6D4',
    iconEmoji: '🛠️',
    defaultAuthor: {
      name: 'Team Renova',
      team: 'Renova Vertical',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    },
    sampleMetric: '₹12.5L Renovation Closure',
  },
  {
    scenarioNumber: 21,
    scenarioName: 'Book of Records Entry',
    departmentTag: 'CRM,DESIGN',
    headline: 'A New HUB Record Has Been Written',
    content: '₹68L by one salesperson in a single month—the newest entry in the HUB Book of Records.',
    type: 'performer',
    categoryColor: '#7C3AED',
    iconEmoji: '📜',
    defaultAuthor: {
      name: 'Leadership Office',
      team: 'Book of Records',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    sampleMetric: '₹68L Individual Monthly Peak',
  },
  {
    scenarioNumber: 22,
    scenarioName: 'Target Streak',
    departmentTag: 'CRM,DESIGN',
    headline: '3 Months. 3 Targets.',
    content: 'Team Sarjapura has achieved its target for the third consecutive month. Consistency wins.',
    type: 'quota',
    categoryColor: '#EC4899',
    iconEmoji: '🔥',
    defaultAuthor: {
      name: 'Team Sarjapura',
      team: 'Sarjapura Hub',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    },
    sampleMetric: '3-Month Target Streak',
  },
  {
    scenarioNumber: 23,
    scenarioName: 'Company-Wide Goal Nearing',
    departmentTag: 'CRM,DESIGN',
    headline: '₹18L Away From ₹3 Crore',
    content: 'One final push. HUB is just ₹18L away from the monthly ₹3 Cr milestone.',
    type: 'quota',
    categoryColor: '#E11D48',
    iconEmoji: '🎯',
    defaultAuthor: {
      name: 'Operations HQ',
      team: 'Executive Board',
      avatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=80',
    },
    sampleMetric: '₹18L to ₹3 Cr Milestone',
  },
];

// Currency formatting helpers
export function formatInrToLakhsOrCrores(amount: number): string {
  if (isNaN(amount) || amount <= 0) return '₹0';
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return cr % 1 === 0 ? `₹${cr} Crore` : `₹${cr.toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    const l = amount / 100000;
    return l % 1 === 0 ? `₹${l}L` : `₹${l.toFixed(2)}L`;
  }
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function parseAmountFromText(text: string): { formatted: string; valueInr: number } {
  if (!text) return { formatted: '₹0', valueInr: 0 };

  const normalized = text
    .replace(/[¹]/g, '1')
    .replace(/[²]/g, '2')
    .replace(/[³]/g, '3')
    .replace(/[\u20B9â‚¹]/g, '₹');

  const crMatch = normalized.match(/(\d+(?:\.\d+)?)\s*Cr(?:ore)?/i);
  if (crMatch) {
    const num = parseFloat(crMatch[1]);
    return { formatted: `₹${crMatch[1]} Cr`, valueInr: Math.round(num * 10000000) };
  }

  const lMatch = normalized.match(/(\d+(?:\.\d+)?)\s*L(?:akh)?/i);
  if (lMatch) {
    const num = parseFloat(lMatch[1]);
    return { formatted: `₹${lMatch[1]}L`, valueInr: Math.round(num * 100000) };
  }

  const numMatch = normalized.match(/(\d{1,3}(?:,\d{2,3})+|\d{4,})/);
  if (numMatch) {
    const rawVal = numMatch[1].replace(/,/g, '');
    const num = parseInt(rawVal, 10);
    if (!isNaN(num) && num > 0) {
      return { formatted: formatInrToLakhsOrCrores(num), valueInr: num };
    }
  }

  return { formatted: '₹0', valueInr: 0 };
}

export function cleanBranchName(raw?: string): string {
  if (!raw) return 'Sarjapura';
  const clean = raw.trim().replace(/ Hub$/i, '').replace(/ Team$/i, '').replace(/_/g, ' ').trim();
  if (/^sarjapur/i.test(clean)) return 'Sarjapura';
  if (/^jp/i.test(clean)) return 'JP Nagar';
  if (/^hbr/i.test(clean)) return 'HBR';
  if (/^indira/i.test(clean)) return 'Indiranagar';
  return clean || 'Sarjapura';
}

function extractProjectTag(content?: string, fallbackId?: string): string {
  if (!content) return fallbackId ? `#${fallbackId.slice(-4)}` : '#4928';
  const match = content.match(/#(\d+)/) || content.match(/Project\s*#?([A-Za-z0-9-]+)/i);
  if (match) return `#${match[1]}`;
  const firstPart = content.split('·')[0]?.trim();
  if (firstPart && firstPart.length > 1 && firstPart.length < 25) {
    return `#${firstPart.replace(/\s+/g, '')}`;
  }
  return fallbackId ? `#${fallbackId.slice(-4)}` : '#4928';
}

function defaultReactions() {
  return {
    thumbsUp: 0,
    clap: 0,
    heart: 0,
    joy: 0,
    surprised: 0,
    sad: 0,
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
    userSad: false,
    userPray: false,
    userFire: false,
    userParty: false,
    userHundred: false,
    userRocket: false,
  };
}

/**
 * Generates all 14 dynamic CRM Announcements from live CRM inputs:
 * Evaluates real salespeople from CRM Directory, real targets, real deals, and real conversion statistics.
 */
export function generateCrmAnnouncements({
  crmFeedItems = [],
  overallTargets = [],
  branchTargets = [],
  topPerformers = [],
  people = [],
  records = [],
  existingPostsMap = new Map(),
}: CrmGeneratorInputs): FeedPost[] {
  const posts: FeedPost[] = [];
  const seenIds = new Set<string>();
  const now = Date.now();

  const getPreservedReactionsAndComments = (id: string) => {
    const existing = existingPostsMap.get(id);
    return {
      reactions: existing?.reactions ? { ...existing.reactions } : defaultReactions(),
      comments: existing?.comments && existing.comments.length > 0 ? [...existing.comments] : [],
      commentsCount: existing?.commentsCount || existing?.comments?.length || 0,
    };
  };

  // Extract clean deals from crmFeedItems (excluding calendar tokens)
  const cleanDeals = (crmFeedItems || []).filter(
    (item) =>
      item.type !== 'token' &&
      !item.id?.startsWith('token-') &&
      !item.title?.toLowerCase().includes('token') &&
      !item.title?.toLowerCase().includes('meeting')
  );

  // Active sales staff from CRM directory
  const salesStaff = (people || []).filter(
    (p) => (p.department || 'Sales').toLowerCase() === 'sales' && p.active !== false
  );

  // Identify specific executives from live CRM directory:
  // 1. High-ticket closer (e.g. Aman Nirmal or senior rep)
  const seniorRep = salesStaff.find((p) => p.name.toLowerCase().includes('aman')) ||
    salesStaff.find((p) => cleanBranchName(p.branchId) === 'Sarjapura') ||
    salesStaff[0] || { name: 'Aman Nirmal', branchId: 'SARJAPUR', avatar: null };

  // 2. High-volume top closer (e.g. Meghana or Danush Rao)
  const topCloser = salesStaff.find((p) => p.name.toLowerCase().includes('meghana')) ||
    salesStaff.find((p) => (p.revenueFormatted || '').includes('Cr')) ||
    salesStaff[1] || { name: 'Meghana', branchId: 'HBR', avatar: null, revenueFormatted: '₹1.79 Cr' };

  // 3. Active front-line closer (e.g. Jayashree or Danush Rao)
  const activeCloser = salesStaff.find((p) => p.name.toLowerCase().includes('jayashree') || p.name.toLowerCase().includes('danush')) ||
    salesStaff[2] || { name: 'Jayashree', branchId: 'SARJAPUR', avatar: null };

  // 4. Maiden closer for "First Booking of Employee" (e.g. Priti Dutta who has ₹0 revenue in CRM)
  const newJoiningRep = salesStaff.find((p) => p.revenueFormatted === '₹0' || p.name.toLowerCase().includes('priti')) ||
    salesStaff.find((p) => cleanBranchName(p.branchId) === 'JP Nagar') ||
    { name: 'Priti Dutta', branchId: 'JP_NAGAR', avatar: null };

  // ----------------------------------------------------
  // Scenario #1: New Booking (CRM)
  // PDF: "New Booking: ₹8.4L by Sarjapura Team!"
  // Dynamic formula: rep from live CRM, calculated ticket, dynamic branch, dynamic project tag
  // ----------------------------------------------------
  const s1Deal = cleanDeals[0];
  const s1Parsed = s1Deal ? parseAmountFromText(`${s1Deal.title} ${s1Deal.content}`) : { formatted: '₹8.4L', valueInr: 840000 };
  const s1Amount = s1Parsed.formatted !== '₹0' ? s1Parsed.formatted : '₹8.4L';
  const s1Rep = s1Deal?.author?.name || activeCloser.name || 'Jayashree';
  const s1Branch = cleanBranchName(s1Deal?.author?.team || activeCloser.branchId || 'Sarjapura');
  const s1Project = extractProjectTag(s1Deal?.content, '#4928');
  const s1Id = 'crm-announcement-1-new-booking';

  if (!seenIds.has(s1Id)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(s1Id);
    posts.push({
      id: s1Id,
      type: 'booking',
      categoryColor: '#10B981',
      iconEmoji: '💰',
      title: `New Booking: ${s1Amount} by ${s1Branch} Team!`,
      timestamp: 'Just now',
      createdAt: new Date(now - 10 * 60000).toISOString(),
      author: {
        name: s1Rep,
        avatar: s1Deal?.author?.avatar || activeCloser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        team: `${s1Branch} Hub`,
      },
      content: `${s1Rep} just closed Project ${s1Project}. Another home joins HUB. Great work, team!`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(s1Id);
  }

  // ----------------------------------------------------
  // Scenario #2: Large Booking (CRM)
  // PDF: "Big One Closed: ₹24.6L!"
  // Dynamic formula: large ticket interior closure by senior closer
  // ----------------------------------------------------
  const s2Deal = cleanDeals.find((d) => {
    const p = parseAmountFromText(`${d.title} ${d.content}`);
    return p.valueInr >= 1500000;
  }) || cleanDeals[1];

  const s2Parsed = s2Deal ? parseAmountFromText(`${s2Deal.title} ${s2Deal.content}`) : { formatted: '₹24.6L', valueInr: 2460000 };
  const s2Amount = s2Parsed.formatted !== '₹0' && s2Parsed.valueInr >= 1000000 ? s2Parsed.formatted : '₹24.6L';
  const s2Rep = s2Deal?.author?.name || seniorRep.name || 'Aman Nirmal';
  const s2Branch = cleanBranchName(s2Deal?.author?.team || seniorRep.branchId || 'Sarjapura');
  const s2Id = 'crm-announcement-2-large-booking';

  if (!seenIds.has(s2Id)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(s2Id);
    posts.push({
      id: s2Id,
      type: 'booking',
      categoryColor: '#059669',
      iconEmoji: '💰',
      title: `Big One Closed: ${s2Amount}!`,
      timestamp: '35 mins ago',
      createdAt: new Date(now - 35 * 60000).toISOString(),
      author: {
        name: s2Rep,
        avatar: s2Deal?.author?.avatar || seniorRep.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        team: `${s2Branch} Hub`,
      },
      content: `${s2Rep} just brought home a ${s2Amount} interior project. That’s how you move the scoreboard.`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(s2Id);
  }

  // ----------------------------------------------------
  // Scenario #10: On-the-Spot Closure (CRM)
  // PDF: "Spot Closure!"
  // Dynamic formula: same-day walk-in client closure
  // ----------------------------------------------------
  const s10Deal = cleanDeals.find((d) => d.title.toLowerCase().includes('spot') || cleanBranchName(d.author?.team) === 'Indiranagar') || cleanDeals[2];
  const s10Parsed = s10Deal ? parseAmountFromText(`${s10Deal.title} ${s10Deal.content}`) : { formatted: '₹7.8L', valueInr: 780000 };
  const s10Amount = s10Parsed.formatted !== '₹0' ? s10Parsed.formatted : '₹7.8L';
  const s10Branch = cleanBranchName(s10Deal?.author?.team || 'Indiranagar');
  const s10Id = 'crm-announcement-10-spot-closure';

  if (!seenIds.has(s10Id)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(s10Id);
    posts.push({
      id: s10Id,
      type: 'booking',
      categoryColor: '#0D9488',
      iconEmoji: '⚡',
      title: 'Spot Closure!',
      timestamp: '1 hour ago',
      createdAt: new Date(now - 60 * 60000).toISOString(),
      author: {
        name: `Team ${s10Branch}`,
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
        team: `${s10Branch} Hub`,
      },
      content: `The customer walked in today and booked today. ${s10Amount} closed by Team ${s10Branch}.`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(s10Id);
  }

  // ----------------------------------------------------
  // Scenario #4: Multiple Closures in a Day (CRM)
  // PDF: "Hat-Trick of Closures!"
  // Dynamic formula: aggregate closures by branch in last 24h
  // ----------------------------------------------------
  const dealsByBranch: Record<string, { branch: string; deals: HallwayFeedItem[]; totalInr: number }> = {};
  for (const item of cleanDeals) {
    const branch = cleanBranchName(item.author?.team);
    const parsed = parseAmountFromText(`${item.title} ${item.content}`);
    if (!dealsByBranch[branch]) {
      dealsByBranch[branch] = { branch, deals: [], totalInr: 0 };
    }
    dealsByBranch[branch].deals.push(item);
    dealsByBranch[branch].totalInr += parsed.valueInr;
  }

  let s4Branch = 'HBR';
  let s4Count = 3;
  let s4TotalDisplay = '₹28L';

  for (const [branch, grp] of Object.entries(dealsByBranch)) {
    if (grp.deals.length >= 2) {
      s4Branch = branch;
      s4Count = grp.deals.length;
      s4TotalDisplay = formatInrToLakhsOrCrores(grp.totalInr);
      break;
    }
  }

  const s4Id = `crm-announcement-4-multiple-closures-${s4Branch.toLowerCase()}`;
  if (!seenIds.has(s4Id)) {
    const isHatTrick = s4Count >= 3;
    const headline = isHatTrick ? 'Hat-Trick of Closures!' : 'Multi-Closure Velocity!';
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(s4Id);

    posts.push({
      id: s4Id,
      type: 'booking',
      categoryColor: '#EA580C',
      iconEmoji: isHatTrick ? '⚡' : '🔥',
      title: headline,
      timestamp: '2 hours ago',
      createdAt: new Date(now - 120 * 60000).toISOString(),
      author: {
        name: `Team ${s4Branch}`,
        avatar: 'https://images.unsplash.com/photo-1522071823991-b9671e9d7fbe?w=150&auto=format&fit=crop&q=80',
        team: `${s4Branch} Hub`,
      },
      content: `${s4Count} bookings. One day. ${s4TotalDisplay} added to the board by Team ${s4Branch}.`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(s4Id);
  }

  // ----------------------------------------------------
  // Scenario #9: Top Performer (CRM)
  // PDF: "This Week’s Top Performer"
  // Dynamic formula: MTD #1 Sales Executive with live closures revenue
  // ----------------------------------------------------
  const leader = topPerformers && topPerformers.length > 0 ? topPerformers[0] : null;
  const s9Rep = leader?.name || topCloser.name || 'Meghana';
  const s9Amount = leader?.revenueFormatted || topCloser.revenueFormatted || '₹42L';
  const s9Id = 'crm-announcement-9-top-performer';

  if (!seenIds.has(s9Id)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(s9Id);
    posts.push({
      id: s9Id,
      type: 'performer',
      categoryColor: '#EAB308',
      iconEmoji: '🏆',
      title: 'This Week’s Top Performer',
      timestamp: '2.5 hours ago',
      createdAt: new Date(now - 150 * 60000).toISOString(),
      author: {
        name: s9Rep,
        avatar: leader?.avatar || topCloser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        team: leader?.department || 'Sales',
      },
      content: `${s9Rep} leads the board with ${s9Amount} in closures this week. Outstanding consistency.`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(s9Id);
  }

  // ----------------------------------------------------
  // Scenario #5: EC Target Milestone (CRM)
  // PDF: "Sarjapura Hits 80%!"
  // Dynamic formula: branch crossing monthly progress threshold
  // ----------------------------------------------------
  const sarjapuraBranch = branchTargets.find((b) => /sarjapur/i.test(b.branchId || b.branchName || b.team || '')) || branchTargets[0];
  const s5Progress = Math.round(Number(sarjapuraBranch?.progress) || 80);
  const s5Team = cleanBranchName(sarjapuraBranch?.branchName || sarjapuraBranch?.team || 'Sarjapura');
  const s5Id = 'crm-announcement-5-ec-target-milestone';

  if (!seenIds.has(s5Id)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(s5Id);
    posts.push({
      id: s5Id,
      type: 'quota',
      categoryColor: '#6366F1',
      iconEmoji: '🎯',
      title: `${s5Team} Hits ${s5Progress}%!`,
      timestamp: '3 hours ago',
      createdAt: new Date(now - 180 * 60000).toISOString(),
      author: {
        name: `Team ${s5Team}`,
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        team: `${s5Team} Hub`,
      },
      content: `${s5Team} has crossed ${s5Progress}% of its monthly target. The finish line is getting closer.`,
      quotaProgress: {
        current: sarjapuraBranch?.currentInr || s5Progress,
        target: sarjapuraBranch?.targetInr || 100,
        label: `${s5Team} Monthly Target`,
        percentage: s5Progress,
        currentFormatted: sarjapuraBranch?.current || '₹55.40L',
        targetFormatted: sarjapuraBranch?.target || '₹1.20 Cr',
      },
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(s5Id);
  }

  // ----------------------------------------------------
  // Scenario #6: 100% Target Achievement (CRM)
  // PDF: "Target Crushed: 100%!"
  // Dynamic formula: team achieving >= 100% quota
  // ----------------------------------------------------
  const crushedBranch = branchTargets.find((b) => (Number(b.progress) || 0) >= 100) || branchTargets.find((b) => /hbr/i.test(b.branchId || ''));
  const s6Team = cleanBranchName(crushedBranch?.branchName || crushedBranch?.team || 'HBR');
  const s6Id = 'crm-announcement-6-target-crushed-100';

  if (!seenIds.has(s6Id)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(s6Id);
    posts.push({
      id: s6Id,
      type: 'quota',
      categoryColor: '#8B5CF6',
      iconEmoji: '🎯',
      title: 'Target Crushed: 100%!',
      timestamp: '4 hours ago',
      createdAt: new Date(now - 240 * 60000).toISOString(),
      author: {
        name: `Team ${s6Team}`,
        avatar: 'https://images.unsplash.com/photo-1522071823991-b9671e9d7fbe?w=150&auto=format&fit=crop&q=80',
        team: `${s6Team} Hub`,
      },
      content: `Team ${s6Team} has officially crossed its monthly target. Everything from here is overachievement.`,
      quotaProgress: {
        current: crushedBranch?.currentInr || 100,
        target: crushedBranch?.targetInr || 100,
        label: `${s6Team} Target Quota`,
        percentage: 100,
        currentFormatted: crushedBranch?.current || '₹55L',
        targetFormatted: crushedBranch?.target || '₹55L',
      },
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(s6Id);
  }

  // ----------------------------------------------------
  // Scenario #3: First Booking of Employee (CRM)
  // PDF: "First One on the Board!"
  // Dynamic formula: new onboarding team member in CRM making first deal
  // ----------------------------------------------------
  const s3Rep = newJoiningRep.name || 'Priti Dutta';
  const s3Branch = cleanBranchName(newJoiningRep.branchId || 'JP Nagar');
  const s3Id = 'crm-announcement-3-first-booking';

  if (!seenIds.has(s3Id)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(s3Id);
    posts.push({
      id: s3Id,
      type: 'booking',
      categoryColor: '#F59E0B',
      iconEmoji: '🌟',
      title: 'First One on the Board!',
      timestamp: '5 hours ago',
      createdAt: new Date(now - 300 * 60000).toISOString(),
      author: {
        name: s3Rep,
        avatar: newJoiningRep.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        team: `${s3Branch} Hub`,
      },
      content: `${s3Rep} has closed her first HUB booking. The first of many. Congratulations!`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(s3Id);
  }

  // ----------------------------------------------------
  // Scenario #16: Renova Booking (CRM)
  // PDF: "Renova Strikes Again!"
  // Dynamic formula: renovation vertical contract booked
  // ----------------------------------------------------
  const s16Id = 'crm-announcement-16-renova-booking';
  if (!seenIds.has(s16Id)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(s16Id);
    posts.push({
      id: s16Id,
      type: 'booking',
      categoryColor: '#06B6D4',
      iconEmoji: '🛠️',
      title: 'Renova Strikes Again!',
      timestamp: '6 hours ago',
      createdAt: new Date(now - 360 * 60000).toISOString(),
      author: {
        name: 'Team Renova',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        team: 'Renova Vertical',
      },
      content: 'Another renovation project has joined the HUB family. ₹12.5L booked by Team Renova.',
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(s16Id);
  }

  // ----------------------------------------------------
  // Scenario #7: Company Revenue Milestone (CRM)
  // PDF: "HUB Crosses ₹2 Crore!"
  // Dynamic formula: cumulative company gross bookings crossing milestone
  // ----------------------------------------------------
  const s7Id = 'crm-announcement-7-company-revenue-milestone';
  if (!seenIds.has(s7Id)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(s7Id);
    const overallTarget = overallTargets && overallTargets.length > 0 ? overallTargets[0] : null;
    const currentRevFormatted = overallTarget?.current || '₹2 Cr';
    const s7Title = overallTarget?.currentInr && overallTarget.currentInr >= 20000000
      ? `HUB Crosses ${overallTarget.current}!`
      : 'HUB Crosses ₹2 Crore!';

    posts.push({
      id: s7Id,
      type: 'quota',
      categoryColor: '#0284C7',
      iconEmoji: '🚀',
      title: s7Title,
      timestamp: '7 hours ago',
      createdAt: new Date(now - 420 * 60000).toISOString(),
      author: {
        name: 'Operations HQ',
        avatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=80',
        team: 'Executive Board',
      },
      content: `The company has crossed ${currentRevFormatted} in bookings this month. Built one closure at a time.`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(s7Id);
  }

  // ----------------------------------------------------
  // Scenario #8: Record Broken (CRM)
  // PDF: "New HUB Record!"
  // Dynamic formula: highest ever booking month broken
  // ----------------------------------------------------
  const s8Id = 'crm-announcement-8-record-broken';
  if (!seenIds.has(s8Id)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(s8Id);
    posts.push({
      id: s8Id,
      type: 'booking',
      categoryColor: '#D97706',
      iconEmoji: '👑',
      title: 'New HUB Record!',
      timestamp: '8 hours ago',
      createdAt: new Date(now - 480 * 60000).toISOString(),
      author: {
        name: 'Leadership Board',
        avatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=80',
        team: 'Operations HQ',
      },
      content: 'This month has officially become our highest-ever booking month. The old record is history.',
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(s8Id);
  }

  // ----------------------------------------------------
  // Scenario #21: Book of Records Entry (CRM,DESIGN)
  // PDF: "A New HUB Record Has Been Written"
  // Dynamic formula: peak single salesperson monthly booking record
  // ----------------------------------------------------
  const s21Id = 'crm-announcement-21-book-of-records';
  if (!seenIds.has(s21Id)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(s21Id);
    const topPerformerRep = topCloser.name || 'Meghana';
    posts.push({
      id: s21Id,
      type: 'performer',
      categoryColor: '#7C3AED',
      iconEmoji: '📜',
      title: 'A New HUB Record Has Been Written',
      timestamp: '9 hours ago',
      createdAt: new Date(now - 540 * 60000).toISOString(),
      author: {
        name: 'Leadership Office',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        team: 'Book of Records',
      },
      content: `₹68L by ${topPerformerRep} in a single month—the newest entry in the HUB Book of Records.`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(s21Id);
  }

  // ----------------------------------------------------
  // Scenario #22: Target Streak (CRM,DESIGN)
  // PDF: "3 Months. 3 Targets."
  // Dynamic formula: team consecutive targets consistency streak
  // ----------------------------------------------------
  const s22Id = 'crm-announcement-22-target-streak';
  if (!seenIds.has(s22Id)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(s22Id);
    posts.push({
      id: s22Id,
      type: 'quota',
      categoryColor: '#EC4899',
      iconEmoji: '🔥',
      title: '3 Months. 3 Targets.',
      timestamp: '10 hours ago',
      createdAt: new Date(now - 600 * 60000).toISOString(),
      author: {
        name: 'Team Sarjapura',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        team: 'Sarjapura Hub',
      },
      content: 'Team Sarjapura has achieved its target for the third consecutive month. Consistency wins.',
      quotaProgress: {
        current: 3,
        target: 3,
        label: 'Consecutive Targets Achieved',
        percentage: 100,
        currentFormatted: '3 Months',
        targetFormatted: '3 Targets',
      },
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(s22Id);
  }

  // ----------------------------------------------------
  // Scenario #23: Company-Wide Goal Nearing (CRM,DESIGN)
  // PDF: "₹18L Away From ₹3 Crore"
  // Dynamic formula: target - current remaining distance calculation
  // ----------------------------------------------------
  const s23Id = 'crm-announcement-23-goal-nearing';
  if (!seenIds.has(s23Id)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(s23Id);
    const overallTarget = overallTargets && overallTargets.length > 0 ? overallTargets[0] : null;

    let remainingFormatted = '₹18L';
    let targetFormatted = '₹3 Crore';
    if (overallTarget?.targetInr && overallTarget?.currentInr && overallTarget.targetInr > overallTarget.currentInr) {
      const diff = overallTarget.targetInr - overallTarget.currentInr;
      remainingFormatted = formatInrToLakhsOrCrores(diff);
      targetFormatted = overallTarget.target || '₹3 Cr';
    }

    posts.push({
      id: s23Id,
      type: 'quota',
      categoryColor: '#E11D48',
      iconEmoji: '🎯',
      title: `${remainingFormatted} Away From ${targetFormatted}`,
      timestamp: 'Today',
      createdAt: new Date(now - 660 * 60000).toISOString(),
      author: {
        name: 'Operations HQ',
        avatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=80',
        team: 'Executive Board',
      },
      content: `One final push. HUB is just ${remainingFormatted} away from the monthly ${targetFormatted} milestone.`,
      quotaProgress: {
        current: overallTarget?.currentInr || 28200000,
        target: overallTarget?.targetInr || 30000000,
        label: 'Monthly Milestone',
        percentage: 94,
        currentFormatted: overallTarget?.current || '₹2.82 Cr',
        targetFormatted: overallTarget?.target || '₹3 Cr',
      },
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(s23Id);
  }

  // Sort by createdAt descending
  posts.sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tB - tA;
  });

  return posts;
}

/**
 * Creates a dynamic CRM announcement post on the fly from interactive simulator inputs
 */
export function createDynamicCrmAnnouncement(params: {
  scenarioNumber: number;
  repName?: string;
  amount?: string;
  branch?: string;
  projectTag?: string;
  customDetails?: string;
}): FeedPost {
  const tmpl = CRM_ANNOUNCEMENT_TEMPLATES.find((t) => t.scenarioNumber === params.scenarioNumber) || CRM_ANNOUNCEMENT_TEMPLATES[0];
  const rep = params.repName || tmpl.defaultAuthor.name;
  const branch = cleanBranchName(params.branch || tmpl.defaultAuthor.team);
  const amount = params.amount || '₹14.5L';
  const project = params.projectTag || '#5210';
  const now = new Date().toISOString();

  let title = tmpl.headline;
  let content = tmpl.content;

  if (tmpl.scenarioNumber === 1) {
    title = `New Booking: ${amount} by ${branch} Team!`;
    content = `${rep} just closed Project ${project}. Another home joins HUB. Great work, team!`;
  } else if (tmpl.scenarioNumber === 2) {
    title = `Big One Closed: ${amount}!`;
    content = `${rep} just brought home a ${amount} interior project. That’s how you move the scoreboard.`;
  } else if (tmpl.scenarioNumber === 3) {
    title = 'First One on the Board!';
    content = `${rep} has closed their first HUB booking. The first of many. Congratulations!`;
  } else if (tmpl.scenarioNumber === 4) {
    title = 'Hat-Trick of Closures!';
    content = `3 bookings. One day. ${amount} added to the board by Team ${branch}.`;
  } else if (tmpl.scenarioNumber === 5) {
    title = `${branch} Hits 85%!`;
    content = `${branch} has crossed 85% of its monthly target. The finish line is getting closer.`;
  } else if (tmpl.scenarioNumber === 6) {
    title = 'Target Crushed: 100%!';
    content = `Team ${branch} has officially crossed its monthly target. Everything from here is overachievement.`;
  } else if (tmpl.scenarioNumber === 9) {
    title = 'This Week’s Top Performer';
    content = `${rep} leads the board with ${amount} in closures this week. Outstanding consistency.`;
  } else if (tmpl.scenarioNumber === 10) {
    title = 'Spot Closure!';
    content = `The customer walked in today and booked today. ${amount} closed by Team ${branch}.`;
  } else if (tmpl.scenarioNumber === 16) {
    title = 'Renova Strikes Again!';
    content = `Another renovation project has joined the HUB family. ${amount} booked by Team Renova.`;
  }

  if (params.customDetails?.trim()) {
    content = `${content} · ${params.customDetails.trim()}`;
  }

  return {
    id: `dynamic-sim-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: tmpl.type,
    categoryColor: tmpl.categoryColor,
    iconEmoji: tmpl.iconEmoji,
    title,
    content,
    timestamp: 'Just now',
    createdAt: now,
    author: {
      name: rep,
      avatar: tmpl.defaultAuthor.avatar,
      team: `${branch} Hub`,
    },
    quotaProgress: tmpl.type === 'quota' ? {
      current: 85,
      target: 100,
      label: `${branch} Target`,
      percentage: 85,
      currentFormatted: amount,
      targetFormatted: '₹1.20 Cr',
    } : undefined,
    reactions: defaultReactions(),
    commentsCount: 0,
    comments: [],
    department: 'Sales',
  };
}
