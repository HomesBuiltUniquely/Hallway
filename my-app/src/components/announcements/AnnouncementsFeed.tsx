'use client';

import React, { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import HubLiveFeedCard from './HubLiveFeedCard';

type TagFilter = 'ALL' | 'DEALS' | 'ANNOUNCEMENTS' | 'PERFORMERS' | 'MILESTONES';

/**
 * Shared company announcements stream (same cards as /announcements).
 * When `compact` is true, ~3 cards are visible with vertical scroll for the rest.
 */
export default function AnnouncementsFeed({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { announcementPosts, searchQuery, setSearchQuery } = useApp();
  const [tagFilter, setTagFilter] = useState<TagFilter>('ALL');

  const eligibleAnnouncements = (announcementPosts || []).filter(
    (post) => !post.id.startsWith('crm-target-')
  );

  const tabCounts = {
    ALL: eligibleAnnouncements.length,
    ANNOUNCEMENTS: eligibleAnnouncements.filter(
      (p) => p.type === 'announcement' || p.type === 'general'
    ).length,
    DEALS: eligibleAnnouncements.filter((p) => p.type === 'booking').length,
    PERFORMERS: eligibleAnnouncements.filter((p) => p.type === 'performer').length,
    MILESTONES: eligibleAnnouncements.filter((p) => p.type === 'quota').length,
  };

  const allTabs = [
    { id: 'ALL' as const, label: 'All Updates', count: tabCounts.ALL },
    { id: 'ANNOUNCEMENTS' as const, label: 'Company Broadcasts', count: tabCounts.ANNOUNCEMENTS },
    { id: 'DEALS' as const, label: 'Deals & Bookings', count: tabCounts.DEALS },
    { id: 'PERFORMERS' as const, label: 'Top Performers', count: tabCounts.PERFORMERS },
    { id: 'MILESTONES' as const, label: 'Milestones & Targets', count: tabCounts.MILESTONES },
  ];

  const visibleTabs = allTabs.filter((tab) => tab.id === 'ALL' || tab.count > 0);

  useEffect(() => {
    if (tagFilter !== 'ALL' && tabCounts[tagFilter] === 0) {
      setTagFilter('ALL');
    }
  }, [tagFilter, tabCounts.ANNOUNCEMENTS, tabCounts.DEALS, tabCounts.PERFORMERS, tabCounts.MILESTONES]);

  const filteredAnnouncements = eligibleAnnouncements.filter((post) => {
    if (tagFilter === 'DEALS' && post.type !== 'booking') return false;
    if (tagFilter === 'ANNOUNCEMENTS' && post.type !== 'announcement' && post.type !== 'general')
      return false;
    if (tagFilter === 'PERFORMERS' && post.type !== 'performer') return false;
    if (tagFilter === 'MILESTONES' && post.type !== 'quota') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        post.title.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        post.author?.name.toLowerCase().includes(q) ||
        post.comments?.some(
          (c) => c.content.toLowerCase().includes(q) || c.authorName.toLowerCase().includes(q)
        )
      );
    }
    return true;
  });

  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    const getTime = (p: typeof a) => {
      if (p.createdAt) {
        const t = new Date(p.createdAt).getTime();
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-1.5">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTagFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                tagFilter === tab.id
                  ? 'bg-brand text-white shadow-xs font-bold'
                  : 'bg-white dark:bg-panel border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-surface-muted dark:hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {searchQuery && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>
              Filter: <strong>&quot;{searchQuery}&quot;</strong>
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-rose-500 hover:underline font-semibold cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div
        className={
          compact
            ? 'flex w-full flex-col gap-5 max-h-[42rem] overflow-x-hidden overflow-y-auto pr-1 scroll-smooth'
            : 'flex w-full flex-col gap-5'
        }
      >
        {sortedAnnouncements.map((post) => (
          <HubLiveFeedCard key={post.id} post={post} />
        ))}
      </div>

      {sortedAnnouncements.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <Megaphone className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">
            {tagFilter === 'ANNOUNCEMENTS'
              ? 'No active company broadcasts.'
              : 'No announcements matching current filter.'}
          </p>
        </div>
      )}
    </div>
  );
}
