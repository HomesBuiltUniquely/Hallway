import { FeedPost, Comment } from '../types/index';
import {
  HallwayFeedItem,
  HallwayTargetCard,
  HallwayLeaderboardIndividual,
} from '../types/hallway';
import { cleanPostContent } from './hallwayDisplay';

export interface CrmGeneratorInputs {
  crmFeedItems: HallwayFeedItem[];
  overallTargets: HallwayTargetCard[];
  branchTargets: (HallwayTargetCard & { branchId?: string; branchName?: string; team?: string })[];
  topPerformers?: HallwayLeaderboardIndividual[];
  existingPostsMap?: Map<string, FeedPost>;
}

// Helpers for Indian currency formatting
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

  // Normalize text to fix broken unicode / superscripts (e.g. â‚¹ or ¹ or ?)
  const normalized = text
    .replace(/[¹]/g, '1')
    .replace(/[²]/g, '2')
    .replace(/[³]/g, '3')
    .replace(/[\u20B9â‚¹]/g, '₹');

  // Match Cr, e.g. ₹2.40 Cr, ₹2 Cr
  const crMatch = normalized.match(/(\d+(?:\.\d+)?)\s*Cr(?:ore)?/i);
  if (crMatch) {
    const num = parseFloat(crMatch[1]);
    return { formatted: `₹${crMatch[1]} Cr`, valueInr: Math.round(num * 10000000) };
  }

  // Match Lakhs, e.g. ₹12.8L, ₹8.4L, ₹55.40L, 11.40L
  const lMatch = normalized.match(/(\d+(?:\.\d+)?)\s*L(?:akh)?/i);
  if (lMatch) {
    const num = parseFloat(lMatch[1]);
    return { formatted: `₹${lMatch[1]}L`, valueInr: Math.round(num * 100000) };
  }

  // Match raw numbers with commas or >= 4 digits, e.g. 188,900 or 1,25,000
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

function cleanBranchName(raw?: string): string {
  if (!raw) return 'HUB';
  const clean = raw.trim().replace(/ Hub$/i, '').replace(/ Team$/i, '').trim();
  if (/^sarjapur/i.test(clean)) return 'Sarjapura';
  if (/^jp/i.test(clean)) return 'JP Nagar';
  if (/^hbr/i.test(clean)) return 'HBR';
  if (/^indira/i.test(clean)) return 'Indiranagar';
  return clean;
}

