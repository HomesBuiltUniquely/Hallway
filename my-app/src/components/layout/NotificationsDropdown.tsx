'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  VolumeX,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatRelativeTime, getNotificationDayGroup } from '../../lib/hallwayDisplay';
import { NotificationItem } from '../../types';

const MUTE_KEY = 'hub_notifications_muted';

export default function NotificationsDropdown({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const {
    notifications,
    notificationsCount,
    markAllNotificationsRead,
    markNotificationRead,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'leads' | 'deals' | 'meetings' | 'tasks' | 'urgent'>('all');
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setMuted(localStorage.getItem(MUTE_KEY) === '1');
    } catch {}
  }, []);

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  // Unread counts for tab badges (mark-all-as-read zeros these)
  const unreadCounts = useMemo(() => {
    const unread = notifications.filter((n) => !n.read);
    return {
      all: unread.length,
      leads: unread.filter((n) => n.type === 'lead').length,
      deals: unread.filter((n) => n.type === 'deal').length,
      meetings: unread.filter((n) => n.type === 'meeting').length,
      tasks: unread.filter((n) => n.type === 'task').length,
      urgent: unread.filter((n) => n.type === 'urgent').length,
    };
  }, [notifications]);

  // Total items per type (keep tab visible if category has any items, even if all read)
  const totalByType = useMemo(
    () => ({
      leads: notifications.filter((n) => n.type === 'lead').length,
      deals: notifications.filter((n) => n.type === 'deal').length,
      meetings: notifications.filter((n) => n.type === 'meeting').length,
      tasks: notifications.filter((n) => n.type === 'task').length,
      urgent: notifications.filter((n) => n.type === 'urgent').length,
    }),
    [notifications]
  );

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (activeTab === 'leads') return n.type === 'lead';
    if (activeTab === 'deals') return n.type === 'deal';
    if (activeTab === 'meetings') return n.type === 'meeting';
    if (activeTab === 'tasks') return n.type === 'task';
    if (activeTab === 'urgent') return n.type === 'urgent';
    return true;
  });

  const todayItems = filtered.filter((n) => getNotificationDayGroup(n.timestamp) === 'TODAY');
  const yesterdayItems = filtered.filter((n) => getNotificationDayGroup(n.timestamp) === 'YESTERDAY');
  const earlierItems = filtered.filter((n) => getNotificationDayGroup(n.timestamp) === 'EARLIER');

  const getIconAndStyle = (item: NotificationItem) => {
    switch (item.type) {
      case 'lead':
        return {
          icon: User,
          avatarBg: 'bg-sky-100 text-sky-600 dark:bg-sky-950/70 dark:text-sky-400',
          badgeStyle:
            'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-100 dark:border-sky-800/60',
        };
      case 'deal':
        return {
          icon: DollarSign,
          avatarBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400',
          badgeStyle:
            'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60',
        };
      case 'meeting':
        return {
          icon: Calendar,
          avatarBg: 'bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400',
          badgeStyle:
            'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-100 dark:border-blue-800/60',
        };
      case 'urgent':
        return {
          icon: AlertTriangle,
          avatarBg: 'bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400',
          badgeStyle:
            'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-100 dark:border-rose-800/60',
        };
      case 'milestone':
        return {
          icon: TrendingUp,
          avatarBg: 'bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400',
          badgeStyle:
            'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-100 dark:border-amber-800/60',
        };
      case 'task':
      default:
        return {
          icon: CheckCircle2,
          avatarBg: 'bg-purple-100 text-purple-600 dark:bg-purple-950/70 dark:text-purple-400',
          badgeStyle:
            'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-100 dark:border-purple-800/60',
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
            ? 'hover:bg-neutral-50 dark:hover:bg-slate-800/40 opacity-65'
            : 'bg-sky-50/40 dark:bg-slate-800/50 hover:bg-neutral-100/70 dark:hover:bg-slate-800/80 ring-1 ring-sky-100/80 dark:ring-slate-700/60'
        }`}
      >
        <div className="shrink-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-2xs ${avatarBg}`}>
            <IconComp className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <h4
            className={`text-[13px] truncate leading-snug ${
              item.read
                ? 'font-medium text-neutral-600 dark:text-neutral-300'
                : 'font-bold text-neutral-900 dark:text-neutral-100'
            }`}
          >
            {item.title}
          </h4>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5 leading-tight">
            {item.subtitle || item.message}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded shadow-2xs ${badgeStyle}`}>
              {item.categoryTag || item.type.toUpperCase()}
            </span>
            {item.read && (
              <span className="text-[10px] text-neutral-400 font-medium">Read</span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end justify-between self-stretch py-0.5">
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium whitespace-nowrap">
            {formatRelativeTime(item.timestamp)}
          </span>
          <div className="flex items-center gap-2 mt-auto">
            {!item.read && (
              <span className="w-2 h-2 rounded-full bg-brand" title="Unread" />
            )}
            <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200 transition-colors" />
          </div>
        </div>
      </div>
    );
  };

  const TabPill = ({
    id,
    label,
    unread,
    total,
  }: {
    id: typeof activeTab;
    label: string;
    unread: number;
    total: number;
  }) => {
    if (id !== 'all' && total === 0) return null;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(id)}
        className={`cursor-pointer whitespace-nowrap text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all ${
          activeTab === id
            ? 'border border-red-500 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white font-semibold shadow-2xs'
            : 'bg-neutral-100 dark:bg-slate-800/60 hover:bg-neutral-200/70 dark:hover:bg-slate-700/60 text-neutral-600 dark:text-neutral-400 border border-transparent font-medium'
        }`}
      >
        <span>{label}</span>
        {unread > 0 ? (
          <span className="bg-brand text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : (
          <span className="bg-neutral-200 dark:bg-slate-700 text-neutral-500 dark:text-neutral-400 text-[9px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center">
            0
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="absolute right-0 mt-2 w-[380px] sm:w-[410px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-neutral-200/90 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between border-b border-neutral-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <h2 className="text-[17px] font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Notifications
          </h2>
          {notificationsCount > 0 && (
            <span className="bg-brand text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
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
            onClick={toggleMute}
            className={`w-7 h-7 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer ${
              muted
                ? 'text-rose-500 hover:text-rose-600'
                : 'text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
            }`}
            title={muted ? 'Unmute notification alerts' : 'Mute notification alerts'}
            aria-pressed={muted}
          >
            {muted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
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

      {muted && (
        <div className="px-4 py-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-100 dark:border-amber-900/50">
          Alerts muted for this browser. You still see notifications here.
        </div>
      )}

      <div className="px-3 py-2 border-b border-neutral-100 dark:border-slate-800/80 bg-neutral-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <TabPill id="all" label="All" unread={unreadCounts.all} total={notifications.length || 1} />
          <TabPill id="leads" label="Leads" unread={unreadCounts.leads} total={totalByType.leads} />
          <TabPill id="deals" label="Deals" unread={unreadCounts.deals} total={totalByType.deals} />
          <TabPill id="meetings" label="Meetings" unread={unreadCounts.meetings} total={totalByType.meetings} />
          <TabPill id="tasks" label="Tasks" unread={unreadCounts.tasks} total={totalByType.tasks} />
          <TabPill id="urgent" label="Urgent" unread={unreadCounts.urgent} total={totalByType.urgent} />
        </div>
      </div>

      <div className="max-h-[360px] overflow-y-auto px-2 py-1 divide-y divide-neutral-100/70 dark:divide-slate-800/70">
        {filtered.length === 0 ? (
          <div className="text-center py-10 px-4">
            <p className="text-xs text-neutral-400 font-medium">No notifications in this category.</p>
          </div>
        ) : (
          <>
            {todayItems.length > 0 && (
              <div>
                <div className="px-2 pt-2 pb-1 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase">
                  TODAY
                </div>
                <div className="space-y-0.5">{todayItems.map(renderItem)}</div>
              </div>
            )}
            {yesterdayItems.length > 0 && (
              <div>
                <div className="px-2 pt-3 pb-1 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase">
                  YESTERDAY
                </div>
                <div className="space-y-0.5">{yesterdayItems.map(renderItem)}</div>
              </div>
            )}
            {earlierItems.length > 0 && (
              <div>
                <div className="px-2 pt-3 pb-1 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase">
                  EARLIER
                </div>
                <div className="space-y-0.5">{earlierItems.map(renderItem)}</div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-neutral-100 dark:border-slate-800 py-2.5 px-4 text-center bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push('/notifications');
          }}
          className="text-[13px] font-semibold text-brand hover:text-brand-hover transition-colors cursor-pointer"
        >
          View all notifications →
        </button>
      </div>
    </div>
  );
}
