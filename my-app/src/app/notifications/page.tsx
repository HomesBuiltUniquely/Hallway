'use client';

import React, { useMemo, useState } from 'react';
import {
  User,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Check,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatRelativeTime, getNotificationDayGroup } from '../../lib/hallwayDisplay';
import { NotificationItem } from '../../types';

type TabId = 'all' | 'leads' | 'deals' | 'meetings' | 'tasks' | 'urgent';

export default function NotificationsPage() {
  const { notifications, notificationsCount, markAllNotificationsRead, markNotificationRead } =
    useApp();
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const unreadByType = useMemo(() => {
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

  const filtered = notifications.filter((n) => {
    if (showUnreadOnly && n.read) return false;
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

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: unreadByType.all },
    { id: 'leads', label: 'Leads', count: unreadByType.leads },
    { id: 'deals', label: 'Deals', count: unreadByType.deals },
    { id: 'meetings', label: 'Meetings', count: unreadByType.meetings },
    { id: 'tasks', label: 'Tasks', count: unreadByType.tasks },
    { id: 'urgent', label: 'Urgent', count: unreadByType.urgent },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Notifications
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {notificationsCount > 0
              ? `${notificationsCount} unread for your session`
              : 'You are caught up'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUnreadOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showUnreadOnly
                ? 'bg-brand text-white border-brand'
                : 'bg-white dark:bg-panel text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
            }`}
          >
            Unread only
          </button>
          {notificationsCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabs
          .filter((t) => t.id === 'all' || t.count > 0 || notifications.some((n) => {
            if (t.id === 'leads') return n.type === 'lead';
            if (t.id === 'deals') return n.type === 'deal';
            if (t.id === 'meetings') return n.type === 'meeting';
            if (t.id === 'tasks') return n.type === 'task';
            if (t.id === 'urgent') return n.type === 'urgent';
            return false;
          }))
          .map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`cursor-pointer whitespace-nowrap text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all ${
                activeTab === tab.id
                  ? 'border border-red-500 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white font-semibold shadow-2xs'
                  : 'bg-neutral-100 dark:bg-slate-800/60 text-neutral-600 dark:text-neutral-400 border border-transparent font-medium'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className="bg-brand text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center">
                  {tab.count > 99 ? '99+' : tab.count}
                </span>
              )}
            </button>
          ))}
      </div>

      <div className="bg-white dark:bg-panel border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2 shadow-xs space-y-1">
        {filtered.length === 0 ? (
          <p className="text-center py-12 text-xs text-slate-400 font-medium">
            No notifications in this view.
          </p>
        ) : (
          <>
            <NotificationGroup title="TODAY" items={todayItems} onRead={markNotificationRead} />
            <NotificationGroup title="YESTERDAY" items={yesterdayItems} onRead={markNotificationRead} />
            <NotificationGroup title="EARLIER" items={earlierItems} onRead={markNotificationRead} />
          </>
        )}
      </div>
    </div>
  );
}

function NotificationGroup({
  title,
  items,
  onRead,
}: {
  title: string;
  items: NotificationItem[];
  onRead: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="px-3 pt-3 pb-1 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 tracking-wider uppercase">
        {title}
      </div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NotificationRow key={item.id} item={item} onRead={onRead} />
        ))}
      </div>
    </div>
  );
}

function NotificationRow({
  item,
  onRead,
}: {
  item: NotificationItem;
  onRead: (id: string) => void;
}) {
  const style = getIconAndStyle(item);
  const IconComp = style.icon;
  return (
    <button
      type="button"
      onClick={() => onRead(item.id)}
      className={`w-full text-left group px-3 py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
        item.read
          ? 'hover:bg-neutral-50 dark:hover:bg-slate-800/40 opacity-70'
          : 'bg-sky-50/40 dark:bg-slate-800/50 hover:bg-neutral-100/70 dark:hover:bg-slate-800/80'
      }`}
    >
      <div className="shrink-0">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-2xs ${style.avatarBg}`}>
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
        <div className="mt-1">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded shadow-2xs ${style.badgeStyle}`}>
            {item.categoryTag || item.type.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end justify-between self-stretch py-0.5">
        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium whitespace-nowrap">
          {formatRelativeTime(item.timestamp)}
        </span>
        <div className="flex items-center gap-2 mt-auto">
          {!item.read && <span className="w-2 h-2 rounded-full bg-brand" title="Unread" />}
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
        </div>
      </div>
    </button>
  );
}

function getIconAndStyle(item: NotificationItem) {
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
}
