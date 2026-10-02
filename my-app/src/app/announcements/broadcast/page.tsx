'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Radio,
  Megaphone,
  Trophy,
  ArrowLeft,
  Send,
  CheckCircle2,
  Info,
  Loader2,
  ShieldAlert,
  Sparkles,
  Check
} from 'lucide-react';
import { useApp } from '../../../context/AppContext';
import { FeedPost } from '../../../types';
import { canCreateAnnouncement, getAllowedBroadcastDepartments } from '../../../lib/permissions';
import { CRM_ANNOUNCEMENT_TEMPLATES, CrmScenarioTemplate } from '../../../lib/crmAnnouncementsGenerator';

export default function BroadcastPage() {
  const router = useRouter();
  const { addNewPost, currentUser } = useApp();

  const allowedDepts = getAllowedBroadcastDepartments(currentUser);
  const [department, setDepartment] = useState<string>(allowedDepts[0] || 'Sales');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<FeedPost['type']>('announcement');
  const [authorName, setAuthorName] = useState(currentUser.name || 'Leadership Office');
  const [authorTeam, setAuthorTeam] = useState(`${currentUser.department || 'HQ'} Hub`);
  const [isPublishing, setIsPublishing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTemplateNum, setSelectedTemplateNum] = useState<number | null>(null);

  const handleSelectTemplate = (tmpl: CrmScenarioTemplate) => {
    setSelectedTemplateNum(tmpl.scenarioNumber);
    setTitle(tmpl.headline);
    setContent(tmpl.content);
    setType(tmpl.type);
    if (tmpl.defaultAuthor) {
      setAuthorName(tmpl.defaultAuthor.name);
      setAuthorTeam(tmpl.defaultAuthor.team);
    }
  };

  useEffect(() => {
    if (allowedDepts.length > 0 && !allowedDepts.includes(department)) {
      setDepartment(allowedDepts[0]);
    }
    if (currentUser?.name) {
      setAuthorName(currentUser.name);
      setAuthorTeam(`${currentUser.department || 'HQ'} Hub`);
    }
  }, [currentUser]);

  // Enterprise RBAC Guard: If standard employee attempts direct URL visit
  if (!canCreateAnnouncement(currentUser)) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-center shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Broadcast Permissions Required
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
          Corridor broadcasts and performer spotlights are restricted to Administrators and Department Leads. Standard accounts participate via comments and reactions on the live feed.
        </p>
        <div className="pt-2">
          <Link
            href="/announcements"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all shadow-sm hover:opacity-90 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Announcements Feed</span>
          </Link>
        </div>
      </div>
    );
  }

  const categories = [
    {
      id: 'announcement',
      label: 'Official Announcement',
      icon: Megaphone,
      color: '#EF4444',
      desc: 'Company directives, executive memos, town hall notices, and branch operations.'
    },
    {
      id: 'performer',
      label: 'Performer Spotlight',
      icon: Trophy,
      color: '#F59E0B',
      desc: 'Recognizing top deal closers, conversion velocity milestones, and MVP team awards.'
    },
    {
      id: 'general',
      label: 'Corridor Directive',
      icon: Radio,
      color: '#3B82F6',
      desc: 'Operational schedules, departmental notices, or collaborative directives.'
    }
  ];

  const selectedCategory = categories.find((c) => c.id === type) || categories[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsPublishing(true);
    try {
      const created = await addNewPost(
        title.trim(),
        content.trim(),
        type,
        department as any,
        undefined,
        {
          name: authorName.trim() || currentUser.name,
          avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          team: authorTeam.trim() || `${department} Hub`
        }
      );

      if (created) {
        setSuccessMessage('Broadcast published successfully and stored in the database!');
        setTimeout(() => {
          router.push('/announcements');
        }, 1000);
      }
    } catch (err) {
      console.error('Error broadcasting:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <Link
            href="/announcements"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Announcements</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Publish Corridor Broadcast
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Official executive announcements, department directives, and top performer spotlights.
              </p>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMessage} Redirecting to Corridor timeline...</span>
        </div>
      )}

      {/* Main Grid: Form on Left, Live Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0D1829] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Quick CRM Scenario Templates from Master PDF */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <Sparkles className="w-4 h-4 text-rose-500" />
                  <span>CRM Scenario Templates (PDF Scenarios 1–25)</span>
                </div>
                {selectedTemplateNum && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplateNum(null);
                      setTitle('');
                      setContent('');
                      setType('announcement');
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {CRM_ANNOUNCEMENT_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplateNum === tmpl.scenarioNumber;
                  return (
                    <button
                      key={tmpl.scenarioNumber}
                      type="button"
                      onClick={() => handleSelectTemplate(tmpl)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                        isSelected
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                      }`}
                    >
                      <span>{tmpl.iconEmoji}</span>
                      <span>#{tmpl.scenarioNumber} {tmpl.scenarioName}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                1. Select Broadcast Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {categories.map((c) => {
                  const Icon = c.icon;
                  const isSelected = type === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setType(c.id as FeedPost['type'])}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30 text-slate-900 dark:text-white ring-2 ring-rose-500/20 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-xs mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Icon className="w-4 h-4 shrink-0" style={{ color: c.color }} />
                          <span className="truncate">{c.label}</span>
                        </div>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                        {c.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title / Headline */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                2. Headline Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={255}
                placeholder={
                  type === 'performer'
                    ? 'e.g. 🏆 MVP Closer: Meghana Achieved 120% Quota Milestone'
                    : 'e.g. 📢 Q3 All-Hands Executive Townhall Scheduled'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all font-medium"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                {255 - title.length} characters remaining
              </span>
            </div>

            {/* Department & Author Attribution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Department
                </label>
                <select
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value);
                    setAuthorTeam(`${e.target.value} Hub`);
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {allowedDepts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Author Name
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Content Textarea */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                3. Announcement Details & Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={5}
                placeholder={
                  type === 'performer'
                    ? 'Highlight this performer’s contribution, speed of closing, design excellence, or special project turnaround...'
                    : 'Write the full broadcast news, milestones, key takeaways, action items, or celebration message...'
                }
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3.5 py-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all leading-relaxed"
              />
            </div>

            {/* Publish Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
              <Link
                href="/announcements"
                className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isPublishing || !title.trim() || !content.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-900/20 cursor-pointer"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to Database...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Broadcast Now</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Real-time Live Card Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>Live Timeline Preview</span>
          </div>

          <div className="bg-white dark:bg-[#0D1829] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            {/* Header: Author + Category */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'}
                  alt={authorName}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {authorName || 'Leadership'}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {authorTeam || `${department} Hub`} · <span className="text-slate-400">Just Now</span>
                  </p>
                </div>
              </div>

              <span
                className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg text-white shadow-2xs"
                style={{ backgroundColor: selectedCategory.color }}
              >
                {type.toUpperCase()}
              </span>
            </div>

            {/* Title Headline */}
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                {title || 'Headline Title will appear here...'}
              </h3>
            </div>

            {/* Content Body */}
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {content || 'Detailed announcement and broadcast description will appear here as you type into the editor...'}
            </p>

            {/* Footer Reactions / Comments Mock */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-[11px]">
                  👍 1
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-[11px]">
                  👏 1
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-[11px]">
                  ❤️ 1
                </span>
              </div>
              <span className="text-[11px] font-medium">0 comments</span>
            </div>
          </div>

          <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30 rounded-2xl flex items-start gap-3">
            <Info className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
              Broadcasts are permanently saved to the MySQL <code className="font-mono text-rose-600 dark:text-rose-400">announcements</code> table in <code className="font-mono text-rose-600 dark:text-rose-400">hallway_db</code> and will immediately be visible to all logged-in users on the Announcements feed and Home corridor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
