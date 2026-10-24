import { FeedPost } from '../types/index';
import { formatPersonName, istYmd } from './hallwayDisplay';
import {
  HallwayFeedItem,
  HallwayTargetCard,
  HallwayLeaderboardIndividual,
  HallwayPerson,
  HallwayIndividualRecord,
  HallwayTeamRecord,
} from '../types/hallway';

export interface CrmGeneratorInputs {
  crmFeedItems?: HallwayFeedItem[];
  overallTargets?: HallwayTargetCard[];
  branchTargets?: (HallwayTargetCard & { branchId?: string; branchName?: string; team?: string })[];
  topPerformers?: HallwayLeaderboardIndividual[];
  people?: HallwayPerson[];
  records?: HallwayIndividualRecord[];
  teamRecords?: HallwayTeamRecord[];
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
 * Enterprise scenario templates matching the Master Specification:
 * - Scenarios 1-10: Core CRM Deals, Closures, Performers & Milestones
 * - Scenarios 21-23: Book of Records, Streaks & Goal Progression
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
      avatar: '',
    },
    sampleMetric: '₹8.4L Booking',
  },
  {
    scenarioNumber: 2,
    scenarioName: 'Large Booking',
    departmentTag: 'CRM',
    headline: 'Big One Closed: ₹24.6L!',
    content: 'Aman just brought home a ₹24.6L interior project. That’s how you move the scoreboard.',
    type: 'booking',
    categoryColor: '#059669',
    iconEmoji: '🔥',
    defaultAuthor: {
      name: 'Aman Nirmal',
      team: 'Sarjapura Hub',
      avatar: '',
    },
    sampleMetric: '₹24.6L High-Value Deal',
  },
  {
    scenarioNumber: 3,
    scenarioName: 'First Booking of Employee',
    departmentTag: 'CRM',
    headline: 'First One on the Board!',
    content: 'Rayan has closed his first HUB booking. The first of many. Congratulations!',
    type: 'booking',
    categoryColor: '#0D9488',
    iconEmoji: '🚀',
    defaultAuthor: {
      name: 'Rayan',
      team: 'JP Nagar Hub',
      avatar: '',
    },
    sampleMetric: 'Maiden Booking',
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
      avatar: '',
    },
    sampleMetric: '3 Bookings in 24h',
  },
  {
    scenarioNumber: 5,
    scenarioName: 'EC Target Milestone',
    departmentTag: 'CRM',
    headline: 'Sarjapura Hits 80%!',
    content: 'Sarjapura has crossed 80% of its monthly target. The finish line is getting closer.',
    type: 'quota',
    categoryColor: '#8B5CF6',
    iconEmoji: '🎯',
    defaultAuthor: {
      name: 'Team Sarjapura',
      team: 'Sarjapura Hub',
      avatar: '',
    },
    sampleMetric: '80% Branch Quota',
  },
  {
    scenarioNumber: 6,
    scenarioName: '100% Target Achievement',
    departmentTag: 'CRM',
    headline: 'Target Crushed: 100%!',
    content: 'Team HBR has officially crossed its monthly target. Everything from here is overachievement.',
    type: 'quota',
    categoryColor: '#10B981',
    iconEmoji: '🏆',
    defaultAuthor: {
      name: 'Team HBR',
      team: 'HBR Hub',
      avatar: '',
    },
    sampleMetric: '100% Target Crushed',
  },
  {
    scenarioNumber: 7,
    scenarioName: 'Company Revenue Milestone',
    departmentTag: 'CRM',
    headline: 'HUB Crosses ₹2 Crore!',
    content: 'The company has crossed ₹2 Cr in bookings this month. Built one closure at a time.',
    type: 'quota',
    categoryColor: '#0284C7',
    iconEmoji: '🎯',
    defaultAuthor: {
      name: 'Operations HQ',
      team: 'Executive Board',
      avatar: '',
    },
    sampleMetric: '₹2 Cr Milestone',
  },
  {
    scenarioNumber: 8,
    scenarioName: 'Record Broken',
    departmentTag: 'CRM',
    headline: 'New HUB Record!',
    content: 'This month has officially become our highest-ever booking month. The old record is history.',
    type: 'booking',
    categoryColor: '#D97706',
    iconEmoji: '🎖️',
    defaultAuthor: {
      name: 'Meghana',
      team: 'HBR Hub',
      avatar: '',
    },
    sampleMetric: 'New Company Record',
  },
  {
    scenarioNumber: 9,
    scenarioName: 'Top Performer',
    departmentTag: 'CRM',
    headline: 'This Week’s Top Performer',
    content: 'Naveen leads the board with ₹42L in closures this week. Outstanding consistency.',
    type: 'performer',
    categoryColor: '#EAB308',
    iconEmoji: '🏅',
    defaultAuthor: {
      name: 'Naveen',
      team: 'Sarjapura Hub',
      avatar: '',
    },
    sampleMetric: 'Rank #1 Leader',
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
      name: 'Sales Executive',
      team: 'Indiranagar Hub',
      avatar: '',
    },
    sampleMetric: 'Same-Day Walk-in & Close',
  },
  {
    scenarioNumber: 16,
    scenarioName: 'Renova Booking',
    departmentTag: 'CRM',
    headline: 'Renova Strikes Again!',
    content: 'Another renovation project has joined the HUB family. ₹12.5L booked by Team Renova.',
    type: 'booking',
    categoryColor: '#D97706',
    iconEmoji: '🔨',
    defaultAuthor: {
      name: 'Team Renova',
      team: 'Renova Hub',
      avatar: '',
    },
    sampleMetric: 'Renovation Closure',
  },
  {
    scenarioNumber: 21,
    scenarioName: 'Book of Records Entry',
    departmentTag: 'CRM,DESIGN',
    headline: 'A New HUB Record Has Been Written',
    content: '₹68L by one salesperson in a single month—the newest entry in the HUB Book of Records.',
    type: 'performer',
    categoryColor: '#7C3AED',
    iconEmoji: '📖',
    defaultAuthor: {
      name: 'Leadership Office',
      team: 'Operations HQ',
      avatar: '',
    },
    sampleMetric: 'Book of Records Entry',
  },
  {
    scenarioNumber: 22,
    scenarioName: 'Target Streak',
    departmentTag: 'CRM,DESIGN',
    headline: '3 Months. 3 Targets.',
    content: 'Team Sarjapura has achieved its target for the third consecutive month. Consistency wins.',
    type: 'performer',
    categoryColor: '#EC4899',
    iconEmoji: '🔥',
    defaultAuthor: {
      name: 'Team Sarjapura',
      team: 'Sarjapura Hub',
      avatar: '',
    },
    sampleMetric: '3-Month Quota Streak',
  },
  {
    scenarioNumber: 23,
    scenarioName: 'Company-Wide Goal Nearing',
    departmentTag: 'CRM,DESIGN',
    headline: '₹18L Away From ₹3 Crore',
    content: 'One final push. HUB is just ₹18L away from the monthly ₹3 Cr milestone.',
    type: 'quota',
    categoryColor: '#E11D48',
    iconEmoji: '🎪',
    defaultAuthor: {
      name: 'Operations HQ',
      team: 'Executive Board',
      avatar: '',
    },
    sampleMetric: 'Goal Striking Distance',
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
  const clean = raw.trim().replace(/ Hub$/i, '').replace(/ Team$/i, '').replace(/ Layout$/i, '').replace(/_/g, ' ').trim();
  if (/^sarjapur/i.test(clean)) return 'Sarjapura';
  if (/^jp/i.test(clean)) return 'JP Nagar';
  if (/^hbr/i.test(clean)) return 'HBR';
  return clean || 'Sarjapura';
}

