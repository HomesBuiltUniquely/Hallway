'use client';

import React, { useState, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  Sparkles,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  X,
  Zap,
  Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isSuperAdmin } from '../../lib/permissions';
import { formatExactIstTimestamp } from '../../lib/hallwayDisplay';

export interface NotificationItem {
  id: string;
  type: 'deal' | 'task' | 'urgent' | 'milestone' | 'meeting';
  title: string;
  message: string;
  timestamp: string;
  exactIstTime: string;
  read: boolean;
  actionUrl?: string;
  targetRole?: string;
}

export default function NotificationsDropdown({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { currentUser } = useApp();
  const isAdmin = isSuperAdmin(currentUser);
  const [activeTab, setActiveTab] = useState<'all' | 'deals' | 'tasks' | 'urgent'>('all');
  const [readMap, setReadMap] = useState<Record<string, boolean>>({});

  // Dynamic role-based notifications customized for the user
  const initialNotifications: NotificationItem[] = useMemo(() => {
    const roleLower = (currentUser?.role || '').toLowerCase();
    const deptLower = (currentUser?.department || '').toLowerCase();
    const nameLower = (currentUser?.name || '').toLowerCase();

    const isDesigner = deptLower === 'design' || roleLower.includes('design');
    const isSales = deptLower === 'sales' || roleLower.includes('sales') || roleLower.includes('crm');

    // 1. Super Admin / Founders (Sachin, Ranjith, Susmita)
    if (isAdmin || nameLower.includes('sachin') || nameLower.includes('ranjith')) {
      return [
        {
          id: 'notif-adm-1',
          type: 'deal',
          title: 'High-Value Project Closed: ₹24.6L',
          message: 'Aman Nirmal & Anushka closed Prestige Lakeside 3BHK contract at Sarjapur Hub.',
          timestamp: '2026-10-12T18:30:00+05:30',
          exactIstTime: '12 Oct 2026, 6:30 PM IST',
          read: false,
        },
        {
          id: 'notif-adm-2',
          type: 'urgent',
          title: 'Commercial Discount Escalation',
          message: 'Prestige Willow — ₹18.4L Quote requires Admin sign-off for 4% margin deviation.',
          timestamp: '2026-10-12T16:15:00+05:30',
          exactIstTime: '12 Oct 2026, 4:15 PM IST',
          read: false,
        },
        {
          id: 'notif-adm-3',
          type: 'milestone',
          title: 'Corridor Milestone Crossed',
          message: 'JP Nagar Hub crossed ₹31.82L (26.5% of monthly corridor quota).',
          timestamp: '2026-10-12T14:00:00+05:30',
          exactIstTime: '12 Oct 2026, 2:00 PM IST',
          read: false,
        },
        {
          id: 'notif-adm-4',
          type: 'meeting',
          title: 'Executive Sync Scheduled',
          message: 'Leadership Pacing Review with Branch Managers scheduled today at 10:30 AM.',
          timestamp: '2026-10-12T10:15:00+05:30',
          exactIstTime: '12 Oct 2026, 10:15 AM IST',
          read: true,
        },
      ];
    }

    // 2. Designers (Gulshi, Anushka, Shalini, Abhishek, etc.)
    if (isDesigner) {
      return [
        {
          id: 'notif-des-1',
          type: 'urgent',
          title: 'XP SLA Penalty Warning',
          message: '⚠️ 2 hours left to submit 3D concept for Villa 402 to prevent -20 XP penalty.',
          timestamp: '2026-10-12T17:45:00+05:30',
          exactIstTime: '12 Oct 2026, 5:45 PM IST',
          read: false,
        },
        {
          id: 'notif-des-2',
          type: 'meeting',
          title: 'Joint Client Consultation Booked',
          message: '3-way review booked with Client Somya biswal & Aman Nirmal (Today 4:00 PM).',
          timestamp: '2026-10-12T14:30:00+05:30',
          exactIstTime: '12 Oct 2026, 2:30 PM IST',
          read: false,
        },
        {
          id: 'notif-des-3',
          type: 'task',
          title: 'Factory DQC Drawing Approval',
          message: 'Modular kitchen CAD detail drawing approved for production for Penthouse 1204.',
          timestamp: '2026-10-12T11:15:00+05:30',
          exactIstTime: '12 Oct 2026, 11:15 AM IST',
          read: false,
        },
        {
          id: 'notif-des-4',
          type: 'milestone',
          title: 'XP Level-Up Celebration!',
          message: '⚡ You earned +40 XP for on-time deliverable release. You reached Creator Level 3!',
          timestamp: '2026-10-12T09:45:00+05:30',
          exactIstTime: '12 Oct 2026, 9:45 AM IST',
          read: true,
        },
      ];
    }

    // 3. Sales / CRM Reps (Aman, Meghana, Somashekar, Bilal, etc.)
    if (isSales) {
      return [
        {
          id: 'notif-crm-1',
          type: 'meeting',
          title: 'Upcoming Client Showroom Visit',
          message: 'Client consultation with Somya biswal & Designer Gulshi starts in 45 mins.',
          timestamp: '2026-10-12T15:15:00+05:30',
          exactIstTime: '12 Oct 2026, 3:15 PM IST',
          read: false,
        },
        {
          id: 'notif-crm-2',
          type: 'deal',
          title: 'Token Advance Verified',
          message: 'Accounts confirmed receipt of ₹1.00L advance payment for Lead #1240.',
          timestamp: '2026-10-12T13:45:00+05:30',
          exactIstTime: '12 Oct 2026, 1:45 PM IST',
          read: false,
        },
        {
          id: 'notif-crm-3',
          type: 'urgent',
          title: 'Hot Lead Assigned to Queue',
          message: 'New high-intent enquiry: 3BHK Prestige Lakeside assigned to your corridor.',
          timestamp: '2026-10-12T11:20:00+05:30',
          exactIstTime: '12 Oct 2026, 11:20 AM IST',
          read: false,
        },
        {
          id: 'notif-crm-4',
          type: 'milestone',
          title: 'Leaderboard Movement',
          message: '🔥 Great velocity! You moved up to #2 on the JP Nagar branch sales board.',
          timestamp: '2026-10-12T10:00:00+05:30',
          exactIstTime: '12 Oct 2026, 10:00 AM IST',
          read: true,
        },
      ];
    }

    // 4. General fallback
    return [
      {
        id: 'notif-gen-1',
        type: 'deal',
        title: 'New Deal: ₹24.6L Closed',
        message: 'Aman Nirmal closed a high-value interior contract at Sarjapur Hub.',
        timestamp: '2026-10-12T18:30:00+05:30',
        exactIstTime: '12 Oct 2026, 6:30 PM IST',
        read: false,
      },
      {
        id: 'notif-gen-2',
        type: 'milestone',
        title: 'October Company Milestone',
        message: 'HUB has recorded ₹49.93L in gross bookings towards monthly target.',
        timestamp: '2026-10-12T14:00:00+05:30',
        exactIstTime: '12 Oct 2026, 2:00 PM IST',
        read: false,
      },
      {
        id: 'notif-gen-3',
        type: 'meeting',
        title: 'Showroom Schedule Synchronized',
        message: 'Today appointments have been synced with live CRM database.',
        timestamp: '2026-10-12T10:15:00+05:30',
        exactIstTime: '12 Oct 2026, 10:15 AM IST',
        read: true,
      },
    ];
  }, [currentUser, isAdmin]);

  const markAllRead = () => {
    const updated: Record<string, boolean> = {};
    initialNotifications.forEach((n) => {
      updated[n.id] = true;
    });
    setReadMap(updated);
  };

  const markItemRead = (id: string) => {
    setReadMap((prev) => ({ ...prev, [id]: true }));
  };

  // Filtered list
  const filtered = initialNotifications.filter((n) => {
    if (activeTab === 'deals') return n.type === 'deal';
    if (activeTab === 'tasks') return n.type === 'task' || n.type === 'meeting';
    if (activeTab === 'urgent') return n.type === 'urgent';
    return true;
  });

  const unreadCount = initialNotifications.filter((n) => !(readMap[n.id] ?? n.read)).length;

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-96 sm:w-[420px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-500">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Activity & Notifications
            </h3>
            <p className="text-[10px] text-slate-400">
              Personalized for {currentUser?.name || 'User'} ({currentUser?.role || 'Staff'})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3 h-3" />
              <span>Mark all read</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 my-2.5 p-1 bg-slate-100 dark:bg-slate-800/70 rounded-xl text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
            activeTab === 'all'
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          All ({initialNotifications.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('deals')}
          className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
            activeTab === 'deals'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Deals
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
            activeTab === 'tasks'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Tasks
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('urgent')}
          className={`flex-1 py-1 rounded-lg transition-all cursor-pointer text-center ${
            activeTab === 'urgent'
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Urgent
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-slate-400">No notifications in this category.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const isRead = readMap[item.id] ?? item.read;

            return (
              <div
                key={item.id}
                onClick={() => markItemRead(item.id)}
                className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                  isRead
                    ? 'bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 opacity-75'
                    : 'bg-slate-50/80 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Icon Badge */}
                  <div className="shrink-0 mt-0.5">
                    {item.type === 'deal' && (
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {item.type === 'urgent' && (
                      <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 flex items-center justify-center text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {item.type === 'milestone' && (
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {item.type === 'meeting' && (
                      <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-700 flex items-center justify-center text-sky-600 dark:text-sky-400">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {item.type === 'task' && (
                      <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/60 border border-violet-300 dark:border-violet-700 flex items-center justify-center text-violet-600 dark:text-violet-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate">
                        {item.title}
                      </p>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Unread" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                      {item.message}
                    </p>
                    
                    {/* Exact IST Timestamp */}
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{item.exactIstTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
        <span className="text-slate-400">Timezone: Indian Standard Time (IST)</span>
        <button
          type="button"
          onClick={onClose}
          className="font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
}
