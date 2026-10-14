'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyRound, Trophy, Target, Megaphone, SmilePlus, Trash2 } from 'lucide-react';
import { FeedPost } from '../../types/index';
import { useApp } from '../../context/AppContext';
import { cleanPostContent, formatRelativeTime } from '../../lib/hallwayDisplay';
import { canDeleteAnnouncement, canDeleteComment } from '../../lib/permissions';
import UserAvatar from '../common/UserAvatar';

const AVAILABLE_REACTIONS = [
  { id: 'thumbsUp', emoji: '👍', label: 'Like' },
  { id: 'heart', emoji: '❤️', label: 'Love' },
  { id: 'clap', emoji: '👏', label: 'Applause' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'party', emoji: '🎉', label: 'Celebrate' },
  { id: 'hundred', emoji: '💯', label: '100' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket' },
  { id: 'joy', emoji: '😂', label: 'Joy' },
] as const;

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

function RailBgMotion({ kind }: { kind: CardKind }) {
  const { Icon, tone } = boostMeta(kind);
  return (
    <div className={`hub-rail-bg-motion ${tone}`} aria-hidden>
      <Icon className="hub-rail-bg-motion__icon" strokeWidth={1.25} />
    </div>
  );
}

function TitleBoost({ kind }: { kind: CardKind }) {
  const { Icon, tone } = boostMeta(kind);
  return (
    <span className={`hub-title-boost ${tone}`} aria-hidden>
      <Icon className="hub-title-boost__icon" strokeWidth={2.4} />
    </span>
  );
}

function userKeyFor(id: string) {
  return `user${id.charAt(0).toUpperCase()}${id.slice(1)}`;
}

export default function HubLiveFeedCard({ post }: { post: FeedPost }) {
  const { currentUser, addReaction, addComment, deleteAnnouncement, deleteComment } = useApp();
  const [showComments, setShowComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

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

  const reactions = post.reactions || {};
  const activeReactionChips = useMemo(
    () =>
      AVAILABLE_REACTIONS.map((r) => ({
        ...r,
        count: Number(reactions[r.id]) || 0,
        mine: Boolean(reactions[userKeyFor(r.id)]),
      })).filter((r) => r.count > 0 || r.mine),
    [reactions]
  );

  const myReaction = useMemo(
    () => AVAILABLE_REACTIONS.find((r) => reactions[userKeyFor(r.id)]) || null,
    [reactions]
  );

  const commentsList = post.comments || [];
  const commentsCount = Math.max(commentsList.length, post.commentsCount || 0);

  useEffect(() => {
    if (!showReactionPicker) return;
    const onDoc = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showReactionPicker]);

  const handleToggleReaction = async (reactionKey: string) => {
    try {
      await addReaction(post.id, reactionKey);
    } finally {
      setShowReactionPicker(false);
    }
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

  const handleDeleteComment = async (commentId: string) => {
    if (deletingCommentId) return;
    setDeletingCommentId(commentId);
    try {
      await deleteComment(post.id, commentId);
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <article className="relative isolate w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800/90 dark:bg-panel">
      <div className="grid grid-cols-1 md:grid-cols-[11rem_minmax(0,1fr)]">
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

        <div className="flex min-w-0 flex-col bg-white px-4 py-4 md:px-5 dark:bg-panel">
          <h3 className="text-[15px] font-bold leading-snug tracking-tight text-slate-900 sm:text-base dark:text-white">
            {displayTitle}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {cleanPostContent(post.content)}
          </p>

          {/* Chips + React + comment + delete — one row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
            {activeReactionChips.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleToggleReaction(r.id)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] transition-all ${
                  r.mine
                    ? 'border-brand/40 bg-brand-soft text-ink shadow-xs dark:text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200'
                }`}
                title={r.mine ? 'Remove your reaction' : `React with ${r.label}`}
              >
                <span>{r.emoji}</span>
                <span className="text-[11px] font-bold tabular-nums">{r.count}</span>
              </button>
            ))}

            <div className="relative" ref={pickerRef}>
              <button
                type="button"
                onClick={() => setShowReactionPicker((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${
                  myReaction ? 'text-brand' : 'text-slate-500'
                }`}
                aria-label="Add reaction"
              >
                {myReaction ? (
                  <span className="text-sm leading-none">{myReaction.emoji}</span>
                ) : (
                  <SmilePlus className="h-4 w-4" />
                )}
                <span className="text-xs font-semibold">React</span>
              </button>

              {showReactionPicker && (
                <div className="absolute bottom-full left-0 z-40 mb-2 flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-panel">
                  {AVAILABLE_REACTIONS.map((r) => {
                    const mine = Boolean(reactions[userKeyFor(r.id)]);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleToggleReaction(r.id)}
                        className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-lg transition-transform hover:scale-125 ${
                          mine
                            ? 'bg-brand-soft ring-1 ring-brand/30'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={mine ? `Remove ${r.label}` : r.label}
                      >
                        {r.emoji}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowComments((v) => !v)}
              className="cursor-pointer text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
            >
              {commentsCount > 0
                ? `View all ${commentsCount} ${commentsCount === 1 ? 'comment' : 'comments'}`
                : 'Add a comment…'}
            </button>

            {canDeleteAnnouncement(post, currentUser) && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${post.title}"?`)) {
                    void deleteAnnouncement(post.id);
                  }
                }}
                className="ml-auto cursor-pointer p-1 text-slate-300 transition-colors hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400"
                title="Delete post"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Instagram-style comment thread */}
      {showComments && (
        <div className="border-t border-slate-100 bg-[#fafafa] dark:border-slate-800 dark:bg-black/20">
          <div className="max-h-60 space-y-3 overflow-y-auto px-4 py-3">
            {commentsList.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-400">
                No comments yet.
              </p>
            ) : (
              commentsList.map((comm) => {
                const canDelete = canDeleteComment(comm, currentUser);
                return (
                  <div key={comm.id} className="group flex items-start gap-3">
                    <UserAvatar
                      name={comm.authorName}
                      avatar={comm.authorAvatar}
                      size={32}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-[13px] leading-5 text-slate-800 dark:text-slate-200">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {comm.authorName}
                        </span>
                        <span className="mx-1.5 font-normal">{comm.content}</span>
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {comm.timestamp || formatRelativeTime(comm.createdAt)}
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        disabled={deletingCommentId === comm.id}
                        onClick={() => void handleDeleteComment(comm.id)}
                        className="mt-1 shrink-0 rounded-full p-1.5 text-slate-300 opacity-70 transition-all hover:bg-slate-200/80 hover:text-brand group-hover:opacity-100 dark:hover:bg-slate-800"
                        title="Delete your comment"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={handleCommentSubmit}
            className="flex items-center gap-3 border-t border-slate-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-panel"
          >
            <UserAvatar name={currentUser.name} avatar={currentUser.avatar} size={32} />
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a comment…"
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim() || isSubmittingComment}
              className="shrink-0 text-[13px] font-semibold text-brand disabled:opacity-30"
            >
              {isSubmittingComment ? '…' : 'Post'}
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
