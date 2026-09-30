'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Smile,
  Send,
  Heart,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FeedPost } from '../../types/index';
import { useApp } from '../../context/AppContext';
import { cleanPostContent } from '../../lib/hallwayDisplay';

const AVAILABLE_REACTIONS = [
  { id: 'clap', emoji: '👏', label: 'Applause' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'thumbsUp', emoji: '👍', label: 'Like' },
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'party', emoji: '🎉', label: 'Celebrate' },
  { id: 'hundred', emoji: '💯', label: '100' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket' },
];

export default function HubLiveFeedCard({ post }: { post: FeedPost }) {
  const { currentUser, addReaction, addComment, likeComment } = useApp();
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

  // Derive the circular icon emoji
  const iconEmoji =
    post.iconEmoji ||
    (post.type === 'booking'
      ? '💰'
      : post.type === 'quota'
      ? '🎯'
      : post.type === 'performer'
      ? '🏆'
      : post.type === 'announcement'
      ? '📢'
      : '✨');

  // Extract active reactions that have count > 0 or user reacted
  const activeReactions = AVAILABLE_REACTIONS.filter((r) => {
    const userKey = 'user' + r.id.charAt(0).toUpperCase() + r.id.slice(1);
    const count = Number(post.reactions?.[r.id]) || 0;
    const userReacted = Boolean(post.reactions?.[userKey]);
    return count > 0 || userReacted;
  });

  const commentsList = post.comments || [];
  const commentsCount = Math.max(commentsList.length, post.commentsCount || 0);

  return (
    <div
      className="bg-white dark:bg-[#0D1829] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 relative overflow-hidden"
      style={{
        borderLeftWidth: '5px',
        borderLeftColor: post.categoryColor || '#10B981',
      }}
    >
      {/* Top Header Row with Circular Icon Badge, Title & Timestamp */}
      <div className="flex items-start gap-3.5 mb-2.5">
        {/* Soft-tinted Category Icon Badge */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 shadow-2xs select-none transition-transform hover:scale-105"
          style={{
            backgroundColor: `${post.categoryColor || '#10B981'}18`,
            border: `1px solid ${post.categoryColor || '#10B981'}35`,
          }}
        >
          <span>{iconEmoji}</span>
        </div>

        {/* Headline & Relative Timestamp */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {post.title}
            </h3>
            <span className="text-[11px] font-medium text-slate-400 shrink-0 whitespace-nowrap">
              {post.timestamp || 'Just now'}
            </span>
          </div>

          {/* Post Narrative Copy */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
            {cleanPostContent(post.content)}
          </p>
        </div>
      </div>

      {/* Quota Progress Bar (For target milestones like 80% / 100%) */}
      {post.quotaProgress && (
        <div className="my-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            <span>{post.quotaProgress.label || 'Monthly Target'}</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {post.quotaProgress.percentage}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, post.quotaProgress.percentage))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom Action Row: Reactions and Comments */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-2">
        {/* Left: Reaction Pills and React Button */}
        <div className="flex items-center flex-wrap gap-1.5 relative">
          {activeReactions.map((r) => {
            const userKey = 'user' + r.id.charAt(0).toUpperCase() + r.id.slice(1);
            const count = Number(post.reactions?.[r.id]) || 0;
            const isUserReacted = Boolean(post.reactions?.[userKey]);

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleToggleReaction(r.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  isUserReacted
                    ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent'
                }`}
              >
                <span>{r.emoji}</span>
                <span>{count}</span>
              </button>
            );
          })}

          {/* Add Reaction Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Smile className="w-3.5 h-3.5" />
              <span>React</span>
            </button>

            {/* Reaction Popover Picker */}
            {showReactionPicker && (
              <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-lg z-30 animate-in fade-in duration-100">
                {AVAILABLE_REACTIONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleToggleReaction(r.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-125 transition-all text-base"
                    title={r.label}
                  >
                    <span>{r.emoji}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Comments Toggle */}
        <button
          type="button"
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}</span>
          {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
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
                  <img
                    src={comm.authorAvatar}
                    alt={comm.authorName}
                    className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {comm.authorName}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {comm.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {comm.content}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => likeComment(post.id, comm.id)}
                    className={`p-1 rounded-md shrink-0 transition-colors ${
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
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full object-cover shrink-0"
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
              className="p-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
