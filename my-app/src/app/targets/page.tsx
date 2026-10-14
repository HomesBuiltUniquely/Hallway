'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  CorridorGate,
} from '../../components/hallway/CorridorGate';
import { useCorridorScope } from '../../components/hallway/CorridorScopeBar';
import DepartmentPills from '../../components/common/DepartmentPills';
import FeedCard from '../../components/home/FeedCard';
import { FeedPost } from '../../types';
import EmptyState from '../../components/common/EmptyState';

const defaultTargetPosts: FeedPost[] = [
  {
    id: 'crm-target-all-current',
    type: 'quota',
    categoryColor: '#8B5CF6',
    iconEmoji: '🎯',
    title: 'All Hubs (Overall) : Monthly gross booking: ₹71.67L achieved (14.9%)',
    timestamp: 'Just now',
    createdAt: new Date().toISOString(),
    author: {
      name: 'Hub Operations',
      avatar: '',
      team: 'Operations HQ',
    },
    content:
      'Monthly gross booking pacing across all corridors is at ₹71.67L towards the ₹4.80 Cr target (14.9% achieved).',
    quotaProgress: {
      current: 7167288,
      target: 48000000,
      label: 'All Hubs (Overall) Target',
      percentage: 14.9,
      currentFormatted: '₹71.67L',
      targetFormatted: '₹4.80 Cr',
    },
    reactions: {},
    commentsCount: 1,
    comments: [
      {
        id: 'c-all-1',
        authorName: 'Ranjith',
        authorHandle: 'ranjith',
        authorAvatar: '',
        authorRole: 'ADMIN',
        content: 'Great momentum across all 3 hubs this week! Keep pushing for the 4.80 Cr quota 🚀',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        timestamp: '1 hour ago',
        likes: 2,
        userLiked: false,
      },
    ],
    department: 'Sales',
  },
  {
    id: 'crm-target-JP_NAGAR-current',
    type: 'quota',
    categoryColor: '#8B5CF6',
    iconEmoji: '🎯',
    title: 'JP Nagar: Monthly gross booking: ₹31.82L achieved (26.5%)',
    timestamp: 'Just now',
    createdAt: new Date().toISOString(),
    author: {
      name: 'JP Nagar Operations',
      avatar: '',
      team: 'JP Nagar Hub',
    },
    content:
      'JP Nagar Hub monthly gross booking pacing is at ₹31.82L towards the ₹1.20 Cr branch target (26.5% achieved).',
    quotaProgress: {
      current: 3181997,
      target: 12000000,
      label: 'JP Nagar Target',
      percentage: 26.5,
      currentFormatted: '₹31.82L',
      targetFormatted: '₹1.20 Cr',
    },
    reactions: {},
    commentsCount: 0,
    comments: [],
    department: 'Sales',
  },
  {
    id: 'crm-target-SARJAPUR-current',
    type: 'quota',
    categoryColor: '#8B5CF6',
    iconEmoji: '🎯',
    title: 'Sarjapura: Monthly gross booking: ₹24.40L achieved (20.3%)',
    timestamp: 'Just now',
    createdAt: new Date().toISOString(),
    author: {
      name: 'Sarjapura Operations',
      avatar: '',
      team: 'Sarjapura Hub',
    },
    content:
      'Sarjapura Hub monthly gross booking pacing is at ₹24.40L towards the ₹1.20 Cr branch target (20.3% achieved).',
    quotaProgress: {
      current: 2439911,
      target: 12000000,
      label: 'Sarjapura Target',
      percentage: 20.3,
      currentFormatted: '₹24.40L',
      targetFormatted: '₹1.20 Cr',
    },
    reactions: {},
    commentsCount: 0,
    comments: [],
    department: 'Sales',
  },
  {
    id: 'crm-target-HBR-current',
    type: 'quota',
    categoryColor: '#8B5CF6',
    iconEmoji: '🎯',
    title: 'HBR Layout: Monthly gross booking: ₹15.45L achieved (6.4%)',
    timestamp: 'Just now',
    createdAt: new Date().toISOString(),
    author: {
      name: 'HBR Layout Operations',
      avatar: '',
      team: 'HBR Layout Hub',
    },
    content:
      'HBR Layout Hub monthly gross booking pacing is at ₹15.45L towards the ₹2.40 Cr branch target (6.4% achieved).',
    quotaProgress: {
      current: 1545380,
      target: 24000000,
      label: 'HBR Layout Target',
      percentage: 6.4,
      currentFormatted: '₹15.45L',
      targetFormatted: '₹2.40 Cr',
    },
    reactions: {},
    commentsCount: 0,
    comments: [],
    department: 'Sales',
  },
];

function TargetsInner() {
  const { branchId } = useCorridorScope();
  const { feedPosts } = useApp();

  // Target posts dynamically from live CRM feed in AppContext
  const dynamicTargetPosts = feedPosts.filter(
    (p) => p.type === 'quota' || p.id?.startsWith('crm-target-')
  );

  const postsToUse = dynamicTargetPosts.length > 0 ? dynamicTargetPosts : defaultTargetPosts;

  // Filter based on corridor scope if a specific branch is selected
  const displayedPosts = postsToUse.filter((post) => {
    if (!branchId || branchId === 'all') return true;
    const b = branchId.toLowerCase();
    const pid = post.id.toLowerCase();
    const ptitle = post.title.toLowerCase();
    const pcontent = post.content.toLowerCase();
    return (
      pid.includes(b) ||
      ptitle.includes(b) ||
      pcontent.includes(b) ||
      pid.includes('overall') ||
      pid.includes('all')
    );
  });

  return (
    <div className="space-y-6">
      {/* Department Filter Pills */}
      <DepartmentPills />

      {/* Target Section Header exactly matching the reference screenshot */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-600 dark:bg-violet-400 shrink-0" />
          <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
            MONTHLY TARGETS
          </h2>
        </div>
        <span className="text-xs sm:text-sm text-slate-400 font-medium">
          Corridor pacing in real-time
        </span>
      </div>

      {/* Clean vertical stack of dynamic target cards */}
      <div className="space-y-4">
        {displayedPosts.map((post) => (
          <FeedCard key={post.id} post={post} />
        ))}
      </div>

      {displayedPosts.length === 0 && (
        <EmptyState
          title="No targets matching scope"
          description="Select 'All branches' or adjust corridor filters to inspect branch quotas."
        />
      )}
    </div>
  );
}

export default function TargetsPage() {
  return (
    <CorridorGate>
      <TargetsInner />
    </CorridorGate>
  );
}
