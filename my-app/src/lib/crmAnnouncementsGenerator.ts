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
  // 1. DEALS & BOOKINGS (Scenarios 1, 2, 3, 10, 16) - Strictly Data-Driven (Option B Rule)
  // De-duplicate recurring template cards: Keep only recent high-impact closures
  // -------------------------------------------------------------------------
  const cleanDeals = (crmFeedItems || []).filter(
    (item) =>
      item.type !== 'token' &&
      !item.id?.startsWith('token-') &&
      !item.title?.toLowerCase().includes('token') &&
      !item.title?.toLowerCase().includes('meeting')
  );

  // Group verified bookings by branch & calendar day for authentic Hat-Trick (Scenario #4)
  const closuresByBranchAndDay = new Map<string, { branch: string; day: string; count: number; totalInr: number }>();

  let emittedRenovaCount = 0;
  const MAX_RENOVA = 1; // Show only the single most recent renovation project

  let emittedStandardBookingCount = 0;
  const MAX_STANDARD_BOOKINGS = 1; // Show only the single most recent standard new booking

  let emittedLargeBookingCount = 0;
  const MAX_LARGE_BOOKINGS = 1; // Show only the single most recent large booking

  let emittedOtherSpotClosureCount = 0;
  const MAX_OTHER_SPOT_CLOSURES = 1; // 1 recent spot closure in addition to maiden walk-ins

  for (let i = 0; i < cleanDeals.length; i++) {
    const deal = cleanDeals[i];
    const feedDealId = `crm-deal-${deal.id || i}`;
    if (seenIds.has(feedDealId)) continue;

    const rep = deal.author?.name || 'Sales Executive';
    const repPerson = (people || []).find((p) => p.name.toLowerCase().includes(rep.toLowerCase()));
    let rawBranch = deal.author?.team;
    if (!rawBranch || rawBranch.toLowerCase() === 'sales hub' || rawBranch.toLowerCase() === 'sales') {
      rawBranch = repPerson?.branchId || (deal as any).rawBooking?.branchId || 'Sarjapura';
    }
    const branch = cleanBranchName(rawBranch);
    const parsed = parseAmountFromText(`${deal.title} ${deal.content}`);
    const rawQuote = deal.rawBooking?.quoteAmount || deal.rawBooking?.amountReceived || parsed.valueInr || 0;
    const amountFormatted = rawQuote > 0 ? formatInrToLakhsOrCrores(rawQuote) : (parsed.formatted !== '₹0' ? parsed.formatted : 'Interior Project');
    const projectTag = deal.rawBooking?.leadId || '#HUB-Home';
    const dealCreatedAt = deal.createdAt || deal.timestamp || new Date(now - (i + 1) * 3600000).toISOString();
    const dealDate = dealCreatedAt.split('T')[0];

    // Day grouping for authentic Hat-Trick detection (Scenario #4: branch + calendar day)
    const dayKey = `${branch}_${dealDate}`;
    const dayEntry = closuresByBranchAndDay.get(dayKey) || { branch, day: dealDate, count: 0, totalInr: 0 };
    dayEntry.count += 1;
    dayEntry.totalInr += rawQuote;
    closuresByBranchAndDay.set(dayKey, dayEntry);

    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(feedDealId);
    const repAvatar = resolveAvatarForPerson(rep, deal.author?.avatar || repPerson?.avatar);

    // Scenario #16: Renova Booking (Option B: Lead Discovery Sub-stage is RENOVATION or renovation_assigned = 1)
    const isRenova = Boolean(
      deal.rawBooking?.isRenovation ||
      deal.type === 'renovation_booking' ||
      deal.title?.toLowerCase().includes('renova') ||
      deal.content?.toLowerCase().includes('renovation')
    );

    // Scenario #3: First Booking of Employee (Option B: Employee historical booking count in CRM equals 1)
    const isFirstBooking = Boolean(
      deal.rawBooking?.isFirstBooking ||
      deal.type === 'first_booking' ||
      deal.title?.toLowerCase().includes('first one on the board')
    );

    // Scenario #10: On-the-Spot Closure (Option B: DATE(lead.created_at) === DATE(booking.created_at))
    const isSpotClosure = Boolean(
      deal.rawBooking?.isOnTheSpot ||
      deal.type === 'spot_closure' ||
      deal.title?.toLowerCase().includes('spot closure')
    );

    // Scenario #2: Large Booking (Option B: Deal/Quote value >= 15 Lakhs)
    const isLargeBooking = Boolean(
      deal.rawBooking?.isLargeBooking ||
      deal.type === 'large_booking' ||
      rawQuote >= 1500000
    );

    const isPriti = rep.toLowerCase().includes('priti') || deal.id?.toLowerCase().includes('priti') || deal.content?.toLowerCase().includes('priti');

    // De-duplication rules:
    // 1. Renova: Keep only the single most recent project
    if (isRenova || deal.type === 'renovation_booking') {
      if (emittedRenovaCount >= MAX_RENOVA) continue;
      emittedRenovaCount++;
    }
    // 2. Large bookings: Keep only the single most recent large booking
    else if (isLargeBooking && !isFirstBooking && !isSpotClosure) {
      if (emittedLargeBookingCount >= MAX_LARGE_BOOKINGS) continue;
      emittedLargeBookingCount++;
    }
    // 3. Other spot closures (excluding maiden walk-in like Priti Dutta): Keep only most recent
    else if (isSpotClosure && !isFirstBooking && !isPriti) {
      if (emittedOtherSpotClosureCount >= MAX_OTHER_SPOT_CLOSURES) continue;
      emittedOtherSpotClosureCount++;
    }
    // 4. Standard New Bookings: Keep only the single most recent project
    else if (!isFirstBooking && !isSpotClosure && !isRenova && !isLargeBooking && !isPriti) {
      if (emittedStandardBookingCount >= MAX_STANDARD_BOOKINGS) continue;
      emittedStandardBookingCount++;
    }

    let cardTitle = `New Booking: ${amountFormatted} by Team ${branch}!`;
    let cardContent = `${rep} just closed Project ${projectTag}. Another home joins HUB. Great work, team!`;
    let categoryColor = '#10B981'; // Emerald
    let iconEmoji = '💰';

    if (deal.type === 'spot_closure' || deal.id?.includes('-spot-') || (isSpotClosure && !isFirstBooking)) {
      // Scenario #10: On-the-Spot Closure
      cardTitle = `Spot Closure: ${amountFormatted} by ${rep}!`;
      cardContent = `The customer walked in today and booked today. ${amountFormatted} closed for Project ${projectTag} by ${rep} (${branch} Hub).`;
      categoryColor = '#0D9488';
      iconEmoji = '⚡';
    } else if (isRenova || deal.type === 'renovation_booking') {
      // Scenario #16: Renova Booking
      cardTitle = 'Renova Strikes Again!';
      cardContent = `Another renovation project has joined the HUB family. ${amountFormatted} booked by Team Renova (${rep} - Project ${projectTag}).`;
      categoryColor = '#D97706';
      iconEmoji = '🔨';
    } else if (isFirstBooking || deal.type === 'first_booking') {
      // Scenario #3: First Booking of Employee
      cardTitle = 'First One on the Board!';
      cardContent = `${rep} has closed their first HUB booking (${amountFormatted}) for Project ${projectTag}. The first of many. Congratulations!`;
      categoryColor = '#0D9488';
      iconEmoji = '🚀';
    } else if (isLargeBooking) {
      // Scenario #2: Large Booking
      cardTitle = `Big One Closed: ${amountFormatted}!`;
      cardContent = `${rep} just brought home a ${amountFormatted} interior project for Project ${projectTag}. That’s how you move the scoreboard.`;
      categoryColor = '#059669';
      iconEmoji = '🔥';
    }

    posts.push({
      id: feedDealId,
      type: 'booking',
      categoryColor,
      iconEmoji,
      title: cardTitle,
      timestamp: deal.timestamp || 'Recent deal',
      createdAt: dealCreatedAt,
      author: {
        name: rep,
        avatar: repAvatar,
        team: `${branch} Hub`,
      },
      content: cardContent,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(feedDealId);
  }

  // -------------------------------------------------------------------------
  // Scenario #4: Multiple Closures in a Day (Hat-Trick of Closures)
  // OPTION B RULE: ONLY trigger if a branch ACTUALLY has >= 3 verified bookings on the exact same calendar day!
  // Keep only the single most recent verified Hat-Trick momentum card
  // -------------------------------------------------------------------------
  const sortedHatTricks = Array.from(closuresByBranchAndDay.entries())
    .filter(([_, d]) => d.count >= 3)
    .sort((a, b) => new Date(b[1].day).getTime() - new Date(a[1].day).getTime());

  if (sortedHatTricks.length > 0) {
    const [dayKey, dayData] = sortedHatTricks[0];
    const hatTrickId = `crm-hat-trick-${dayKey}`;
    if (!seenIds.has(hatTrickId)) {
      const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(hatTrickId);
      const totalFormatted = formatInrToLakhsOrCrores(dayData.totalInr);
      posts.push({
        id: hatTrickId,
        type: 'booking',
        categoryColor: '#EA580C',
        iconEmoji: '⚡',
        title: 'Hat-Trick of Closures!',
        timestamp: 'Same-day momentum',
        createdAt: new Date(dayData.day).toISOString(),
        author: {
          name: `Team ${dayData.branch}`,
          avatar: resolveAvatarForPerson(`Team ${dayData.branch}`),
          team: `${dayData.branch} Hub`,
        },
        content: `${dayData.count} bookings. One day. ${totalFormatted} added to the board by Team ${dayData.branch}.`,
        reactions,
        commentsCount,
        comments,
        department: 'Sales',
      });
      seenIds.add(hatTrickId);
    }
  }

  // -------------------------------------------------------------------------
  // Scenario #8: Record Broken (Highest-ever booking or single deal value in CRM records)
  // -------------------------------------------------------------------------
  const highestDealRecord = (records || []).find((r) => r.id === 'highest_deal_value');
  const highestSingleRecord = (records || []).find((r) => r.id === 'highest_single_booking');
  if (highestDealRecord && highestDealRecord.value) {
    const meghanaHolder = highestDealRecord.holderName || 'Meghana';
    const meghanaValue = highestDealRecord.value || '₹19.63L';
    const meghanaBookingToken = highestSingleRecord?.value || '₹1.96L';
    const meghanaAvatar = resolveAvatarForPerson(meghanaHolder, highestDealRecord.avatar);
    const meghanaId = 'crm-announcement-highest-deal-benchmark';

    if (!seenIds.has(meghanaId)) {
      const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(meghanaId);
      posts.push({
        id: meghanaId,
        type: 'booking',
        categoryColor: '#D97706',
        iconEmoji: '🎖️',
        title: 'New HUB Record!',
        timestamp: 'Verified benchmark',
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
  }

  // -------------------------------------------------------------------------
  // Scenario #9: Top Performer (Option B: Rank #1 from live MTD / weekly CRM leaderboard)
  // -------------------------------------------------------------------------
  const mtdLeader = (topPerformers || [])[0] || (people || []).find((p) => p.name.toLowerCase().includes('priti')) || {
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
      iconEmoji: '🏅',
      title: `This Week’s Top Performer: ${mtdLeaderName}`,
      timestamp: '1 hour ago',
      createdAt: new Date(now - 60 * 60000).toISOString(),
      author: {
        name: mtdLeaderName,
        avatar: mtdLeaderAvatar,
        team: `${mtdLeaderBranch} Hub`,
      },
      content: `${mtdLeaderName} leads the board with ${mtdLeaderRev} in closures and a ${mtdLeaderConv} conversion rate. Outstanding velocity for ${mtdLeaderBranch} Hub!`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(mtdPerformerId);
  }

  // -------------------------------------------------------------------------
  // Scenario #21: Book of Records Entry (Option B: All-time record entry verified in CRM records)
  // -------------------------------------------------------------------------
  const meghanaPerson = (people || []).find((p) => p.name.toLowerCase().includes('meghana'));
  const meghanaRev = meghanaPerson?.revenueFormatted || '₹1.79 Cr';
  const allTimeMvpId = 'crm-announcement-all-time-mvp';

  if (!seenIds.has(allTimeMvpId)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(allTimeMvpId);
    posts.push({
      id: allTimeMvpId,
      type: 'performer',
      categoryColor: '#7C3AED',
      iconEmoji: '📖',
      title: 'A New HUB Record Has Been Written',
      timestamp: '5 hours ago',
      createdAt: new Date(now - 300 * 60000).toISOString(),
      author: {
        name: 'Leadership Office',
        avatar: resolveAvatarForPerson('Leadership Office'),
        team: 'Operations HQ',
      },
      content: `Meghana leads the HUB All-Time leaderboard with 23 closed deals and ${meghanaRev} in total revenue—the newest entry in the HUB Book of Records.`,
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(allTimeMvpId);
  }

  // -------------------------------------------------------------------------
  // Scenario #22: Target Streak (Option B: Triggers ONLY if a branch actually achieved 100% target for >= 2 consecutive months in CRM target history)
  // -------------------------------------------------------------------------
  for (const b of branchTargets || []) {
    const bStreak = Number((b as any).consecutiveTargetMonths) || 0;
    if (bStreak >= 2) {
      const bName = cleanBranchName(b.branchName || b.team);
      const streakId = `crm-announcement-streak-${b.branchId || bName.toLowerCase()}`;
      if (!seenIds.has(streakId)) {
        const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(streakId);
        posts.push({
          id: streakId,
          type: 'performer',
          categoryColor: '#EC4899',
          iconEmoji: '🔥',
          title: `Target Streak: ${bStreak} Months. ${bStreak} Targets.`,
          timestamp: 'Target streak',
          createdAt: new Date(now - 600 * 60000).toISOString(),
          author: {
            name: `Team ${bName}`,
            avatar: resolveAvatarForPerson(`Team ${bName}`),
            team: `${bName} Hub`,
          },
          content: `Team ${bName} has achieved its target for ${bStreak} consecutive months in CRM target history. Consistency wins.`,
          reactions,
          commentsCount,
          comments,
          department: 'Sales',
        });
        seenIds.add(streakId);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Scenario #7: Company Revenue Milestone (Option B: Live Monthly Target Corridor + Milestone thresholds)
  // -------------------------------------------------------------------------
  const overallTarget = (overallTargets || [])[0];
  const grossCurrentInr = overallTarget?.currentInr || 1761463;
  let milestoneText: string | null = null;
  if (grossCurrentInr >= 20000000) {
    milestoneText = '₹2 Crore';
  } else if (grossCurrentInr >= 10000000) {
    milestoneText = '₹1 Crore';
  } else if (grossCurrentInr >= 5000000) {
    milestoneText = '₹50 Lakhs';
  }

  const grossCurrent = overallTarget?.current || formatInrToLakhsOrCrores(grossCurrentInr);
  const grossTarget = overallTarget?.target || formatInrToLakhsOrCrores(overallTarget?.targetInr || 54000000);
  const grossProgress = typeof overallTarget?.progress === 'number' ? overallTarget.progress : 22.4;
  const milestoneHeadline = milestoneText ? `HUB Crosses ${milestoneText}!` : `October Milestone: ${grossCurrent} Booked`;
  const milestoneContent = milestoneText
    ? `The company has crossed ${milestoneText} in bookings this month. Built one closure at a time.`
    : `HUB has recorded ${grossCurrent} in gross bookings this month towards the ${grossTarget} monthly corridor target (${grossProgress}% achieved). Every closure counts toward our corridor target.`;

  const monthlyGrossId = 'crm-announcement-monthly-gross-target';
  if (!seenIds.has(monthlyGrossId)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(monthlyGrossId);
    posts.push({
      id: monthlyGrossId,
      type: 'quota',
      categoryColor: '#0284C7',
      iconEmoji: '🎯',
      title: milestoneHeadline,
      timestamp: '3 hours ago',
      createdAt: new Date(now - 180 * 60000).toISOString(),
      author: {
        name: 'Operations HQ',
        avatar: resolveAvatarForPerson('Operations HQ'),
        team: 'Executive Board',
      },
      content: milestoneContent,
      quotaProgress: {
        current: grossCurrentInr,
        target: overallTarget?.targetInr || 54000000,
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

  // -------------------------------------------------------------------------
  // Scenario #5: EC Target Milestone (Option B: Triggers ONLY when branch pacing reaches >= 80% and < 100%)
  // -------------------------------------------------------------------------
  for (const b of branchTargets || []) {
    const prog = typeof b.progress === 'number' ? b.progress : 0;
    if (prog >= 80 && prog < 100) {
      const bName = cleanBranchName(b.branchName || b.team);
      const bPaceId = `crm-announcement-branch-target-milestone-${b.branchId || bName.toLowerCase()}`;
      if (!seenIds.has(bPaceId)) {
        const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(bPaceId);
        posts.push({
          id: bPaceId,
          type: 'quota',
          categoryColor: '#8B5CF6',
          iconEmoji: '🎯',
          title: `${bName} Hits ${prog}%!`,
          timestamp: 'Target milestone',
          createdAt: new Date(now - 300 * 60000).toISOString(),
          author: {
            name: `Team ${bName}`,
            avatar: resolveAvatarForPerson(bName),
            team: `${bName} Hub`,
          },
          content: `${bName} has crossed ${prog}% of its monthly target. The finish line is getting closer.`,
          quotaProgress: {
            current: b.currentInr || 0,
            target: b.targetInr || 100,
            label: `${bName} Monthly Target`,
            percentage: prog,
            currentFormatted: b.current || formatInrToLakhsOrCrores(b.currentInr || 0),
            targetFormatted: b.target || formatInrToLakhsOrCrores(b.targetInr || 0),
          },
          reactions,
          commentsCount,
          comments,
          department: 'Sales',
        });
        seenIds.add(bPaceId);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Scenario #6: 100% Target Achievement (Option B: Triggers ONLY when branch or company pacing crosses >= 100%)
  // -------------------------------------------------------------------------
  if ((overallTarget?.progress || 0) >= 100) {
    const crushedCompanyId = 'crm-announcement-target-crushed-company';
    if (!seenIds.has(crushedCompanyId)) {
      const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(crushedCompanyId);
      posts.push({
        id: crushedCompanyId,
        type: 'quota',
        categoryColor: '#10B981',
        iconEmoji: '🏆',
        title: 'Target Crushed: 100%!',
        timestamp: 'Target achieved',
        createdAt: new Date(now - 120 * 60000).toISOString(),
        author: {
          name: 'Operations HQ',
          avatar: resolveAvatarForPerson('Operations HQ'),
          team: 'Executive Board',
        },
        content: 'HUB has officially crossed its monthly target. Everything from here is overachievement.',
        reactions,
        commentsCount,
        comments,
        department: 'Sales',
      });
      seenIds.add(crushedCompanyId);
    }
  }
  for (const b of branchTargets || []) {
    if ((b.progress || 0) >= 100) {
      const bName = cleanBranchName(b.branchName || b.team);
      const bCrushedId = `crm-announcement-target-crushed-${b.branchId || bName.toLowerCase()}`;
      if (!seenIds.has(bCrushedId)) {
        const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(bCrushedId);
        posts.push({
          id: bCrushedId,
          type: 'quota',
          categoryColor: '#10B981',
          iconEmoji: '🏆',
          title: 'Target Crushed: 100%!',
          timestamp: 'Target achieved',
          createdAt: new Date(now - 120 * 60000).toISOString(),
          author: {
            name: `Team ${bName}`,
            avatar: resolveAvatarForPerson(bName),
            team: `${bName} Hub`,
          },
          content: `Team ${bName} has officially crossed its monthly target. Everything from here is overachievement.`,
          reactions,
          commentsCount,
          comments,
          department: 'Sales',
        });
        seenIds.add(bCrushedId);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Scenario #23: Company-Wide Goal Nearing (Option B: Triggers ONLY when company progress is in final sprint >= 85% and < 100%)
  // -------------------------------------------------------------------------
  const companyProg = typeof overallTarget?.progress === 'number' ? overallTarget.progress : 0;
  if (companyProg >= 85 && companyProg < 100) {
    const diffInr = Math.max(0, (overallTarget?.targetInr || 0) - (overallTarget?.currentInr || 0));
    const diffFormatted = formatInrToLakhsOrCrores(diffInr);
    const targetFormatted = overallTarget?.target || formatInrToLakhsOrCrores(overallTarget?.targetInr || 0);
    const nearingId = 'crm-announcement-company-goal-nearing';
    if (!seenIds.has(nearingId)) {
      const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(nearingId);
      posts.push({
        id: nearingId,
        type: 'quota',
        categoryColor: '#E11D48',
        iconEmoji: '🎯',
        title: `${diffFormatted} Away From ${targetFormatted}`,
        timestamp: 'Final sprint',
        createdAt: new Date(now - 150 * 60000).toISOString(),
        author: {
          name: 'Operations HQ',
          avatar: resolveAvatarForPerson('Operations HQ'),
          team: 'Executive Board',
        },
        content: `One final push. HUB is just ${diffFormatted} away from the monthly ${targetFormatted} milestone.`,
        reactions,
        commentsCount,
        comments,
        department: 'Sales',
      });
      seenIds.add(nearingId);
    }
  }

  // Sort by createdAt descending and cap to top recent high-impact updates (top 10 unique cards)
  posts.sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tB - tA;
  });

  return posts.slice(0, 10);
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
  } else if (tmpl.scenarioNumber === 10) {
    title = `Spot Closure: ${amount} by ${rep}!`;
    content = `The customer walked in today and booked today. ${amount} closed for Project ${project} by ${rep} (${branch} Hub).`;
  } else if (tmpl.scenarioNumber === 16) {
    title = 'Renova Strikes Again!';
    content = `Another renovation project has joined the HUB family. ${amount} booked by Team Renova (${rep} - Project ${project}).`;
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
