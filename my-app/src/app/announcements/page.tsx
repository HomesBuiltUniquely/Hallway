'use client';

import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import AnnouncementsFeed from '../../components/announcements/AnnouncementsFeed';
import NewPostModal from '../../components/home/NewPostModal';
import { canCreateAnnouncement } from '../../lib/permissions';

export default function AnnouncementsPage() {
  const { currentUser, refreshFeed } = useApp();
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshFeed();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Company Announcements
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Live corridor broadcasts, bookings, performers, and milestones.
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

      <AnnouncementsFeed />

      <NewPostModal isOpen={isNewPostOpen} onClose={() => setIsNewPostOpen(false)} />
    </div>
  );
}