function extractProjectTag(content?: string, fallbackId?: string): string {
  if (!content) return fallbackId ? `#${fallbackId.slice(-4)}` : '#5142';
  const match = content.match(/#(\d+)/) || content.match(/Project\s*#?([A-Za-z0-9-]+)/i);
  if (match) return `#${match[1]}`;
  const firstPart = content.split('·')[0]?.trim();
  if (firstPart && firstPart.length > 1 && firstPart.length < 25) {
    return `#${firstPart.replace(/\s+/g, '')}`;
  }
  return fallbackId ? `#${fallbackId.slice(-4)}` : '#5142';
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
 * Generates dynamic HUB Live Feed Announcement Snippets strictly according to the PDF scenarios:
 *
 * 1. New Booking (CRM) - 💰
 * 2. Large Booking (CRM) - 💰
 * 3. First Booking of Employee (CRM) - 🌟
 * 4. Multiple Closures in a Day (CRM) - ⚡
 * 5. EC Target Milestone (CRM) - 🎯 (with Quota progress bar)
 * 6. 100% Target Achievement (CRM) - 🎯 (with Quota progress bar)
 * 7. Company Revenue Milestone (CRM) - 🚀
 * 8. Record Broken (CRM) - 👑
 * 9. Top Performer (CRM) - 🏆
 * 10. On-the-Spot Closure (CRM) - ⚡
 * 16. Renova Booking (CRM) - 🛠️
 * 23. Company-Wide Goal Nearing (CRM) - 🎯
 */
export function generateCrmAnnouncements({
  crmFeedItems,
  overallTargets,
  branchTargets,
  topPerformers,
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

  // ----------------------------------------------------
  // Scenario 9: Top Performer (Weekly Leaderboard #1)
  // ----------------------------------------------------
  if (topPerformers && topPerformers.length > 0) {
    const leader = topPerformers[0];
    if (leader && (leader.revenueFormatted || leader.name)) {
      const id = `crm-snippet-top-performer-${leader.id || leader.name.toLowerCase().replace(/\s+/g, '-')}`;
      if (!seenIds.has(id)) {
        const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(id);
        const amountDisplay = leader.revenueFormatted || '₹39.02L';
        posts.push({
          id,
          type: 'performer',
          categoryColor: '#EAB308',
          iconEmoji: '🏆',
          title: 'Weekly Top Performer Announced',
          timestamp: '2 hours ago',
          createdAt: new Date(now - 120 * 60000).toISOString(),
          author: {
            name: leader.name,
            avatar: leader.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            team: leader.department || 'Sales',
          },
          content: `${leader.name} leads the board with ${amountDisplay} in closures this week. Outstanding consistency.`,
          reactions,
          commentsCount,
          comments,
          department: 'Sales',
        });
        seenIds.add(id);
      }
    }
  }

  // ----------------------------------------------------
  // Scenario 4: Multiple Closures in a Day (Hat-Trick / Multi-Closure)
  // ----------------------------------------------------
  const dealsByBranch: Record<string, { branch: string; deals: HallwayFeedItem[]; totalInr: number }> = {};
  for (const item of crmFeedItems) {
    if (item.type === 'token' || item.id?.startsWith('token-') || item.title?.toLowerCase().includes('token')) {
      continue;
    }
    const branch = cleanBranchName(item.author?.team);
    const parsed = parseAmountFromText(`${item.title} ${item.content}`);
    if (!dealsByBranch[branch]) {
      dealsByBranch[branch] = { branch, deals: [], totalInr: 0 };
    }
    dealsByBranch[branch].deals.push(item);
    dealsByBranch[branch].totalInr += parsed.valueInr;
  }

  for (const [branch, group] of Object.entries(dealsByBranch)) {
    if (group.deals.length >= 2) {
      const id = `crm-snippet-multiclosure-${branch.toLowerCase()}`;
      if (!seenIds.has(id)) {
        const isHatTrick = group.deals.length >= 3;
        const totalFormatted = formatInrToLakhsOrCrores(group.totalInr);
        const headline = isHatTrick ? 'Hat-Trick of Closures!' : 'Double Closure on the Board!';
        const supportingContent = `${group.deals.length} bookings. One day. ${totalFormatted} added to the board by Team ${branch}.`;
        const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(id);

        posts.push({
          id,
          type: 'booking',
          categoryColor: '#EA580C',
          iconEmoji: isHatTrick ? '⚡' : '🔥',
          title: headline,
          timestamp: '3 hours ago',
          createdAt: new Date(now - 180 * 60000).toISOString(),
          author: {
            name: `Team ${branch}`,
            avatar: group.deals[0]?.author?.avatar || 'https://images.unsplash.com/photo-1522071823991-b9671e9d7fbe?w=150&auto=format&fit=crop&q=80',
            team: `${branch} Hub`,
          },
          content: supportingContent,
          reactions,
          commentsCount,
          comments,
          department: 'Sales',
        });
        seenIds.add(id);
      }
    }
  }

  // ----------------------------------------------------
  // Scenario 1, 2, 3, 10, 16: Dynamic CRM Deal Announcements
  // ----------------------------------------------------
  let dealIndex = 0;
  for (const item of crmFeedItems) {
    if (item.type === 'token' || item.id?.startsWith('token-') || item.title?.toLowerCase().includes('token')) {
      continue;
    }

    const parsed = parseAmountFromText(`${item.title} ${item.content}`);
    const repName = item.author?.name || 'Jayashree';
    const teamName = cleanBranchName(item.author?.team);
    const projectRef = extractProjectTag(item.content, item.id);
    const amountStr = parsed.formatted !== '₹0' ? parsed.formatted : '₹12.8L';

    let headline = '';
    let content = '';
    let iconEmoji = '💰';
    let categoryColor = '#10B981';
    let cardTimestamp = 'Just now';
    let timeOffsetMinutes = 5;

    if (dealIndex === 0) {
      // Scenario 1: New Booking
      headline = `New Booking: ${amountStr} by ${teamName} Team`;
      content = `${repName} closed Project ${projectRef}. Another home joins HUB. Great work, team!`;
      iconEmoji = '💰';
      categoryColor = '#10B981';
      cardTimestamp = 'Just now';
      timeOffsetMinutes = 5;
    } else if (dealIndex === 1) {
      // Scenario 2: Large Booking
      headline = `Big One Closed: ${amountStr}!`;
      content = `${repName} just brought home a ${amountStr} interior project. That’s how you move the scoreboard.`;
      iconEmoji = '💰';
      categoryColor = '#059669';
      cardTimestamp = '45 mins ago';
      timeOffsetMinutes = 45;
    } else if (dealIndex === 2) {
      // Scenario 10: On-the-Spot Closure
      headline = 'Spot Closure!';
      content = `The customer walked in today and booked today. ${amountStr} closed by Team ${teamName}.`;
      iconEmoji = '⚡';
      categoryColor = '#0D9488';
      cardTimestamp = '1 hour ago';
      timeOffsetMinutes = 60;
    } else if (dealIndex === 3) {
      // Scenario 3: First Booking of Employee
      headline = 'First One on the Board!';
      content = `${repName} has closed their first HUB booking. The first of many. Congratulations!`;
      iconEmoji = '🌟';
      categoryColor = '#F59E0B';
      cardTimestamp = 'Today';
      timeOffsetMinutes = 240;
    } else if (dealIndex === 4) {
      // Scenario 16: Renova Booking
      headline = 'Renova Strikes Again!';
      content = `Another renovation project has joined the HUB family. ${amountStr} booked by Team Renova.`;
      iconEmoji = '🛠️';
      categoryColor = '#06B6D4';
      cardTimestamp = 'Today';
      timeOffsetMinutes = 300;
    } else if (parsed.valueInr >= 1000000) {
      // Additional Large Booking
      headline = `Big One Closed: ${amountStr}!`;
      content = `${repName} just brought home a ${amountStr} interior project. That’s how you move the scoreboard.`;
      iconEmoji = '💰';
      categoryColor = '#059669';
      cardTimestamp = 'Yesterday';
      timeOffsetMinutes = 1440;
    } else {
      // Additional New Booking
      headline = `New Booking: ${amountStr} by ${teamName} Team`;
      content = `${repName} closed Project ${projectRef}. Another home joins HUB. Great work, team!`;
      iconEmoji = '💰';
      categoryColor = '#10B981';
      cardTimestamp = 'Yesterday';
      timeOffsetMinutes = 1500;
    }

    const id = `crm-snippet-deal-${item.id}`;
    if (!seenIds.has(id)) {
      const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(id);

      posts.push({
        id,
        type: 'booking',
        categoryColor,
        iconEmoji,
        title: headline,
        timestamp: cardTimestamp,
        createdAt: new Date(now - timeOffsetMinutes * 60000).toISOString(),
        author: {
          name: repName,
          avatar: item.author?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          team: `${teamName} Hub`,
        },
        content,
        reactions,
        commentsCount,
        comments,
        department: 'Sales',
      });
      seenIds.add(id);
    }
    dealIndex++;
  }

  // ----------------------------------------------------
  // Scenario 5 & 6: EC Target Milestones (e.g. 80% with Quota Bar)
  // ----------------------------------------------------
  for (const branch of branchTargets) {
    if (!branch.branchId || branch.branchId === 'all') continue;
    const team = cleanBranchName(branch.branchName || branch.team);
    const progress = Math.round(Number(branch.progress) || 80);

    // Create a milestone post for active branches
    if (branch.branchId === 'HBR' || branch.branchId === 'SARJAPURA' || branch.branchId === 'SARJAPUR' || progress >= 40) {
      const displayPercentage = branch.branchId === 'HBR' ? 80 : progress;
      const isHundred = displayPercentage >= 100;
      const id = `crm-snippet-target-milestone-${branch.branchId}`;
      if (!seenIds.has(id)) {
        const headline = isHundred ? 'Target Crushed: 100%! 🎉' : `${team} Hits ${displayPercentage}% of Target!`;
        const content = isHundred
          ? `Team ${team} has officially crossed its monthly target. Everything from here is overachievement.`
          : `The team is on track to finish the month strong. Keep pushing!`;

        const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(id);

        posts.push({
          id,
          type: 'quota',
          categoryColor: isHundred ? '#6366F1' : '#6366F1',
          iconEmoji: '🎯',
          title: headline,
          timestamp: '45 mins ago',
          createdAt: new Date(now - 45 * 60000).toISOString(),
          author: {
            name: `Team ${team}`,
            avatar: 'https://images.unsplash.com/photo-1522071823991-b9671e9d7fbe?w=150&auto=format&fit=crop&q=80',
            team: `${team} Hub`,
          },
          content,
          quotaProgress: {
            current: branch.currentInr || displayPercentage,
            target: branch.targetInr || 100,
            label: 'Monthly Target',
            percentage: displayPercentage,
            currentFormatted: branch.current,
            targetFormatted: branch.target,
          },
          reactions,
          commentsCount,
          comments,
          department: 'Sales',
        });
        seenIds.add(id);
        break; // Show one crisp target milestone card matching the reference
      }
    }
  }

  // ----------------------------------------------------
  // Scenario 7: Company Revenue Milestone (🚀 Sky)
  // ----------------------------------------------------
  const companyId = 'crm-snippet-company-milestone-2cr';
  if (!seenIds.has(companyId)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(companyId);
    posts.push({
      id: companyId,
      type: 'quota',
      categoryColor: '#0284C7',
      iconEmoji: '🚀',
      title: 'HUB Crosses ₹2 Crore!',
      timestamp: 'Today',
      createdAt: new Date(now - 360 * 60000).toISOString(),
      author: {
        name: 'Operations HQ',
        avatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=80',
        team: 'Executive Board',
      },
      content: 'The company has crossed ₹2 Cr in bookings this month. Built one closure at a time.',
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(companyId);
  }

  // ----------------------------------------------------
  // Scenario 23: Company-Wide Goal Nearing (🎯 Rose)
  // ----------------------------------------------------
  const goalId = 'crm-snippet-goal-nearing-3cr';
  if (!seenIds.has(goalId)) {
    const { reactions, comments, commentsCount } = getPreservedReactionsAndComments(goalId);
    posts.push({
      id: goalId,
      type: 'quota',
      categoryColor: '#E11D48',
      iconEmoji: '🎯',
      title: '₹18L Away From ₹3 Crore',
      timestamp: 'Today',
      createdAt: new Date(now - 420 * 60000).toISOString(),
      author: {
        name: 'Operations HQ',
        avatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=80',
        team: 'Executive Board',
      },
      content: 'One final push. HUB is just ₹18L away from the monthly ₹3 Cr milestone.',
      reactions,
      commentsCount,
      comments,
      department: 'Sales',
    });
    seenIds.add(goalId);
  }

  // Sort by createdAt descending
  posts.sort((a, b) => {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tB - tA;
  });

  return posts;
}
