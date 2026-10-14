'use client';

import React, { useState } from 'react';
import {
  User,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Check,
  ChevronRight,
  X,
  Volume2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatRelativeTime, getNotificationDayGroup } from '../../lib/hallwayDisplay';
import { NotificationItem } from '../../types';

export default function NotificationsDropdown({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const {
    notifications,
    notificationsCount,
    markAllNotificationsRead,
    markNotificationRead,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'leads' | 'deals' | 'meetings' | 'tasks' | 'urgent'>('all');

  if (!isOpen) return null;

  // Filter items based on activeTab
  const filtered = notifications.filter((n) => {
    if (activeTab === 'leads') return n.type === 'lead';
    if (activeTab === 'deals') return n.type === 'deal';
    if (activeTab === 'meetings') return n.type === 'meeting';
    if (activeTab === 'tasks') return n.type === 'task';
    if (activeTab === 'urgent') return n.type === 'urgent';
    return true;
  });

  // Category counts
  const countAll = notifications.length;
  const countLeads = notifications.filter((n) => n.type === 'lead').length;
  const countDeals = notifications.filter((n) => n.type === 'deal').length;
  const countMeetings = notifications.filter((n) => n.type === 'meeting').length;
  const countTasks = notifications.filter((n) => n.type === 'task').length;
  const countUrgent = notifications.filter((n) => n.type === 'urgent').length;

  // Group filtered items by day
  const todayItems = filtered.filter((n) => getNotificationDayGroup(n.timestamp) === 'TODAY');
  const yesterdayItems = filtered.filter((n) => getNotificationDayGroup(n.timestamp) === 'YESTERDAY');
  const earlierItems = filtered.filter((n) => getNotificationDayGroup(n.timestamp) === 'EARLIER');

  const getIconAndStyle = (item: NotificationItem) => {
    switch (item.type) {
      case 'lead':
        return {
          icon: User,
          avatarBg: 'bg-sky-100 text-sky-600 dark:bg-sky-950/70 dark:text-sky-400',
          badgeStyle: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-100 dark:border-sky-800/60',
        };
      case 'deal':
        return {
          icon: DollarSign,
          avatarBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400',
          badgeStyle: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60',
        };
      case 'meeting':
        return {
          icon: Calendar,
          avatarBg: 'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400',
          badgeStyle: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-100 dark:border-blue-800/60',
        };
      case 'urgent':
        return {
          icon: AlertTriangle,
          avatarBg: 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400',
          badgeStyle: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-100 dark:border-rose-800/60',
        };
      case 'milestone':
        return {
          icon: TrendingUp,
          avatarBg: 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400',
          badgeStyle: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-100 dark:border-amber-800/60',
        };
      case 'task':
      default:
        return {
          icon: CheckCircle2,
          avatarBg: 'bg-purple-100 text-purple-600 dark:bg-purple-950/70 dark:text-purple-400',
          badgeStyle: 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-100 dark:border-purple-800/60',
        };
    }
  };

  const renderItem = (item: NotificationItem) => {
    const { icon: IconComp, avatarBg, badgeStyle } = getIconAndStyle(item);
    return (
      <div
        key={item.id}
        onClick={() => markNotificationRead(item.id)}
        className={`group px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
          item.read
            ? 'hover:bg-neutral-50 dark:hover:bg-slate-800/40 opacity-80'
            : 'bg-sky-50/20 dark:bg-slate-800/50 hover:bg-neutral-100/70 dark:hover:bg-slate-800/80'
        }`}
      >
        {/* Left circular avatar */}
        <div className="shrink-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-2xs ${avatarBg}`}>
            <IconComp className="w-4 h-4" />
          </div>
        </div>

        {/* Middle: Title, Subtitle, Category Tag */}
        <div className="flex-1 min-w-0 pr-1">
          <h4 className="text-[13px] font-semibold text-neutral-850 dark:text-neutral-100 truncate leading-snug">
            {item.title}
          </h4>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5 leading-tight">
            {item.subtitle || item.message}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded shadow-2xs ${badgeStyle}`}>
              {item.categoryTag || item.type.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Right side: Relative Time + Red Dot + Chevron */}
        <div className="shrink-0 flex flex-col items-end justify-between self-stretch py-0.5">
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium whitespace-nowrap">
            {formatRelativeTime(item.timestamp)}
          </span>
          <div className="flex items-center gap-2 mt-auto">
            {!item.read && (
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" title="Unread" />
            )}
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200 transition-colors" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute right-0 mt-2 w-[380px] sm:w-[410px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-neutral-200/90 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      {/* 1. Header Bar */}
      <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between border-b border-neutral-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <h2 className="text-[17px] font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Notifications
          </h2>
          {notificationsCount > 0 && (
            <span className="bg-[#EF4444] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              {notificationsCount > 99 ? '99+ unread' : `${notificationsCount} unread`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
          {notificationsCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="w-7 h-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              title="Mark all as read"
            >
              <Check className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            </button>
          )}
          <button
            type="button"
            className="w-7 h-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            title="Notification alerts"
          >
            <Volume2 className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>
      </div>

      {/* 2. Filter Pills Row */}
      <div className="px-3 py-2 border-b border-neutral-100 dark:border-slate-800/80 bg-neutral-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {/* All */}
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`cursor-pointer whitespace-nowrap text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all ${
              activeTab === 'all'
                ? 'border border-red-500 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white font-semibold shadow-2xs'
                : 'bg-neutral-100 dark:bg-slate-800/60 hover:bg-neutral-200/70 dark:hover:bg-slate-700/60 text-neutral-600 dark:text-neutral-400 border border-transparent font-medium'
            }`}
          >
            <span>All</span>
            <span className="bg-[#EF4444] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
              {countAll > 99 ? '99+' : countAll}
            </span>
          </button>

          {/* Leads */}
          {countLeads > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('leads')}
              className={`cursor-pointer whitespace-nowrap text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all ${
                activeTab === 'leads'
                  ? 'border border-red-500 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white font-semibold shadow-2xs'
                  : 'bg-neutral-100 dark:bg-slate-800/60 hover:bg-neutral-200/70 dark:hover:bg-slate-700/60 text-neutral-600 dark:text-neutral-400 border border-transparent font-medium'
              }`}
            >
              <span>Leads</span>
              <span className="bg-[#EF4444] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                {countLeads}
              </span>
            </button>
          )}

          {/* Deals */}
          {countDeals > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('deals')}
              className={`cursor-pointer whitespace-nowrap text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all ${
                activeTab === 'deals'
                  ? 'border border-red-500 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white font-semibold shadow-2xs'
                  : 'bg-neutral-100 dark:bg-slate-800/60 hover:bg-neutral-200/70 dark:hover:bg-slate-700/60 text-neutral-600 dark:text-neutral-400 border border-transparent font-medium'
              }`}
            >
              <span>Deals</span>
              <span className="bg-[#EF4444] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                {countDeals}
              </span>
            </button>
          )}

          {/* Meetings */}
          {countMeetings > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('meetings')}
              className={`cursor-pointer whitespace-nowrap text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all ${
                activeTab === 'meetings'
                  ? 'border border-red-500 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white font-semibold shadow-2xs'
                  : 'bg-neutral-100 dark:bg-slate-800/60 hover:bg-neutral-200/70 dark:hover:bg-slate-700/60 text-neutral-600 dark:text-neutral-400 border border-transparent font-medium'
              }`}
            >
              <span>Meetings</span>
              <span className="bg-[#EF4444] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                {countMeetings}
              </span>
            </button>
          )}

          {/* Tasks */}
          {countTasks > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`cursor-pointer whitespace-nowrap text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all ${
                activeTab === 'tasks'
                  ? 'border border-red-500 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white font-semibold shadow-2xs'
                  : 'bg-neutral-100 dark:bg-slate-800/60 hover:bg-neutral-200/70 dark:hover:bg-slate-700/60 text-neutral-600 dark:text-neutral-400 border border-transparent font-medium'
              }`}
            >
              <span>Tasks</span>
              <span className="bg-[#EF4444] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                {countTasks}
              </span>
            </button>
          )}

          {/* Urgent */}
          {countUrgent > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('urgent')}
              className={`cursor-pointer whitespace-nowrap text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all ${
                activeTab === 'urgent'
                  ? 'border border-red-500 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white font-semibold shadow-2xs'
                  : 'bg-neutral-100 dark:bg-slate-800/60 hover:bg-neutral-200/70 dark:hover:bg-slate-700/60 text-neutral-600 dark:text-neutral-400 border border-transparent font-medium'
              }`}
            >
              <span>Urgent</span>
              <span className="bg-[#EF4444] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
                {countUrgent}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Notifications List */}
      <div className="max-h-[360px] overflow-y-auto px-2 py-1 divide-y divide-neutral-100/70 dark:divide-slate-800/70">
        {filtered.length === 0 ? (
          <div className="text-center py-10 px-4">
            <p className="text-xs text-neutral-400 font-medium">No notifications in this category.</p>
          </div>
        ) : (
          <>
            {/* TODAY section */}
            {todayItems.length > 0 && (
              <div>
                <div className="px-2 pt-2 pb-1 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase">
                  TODAY
                </div>
                <div className="space-y-0.5">
                  {todayItems.map(renderItem)}
                </div>
              </div>
            )}

            {/* YESTERDAY section */}
            {yesterdayItems.length > 0 && (
              <div>
                <div className="px-2 pt-3 pb-1 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase">
                  YESTERDAY
                </div>
                <div className="space-y-0.5">
                  {yesterdayItems.map(renderItem)}
                </div>
              </div>
            )}

            {/* EARLIER section (if any) */}
            {earlierItems.length > 0 && (
              <div>
                <div className="px-2 pt-3 pb-1 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase">
                  EARLIER
                </div>
                <div className="space-y-0.5">
                  {earlierItems.map(renderItem)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. Bottom Footer Link */}
      <div className="border-t border-neutral-100 dark:border-slate-800 py-2.5 px-4 text-center bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={() => {
            setActiveTab('all');
          }}
          className="text-[13px] font-semibold text-[#EF4444] hover:text-red-600 transition-colors cursor-pointer"
        >
          View all notifications →
        </button>
      </div>
    </div>
  );
}
