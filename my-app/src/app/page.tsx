'use client';

import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTimeBasedGreeting, getGreetingName, formatExactDateIst } from '../lib/hallwayDisplay';
import HubLiveFeedCard from '../components/announcements/HubLiveFeedCard';
import WidgetToday from '../components/home/WidgetToday';
import WidgetActions from '../components/home/WidgetActions';
import WidgetCampaign from '../components/home/WidgetCampaign';
import WidgetLeadership from '../components/home/WidgetLeadership';
import NewPostModal from '../components/home/NewPostModal';
import { canCreateAnnouncement } from '../lib/permissions';

export default function HomePage() {
  const { currentUser, announcementPosts, searchQuery, setSearchQuery, refreshFeed } = useApp();
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState<'ALL' | 'DEALS' | 'ANNOUNCEMENTS' | 'PERFORMERS' | 'MILESTONES'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [greeting, setGreeting] = useState<string>(() => getTimeBasedGreeting());

  // Periodically refresh greeting if shift crosses morning/afternoon/evening boundaries
  useEffect(() => {
    setGreeting(getTimeBasedGreeting());
    const timer = setInterval(() => {
      setGreeting(getTimeBasedGreeting());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshFeed();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Base eligible posts (Excludes raw target pacing cards which now live on /targets)
  const eligibleAnnouncements = (announcementPosts || []).filter(
    (post) => !post.id.startsWith('crm-target-')
  );

  // Dynamic Category Counts
  const tabCounts = {
    ALL: eligibleAnnouncements.length,
    ANNOUNCEMENTS: eligibleAnnouncements.filter((p) => p.type === 'announcement' || p.type === 'general').length,
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

  // Dynamic Tab Visibility: Only display category tabs that currently have updates.
  const visibleTabs = allTabs.filter((tab) => tab.id === 'ALL' || tab.count > 0);

  // Auto-reset tag filter if current selection has 0 items
  useEffect(() => {
    if (tagFilter !== 'ALL' && tabCounts[tagFilter] === 0) {
      setTagFilter('ALL');
    }
  }, [tagFilter, tabCounts.ANNOUNCEMENTS, tabCounts.DEALS, tabCounts.PERFORMERS, tabCounts.MILESTONES]);

  const filteredAnnouncements = eligibleAnnouncements.filter((post) => {
    if (tagFilter === 'DEALS' && post.type !== 'booking') return false;
    if (tagFilter === 'ANNOUNCEMENTS' && post.type !== 'announcement' && post.type !== 'general') return false;
    if (tagFilter === 'PERFORMERS' && post.type !== 'performer') return false;
    if (tagFilter === 'MILESTONES' && post.type !== 'quota') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        post.title.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        post.author?.name.toLowerCase().includes(q) ||
        post.comments?.some((c) => c.content.toLowerCase().includes(q) || c.authorName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Chronological sorting: newest updates strictly first
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
    <div className="space-y-6">
      {/* Top Welcome Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {greeting}, {getGreetingName(currentUser.name)}. Here's what's happening across HUB today.
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time closures, company announcements, today's schedule, and pending actions.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            title="Refresh feed"
            className="p-2 bg-white dark:bg-[#0D1829] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-rose-600' : ''}`} />
          </button>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
            {formatExactDateIst()}
          </span>
          {canCreateAnnouncement(currentUser) && (
            <button
              onClick={() => setIsNewPostOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-rose-900/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Broadcast</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Full Announcements & Live Feed Stream (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Category Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-1.5">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTagFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    tagFilter === tab.id
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : 'bg-white dark:bg-[#0D1829] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {searchQuery && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Filter: <strong>"{searchQuery}"</strong></span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-rose-500 hover:underline font-semibold cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Announcements Feed Stream */}
          <div className="flex flex-col gap-4 w-full">
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

        {/* Right Column: Widgets (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <WidgetToday />
          <WidgetActions />
          <WidgetCampaign />
          <WidgetLeadership />
        </div>
      </div>

      <NewPostModal isOpen={isNewPostOpen} onClose={() => setIsNewPostOpen(false)} />
    </div>
  );
}
