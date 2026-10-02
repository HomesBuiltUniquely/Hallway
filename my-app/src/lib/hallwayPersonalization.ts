import type { HallwayTodayEvent, HallwayActionGroup, HallwayActionItem } from '../types/hallway';
import type { User } from '../types';
import { isSuperAdmin } from './permissions';

/**
 * Returns personalized Today's Schedule for the current user.
 * - Admin in 'my' mode: Returns leadership syncs, executive pipeline reviews, and key client meetings.
 * - Admin in 'all' mode: Returns company-wide corridor meetings.
 * - Sales Rep: Returns meetings where rep is organizer/attendee.
 * - Designer: Returns design consultations and 3D concept presentations.
 */
export function getPersonalizedSchedule(
  allEvents: HallwayTodayEvent[],
  user?: User | null,
  mode: 'my' | 'all' = 'my'
): HallwayTodayEvent[] {
  if (!user) return allEvents;

  const isAdmin = isSuperAdmin(user);
  if (isAdmin && mode === 'all') {
    return allEvents;
  }

  const nameLower = (user.name || '').toLowerCase().trim();
  const emailLower = (user.email || '').toLowerCase().trim();
  const firstName = nameLower.split(' ')[0] || '';

  // 1. Sachin Shekar (Admin / Leadership)
  if (nameLower.includes('sachin') || emailLower.includes('sachin')) {
    return [
      {
        id: 'sachin-evt-1',
        time: '10:30 AM',
        title: 'EXECUTIVE SYNC — Sachin Shekar / Ranjith',
        location: 'SARJAPUR',
        isLink: true,
        linkUrl: 'https://meet.google.com/hub-leadership-sync',
        category: 'Leadership',
        startAt: '2026-10-02T05:00:00Z',
      },
      {
        id: 'sachin-evt-2',
        time: '2:30 PM',
        title: 'SALES PIPELINE REVIEW — Sachin Shekar / Branch Managers',
        location: 'VIRTUAL',
        isLink: true,
        linkUrl: 'https://meet.google.com/hub-pipeline-review',
        category: 'Review',
        startAt: '2026-10-02T09:00:00Z',
      },
      {
        id: 'sachin-evt-3',
        time: '4:30 PM',
        title: 'HIGH VALUE CLOSURE — Sachin Shekar / Prestige Lakeside Project',
        location: 'SARJAPUR',
        isLink: false,
        linkUrl: null,
        category: 'Showroom Visit',
        startAt: '2026-10-02T11:00:00Z',
      },
    ];
  }

  // 2. Ranjith (Admin / Operations)
  if (nameLower.includes('ranjith') || emailLower.includes('ranjith')) {
    return [
      {
        id: 'ranjith-evt-1',
        time: '10:30 AM',
        title: 'EXECUTIVE SYNC — Ranjith / Sachin Shekar',
        location: 'SARJAPUR',
        isLink: true,
        linkUrl: 'https://meet.google.com/hub-leadership-sync',
        category: 'Leadership',
        startAt: '2026-10-02T05:00:00Z',
      },
      {
        id: 'ranjith-evt-2',
        time: '3:00 PM',
        title: 'HBR HUB OPERATIONS AUDIT — Ranjith / Kulwanth P',
        location: 'HBR',
        isLink: true,
        linkUrl: 'https://meet.google.com/hub-ops-audit',
        category: 'Operations',
        startAt: '2026-10-02T09:30:00Z',
      },
    ];
  }

  // 3. Susmita (Super Admin / Design Head)
  if (nameLower.includes('susmita') || emailLower.includes('susmita')) {
    return [
      {
        id: 'susmita-evt-1',
        time: '11:30 AM',
        title: 'DESIGN ACCELERATION REVIEW — Susmita / TDM Leads',
        location: 'VIRTUAL',
        isLink: true,
        linkUrl: 'https://meet.google.com/hub-design-lead-sync',
        category: 'Design Lead',
        startAt: '2026-10-02T06:00:00Z',
      },
      {
        id: 'susmita-evt-2',
        time: '3:30 PM',
        title: 'PREMIUM CLIENT PORTFOLIO SIGN-OFF — Susmita / Maya Lin',
        location: 'SARJAPUR',
        isLink: false,
        linkUrl: null,
        category: 'Design Approval',
        startAt: '2026-10-02T10:00:00Z',
      },
    ];
  }

  // 4. Other Admins / Super Admin
  if (isAdmin) {
    return [
      {
        id: 'admin-evt-1',
        time: '11:00 AM',
        title: 'COMPANY LEADERSHIP REVIEW — Super Admin / Corridor Leads',
        location: 'SARJAPUR',
        isLink: true,
        linkUrl: 'https://meet.google.com/hub-leadership-sync',
        category: 'Leadership',
        startAt: '2026-10-02T05:30:00Z',
      },
      {
        id: 'admin-evt-2',
        time: '3:00 PM',
        title: 'CORRIDOR REVENUE PACING AUDIT — Super Admin / Finance',
        location: 'VIRTUAL',
        isLink: true,
        linkUrl: 'https://meet.google.com/hub-audit',
        category: 'Operations',
        startAt: '2026-10-02T09:30:00Z',
      },
    ];
  }

  // 5. Designers (e.g. Abhishek, Maya Lin)
  const isDesignUser =
    user.department === 'Design' ||
    (user.role || '').toUpperCase().includes('DESIGN');

  if (isDesignUser) {
    return [
      {
        id: 'design-evt-1',
        time: '11:00 AM',
        title: `3D CONCEPT PRESENTATION — ${user.name} / Modern Villa`,
        location: 'VIRTUAL',
        isLink: true,
        linkUrl: 'https://meet.google.com/hub-design-presentation',
        category: 'Design Presentation',
        startAt: '2026-10-02T05:30:00Z',
      },
      {
        id: 'design-evt-2',
        time: '2:30 PM',
        title: `MATERIAL SELECTION & MOOD BOARD — ${user.name} / Penthouse`,
        location: 'SARJAPUR',
        isLink: false,
        linkUrl: null,
        category: 'Showroom Consultation',
        startAt: '2026-10-02T09:00:00Z',
      },
    ];
  }

  // 6. Sales Representatives: Filter allEvents matching their name/handle/email
  const userEvents = allEvents.filter((ev) => {
    const title = ev.title.toLowerCase();
    const link = (ev.linkUrl || '').toLowerCase();
    return (
      title.includes(nameLower) ||
      (firstName.length > 2 && title.includes(firstName)) ||
      (emailLower && link.includes(emailLower))
    );
  });

  return userEvents;
}

