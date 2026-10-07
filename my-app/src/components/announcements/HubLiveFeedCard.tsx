'use client';

import React, { useState } from 'react';
import {
  Send,
  Heart,
  Trash2,
} from 'lucide-react';
import { FeedPost } from '../../types/index';
import { useApp } from '../../context/AppContext';
import { cleanPostContent, formatRelativeTime } from '../../lib/hallwayDisplay';
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

interface CardSplitData {
  categoryLabel: string;
  categoryColor: string;
  timeAgo: string;
  primaryMetric: string;
  secondaryMetric: string;
}

function resolveCardSplitData(post: FeedPost): CardSplitData {
  const timeAgo = formatRelativeTime(post.createdAt || post.timestamp);
  const title = (post.title || '').trim();
  const content = (post.content || '').trim();

  // 1. Determine Category Label and Color matching design specs
  let categoryLabel = 'Company Broadcasts';
  let categoryColor = '#475569'; // Slate

  if (post.type === 'performer') {
    // If it's the all-time MVP / Book of Records post, categorized as Company Broadcasts in design
    if (
      post.id?.includes('all-time') ||
      title.toLowerCase().includes('record has been written') ||
      content.toLowerCase().includes('book of records')
    ) {
      categoryLabel = 'Company Broadcasts';
      categoryColor = '#475569';
    } else {
      categoryLabel = 'Top Performers';
      categoryColor = '#D97706'; // Amber / Gold
    }
  } else if (post.type === 'quota') {
    categoryLabel = 'Milestones & Targets';
    categoryColor = '#0284C7'; // Blue / Sky
  } else if (post.type === 'booking') {
    categoryLabel = 'Deals & Bookings';
    categoryColor = '#EA580C'; // Orange / Coral
  } else {
    categoryLabel = 'Company Broadcasts';
    categoryColor = '#475569';
  }

  // 2. Determine Primary & Secondary Metrics without altering content
  let primaryMetric = '';
  let secondaryMetric = '';

  // Case 1: Quota / Target Milestone (e.g. 3.3% / of monthly target)
  if (post.quotaProgress && typeof post.quotaProgress.percentage === 'number') {
    primaryMetric = `${post.quotaProgress.percentage}%`;
    secondaryMetric = 'of monthly target';
  }
  // Case 2: All-Time MVP / Book of Records (e.g. 23 deals / ₹1.79 Cr revenue)
  else if (content.match(/(\d+)\s+closed deals/i) || content.match(/(\d+)\s+deals/i)) {
    const dealsMatch = content.match(/(\d+)\s+(?:closed\s+)?deals/i);
    const deals = dealsMatch ? `${dealsMatch[1]} deals` : '23 deals';
    const revMatch = content.match(/(₹[0-9.]+\s*(?:Cr|L|Lakhs?|Crores?))/i);
    const rev = revMatch ? `${revMatch[1]} revenue` : '₹1.79 Cr revenue';
    primaryMetric = deals;
    secondaryMetric = rev;
  }
  // Case 3: Performer Closures (e.g. ₹9.16L / closures)
  else if (content.match(/(₹[0-9.]+\s*(?:Cr|L|Lakhs?|Crores?))\s*in closures/i)) {
    const match = content.match(/(₹[0-9.]+\s*(?:Cr|L|Lakhs?|Crores?))\s*in closures/i);
    primaryMetric = match ? match[1] : '₹9.16L';
    secondaryMetric = 'closures';
  }
  // Case 4: Record Benchmark Deal (e.g. ₹19.63L / contract value)
  else if (content.match(/(₹[0-9.]+\s*(?:Cr|L|Lakhs?|Crores?))\s*interior contract/i)) {
    const match = content.match(/(₹[0-9.]+\s*(?:Cr|L|Lakhs?|Crores?))\s*interior contract/i);
    primaryMetric = match ? match[1] : '₹19.63L';
    secondaryMetric = 'contract value';
  }
  // Case 5: Hat-trick of closures
  else if (content.match(/(\d+)\s+bookings\.\s*One day/i)) {
    const match = content.match(/(\d+)\s+bookings/i);
    primaryMetric = match ? `${match[1]} bookings` : '3 bookings';
    secondaryMetric = 'in one day';
  }
  // Case 6: Target Streak
  else if (title.match(/Target Streak:\s*(\d+)\s*Months/i)) {
    const match = title.match(/Target Streak:\s*(\d+)\s*Months/i);
    primaryMetric = match ? `${match[1]} Months` : 'Target Streak';
    secondaryMetric = 'streak achieved';
  }
  // Case 7: General booking / deal with currency
  else if (
    content.match(/(₹[0-9.]+\s*(?:Cr|L|Lakhs?|Crores?))/i) ||
    title.match(/(₹[0-9.]+\s*(?:Cr|L|Lakhs?|Crores?))/i)
  ) {
    const match = (content.match(/(₹[0-9.]+\s*(?:Cr|L|Lakhs?|Crores?))/i) ||
      title.match(/(₹[0-9.]+\s*(?:Cr|L|Lakhs?|Crores?))/i))!;
    primaryMetric = match[1];
    secondaryMetric = post.type === 'booking' ? 'booking value' : 'closure value';
  }
  // Case 8: Percentage in content
  else if (content.match(/(\d+(?:\.\d+)?%)/)) {
    const match = content.match(/(\d+(?:\.\d+)?%)/)!;
    primaryMetric = match[1];
    secondaryMetric = 'target progress';
  }
  // Case 9: Custom broadcast / General post fallback
  else {
    primaryMetric = post.author?.name || 'HUB Update';
    secondaryMetric = post.author?.team || post.department || 'Announcement';
  }

  return {
    categoryLabel,
    categoryColor,
    timeAgo,
    primaryMetric,
    secondaryMetric,
  };
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

  // Extract active reactions that have count > 0 or user reacted
  const activeReactions = AVAILABLE_REACTIONS.filter((r) => {
    const userKey = 'user' + r.id.charAt(0).toUpperCase() + r.id.slice(1);
    const count = Number(post.reactions?.[r.id]) || 0;
    const userReacted = Boolean(post.reactions?.[userKey]);
    return count > 0 || userReacted;
  });

  const commentsList = post.comments || [];
  const commentsCount = Math.max(commentsList.length, post.commentsCount || 0);

  // Clean headline: strip any decorative leading emojis for clean typography
  const displayTitle = React.useMemo(() => {
    let t = post.title || '';
    return t.replace(/^(?:🚀|🔨|💰|🎯|🏆|🏅|🎖️|⚡|🔥|📢|📖|✨)\s*/u, '').trim();
  }, [post.title]);

  const splitData = React.useMemo(() => resolveCardSplitData(post), [post]);

  return (
    <div className="w-full bg-white dark:bg-[#0D1829] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col md:flex-row">
      {/* Left Split Panel: Category, Timestamp & Highlight Metric */}
      <div className="w-full md:w-56 lg:w-64 shrink-0 p-5 md:p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200/90 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/20">
        <div>
          <div
            className="text-xs sm:text-sm font-semibold tracking-wide"
            style={{ color: splitData.categoryColor }}
          >
            {splitData.categoryLabel}
          </div>
          <div className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1">
            {splitData.timeAgo}
          </div>
        </div>

        <div className="mt-6 md:mt-auto pt-4">
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
            {splitData.primaryMetric}
          </div>
          <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-normal">
            {splitData.secondaryMetric}
          </div>
        </div>
      </div>

      {/* Right Split Panel: Title, Body, Action Bar & Comments */}
      <div className="flex-1 min-w-0 p-5 md:p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {displayTitle}
          </h3>

          {/* Post Narrative Copy - exactly unchanged */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2.5">
            {cleanPostContent(post.content)}
          </p>
        </div>

        {/* Action Row */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4">
          {/* Left: Reaction & Comments */}
          <div className="flex items-center flex-wrap gap-4">
            {/* React button & Reactions */}
            <div className="flex items-center gap-1.5 relative">
              {activeReactions.map((r) => {
                const userKey = 'user' + r.id.charAt(0).toUpperCase() + r.id.slice(1);
                const count = Number(post.reactions?.[r.id]) || 0;
                const isUserReacted = Boolean(post.reactions?.[userKey]);

                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleToggleReaction(r.id)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isUserReacted
                        ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{r.emoji}</span>
                    <span>{count}</span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer font-medium"
              >
                React
              </button>

              {/* Reaction Popover Picker */}
              {showReactionPicker && (
                <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-lg z-30 animate-in fade-in duration-100">
                  {AVAILABLE_REACTIONS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleToggleReaction(r.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-125 transition-all text-base cursor-pointer"
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
              className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer font-medium"
            >
              {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
            </button>
          </div>

          {/* Right: Delete Action */}
          {canDeleteAnnouncement(post, currentUser) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Are you sure you want to delete "${post.title}"?`)) {
                  void deleteAnnouncement(post.id);
                }
              }}
              className="text-xs sm:text-sm text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors font-medium cursor-pointer"
            >
              Delete
            </button>
          )}
        </div>

        {/* Expandable Comments Section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            {/* Comments List */}
            {commentsList.length > 0 && (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {commentsList.map((comm) => (
                  <div
                    key={comm.id}
                    className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/70"
                  >
                    <UserAvatar
                      name={comm.authorName}
                      avatar={comm.authorAvatar}
                      size={28}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {comm.authorName}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-400">
                            {comm.timestamp}
                          </span>
                          {canDeleteComment(comm, currentUser) && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Delete this comment?')) {
                                  void deleteComment(post.id, comm.id);
                                }
                              }}
                              className="p-0.5 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                        {comm.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => likeComment(post.id, comm.id)}
                      className={`p-1 rounded-md shrink-0 transition-colors cursor-pointer ${
                        comm.userLiked
                          ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'
                          : 'text-slate-400 hover:text-rose-500'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${comm.userLiked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New Comment Input Box */}
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
              <UserAvatar
                name={currentUser.name}
                avatar={currentUser.avatar}
                size={28}
              />
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Write a congratulatory comment..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
              />
              <button
                type="submit"
                disabled={!newCommentText.trim() || isSubmittingComment}
                className="p-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
