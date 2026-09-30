'use client';

import React, { useState } from 'react';
import { Filter, Plus, ChevronDown, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isTodayOrYesterday } from '../lib/hallwayDisplay';
import FeedCard from '../components/home/FeedCard';
import WidgetToday from '../components/home/WidgetToday';
import WidgetActions from '../components/home/WidgetActions';
import WidgetCampaign from '../components/home/WidgetCampaign';
import WidgetLeadership from '../components/home/WidgetLeadership';
import NewPostModal from '../components/home/NewPostModal';

export default function HomePage() {
  const { currentUser, feedPosts, searchQuery } = useApp();
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ANNOUNCEMENTS' | 'BOOKINGS' | 'TARGETS' | 'PERFORMERS'>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  // Filter posts (only today's news and 1-day before news)
  const filteredPosts = feedPosts.filter((post) => {
    if (!isTodayOrYesterday(post.createdAt, post.timestamp)) return false;
    if (selectedFilter === 'ANNOUNCEMENTS' && post.type !== 'announcement') return false;
    if (selectedFilter === 'BOOKINGS' && post.type !== 'booking') return false;
    if (selectedFilter === 'TARGETS' && post.type !== 'quota') return false;
    if (selectedFilter === 'PERFORMERS' && post.type !== 'performer') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        post.title.toLowerCase().includes(q) ||
        post.content.toLowerCase().includes(q) ||
        post.author?.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Good morning, {currentUser.name}. Here's what's happening across HUB today.
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time feed of deal closures, conversion velocity, and team milestones.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
            {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button
            onClick={() => setIsNewPostOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-rose-900/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Broadcast</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live at HUB Timeline (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Feed Header & Filter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-sans">
                Live at HUB
              </h2>
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors uppercase tracking-wider"
              >
                <Filter className="w-3 h-3" />
                <span>
                  FILTER{' '}
                  {selectedFilter === 'ANNOUNCEMENTS'
                    ? '(ANNOUNCEMENTS)'
                    : selectedFilter === 'BOOKINGS'
                    ? '(GROSS BOOKINGS)'
                    : selectedFilter === 'TARGETS'
                    ? '(TARGETS)'
                    : selectedFilter === 'PERFORMERS'
                    ? '(PERFORMERS)'
                    : ''}
                </span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-1.5 z-20 text-xs animate-in fade-in duration-100">
                  {[
                    { id: 'ALL', label: 'All Updates' },
                    { id: 'ANNOUNCEMENTS', label: '📢 Announcements' },
                    { id: 'BOOKINGS', label: '🟢 Gross Bookings' },
                    { id: 'TARGETS', label: '🟣 Branch Targets' },
                    { id: 'PERFORMERS', label: '🟡 Top Performers' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSelectedFilter(f.id as any);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors font-medium ${
                        selectedFilter === f.id
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Feed Posts */}
          <div className="space-y-4">
            {filteredPosts.slice(0, visibleCount).map((post) => (
              <FeedCard key={post.id} post={post} />
            ))}

            {filteredPosts.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <p className="text-sm font-semibold text-slate-500">No updates matching current search or filter.</p>
              </div>
            )}

            {filteredPosts.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 3)}
                className="w-full py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors shadow-xs"
              >
                Load earlier updates
              </button>
            )}
          </div>
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