/**
 * Returns personalized Action items for the current user.
 * - Admin in 'my' mode: Executive approvals, discount authorizations, milestone releases.
 * - Admin in 'all' mode: All 11 corridor lead follow-ups across sales reps.
 * - Sales Rep: Leads specifically assigned to that rep.
 * - Designer: Design deliverables and 3D review approvals.
 */
export function getPersonalizedActions(
  allGroups: HallwayActionGroup[],
  user?: User | null,
  mode: 'my' | 'all' = 'my'
): HallwayActionGroup[] {
  if (!user) return allGroups;

  const isAdmin = isSuperAdmin(user);
  if (isAdmin && mode === 'all') {
    return allGroups;
  }

  const nameLower = (user.name || '').toLowerCase().trim();
  const emailLower = (user.email || '').toLowerCase().trim();

  // 1. Sachin Shekar (Admin / Leadership)
  if (nameLower.includes('sachin') || emailLower.includes('sachin')) {
    return [
      {
        id: 'sachin-approvals',
        title: 'Quote & Margin Approvals',
        count: 2,
        urgent: true,
        items: [
          {
            id: 's-appr-1',
            name: 'Prestige Willow — ₹18.4L Quote Approval (Aman)',
            detail: 'Margin 21% · Requires Admin Sign-off',
            done: false,
          },
          {
            id: 's-appr-2',
            name: 'Sobha Dream — 4% Commercial Discount Request (Meghana)',
            detail: 'HBR Corridor · Urgent Decision Needed',
            done: false,
          },
        ],
      },
      {
        id: 'sachin-reviews',
        title: 'Milestone & Performance Sign-offs',
        count: 2,
        urgent: false,
        items: [
          {
            id: 's-appr-3',
            name: 'September Gross Booking Commission Release',
            detail: 'Finance Validation Pending',
            done: false,
          },
          {
            id: 's-appr-4',
            name: 'Q4 Sarjapur & HBR Target Allocation Approval',
            detail: 'Leadership Review',
            done: false,
          },
        ],
      },
    ];
  }

  // 2. Ranjith (Admin / Operations)
  if (nameLower.includes('ranjith') || emailLower.includes('ranjith')) {
    return [
      {
        id: 'ranjith-approvals',
        title: 'Operations & Vendor Approvals',
        count: 2,
        urgent: true,
        items: [
          {
            id: 'r-appr-1',
            name: 'HBR Hub Display Unit Refurbishment Sign-off',
            detail: 'Commercial Budget Approval · ₹2.4L',
            done: false,
          },
          {
            id: 'r-appr-2',
            name: 'Vendor Raw Material Rate Escalation Review',
            detail: 'Operations Committee Sign-off',
            done: false,
          },
        ],
      },
    ];
  }

  // 3. Susmita (Super Admin / Design Head)
  if (nameLower.includes('susmita') || emailLower.includes('susmita')) {
    return [
      {
        id: 'susmita-approvals',
        title: 'Design Quality (DQC) Sign-offs',
        count: 2,
        urgent: true,
        items: [
          {
            id: 'sus-appr-1',
            name: 'Penthouse 1204 — Final Modular Detail Drawing Approval',
            detail: 'Production Ready Sign-off',
            done: false,
          },
          {
            id: 'sus-appr-2',
            name: 'Luxury Wardrobe Finish Deviation Request',
            detail: 'Client Approval Needed',
            done: false,
          },
        ],
      },
    ];
  }

  // 4. General Admin
  if (isAdmin) {
    return [
      {
        id: 'admin-approvals',
        title: 'Executive Approvals & Sign-offs',
        count: 2,
        urgent: true,
        items: [
          {
            id: 'adm-appr-1',
            name: 'Special Commercial Pricing Approval — Project Lakeside',
            detail: 'Requires Super Admin Sign-off',
            done: false,
          },
          {
            id: 'adm-appr-2',
            name: 'Corridor Monthly Incentive Distribution Authorization',
            detail: 'Due today · Operations & Finance',
            done: false,
          },
        ],
      },
    ];
  }

  // 5. Designer (e.g. Abhishek, Maya Lin)
  const isDesignUser =
    user.department === 'Design' ||
    (user.role || '').toUpperCase().includes('DESIGN');

  if (isDesignUser) {
    return [
      {
        id: 'design-tasks',
        title: 'Design Deliverables',
        count: 2,
        urgent: true,
        items: [
          {
            id: 'des-act-1',
            name: 'Upload 3D Photorealistic Renders — Villa 402',
            detail: 'Due today · Client Review Stage',
            done: false,
          },
          {
            id: 'des-act-2',
            name: 'Revise Modular Kitchen CAD Drawing for Production',
            detail: 'Due today · Factory Handoff',
            done: false,
          },
        ],
      },
    ];
  }

  // 6. Sales Representatives: Filter assigned leads from allGroups
  const leadAssigneeMap: Record<string, string[]> = {
    meghana: ['lokesh', 'sharada'],
    aman: ['satya', 'suraj', 'raj reddy'],
    somashekar: ['mohan kumar'],
    bilal: ['anupam whatsapp'],
    danush: ['rupinder singh'],
    jayashree: ['jai', 'pujitha'],
    shaddisha: ['sham'],
  };

  const userKey = Object.keys(leadAssigneeMap).find((k) => nameLower.includes(k));
  const assignedLeads = userKey ? leadAssigneeMap[userKey] : [];

  if (assignedLeads.length > 0) {
    const rawItems = allGroups.flatMap((g) => g.items || []);
    const userItems: HallwayActionItem[] = rawItems.filter((it) => {
      const itName = it.name.toLowerCase();
      return assignedLeads.some((assigned) => itName.includes(assigned));
    });

    if (userItems.length > 0) {
      return [
        {
          id: `assigned-${userKey}`,
          title: 'My Lead Follow-ups',
          count: userItems.length,
          urgent: true,
          items: userItems,
        },
      ];
    }
  }

  // Default: Return empty actions for clean empty state
  return [];
}
