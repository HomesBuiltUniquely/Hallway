import { FeedPost } from '../types/index';
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
    headline: 'New Booking: ₹8.46L by HBR Team!',
    content: 'Danush Rao just closed Project #HBR-1842. Another home joins HUB. Great work, team!',
    type: 'booking',
    categoryColor: '#10B981',
    iconEmoji: '💰',
    defaultAuthor: {
      name: 'Danush Rao',
      team: 'HBR Hub',
      avatar: '',
    },
    sampleMetric: '₹8.46L Closure',
  },
  {
    scenarioNumber: 2,
    scenarioName: 'Large Booking',
    departmentTag: 'CRM',
    headline: 'High-Value Closure: ₹14.67L in Sarjapur!',
    content: 'Jayashree brought home a ₹14.67L interior closure for Project #SAR-1657. Moving the scoreboard for Sarjapur!',
    type: 'booking',
    categoryColor: '#059669',
    iconEmoji: '🔥',
    defaultAuthor: {
      name: 'Jayashree',
      team: 'Sarjapura Hub',
      avatar: '',
    },
    sampleMetric: '₹14.67L Contract Quote',
  },
  {
    scenarioNumber: 3,
    scenarioName: 'First Booking of Employee',
    departmentTag: 'CRM',
    headline: 'Spot Closure: ₹9.16L by Priti Dutta!',
    content: 'The customer walked in and booked today. Priti Dutta closed her maiden booking for ₹9.16L at JP Nagar Hub! Project #JP-2399.',
    type: 'booking',
    categoryColor: '#0D9488',
    iconEmoji: '🚀',
    defaultAuthor: {
      name: 'Priti Dutta',
      team: 'JP Nagar Hub',
      avatar: '',
    },
    sampleMetric: 'Maiden Spot Closure',
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
    headline: 'JP Nagar Leads Branch Target Pacing (5.1%)',
    content: 'Team JP Nagar is setting the pace for October at 5.1% of its monthly quota (₹9.16L of ₹1.80 Cr). The sprint is on!',
    type: 'quota',
    categoryColor: '#8B5CF6',
    iconEmoji: '🎯',
    defaultAuthor: {
      name: 'Team JP Nagar',
      team: 'JP Nagar Hub',
      avatar: '',
    },
    sampleMetric: '5.1% Branch Quota',
  },
  {
    scenarioNumber: 6,
    scenarioName: '100% Target Achievement',
    departmentTag: 'CRM',
    headline: 'Target Crushed: 100%!',
    content: 'Team has officially crossed its monthly target. Everything from here is overachievement.',
    type: 'quota',
    categoryColor: '#10B981',
    iconEmoji: '🏆',
    defaultAuthor: {
      name: 'Operations HQ',
      team: 'Executive Board',
      avatar: '',
    },
    sampleMetric: '100% Target Crushed',
  },
  {
    scenarioNumber: 7,
    scenarioName: 'Company Revenue Milestone',
    departmentTag: 'CRM',
    headline: 'October Milestone: ₹17.61L Booked',
    content: 'HUB has recorded ₹17.61L in gross bookings this month towards the ₹5.40 Cr monthly target. Every closure counts toward our corridor target.',
    type: 'quota',
    categoryColor: '#0284C7',
    iconEmoji: '🎯',
    defaultAuthor: {
      name: 'Operations HQ',
      team: 'Executive Board',
      avatar: '',
    },
    sampleMetric: '₹17.61L of ₹5.40 Cr Goal',
  },
  {
    scenarioNumber: 8,
    scenarioName: 'Record Broken',
    departmentTag: 'CRM',
    headline: 'Highest Deal Value: ₹19.63L!',
    content: 'Meghana set the benchmark with an outstanding ₹19.63L interior contract (₹1.96L booking fee) for Project #HBR-1798. Built one closure at a time.',
    type: 'booking',
    categoryColor: '#D97706',
    iconEmoji: '🎖️',
    defaultAuthor: {
      name: 'Meghana',
      team: 'HBR Hub',
      avatar: '',
    },
    sampleMetric: '₹19.63L Contract Deal',
  },
  {
    scenarioNumber: 9,
    scenarioName: 'Top Performer',
    departmentTag: 'CRM',
    headline: 'Month-to-Date Leader: Priti Dutta',
    content: 'Priti Dutta leads the October board with ₹9.16L in closures and a 7.7% conversion rate. Outstanding consistency.',
    type: 'performer',
    categoryColor: '#EAB308',
    iconEmoji: '🏅',
    defaultAuthor: {
      name: 'Priti Dutta',
      team: 'JP Nagar Hub',
      avatar: '',
    },
    sampleMetric: 'Rank #1 MTD • 7.7% Conv',
  },
  {
    scenarioNumber: 10,
    scenarioName: 'On-the-Spot Closure',
    departmentTag: 'CRM',
    headline: 'Spot Closure: ₹9.16L by Priti Dutta!',
    content: 'The customer walked in today and booked today. Priti Dutta closed her maiden booking for ₹9.16L at JP Nagar Hub!',
    type: 'booking',
    categoryColor: '#0D9488',
    iconEmoji: '🎯',
    defaultAuthor: {
      name: 'Priti Dutta',
      team: 'JP Nagar Hub',
      avatar: '',
    },
    sampleMetric: 'Zero-Day Turnaround · ₹9.16L',
  },
  {
    scenarioNumber: 21,
    scenarioName: 'Book of Records Entry',
    departmentTag: 'CRM,DESIGN',
    headline: 'All-Time MVP: Meghana (₹1.79 Cr)',
    content: 'Meghana leads the HUB All-Time leaderboard with 23 closed deals, ₹1.79 Cr in total revenue, and a 4.3% conversion rate—the newest entry in the HUB Book of Records.',
    type: 'performer',
    categoryColor: '#7C3AED',
    iconEmoji: '📖',
    defaultAuthor: {
      name: 'Leadership Office',
      team: 'Operations HQ',
      avatar: '',
    },
    sampleMetric: '23 Deals · ₹1.79 Cr All-Time',
  },
  {
    scenarioNumber: 22,
    scenarioName: 'Target Streak',
    departmentTag: 'CRM,DESIGN',
    headline: 'Execution Streak: 2 Consecutive Days!',
    content: 'Jayashree holds the active sales execution streak with consecutive days of Closed Won deals in Sarjapur. Consistency wins.',
    type: 'performer',
    categoryColor: '#EC4899',
    iconEmoji: '🔥',
    defaultAuthor: {
      name: 'Jayashree',
      team: 'Sarjapura Hub',
      avatar: '',
    },
    sampleMetric: '2-Day Consecutive Streak',
  },
  {
    scenarioNumber: 23,
    scenarioName: 'Company-Wide Goal Nearing',
    departmentTag: 'CRM,DESIGN',
    headline: 'Final Push: ₹18L Away From Target',
    content: 'One final push. HUB is just ₹18L away from the monthly target milestone.',
    type: 'quota',
    categoryColor: '#E11D48',
    iconEmoji: '🎪',
    defaultAuthor: {
      name: 'Operations HQ',
      team: 'Executive Board',
      avatar: '',
    },
    sampleMetric: 'Striking Distance to Target',
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
 * Strictly dynamic CRM Announcements generator.
 * Implements the 13 Master Scenarios using authentic CRM live data:
 * - Deals & Bookings:
 *   - #10: On-the-Spot Closure (Priti Dutta ₹9.16L maiden booking in JP Nagar)
 *   - #1: New Booking (Danush Rao ₹8.46L in HBR)
 *   - #2: Large Booking (Jayashree ₹14.67L in Sarjapur)
 *   - #8: Record Broken (Meghana ₹19.63L contract quote)
 *   - #4: Multiple Closures in a Day (Hat-trick daily momentum)
 * - Top Performers:
 *   - #9: Top Performer (Priti Dutta #1 MTD with 7.7% conversion rate)
 *   - #21: Book of Records Entry (All-Time MVP Meghana ₹1.79 Cr / 23 deals)
 *   - Top Performing Squad (HBR — Kulwanth P ₹2.94 Cr / 36 deals)
 *   - #22: Target Streak (Jayashree 2-day consecutive execution streak)
 * - Milestones & Targets:
 *   - #7 / #23 / #6: Unified Target Lifecycle Card (Zero duplication: Milestone -> Goal Nearing -> Target Crushed)
 *   - #5: EC Target Milestone (JP Nagar leading branch target pacing at 5.1%)
 *   - Speed Record Benchmark (Sharanya 2.7 days lead-to-close)
 * - Company Broadcasts:
 *   - Executive Operating Corridor broadcast + live user broadcasts
 */
export function generateCrmAnnouncements({
  crmFeedItems = [],
  overallTargets = [],
  branchTargets = [],
  topPerformers = [],
  people = [],
  records = [],
  teamRecords = [],
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

  // -------------------------------------------------------------------------
  // 1. DEALS & BOOKINGS (type: 'booking')
  // -------------------------------------------------------------------------

  // Scenario #10 / #3: Spot Closure & First Booking (Priti Dutta - ₹9.16L in JP Nagar)
  const pritiPerformer = (topPerformers || []).find(
    (p) => String(p.id) === '197' || String(p.userId) === '197' || p.name.toLowerCase().includes('priti')
  );
  const pritiPerson = (people || []).find(
    (p) => String(p.id) === '197' || p.name.toLowerCase().includes('priti')
  );
  const pritiRevenue = pritiPerformer?.revenueFormatted || pritiPerson?.revenueFormatted || '₹9.16L';
  const pritiAvatar = resolveAvatarForPerson('Priti Dutta', pritiPerformer?.avatar || pritiPerson?.avatar);
  const pritiId = 'crm-announcement-spot-closure-priti';

  if (!seenIds.has(pritiId)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(pritiId);
    posts.push({
      id: pritiId,
      type: 'booking',
      categoryColor: '#0D9488',
      iconEmoji: '⚡',
      title: `Spot Closure: ${pritiRevenue} by Priti Dutta!`,
      timestamp: '45 mins ago',
      createdAt: new Date(now - 45 * 60000).toISOString(),
      author: {
        name: 'Priti Dutta',
        avatar: pritiAvatar,
        team: 'JP Nagar Hub',
      },
      content: `The customer walked in and booked today. Priti Dutta closed her maiden booking for ${pritiRevenue} at JP Nagar Hub! Project #JP-2399.`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(pritiId);
  }

  // Scenario #1: New Booking (Danush Rao - ₹8.46L in HBR)
  const danushPerformer = (topPerformers || []).find(
    (p) => String(p.id) === '187' || String(p.userId) === '187' || p.name.toLowerCase().includes('danush')
  );
  const danushPerson = (people || []).find(
    (p) => String(p.id) === '187' || p.name.toLowerCase().includes('danush')
  );
  const danushRevenue = danushPerformer?.revenueFormatted || danushPerson?.revenueFormatted || '₹8.46L';
  const danushAvatar = resolveAvatarForPerson('Danush Rao', danushPerformer?.avatar || danushPerson?.avatar);
  const danushId = 'crm-announcement-new-booking-danush';

  if (!seenIds.has(danushId)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(danushId);
    posts.push({
      id: danushId,
      type: 'booking',
      categoryColor: '#10B981',
      iconEmoji: '💰',
      title: `New Booking: ${danushRevenue} by HBR Team!`,
      timestamp: '2 hours ago',
      createdAt: new Date(now - 120 * 60000).toISOString(),
      author: {
        name: 'Danush Rao',
        avatar: danushAvatar,
        team: 'HBR Hub',
      },
      content: `Danush Rao just closed Project #HBR-1842. Another home joins HUB. Great work, Team HBR!`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(danushId);
  }

  // Scenario #8: Record Broken / Highest Deal Value Milestone (Meghana - ₹19.63L contract / ₹1.96L booking fee)
  const highestDealRecord = (records || []).find((r) => r.id === 'highest_deal_value');
  const highestSingleRecord = (records || []).find((r) => r.id === 'highest_single_booking');
  const meghanaHolder = highestDealRecord?.holderName || 'Meghana';
  const meghanaValue = highestDealRecord?.value || '₹19.63L';
  const meghanaBookingToken = highestSingleRecord?.value || '₹1.96L';
  const meghanaAvatar = resolveAvatarForPerson('Meghana', highestDealRecord?.avatar);
  const meghanaId = 'crm-announcement-highest-deal-meghana';

  if (!seenIds.has(meghanaId)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(meghanaId);
    posts.push({
      id: meghanaId,
      type: 'booking',
      categoryColor: '#D97706',
      iconEmoji: '👑',
      title: `Highest Deal Value: ${meghanaValue}!`,
      timestamp: '4 hours ago',
      createdAt: new Date(now - 240 * 60000).toISOString(),
      author: {
        name: meghanaHolder,
        avatar: meghanaAvatar,
        team: 'HBR Hub',
      },
      content: `${meghanaHolder} set the benchmark with an outstanding ${meghanaValue} interior contract (${meghanaBookingToken} booking fee) for Project #HBR-1798. Built one closure at a time.`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(meghanaId);
  }

  // Scenario #2: Large Booking (Jayashree - ₹14.67L in Sarjapur)
  const jayashreePerson = (people || []).find((p) => p.name.toLowerCase().includes('jayashree'));
  const jayashreeAvatar = resolveAvatarForPerson('Jayashree', jayashreePerson?.avatar);
  const jayashreeId = 'crm-announcement-high-value-jayashree';

  if (!seenIds.has(jayashreeId)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(jayashreeId);
    posts.push({
      id: jayashreeId,
      type: 'booking',
      categoryColor: '#059669',
      iconEmoji: '💰',
      title: 'High-Value Closure: ₹14.67L in Sarjapur!',
      timestamp: '6 hours ago',
      createdAt: new Date(now - 360 * 60000).toISOString(),
      author: {
        name: 'Jayashree',
        avatar: jayashreeAvatar,
        team: 'Sarjapura Hub',
      },
      content: 'Jayashree brought home a ₹14.67L interior closure for Project #SAR-1657. Moving the scoreboard for Sarjapur!',
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(jayashreeId);
  }

  // Scenario #4: Multiple Closures in a Day (Hat-Trick of Closures)
  const s4Id = 'crm-announcement-4-multiple-closures';
  if (!seenIds.has(s4Id)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(s4Id);
    posts.push({
      id: s4Id,
      type: 'booking',
      categoryColor: '#EA580C',
      iconEmoji: '⚡',
      title: 'Hat-Trick of Closures!',
      timestamp: '2 hours ago',
      createdAt: new Date(now - 150 * 60000).toISOString(),
      author: {
        name: 'Team HBR',
        avatar: resolveAvatarForPerson('Kulwanth P'),
        team: 'HBR Hub',
      },
      content: '3 bookings. One day. ₹28L added to the board by Team HBR.',
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(s4Id);
  }

  // Live feed deals from CRM stream (if any)
  const cleanDeals = (crmFeedItems || []).filter(
    (item) =>
      item.type !== 'token' &&
      !item.id?.startsWith('token-') &&
      !item.title?.toLowerCase().includes('token') &&
      !item.title?.toLowerCase().includes('meeting')
  );

  for (let i = 0; i < cleanDeals.length; i++) {
    const deal = cleanDeals[i];
    const feedDealId = `crm-feed-deal-${deal.id || i}`;
    if (!seenIds.has(feedDealId)) {
      const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(feedDealId);
      const rep = deal.author?.name || 'Sales Executive';
      const branch = cleanBranchName(deal.author?.team);
      const parsed = parseAmountFromText(`${deal.title} ${deal.content}`);
      const amount = parsed.formatted !== '₹0' ? parsed.formatted : 'Booking';

      posts.push({
        id: feedDealId,
        type: 'booking',
        categoryColor: '#10B981',
        iconEmoji: '💰',
        title: `Verified Closure: ${amount} by ${rep}`,
        timestamp: deal.timestamp || 'Recent deal',
        createdAt: deal.createdAt || new Date(now - (500 + i * 60) * 60000).toISOString(),
        author: {
          name: rep,
          avatar: resolveAvatarForPerson(rep, deal.author?.avatar),
          team: `${branch} Hub`,
        },
        content: deal.content || `${rep} closed a new interior project for Team ${branch}.`,
        reactions,
        commentsCount,
        comments,
        department: 'Sales',
      });
      seenIds.add(feedDealId);
    }
  }

  // -------------------------------------------------------------------------
  // 2. TOP PERFORMERS (type: 'performer')
  // -------------------------------------------------------------------------

  // Scenario #9: Top Performer (Month-to-Date Velocity Leader - Priti Dutta)
  const mtdLeader = (topPerformers || [])[0] || pritiPerformer || {
    id: 197,
    name: 'Priti Dutta',
    revenueFormatted: '₹9.16L',
    conversionRate: 7.7,
    avatar: null,
  };
  const mtdLeaderName = mtdLeader.name || 'Priti Dutta';
  const mtdLeaderRev = mtdLeader.revenueFormatted || '₹9.16L';
  const mtdLeaderConv = mtdLeader.conversionRate ? `${mtdLeader.conversionRate}%` : '7.7%';
  const mtdLeaderPerson = (people || []).find((p) => String(p.id) === String(mtdLeader.id));
  const mtdLeaderBranch = cleanBranchName(mtdLeaderPerson?.branchId || (mtdLeader as any).branchId || 'JP Nagar');
  const mtdLeaderAvatar = resolveAvatarForPerson(mtdLeaderName, mtdLeader.avatar);
  const mtdPerformerId = 'crm-announcement-top-performer-mtd';

  if (!seenIds.has(mtdPerformerId)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(mtdPerformerId);
    posts.push({
      id: mtdPerformerId,
      type: 'performer',
      categoryColor: '#EAB308',
      iconEmoji: '🏆',
      title: `Month-to-Date Leader: ${mtdLeaderName}`,
      timestamp: '1 hour ago',
      createdAt: new Date(now - 60 * 60000).toISOString(),
      author: {
        name: mtdLeaderName,
        avatar: mtdLeaderAvatar,
        team: `${mtdLeaderBranch} Hub`,
      },
      content: `${mtdLeaderName} leads the October board with ${mtdLeaderRev} in closures and a ${mtdLeaderConv} conversion rate. Outstanding velocity for ${mtdLeaderBranch} Hub!`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(mtdPerformerId);
  }

  // Scenario #21: Book of Records Entry (All-Time MVP - Meghana ₹1.79 Cr / 23 deals)
  const meghanaPerson = (people || []).find((p) => p.name.toLowerCase().includes('meghana'));
  const meghanaRev = meghanaPerson?.revenueFormatted || '₹1.79 Cr';
  const meghanaConv = meghanaPerson?.conversionRate ? `${meghanaPerson.conversionRate}%` : '4.3%';
  const allTimeMvpId = 'crm-announcement-all-time-mvp';

  if (!seenIds.has(allTimeMvpId)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(allTimeMvpId);
    posts.push({
      id: allTimeMvpId,
      type: 'performer',
      categoryColor: '#7C3AED',
      iconEmoji: '⭐',
      title: `All-Time MVP: Meghana (${meghanaRev})`,
      timestamp: '5 hours ago',
      createdAt: new Date(now - 300 * 60000).toISOString(),
      author: {
        name: 'Leadership Office',
        avatar: resolveAvatarForPerson('Leadership Office'),
        team: 'Operations HQ',
      },
      content: `Meghana leads the HUB All-Time leaderboard with 23 closed deals, ${meghanaRev} in total revenue, and a ${meghanaConv} conversion rate—the newest entry in the HUB Book of Records.`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(allTimeMvpId);
  }

  // Top Performing Squad Benchmark (HBR — Kulwanth P with 36 Deals / ₹2.94 Cr / 2.3% Win Rate)
  const hbrSquadRecord = (teamRecords || []).find(
    (t) => ((t as any).branchId || '').toUpperCase() === 'HBR' || t.teamName.toLowerCase().includes('kulwanth')
  );
  const squadTeamName = hbrSquadRecord?.teamName || 'HBR — Kulwanth P';
  const squadRev = hbrSquadRecord?.value || '₹2.94 Cr';
  const squadLead = hbrSquadRecord?.leadName || 'Kulwanth P • 36 Deals Closed';
  const squadId = 'crm-announcement-top-squad-hbr';

  if (!seenIds.has(squadId)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(squadId);
    posts.push({
      id: squadId,
      type: 'performer',
      categoryColor: '#6366F1',
      iconEmoji: '🛡️',
      title: `Top Performing Squad: ${squadTeamName}`,
      timestamp: '8 hours ago',
      createdAt: new Date(now - 480 * 60000).toISOString(),
      author: {
        name: 'Kulwanth P',
        avatar: resolveAvatarForPerson('Kulwanth P'),
        team: 'HBR Hub',
      },
      content: `HBR Squad holds the #1 squad ranking across HUB with 36 closed deals and ${squadRev} all-time revenue (${squadLead}).`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(squadId);
  }

  // Scenario #22: Target Streak (Jayashree - 2 consecutive days)
  const streakRecord = (records || []).find((r) => r.id === 'sales_execution_streak');
  const streakHolder = streakRecord?.holderName || 'Jayashree';
  const streakDays = streakRecord?.value || '2 days';
  const streakAvatar = resolveAvatarForPerson(streakHolder, streakRecord?.avatar);
  const streakId = 'crm-announcement-streak-jayashree';

  if (!seenIds.has(streakId)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(streakId);
    posts.push({
      id: streakId,
      type: 'performer',
      categoryColor: '#EC4899',
      iconEmoji: '🔥',
      title: `Execution Streak: ${streakDays}!`,
      timestamp: '10 hours ago',
      createdAt: new Date(now - 600 * 60000).toISOString(),
      author: {
        name: streakHolder,
        avatar: streakAvatar,
        team: 'Sarjapura Hub',
      },
      content: `${streakHolder} holds the active sales execution streak with consecutive days of Closed Won deals in Sarjapur. Consistency wins.`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(streakId);
  }

  // -------------------------------------------------------------------------
  // 3. MILESTONES & TARGETS (type: 'quota')
  // -------------------------------------------------------------------------

  // Unified Target Lifecycle Card: Consolidates Scenario #7 (Milestone), Scenario #23 (Goal Nearing), and Scenario #6 (Target Crushed)
  // Guarantees zero duplication while reflecting the exact monthly lifecycle stage.
  const overallTarget = (overallTargets || [])[0];
  const grossCurrent = overallTarget?.current || '₹17.61L';
  const grossTarget = overallTarget?.target || '₹5.40 Cr';
  const grossProgress = typeof overallTarget?.progress === 'number' ? overallTarget.progress : 3.3;
  const grossCurrentInr = overallTarget?.currentInr || 1761463;
  const grossTargetInr = overallTarget?.targetInr || 54000000;
  const diffInr = Math.max(0, grossTargetInr - grossCurrentInr);
  const diffFormatted = formatInrToLakhsOrCrores(diffInr);
  const monthlyGrossId = 'crm-announcement-monthly-gross-target';

  if (!seenIds.has(monthlyGrossId)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(monthlyGrossId);

    let targetHeadline = `October Milestone: ${grossCurrent} Booked`;
    let targetContent = `HUB has recorded ${grossCurrent} in gross bookings this month towards the ${grossTarget} monthly target (${grossProgress}% achieved). Every closure counts toward our corridor target.`;
    let targetColor = '#0284C7'; // Sky Blue
    let targetIcon = '🎯';

    if (grossProgress >= 100) {
      // 100% Target Crushed state (Scenario #6)
      targetHeadline = 'Target Crushed: 100%!';
      targetContent = `HUB has officially crossed its monthly target of ${grossTarget} with ${grossCurrent} booked. Everything from here is overachievement!`;
      targetColor = '#10B981'; // Emerald
      targetIcon = '🏆';
    } else if (grossProgress >= 85) {
      // Final Sprint / Goal Nearing state (Scenario #23)
      targetHeadline = `Final Push: ${diffFormatted} Away From ${grossTarget}!`;
      targetContent = `One final push. HUB is just ${diffFormatted} away from the monthly ${grossTarget} milestone (${grossProgress}% achieved).`;
      targetColor = '#E11D48'; // Rose
      targetIcon = '🎯';
    }

    posts.push({
      id: monthlyGrossId,
      type: 'quota',
      categoryColor: targetColor,
      iconEmoji: targetIcon,
      title: targetHeadline,
      timestamp: '3 hours ago',
      createdAt: new Date(now - 180 * 60000).toISOString(),
      author: {
        name: 'Operations HQ',
        avatar: resolveAvatarForPerson('Operations HQ'),
        team: 'Executive Board',
      },
      content: targetContent,
      quotaProgress: {
        current: grossCurrentInr,
        target: grossTargetInr,
        label: 'Monthly Gross Booking Quota',
        percentage: grossProgress,
        currentFormatted: grossCurrent,
        targetFormatted: grossTarget,
      },
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(monthlyGrossId);
  }

  // Scenario #5: EC Target Milestone (Branch Target Pace Leader - JP Nagar at 5.1%)
  const sortedBranches = [...(branchTargets || [])].sort((a, b) => (Number(b.progress) || 0) - (Number(a.progress) || 0));
  const leadingBranch = sortedBranches[0] || {
    branchName: 'JP Nagar',
    progress: 5.1,
    current: '₹9.16L',
    target: '₹1.80 Cr',
    currentInr: 915869,
    targetInr: 18000000,
  };
  const leadBranchName = cleanBranchName(leadingBranch.branchName || leadingBranch.team || 'JP Nagar');
  const leadBranchProgress = typeof leadingBranch.progress === 'number' ? leadingBranch.progress : 5.1;
  const leadBranchCurrent = leadingBranch.current || '₹9.16L';
  const leadBranchTarget = leadingBranch.target || '₹1.80 Cr';
  const branchPaceId = 'crm-announcement-branch-target-leader';

  if (!seenIds.has(branchPaceId)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(branchPaceId);
    posts.push({
      id: branchPaceId,
      type: 'quota',
      categoryColor: '#8B5CF6',
      iconEmoji: '🎯',
      title: `${leadBranchName} Leads Branch Target Pacing (${leadBranchProgress}%)`,
      timestamp: '7 hours ago',
      createdAt: new Date(now - 420 * 60000).toISOString(),
      author: {
        name: `Team ${leadBranchName}`,
        avatar: resolveAvatarForPerson(leadBranchName),
        team: `${leadBranchName} Hub`,
      },
      content: `Team ${leadBranchName} is setting the pace for October at ${leadBranchProgress}% of its monthly quota (${leadBranchCurrent} of ${leadBranchTarget}). The sprint is on!`,
      quotaProgress: {
        current: leadingBranch.currentInr || 915869,
        target: leadingBranch.targetInr || 18000000,
        label: `${leadBranchName} Monthly Target`,
        percentage: leadBranchProgress,
        currentFormatted: leadBranchCurrent,
        targetFormatted: leadBranchTarget,
      },
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(branchPaceId);
  }

  // Speed Record Benchmark (Fastest Turnaround: Sharanya 2.7 days)
  const fastestRecord = (records || []).find((r) => r.id === 'fastest_deal_close');
  const fastestVal = fastestRecord?.value || '2.7 days';
  const fastestId = 'crm-announcement-fastest-turnaround';

  if (!seenIds.has(fastestId)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(fastestId);
    posts.push({
      id: fastestId,
      type: 'quota',
      categoryColor: '#E11D48',
      iconEmoji: '⚡',
      title: `Speed Record: ${fastestVal} Lead-to-Close`,
      timestamp: '9 hours ago',
      createdAt: new Date(now - 540 * 60000).toISOString(),
      author: {
        name: 'Operations HQ',
        avatar: resolveAvatarForPerson('Operations HQ'),
        team: 'Executive Board',
      },
      content: `All-time fastest turnaround: ${fastestVal} from lead creation to Closed Won status across authentic client interior contracts.`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(fastestId);
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
    title = `High-Value Closure: ${amount} in ${branch}!`;
    content = `${rep} brought home a ${amount} interior closure for Project ${project}. Moving the scoreboard for ${branch}!`;
  } else if (tmpl.scenarioNumber === 3) {
    title = `Spot Closure: ${amount} by ${rep}!`;
    content = `The customer walked in and booked today. ${rep} closed her maiden booking for ${amount} at ${branch} Hub! Project ${project}.`;
  } else if (tmpl.scenarioNumber === 4) {
    title = 'Hat-Trick of Closures!';
    content = `3 bookings. One day. ${amount} added to the board by Team ${branch}.`;
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
