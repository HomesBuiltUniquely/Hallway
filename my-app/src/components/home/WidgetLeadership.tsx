'use client';

import React from 'react';
import Link from 'next/link';
import { Megaphone, Plus, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatRelativeTime } from '../../lib/hallwayDisplay';

export default function WidgetLeadership() {
  const { feedPosts } = useApp();

  const leadershipPost = [...feedPosts]
    .filter((p) => p.type === 'announcement' || p.type === 'general')
    .sort((a, b) => {
      const getTime = (p: any) => {
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
    })[0];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-sans">
            LEADERSHIP BOARD
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        </div>
        <Link
          href="/announcements/broadcast"
          className="text-xs font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1 transition-colors"
        >
          <span>Broadcast</span>
          <Plus className="w-3 h-3" />
        </Link>
      </div>

      {leadershipPost ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <img
              src={
                leadershipPost.author?.avatar ||
                'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
              }
              alt={leadershipPost.author?.name || 'Leadership'}
              className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {leadershipPost.author?.name || 'Leadership HQ'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {leadershipPost.author?.team || 'Operations'} • {formatRelativeTime(leadershipPost.createdAt)}
              </p>
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              {leadershipPost.title}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
              {leadershipPost.content}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30">
            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 text-xs font-bold mb-1">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Leadership Memo</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              All Hub directors & team leads are focusing on mid-month gross booking and token collection velocity across corridors.
            </p>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>Use Broadcast to publish updates</span>
            <Link
              href="/announcements/broadcast"
              className="font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
            >
              <span>Post</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
