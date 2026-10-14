'use client';

import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTimeBasedGreeting, getGreetingName, formatExactDateIst } from '../lib/hallwayDisplay';
import AnnouncementsFeed from '../components/announcements/AnnouncementsFeed';
import WidgetToday from '../components/home/WidgetToday';
import WidgetActions from '../components/home/WidgetActions';
import WidgetCampaign from '../components/home/WidgetCampaign';
import NewPostModal from '../components/home/NewPostModal';
import { canCreateAnnouncement } from '../lib/permissions';

export default function HomePage() {
  const { currentUser, refreshFeed } = useApp();
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [greeting, setGreeting] = useState<string>(() => getTimeBasedGreeting());

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

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {greeting}, {getGreetingName(currentUser.name)}. Here&apos;s what&apos;s happening across HUB today.
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time closures, company announcements, today&apos;s schedule, and pending actions.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh feed"
            className="p-2 bg-white dark:bg-panel border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-rose-600' : ''}`} />
          </button>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
            {formatExactDateIst()}
          </span>
          {canCreateAnnouncement(currentUser) && (
            <button
              type="button"
              onClick={() => setIsNewPostOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-brand/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Broadcast</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: same announcement cards as /announcements; ~3 visible then scroll */}
        <div className="lg:col-span-7">
          <AnnouncementsFeed compact />
        </div>

        {/* Right Column: Widgets (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <WidgetToday />
          <WidgetActions />
          <WidgetCampaign />
        </div>
      </div>

      <NewPostModal isOpen={isNewPostOpen} onClose={() => setIsNewPostOpen(false)} />
    </div>
  );
}
