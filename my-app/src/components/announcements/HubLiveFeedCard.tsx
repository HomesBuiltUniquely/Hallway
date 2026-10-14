'use client';

import React, { useState, useMemo } from 'react';
import { Send, KeyRound, Trophy, Target, Megaphone } from 'lucide-react';
import { FeedPost } from '../../types/index';
import { useApp } from '../../context/AppContext';
import { cleanPostContent, formatRelativeTime } from '../../lib/hallwayDisplay';
import { canDeleteAnnouncement } from '../../lib/permissions';
import UserAvatar from '../common/UserAvatar';

const AVAILABLE_REACTIONS = [
  { id: 'clap', emoji: '👏', label: 'Applause' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'thumbsUp', emoji: '👍', label: 'Like' },
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'party', emoji: '🎉', label: 'Celebrate' },
  { id: 'hundred', emoji: '💯', label: '100' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket' },
];

type CardKind = 'booking' | 'performer' | 'quota' | 'announcement';

function resolveKind(post: FeedPost): CardKind {
  if (post.type === 'booking') return 'booking';
  if (post.type === 'performer') return 'performer';
  if (post.type === 'quota') return 'quota';
  return 'announcement';
}

function categoryMeta(kind: CardKind): { label: string; colorClass: string; railBg: string } {
  switch (kind) {
    case 'booking':
      return {
        label: 'Deals & Bookings',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        railBg: 'bg-emerald-50/70 dark:bg-emerald-950/20',
      };
    case 'performer':
      return {
        label: 'Top Performers',
        colorClass: 'text-[#C88A3E] dark:text-accent-gold',
        railBg: 'bg-amber-50/70 dark:bg-amber-950/20',
      };
    case 'quota':
      return {
        label: 'Milestones & Targets',
        colorClass: 'text-[#2E7DAB] dark:text-accent-cyan',
        railBg: 'bg-sky-50/70 dark:bg-sky-950/20',
      };
    default:
      return {
        label: 'Company Broadcasts',
        colorClass: 'text-brand',
        railBg: 'bg-surface-muted/80 dark:bg-surface-muted/40',
      };
  }
}

function extractMetric(post: FeedPost, kind: CardKind): { value: string; unit: string } {
  const text = `${post.title || ''} ${post.content || ''}`;

  if (kind === 'quota' && post.quotaProgress) {
    return {
      value: `${Math.round(Number(post.quotaProgress.percentage) || 0)}%`,
      unit: 'of monthly target',
    };
  }

  const money = text.match(/(₹\s*[\d.,]+\s*(?:Cr|L|Lakhs?|Crores?)?)/i);
  if (money) {
    const cleaned = money[1]
      .replace(/\s+/g, '')
      .replace(/Lakhs?/i, 'L')
      .replace(/Crores?/i, 'Cr');
    if (kind === 'booking') return { value: cleaned, unit: 'deal closed' };
    if (kind === 'performer') return { value: cleaned, unit: 'closures' };
    return { value: cleaned, unit: 'booked' };
  }

  const pct = text.match(/(\d+(?:\.\d+)?%)/);
  if (pct) {
    return {
      value: pct[1],
      unit: kind === 'quota' ? 'of monthly target' : 'conversion',
    };
  }

  if (kind === 'booking') return { value: 'NEW', unit: 'home booked' };
  if (kind === 'performer') return { value: '#1', unit: 'on the board' };
  if (kind === 'quota') return { value: '—', unit: 'of monthly target' };
  return { value: 'HUB', unit: 'broadcast' };
}

function boostMeta(kind: CardKind) {
  if (kind === 'booking') return { Icon: KeyRound, tone: 'text-accent-gold' };
  if (kind === 'performer') return { Icon: Trophy, tone: 'text-accent-gold' };
  if (kind === 'quota') return { Icon: Target, tone: 'text-accent-cyan' };
  return { Icon: Megaphone, tone: 'text-brand' };
}

/** Large ghost object that flies across the whole left-rail background. */
function RailBgMotion({ kind }: { kind: CardKind }) {
  const { Icon, tone } = boostMeta(kind);
  return (
    <div className={`hub-rail-bg-motion ${tone}`} aria-hidden>
      <Icon className="hub-rail-bg-motion__icon" strokeWidth={1.25} />
    </div>
  );
}

/** Moving object parked at the start of the category title. */
function TitleBoost({ kind }: { kind: CardKind }) {
  const { Icon, tone } = boostMeta(kind);
  return (
    <span className={`hub-title-boost ${tone}`} aria-hidden>
      <Icon className="hub-title-boost__icon" strokeWidth={2.4} />
    </span>
  );
}

