'use client';

import React, { useState, useMemo } from 'react';
import {
  Send,
  Heart,
  Trash2,
  Clock,
  Sparkles,
  Trophy,
  Target,
  Megaphone,
  MessageSquare,
  Building2,
  TrendingUp,
  Zap,
  CheckCircle,
  Home,
  Briefcase,
  User,
} from 'lucide-react';
import { FeedPost } from '../../types/index';
import { useApp } from '../../context/AppContext';
import { cleanPostContent, formatTimestampWithContext } from '../../lib/hallwayDisplay';
import { canDeleteAnnouncement, canDeleteComment } from '../../lib/permissions';
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

interface ExtractedPill {
  label: string;
  icon?: string;
  highlight?: boolean;
}

function parseCardPills(post: FeedPost): ExtractedPill[] {
  const content = post.content || '';
  const title = post.title || '';
  const text = `${title} ${content}`;
  const pills: ExtractedPill[] = [];

  // 1. Currency amount match
  const valMatch = text.match(/(₹[0-9.]+\s*(?:Cr|L|Lakhs?|Crores?))/i);
  if (valMatch) {
    pills.push({ label: `${valMatch[1]} Contract`, icon: '🏷️', highlight: true });
  }

  // 2. Department specific tags
  if (post.type === 'booking') {
    pills.push({ label: 'Token Advance Verified', icon: '💰' });
    if (text.toLowerCase().includes('prestige')) pills.push({ label: 'Prestige Lakeside · 3BHK', icon: '🏡' });
    else if (text.toLowerCase().includes('sobha')) pills.push({ label: 'Sobha Dream Acres', icon: '🏡' });
    else if (text.toLowerCase().includes('villa')) pills.push({ label: 'Signature Villa', icon: '🏡' });
    else pills.push({ label: 'Luxury Interior', icon: '🏡' });
  } else if (post.type === 'performer') {
    if (text.match(/(\d+(?:\.\d+)?%)/)) {
      pills.push({ label: `${text.match(/(\d+(?:\.\d+)?%)/)![1]} Conversion`, icon: '⚡' });
    }
    pills.push({ label: '#1 on Board', icon: '🏆', highlight: true });
  } else if (post.type === 'quota') {
    if (post.quotaProgress) {
      pills.push({ label: `${post.quotaProgress.percentage}% Achieved`, icon: '🎯', highlight: true });
      pills.push({ label: `Goal: ${post.quotaProgress.targetFormatted || '₹4.80 Cr'}`, icon: '🏁' });
    }
  } else {
    if (text.toLowerCase().includes('production') || text.toLowerCase().includes('cad')) {
      pills.push({ label: 'Measurements Locked', icon: '📐' });
      pills.push({ label: 'Factory Handoff', icon: '🏭' });
    } else if (text.toLowerCase().includes('xp')) {
      pills.push({ label: '+40 XP Earned', icon: '⚡', highlight: true });
      pills.push({ label: 'Design Master', icon: '🎖️' });
    }
  }

  return pills.slice(0, 3);
}