function resolveAvatarForPerson(_name: string, fallbackUrl?: string | null): string {
  if (fallbackUrl && fallbackUrl.startsWith('http') && !fallbackUrl.includes('unsplash.com')) {
    return fallbackUrl;
  }
  return '';
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
 * Home announcement register.
 * Bookings and performer cards come from CRM.booking_token_record.
 * The milestone card uses the targets Achieved figure, and only when that is ₹1 crore or more.
 */
export function generateCrmAnnouncements({
  crmFeedItems = [],
  overallTargets = [],
  topPerformers = [],
  existingPostsMap = new Map(),
}: CrmGeneratorInputs): FeedPost[] {
  const posts: FeedPost[] = [];
  const seenIds = new Set<string>();
  const ONE_CRORE_INR = 10_000_000;

  const register = (crmFeedItems || []).filter(
    (item) => item.registerKind && item.registerKind !== 'milestone' && item.registerKind !== 'monthly'
  );

  for (const item of register) {
    if (!item.id || seenIds.has(item.id)) continue;

    const rep = formatPersonName(item.author?.name || '');
    const quoteFormatted = item.quoteFormatted || '';
    if (!rep || rep === 'User' || !quoteFormatted) continue;

    const preserved = existingPostsMap.get(item.id);
    const kind = item.registerKind;
    const type: FeedPost['type'] = kind === 'weekly' || kind === 'monthly' ? 'performer' : 'booking';

    const normalizedTitle =
      kind === 'weekly' || item.title?.toLowerCase().includes('week’s top performer') || item.title?.toLowerCase().includes("week's top performer")
        ? 'This Week’s Top Performer'
        : kind === 'monthly' || item.title?.toLowerCase().includes('month’s top performer') || item.title?.toLowerCase().includes("month's top performer")
        ? 'This Month’s Top Performer'
        : item.title;

    posts.push({
      id: item.id,
      type,
      categoryColor: type === 'performer' ? '#EAB308' : '#10B981',
      iconEmoji: type === 'performer' ? '🏅' : '💰',
      title: normalizedTitle,
      timestamp: item.timestamp || 'Recent',
      createdAt: item.createdAt,
      author: {
        name: rep,
        avatar: preserved?.author?.avatar || '',
        team: item.author?.team || 'Sales',
      },
      content: item.content || '',
      quoteFormatted,
      reactions: preserved?.reactions ? { ...preserved.reactions } : defaultReactions(),
      comments: preserved?.comments && preserved.comments.length > 0 ? [...preserved.comments] : [],
      commentsCount: preserved?.commentsCount || preserved?.comments?.length || 0,
      department: 'Sales',
    });
    seenIds.add(item.id);
  }

  // Live week's top performer calculation from booking deals (if not already unshifted)
  const hasWeeklyTop = posts.some((p) => p.id.startsWith('crm-weekly-top-'));
  if (!hasWeeklyTop) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const monthFromMs = new Date(y, m, 1, 0, 0, 0, 0).getTime();
    const monthToMs = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime();

    // Monday 00:00:00 to Sunday 23:59:59 IST for current week
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const weekFromMs = monday.getTime();

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const weekToMs = sunday.getTime();
    const weekStartStr = monday.toISOString().slice(0, 10);
    const weeklyId = `crm-weekly-top-${weekStartStr}`;

    const repWeekTotals = new Map<string, { name: string; total: number; team: string; count: number }>();

    for (const item of (crmFeedItems || [])) {
      if (!item) continue;
      const rep = formatPersonName(item.author?.name || '');
      if (!rep || rep === 'User' || /\b(test|alice|shalny|razi)\b/i.test(rep)) continue;

      const rawDate = item.createdAt || item.rawBooking?.bookingDoneDate || item.timestamp;
      const t = rawDate ? new Date(rawDate).getTime() : NaN;
      if (isNaN(t)) continue;

      // Date check: Must have a valid timestamp within current month AND current week
      if (t >= monthFromMs && t <= monthToMs && t >= weekFromMs && t <= weekToMs) {
        const rawQuote =
          Number(item.rawBooking?.quoteAmount) ||
          parseAmountFromText(item.quoteFormatted || item.content || '').valueInr ||
          0;
        if (rawQuote <= 0) continue;

        const prev = repWeekTotals.get(rep) || {
          name: rep,
          total: 0,
          team: item.author?.team || 'Sales Hub',
          count: 0,
        };
        prev.total += rawQuote;
        prev.count += 1;
        repWeekTotals.set(rep, prev);
      }
    }

    // Salesperson with the highest total gross bookings is this week's top performer
    const weeklyWinner = [...repWeekTotals.values()].sort(
      (a, b) => b.total - a.total || b.count - a.count || a.name.localeCompare(b.name)
    )[0];

    if (weeklyWinner && weeklyWinner.total > 0 && !seenIds.has(weeklyId)) {
      const weekAmount = formatInrToLakhsOrCrores(weeklyWinner.total);
      const preserved = existingPostsMap.get(weeklyId);
      posts.unshift({
        id: weeklyId,
        type: 'performer',
        categoryColor: '#EAB308',
        iconEmoji: '🏅',
        title: 'This Week’s Top Performer',
        timestamp: 'This week',
        createdAt: `${istYmd()}T12:00:00+05:30`,
        author: {
          name: weeklyWinner.name,
          avatar: preserved?.author?.avatar || '',
          team: weeklyWinner.team,
        },
        content: `${weeklyWinner.name} leads the board with ${weekAmount} in closures this week. Outstanding consistency.`,
        quoteFormatted: weekAmount,
        reactions: preserved?.reactions ? { ...preserved.reactions } : defaultReactions(),
        comments: preserved?.comments && preserved.comments.length > 0 ? [...preserved.comments] : [],
        commentsCount: preserved?.commentsCount || preserved?.comments?.length || 0,
        department: 'Sales',
      });
      seenIds.add(weeklyId);
    }
  }

  const mtdLeader = (topPerformers || []).find(
    (person) =>
      Boolean(person?.name) &&
      !/\btest\b/i.test(String(person.name)) &&
      (Number(person.revenue) > 0 ||
        Boolean(person.revenueFormatted && person.revenueFormatted !== '₹0'))
  );
  if (mtdLeader?.name) {
    const monthKey = istYmd().slice(0, 7);
    const monthId = `crm-monthly-top-${monthKey}`;
    const name = formatPersonName(mtdLeader.name);
    const amount = mtdLeader.revenueFormatted || formatInrToLakhsOrCrores(Number(mtdLeader.revenue) || 0);
    if (!seenIds.has(monthId) && name && name !== 'User' && amount && amount !== '₹0') {
      const preserved = existingPostsMap.get(monthId);
      posts.push({
        id: monthId,
        type: 'performer',
        categoryColor: '#EAB308',
        iconEmoji: '🏅',
        title: 'This Month’s Top Performer',
        timestamp: 'This month',
        createdAt: `${istYmd()}T12:00:00+05:30`,
        author: {
          name,
          avatar: preserved?.author?.avatar || '',
          team: 'Sales',
        },
        content: `${name} leads this month with ${amount} in gross bookings.`,
        quoteFormatted: amount,
        reactions: preserved?.reactions ? { ...preserved.reactions } : defaultReactions(),
        comments: preserved?.comments && preserved.comments.length > 0 ? [...preserved.comments] : [],
        commentsCount: preserved?.commentsCount || preserved?.comments?.length || 0,
        department: 'Sales',
      });
      seenIds.add(monthId);
    }
  }

  const achievedInr = Number(overallTargets[0]?.currentInr) || 0;
  if (achievedInr >= ONE_CRORE_INR) {
    const monthKey = istYmd().slice(0, 7);
    const milestoneId = `crm-month-milestone-${monthKey}`;
    if (!seenIds.has(milestoneId)) {
      const achieved = formatInrToLakhsOrCrores(achievedInr);
      const preserved = existingPostsMap.get(milestoneId);
      posts.push({
        id: milestoneId,
        type: 'quota',
        categoryColor: '#0284C7',
        iconEmoji: '🎯',
        title: 'Company crossed ₹1 Cr this month',
        timestamp: 'This month',
        createdAt: `${istYmd()}T12:00:00+05:30`,
        author: {
          name: 'HUB',
          avatar: preserved?.author?.avatar || '',
          team: 'Company',
        },
        content: `Achieved ${achieved} in bookings this month.`,
        quoteFormatted: achieved,
        reactions: preserved?.reactions ? { ...preserved.reactions } : defaultReactions(),
        comments: preserved?.comments && preserved.comments.length > 0 ? [...preserved.comments] : [],
        commentsCount: preserved?.commentsCount || preserved?.comments?.length || 0,
        department: 'Sales',
      });
    }
  }

  posts.sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tB - tA;
  });
  return posts;
}

