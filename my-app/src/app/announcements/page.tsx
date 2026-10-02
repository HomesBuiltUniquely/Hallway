'use client';

import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, RefreshCw, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import DepartmentPills from '../../components/common/DepartmentPills';
import HubLiveFeedCard from '../../components/announcements/HubLiveFeedCard';
import NewPostModal from '../../components/home/NewPostModal';
import SimulateDealModal from '../../components/announcements/SimulateDealModal';
import { canCreateAnnouncement } from '../../lib/permissions';

export default function AnnouncementsPage() {
  const { currentUser, announcementPosts, activeDepartment, searchQuery, setSearchQuery, refreshFeed } = useApp();
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [tagFilter, setTagFilter] = useState<'ALL' | 'DEALS' | 'ANNOUNCEMENTS' | 'PERFORMERS' | 'MILESTONES'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshFeed();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshFeed();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filter posts for HUB Live Feed (Excluding repeating raw target pacing cards, showing all rich CRM dynamic snippets)
  const filteredAnnouncements = (announcementPosts || []).filter((post) => {
    // Strictly prevent repeating raw target pacing cards already on dashboard
    if (post.id.startsWith('crm-target-')) return false;

    // Filter by department if a specific department is selected
    if (activeDepartment && activeDepartment !== 'All Departments') {
      const postDept = post.department || 'Sales';
      if (postDept.toLowerCase() !== activeDepartment.toLowerCase()) return false;
    }

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

  // Ensure newly broadcasted announcements appear strictly first, followed by newest dynamic CRM feed items
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    const isBroadcastA = a.id?.startsWith('post-');
    const isBroadcastB = b.id?.startsWith('post-');

    if (isBroadcastA && !isBroadcastB) return -1;
    if (!isBroadcastA && isBroadcastB) return 1;

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
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-rose-600 dark:text-rose-500" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              HUB Live Feed & Announcements
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dynamic updates from CRM, corridor milestones, and executive broadcasts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shadow-emerald-900/20 cursor-pointer"
            title="Simulate or broadcast a live CRM deal closure"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
            <span className="hidden sm:inline">Simulate CRM Closure</span>
            <span className="sm:hidden">Simulate</span>
          </button>

          <button
            onClick={handleRefresh}
            title="Refresh announcements from database"
            className="p-2 bg-white dark:bg-[#0D1829] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-rose-600' : ''}`} />
          </button>

          {canCreateAnnouncement(currentUser) && (
            <button
              onClick={() => setIsNewPostOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-rose-900/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Broadcast</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Dynamic CRM Pacing Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-emerald-500/10 via-rose-500/5 to-violet-500/10 dark:from-emerald-950/30 dark:via-rose-950/20 dark:to-violet-950/30 border border-emerald-500/20 dark:border-emerald-800/40 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            Live Dynamic CRM Feed
          </span>
          <span className="text-slate-400 dark:text-slate-500">•</span>
          <span className="text-slate-500 dark:text-slate-400">
            Real-time business rules evaluating 14 Master PDF scenarios from active CRM deals & targets
          </span>
        </div>
        <button
          onClick={() => setIsSimulateOpen(true)}
          className="font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          Test CRM Trigger &rarr;
        </button>
      </div>

      {/* Department Tabs Bar matching Image 1 */}
      <DepartmentPills />

      {/* Filter and In-Page Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center flex-wrap gap-2">
          {[
            { id: 'ALL', label: 'All Updates' },
            { id: 'DEALS', label: '💰 Deals & Bookings' },
            { id: 'ANNOUNCEMENTS', label: '📢 Corridor Broadcasts' },
            { id: 'PERFORMERS', label: '🏆 MVP & Performers' },
            { id: 'MILESTONES', label: '🎯 Targets & Milestones' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTagFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                tagFilter === tab.id
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#0D1829] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search status if searching */}
        {searchQuery && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Filtering by: <strong className="text-slate-900 dark:text-white">"{searchQuery}"</strong></span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-rose-500 hover:underline font-semibold cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* 2-Column Responsive Feed Cards Grid matching Image 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {sortedAnnouncements.map((post) => (
          <HubLiveFeedCard key={post.id} post={post} />
        ))}
      </div>

      {sortedAnnouncements.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-[#0D1829] rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <p className="text-sm font-semibold text-slate-500">
            No updates matching current filter or search query.
          </p>
        </div>
      )}

      <NewPostModal isOpen={isNewPostOpen} onClose={() => setIsNewPostOpen(false)} />
      <SimulateDealModal isOpen={isSimulateOpen} onClose={() => setIsSimulateOpen(false)} />
    </div>
  );
}
