'use client';

import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTimeBasedGreeting, getGreetingName } from '../lib/hallwayDisplay';
import FeedCard from '../components/home/FeedCard';
import WidgetToday from '../components/home/WidgetToday';
import WidgetActions from '../components/home/WidgetActions';
import WidgetCampaign from '../components/home/WidgetCampaign';
import WidgetLeadership from '../components/home/WidgetLeadership';
import NewPostModal from '../components/home/NewPostModal';
import { canCreateAnnouncement } from '../lib/permissions';

export default function HomePage() {
  const { currentUser, feedPosts, searchQuery } = useApp();
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [greeting, setGreeting] = useState<string>(() => getTimeBasedGreeting());

  // Periodically refresh greeting if shift crosses morning/afternoon/evening boundaries
  useEffect(() => {
    setGreeting(getTimeBasedGreeting());
    const timer = setInterval(() => {
      setGreeting(getTimeBasedGreeting());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  // Monthly Target Cards (All Hubs + 3 branches sorted descending by % achieved)
  const targetCards = feedPosts.filter((post) => {
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
            {greeting}, {getGreetingName(currentUser.name)}. Here's what's happening across HUB today.
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Executive target scorecard, active campaigns, and personal actions.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
            {new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
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
        {/* Left Column: Monthly Target Cockpit (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Feed Header */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-600 dark:bg-violet-400 animate-pulse" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-sans">
                Monthly Targets
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              Corridor pacing in real-time
            </span>
          </div>

          {/* Target Cards */}
          <div className="space-y-4">
            {targetCards.map((post) => (
              <FeedCard key={post.id} post={post} />
            ))}

            {targetCards.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <p className="text-sm font-semibold text-slate-500">No targets matching current search.</p>
              </div>
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