export default function HubLiveFeedCard({ post }: { post: FeedPost }) {
  const { currentUser, addReaction, addComment, likeComment, deleteAnnouncement, deleteComment } = useApp();
  const [showComments, setShowComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

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
    } catch {
      // error handled in context
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Extract active reactions with counts
  const activeReactions = AVAILABLE_REACTIONS.filter((r) => {
    const userKey = 'user' + r.id.charAt(0).toUpperCase() + r.id.slice(1);
    const count = Number(post.reactions?.[r.id]) || 0;
    const userReacted = Boolean(post.reactions?.[userKey]);
    return count > 0 || userReacted;
  });

  const commentsList = post.comments || [];
  const commentsCount = Math.max(commentsList.length, post.commentsCount || 0);

  // Clean headline: strip any decorative leading emojis
  const displayTitle = useMemo(() => {
    let t = post.title || '';
    return t.replace(/^(?:🚀|🔨|💰|🎯|🏆|🏅|🎖️|⚡|🔥|📢|📖|✨)\s*/u, '').trim();
  }, [post.title]);

  // Exact Indian Standard Time timestamp
  const timeContext = useMemo(() => {
    return formatTimestampWithContext(post.createdAt || post.timestamp);
  }, [post.createdAt, post.timestamp]);

  const microPills = useMemo(() => parseCardPills(post), [post]);

  const isBooking = post.type === 'booking';
  const isPerformer = post.type === 'performer';
  const isQuota = post.type === 'quota';

  // Determine branch tag
  const branchTag = useMemo(() => {
    const text = `${post.title || ''} ${post.content || ''}`.toLowerCase();
    if (text.includes('sarjapur')) return 'Sarjapura Hub';
    if (text.includes('hbr')) return 'HBR Hub';
    if (text.includes('jp nagar')) return 'JP Nagar Hub';
    return post.author?.team || 'HUB Corridor';
  }, [post.title, post.content, post.author]);

  return (
    <div
      className={`w-full rounded-2xl p-4 sm:p-5 transition-all duration-200 border shadow-xs hover:shadow-md ${
        isBooking
          ? 'bg-gradient-to-br from-emerald-500/[0.04] via-white dark:via-[#0D1829] to-teal-500/[0.02] border-emerald-500/30 dark:border-emerald-500/25'
          : isPerformer
          ? 'bg-gradient-to-br from-amber-500/[0.04] via-white dark:via-[#0D1829] to-orange-500/[0.02] border-amber-500/30 dark:border-amber-500/25'
          : isQuota
          ? 'bg-gradient-to-br from-sky-500/[0.04] via-white dark:via-[#0D1829] to-indigo-500/[0.02] border-sky-500/30 dark:border-sky-500/25'
          : 'bg-white dark:bg-[#0D1829] border-slate-200/90 dark:border-slate-800/90'
      }`}
    >
      {/* Top Micro-Bar: Category Badge + Branch Chip + Exact IST Time */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isBooking ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold uppercase tracking-wide">
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>CRM · NEW BOOKING</span>
            </span>
          ) : isPerformer ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wide">
              <Trophy className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>TOP PERFORMER</span>
            </span>
          ) : isQuota ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-300 text-[10px] font-extrabold uppercase tracking-wide">
              <Target className="w-3 h-3 text-sky-600 dark:text-sky-400" />
              <span>CORRIDOR MILESTONE</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 border border-violet-300 dark:border-violet-700 text-violet-800 dark:text-violet-300 text-[10px] font-extrabold uppercase tracking-wide">
              <Megaphone className="w-3 h-3 text-violet-600 dark:text-violet-400" />
              <span>ANNOUNCEMENT</span>
            </span>
          )}

          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Building2 className="w-2.5 h-2.5 text-slate-400" />
            <span>{branchTag}</span>
          </span>
        </div>

        {/* Exact IST Timing */}
        <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
          <Clock className="w-2.5 h-2.5" />
          <span>{timeContext.exact}</span>
          <span className="hidden sm:inline text-[10px] text-slate-400">({timeContext.relative})</span>
        </div>
      </div>

      {/* Catchy Bold Headline from PDF Scenarios */}
      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
        {displayTitle}
      </h3>

      {/* Crisp 1-2 sentence supporting copy */}
      <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
        {cleanPostContent(post.content)}
      </p>

      {/* Pinterest-Style Micro-Tags Matrix */}
      {microPills.length > 0 && (
        <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
          {microPills.map((p, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                p.highlight
                  ? isBooking
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/80'
                    : isPerformer
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/80'
                    : 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300/80 dark:border-sky-700/80'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
              }`}
            >
              {p.icon && <span>{p.icon}</span>}
              <span>{p.label}</span>
            </span>
          ))}
        </div>
      )}

      {/* Clean Compact Action Strip */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center flex-wrap gap-1.5">
          {/* Reaction Bubbles */}
          {activeReactions.map((r) => {
            const userKey = 'user' + r.id.charAt(0).toUpperCase() + r.id.slice(1);
            const count = Number(post.reactions?.[r.id]) || 0;
            const isUserReacted = Boolean(post.reactions?.[userKey]);

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleToggleReaction(r.id)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                  isUserReacted
                    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{r.emoji}</span>
                <span>{count}</span>
              </button>
            );
          })}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <Heart className="w-3 h-3 text-rose-500" />
              <span>React</span>
            </button>

            {/* Reaction Picker Popover */}
            {showReactionPicker && (
              <div className="absolute bottom-full left-0 mb-1.5 flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-lg z-30 animate-in fade-in duration-100">
                {AVAILABLE_REACTIONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleToggleReaction(r.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-125 transition-all text-sm cursor-pointer"
                    title={r.label}
                  >
                    <span>{r.emoji}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comments Toggle */}
          <button
            type="button"
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3 h-3 text-slate-400" />
            <span>{commentsCount} comments</span>
          </button>
        </div>

        {/* Delete Action (Admin only) */}
        {canDeleteAnnouncement(post, currentUser) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Are you sure you want to delete "${post.title}"?`)) {
                void deleteAnnouncement(post.id);
              }
            }}
            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors cursor-pointer"
            title="Delete announcement"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Expandable Comments Drawer */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
          {commentsList.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {commentsList.map((comm) => (
                <div
                  key={comm.id}
                  className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800/70 text-xs"
                >
                  <UserAvatar name={comm.authorName} avatar={comm.authorAvatar} size={24} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-900 dark:text-white truncate text-[11px]">
                        {comm.authorName}
                      </span>
                      <span className="text-[10px] text-slate-400">{comm.timestamp}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5 leading-snug">
                      {comm.content}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => likeComment(post.id, comm.id)}
                    className="p-0.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                  >
                    <Heart className={`w-3 h-3 ${comm.userLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New Comment Input Box */}
          <form onSubmit={handleCommentSubmit} className="flex items-center gap-1.5">
            <UserAvatar name={currentUser.name} avatar={currentUser.avatar} size={24} />
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Cheer or write a comment..."
              className="flex-1 px-3 py-1 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim() || isSubmittingComment}
              className="p-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0 cursor-pointer"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