/**
 * Creates a dynamic CRM announcement post on the fly
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
  const amount = params.amount || '₹9.16L';
  const project = params.projectTag || '#JP-2399';
  const now = new Date().toISOString();

  let title = tmpl.headline;
  let content = tmpl.content;

  if (tmpl.scenarioNumber === 1) {
    title = `New Booking: ${amount} by ${branch} Team!`;
    content = `${rep} just closed Project ${project}. Another home joins HUB. Great work, team!`;
  } else if (tmpl.scenarioNumber === 2) {
    title = `Big One Closed: ${amount}!`;
    content = `${rep} just brought home a ${amount} interior project for Project ${project}. That’s how you move the scoreboard.`;
  } else if (tmpl.scenarioNumber === 3) {
    title = 'First One on the Board!';
    content = `${rep} has closed their first HUB booking (${amount}) for Project ${project}. The first of many. Congratulations!`;
  } else if (tmpl.scenarioNumber === 4) {
    title = 'Hat-Trick of Closures!';
    content = `3 bookings. One day. ${amount} added to the board by Team ${branch}.`;
  } else if (tmpl.scenarioNumber === 5) {
    title = `${branch} Hits 85%!`;
    content = `${branch} has crossed 85% of its monthly target. The finish line is getting closer.`;
  } else if (tmpl.scenarioNumber === 9) {
    title = 'This Week’s Top Performer';
    content = `${rep} leads the board with ${amount} in closures this week. Outstanding consistency.`;
  } else if (tmpl.scenarioNumber === 10) {
    title = `Spot Closure: ${amount} by ${rep}!`;
    content = `The customer walked in today and booked today. ${amount} closed for Project ${project} by ${rep} (${branch} Hub).`;
  } else if (tmpl.scenarioNumber === 16) {
    title = 'Renova Strikes Again!';
    content = `Another renovation project has joined the HUB family. ${amount} booked by Team Renova (${rep} - Project ${project}).`;
  } else if (tmpl.scenarioNumber === 21) {
    title = 'A New HUB Record Has Been Written';
    content = `${amount} by ${rep} in a single month—the newest entry in the HUB Book of Records.`;
  } else if (tmpl.scenarioNumber === 22) {
    title = '3 Months. 3 Targets.';
    content = `Team ${branch} has achieved its target for the third consecutive month. Consistency wins.`;
  } else if (tmpl.scenarioNumber === 23) {
    title = `${amount} Away From ₹3 Crore`;
    content = `One final push. HUB is just ${amount} away from the monthly ₹3 Cr milestone.`;
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
    reactions: defaultReactions(),
    commentsCount: 0,
    comments: [],
    department: 'Sales',
  };
}