export default function HubLiveFeedCard({ post }: { post: FeedPost }) {
  const { currentUser, addReaction, addComment, deleteAnnouncement } = useApp();
  const [showComments, setShowComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const kind = resolveKind(post);
  const category = categoryMeta(kind);
  const metric = useMemo(() => extractMetric(post, kind), [post, kind]);

  const displayTitle = useMemo(
    () =>
      (post.title || '')
        .replace(/^(?:🚀|🔨|💰|🎯|🏆|🏅|🎖️|⚡|🔥|📢|📖|✨)\s*/u, '')
        .trim(),
    [post.title]
  );

  const relativeTime = useMemo(
    () => formatRelativeTime(post.createdAt || post.timestamp),
    [post.createdAt, post.timestamp]
  );

  const commentsList = post.comments || [];
  const commentsCount = Math.max(commentsList.length, post.commentsCount || 0);

  const handleToggleReaction = async (reactionKey: string) => {
    await addReaction(post.id, reactionKey);
    setShowReactionPicker(false);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      await addComment(post.id, newCommentText.trim());
      setNewCommentText('');
      setShowComments(true);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <article className="relative isolate w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800/90 dark:bg-panel">
      {/* Two-column from md up — stacks cleanly on narrow viewports */}
      <div className="grid grid-cols-1 md:grid-cols-[11rem_minmax(0,1fr)]">
        {/* Left metric rail — bg motion + title leading icon */}
        <aside
          className={`relative overflow-hidden border-b border-slate-100 px-4 py-4 md:border-b-0 md:border-r dark:border-slate-800 ${category.railBg}`}
        >
          <RailBgMotion kind={kind} />
          <div className="relative z-10">
            <p
              className={`flex items-center text-[13px] font-semibold leading-tight ${category.colorClass}`}
            >
              <TitleBoost kind={kind} />
              <span>{category.label}</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{relativeTime}</p>
            <p className="mt-3 break-all text-[1.5rem] font-black leading-none tracking-tight text-slate-900 dark:text-white">
              {metric.value}
            </p>
            <p className="mt-1.5 text-sm leading-snug text-slate-500 dark:text-slate-400">
              {metric.unit}
            </p>
          </div>
        </aside>

        {/* Right story column */}
        <div className="flex min-w-0 flex-col bg-white px-4 py-4 md:px-5 dark:bg-panel">
          <h3 className="text-[15px] font-bold leading-snug tracking-tight text-slate-900 sm:text-base dark:text-white">
            {displayTitle}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {cleanPostContent(post.content)}
          </p>

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowReactionPicker(!showReactionPicker)}
                  className="cursor-pointer transition-colors hover:text-brand"
                >
                  React
                </button>
                {showReactionPicker && (
                  <div className="absolute bottom-full left-0 z-30 mb-1.5 flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-panel">
                    {AVAILABLE_REACTIONS.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleToggleReaction(r.id)}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-sm transition-all hover:scale-125 hover:bg-slate-100 dark:hover:bg-slate-800"
                        title={r.label}
                      >
                        {r.emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowComments(!showComments)}
                className="cursor-pointer transition-colors hover:text-brand"
              >
                {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
              </button>
            </div>

            {canDeleteAnnouncement(post, currentUser) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Are you sure you want to delete "${post.title}"?`)) {
                    void deleteAnnouncement(post.id);
                  }
                }}
                className="cursor-pointer text-sm text-slate-400 transition-colors hover:text-brand"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {showComments && (
        <div className="space-y-2.5 border-t border-slate-100 px-4 pb-4 dark:border-slate-800">
          {commentsList.length > 0 && (
            <div className="max-h-40 space-y-2 overflow-y-auto pt-3">
              {commentsList.map((comm) => (
                <div
                  key={comm.id}
                  className="flex items-start gap-2 rounded-xl bg-slate-50 p-2 text-xs dark:bg-surface-muted"
                >
                  <UserAvatar name={comm.authorName} avatar={comm.authorAvatar} size={24} className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[11px] font-bold text-slate-900 dark:text-white">
                        {comm.authorName}
                      </span>
                      <span className="text-[10px] text-slate-400">{comm.timestamp}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300">{comm.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleCommentSubmit} className="flex items-center gap-1.5 pt-1">
            <UserAvatar name={currentUser.name} avatar={currentUser.avatar} size={24} />
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Cheer or write a comment..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-surface-muted"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim() || isSubmittingComment}
              className="cursor-pointer rounded-xl bg-brand p-1.5 text-white hover:bg-brand-hover disabled:opacity-50"
            >
              <Send className="h-3 w-3" />
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
