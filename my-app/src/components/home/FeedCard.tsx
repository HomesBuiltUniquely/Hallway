'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Send, Sparkles, Award, Smile } from 'lucide-react';
import { FeedPost } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatRelativeTime, cleanPostContent } from '../../lib/hallwayDisplay';

const WHATSAPP_EMOJIS = [
  { key: 'thumbsUp', emoji: '👍', label: 'Like' },
  { key: 'heart', emoji: '❤️', label: 'Love' },
  { key: 'joy', emoji: '😂', label: 'Haha' },
  { key: 'surprised', emoji: '😮', label: 'Wow' },
  { key: 'clap', emoji: '👏', label: 'Clap' },
  { key: 'pray', emoji: '🙏', label: 'Thanks' },
] as const;

export default function FeedCard({ post }: { post: FeedPost }) {
  const { addReaction, addComment, likeComment, currentUser } = useApp();
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const emojiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleEmojiMouseEnter = () => {
    if (emojiTimeoutRef.current) {
      clearTimeout(emojiTimeoutRef.current);
      emojiTimeoutRef.current = null;
    }
    setShowEmojiPicker(true);
  };

  const handleEmojiMouseLeave = () => {
    if (emojiTimeoutRef.current) {
      clearTimeout(emojiTimeoutRef.current);
    }
    emojiTimeoutRef.current = setTimeout(() => {
      setShowEmojiPicker(false);
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (emojiTimeoutRef.current) clearTimeout(emojiTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const currentUserHandle =
    currentUser.name === 'Super Admin'
      ? 'admin'
      : (currentUser.name || 'user').toLowerCase().replace(/\s+/g, '.');

  const handleSendComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commentInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment(post.id, commentInput, {
        name: currentUser.name,
        handle: currentUserHandle,
        avatar: currentUser.avatar,
        role: currentUser.role
      });
      setCommentInput('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickEmoji = (emoji: string) => {
    setCommentInput((prev) => prev + emoji);
  };

  const isPerformerPost = post.type === 'performer' || post.title.toLowerCase().includes('sarah');

  return (
    <div className="bg-white dark:bg-[#0D1829] border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200">
      {/* Top Header with Category Indicator */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
            style={{ backgroundColor: post.categoryColor }}
          />
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {post.title}
          </h3>
          {isPerformerPost && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase border border-amber-400/30">
              <Award className="w-3 h-3" />
              <span>Corridor MVP</span>
            </span>
          )}
        </div>
        <span className="text-[11px] font-medium text-slate-400 shrink-0 whitespace-nowrap">
          {formatRelativeTime(post.createdAt || post.timestamp)}
        </span>
      </div>

      {/* Post Body Content */}
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
        {cleanPostContent(post.content)}
      </p>

      {/* Quota Progress Bar (if quota milestone post) */}
      {post.quotaProgress && (
        <div className="mb-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
            <span className="text-slate-500 dark:text-slate-400">{post.quotaProgress.label}</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{post.quotaProgress.percentage}%</span>
          </div>
          <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
              style={{ width: `${post.quotaProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* WhatsApp-Style Reactions & Comments Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 relative">
        <div className="flex items-center gap-1.5 flex-wrap relative">
          {/* Active Reaction Badges (WhatsApp message reaction pills) */}
          {WHATSAPP_EMOJIS.map((item) => {
            const count = post.reactions[item.key] || 0;
            if (count <= 0) return null;
            const userKey = `user${item.key.charAt(0).toUpperCase() + item.key.slice(1)}`;
            const userReacted = Boolean(post.reactions[userKey]);

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => addReaction(post.id, item.key)}
                title={userReacted ? `Remove ${item.label}` : `React with ${item.label}`}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-2xs border cursor-pointer ${
                  userReacted
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-400/30'
                    : 'bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700/80 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="text-sm leading-none">{item.emoji}</span>
                <span className="text-[11px] font-bold">{count}</span>
              </button>
            );
          })}

          {/* React Trigger Button with Hoverable Reaction Picker */}
          <div
            className="relative inline-flex items-center"
            onMouseEnter={handleEmojiMouseEnter}
            onMouseLeave={handleEmojiMouseLeave}
          >
            {/* Floating WhatsApp Reaction Picker */}
            {showEmojiPicker && (
              <div
                ref={pickerRef}
                className="absolute bottom-full left-0 mb-2 z-30 flex items-center gap-1 bg-white dark:bg-[#1f2c34] px-2.5 py-1.5 rounded-full shadow-2xl border border-slate-200/90 dark:border-slate-700/80 animate-in fade-in zoom-in-95 duration-150 select-none"
              >
                {WHATSAPP_EMOJIS.map((item) => {
                  const userKey = `user${item.key.charAt(0).toUpperCase() + item.key.slice(1)}`;
                  const isUserActive = Boolean(post.reactions[userKey]);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        addReaction(post.id, item.key);
                        setShowEmojiPicker(false);
                      }}
                      title={item.label}
                      className={`p-1.5 text-xl sm:text-2xl rounded-full transition-all duration-150 hover:scale-130 active:scale-95 cursor-pointer relative ${
                        isUserActive ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'hover:bg-slate-100 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <span>{item.emoji}</span>
                      {isUserActive && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* WhatsApp React Trigger Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              title="React"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100/70 dark:bg-slate-800/70 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer"
            >
              <Smile className="w-3.5 h-3.5 text-amber-500" />
              <span>React</span>
            </button>
          </div>
        </div>

        {/* Comment Count / Drawer Toggle */}
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors text-xs font-semibold cursor-pointer ${
            showComments
              ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>{post.commentsCount} {post.commentsCount === 1 ? 'comment' : 'comments'}</span>
        </button>
      </div>

      {/* Expandable Instagram-Style Comments Drawer */}
      {showComments && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in duration-150">

          {/* Quick Congratulate Chips (Specially for Sarah or milestones) */}
          {isPerformerPost && (
            <div className="bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 mb-1.5">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Quick cheers:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '🎉 Incredible performance!',
                  '👏 Unmatched conversion velocity!',
                  '🚀 Inspiring the entire corridor!',
                  '🙌 Best numbers this quarter!'
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setCommentInput(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 text-slate-700 dark:text-slate-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors shadow-2xs font-medium"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Instagram-Style Comment Input Box */}
          <form onSubmit={handleSendComment} className="space-y-2">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-3 py-2 focus-within:ring-2 focus-within:ring-sky-500/40 focus-within:border-sky-500 transition-all">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-600 shrink-0"
              />
              <input
                type="text"
                placeholder={`Add a comment as @${currentUserHandle}...`}
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />

              {/* Quick Emojis inside input like Instagram */}
              <div className="hidden sm:flex items-center gap-1 shrink-0 text-xs">
                {['❤️', '🔥', '👏', '🎉'].map((emo) => (
                  <button
                    key={emo}
                    type="button"
                    onClick={() => handleQuickEmoji(emo)}
                    className="hover:scale-125 transition-transform p-0.5"
                    title={`Add ${emo}`}
                  >
                    {emo}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!commentInput.trim() || isSubmitting}
                className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 flex items-center gap-1 shadow-xs"
              >
                <span>Post</span>
                <Send className="w-3 h-3" />
              </button>
            </div>
          </form>

          {/* Instagram-Style Comments Thread List */}
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comm) => (
                <div
                  key={comm.id}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <img
                      src={comm.authorAvatar}
                      alt={comm.authorName}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0 mt-0.5"
                    />
                    <div className="text-xs leading-relaxed min-w-0">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {comm.authorName}
                        </span>
                        {comm.authorHandle && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            @{comm.authorHandle}
                          </span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                          {comm.authorRole}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap break-words">
                        {comm.content}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                        <span>{formatRelativeTime(comm.createdAt || comm.timestamp)}</span>
                        {comm.likes && comm.likes > 0 ? (
                          <span className="font-semibold text-slate-500 dark:text-slate-400">
                            {comm.likes} {comm.likes === 1 ? 'like' : 'likes'}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setCommentInput(`@${comm.authorHandle || comm.authorName.toLowerCase()} `)}
                          className="hover:text-slate-700 dark:hover:text-slate-200 font-semibold"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Instagram-Style Comment Like Heart Button */}
                  <button
                    type="button"
                    onClick={() => likeComment(post.id, comm.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                    title="Like comment"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${comm.userLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-300 dark:text-slate-600'
                        }`}
                    />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">
                No comments yet. Start the conversation as @{currentUserHandle}!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

