'use client';

import React, { useState, useEffect } from 'react';
import { Radio, Megaphone, Trophy, Loader2, UserCheck, Award, X, Sparkles, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FeedPost } from '../../types';
import { getAllowedBroadcastDepartments } from '../../lib/permissions';
import { usePeople } from '../../hooks/usePeople';
import { CRM_ANNOUNCEMENT_TEMPLATES, CrmScenarioTemplate } from '../../lib/crmAnnouncementsGenerator';

export default function NewPostModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { addNewPost, currentUser } = useApp();
  const { data: peopleData } = usePeople();

  const allowedDepts = getAllowedBroadcastDepartments(currentUser);
  const [department, setDepartment] = useState<string>(allowedDepts[0] || 'Sales');
  const [type, setType] = useState<FeedPost['type']>('announcement');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTemplateNum, setSelectedTemplateNum] = useState<number | null>(null);

  // Performer spotlight specific fields
  const [recognizedPerson, setRecognizedPerson] = useState('');
  const [milestoneMetric, setMilestoneMetric] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync allowed department if currentUser changes
  useEffect(() => {
    if (allowedDepts.length > 0 && !allowedDepts.includes(department)) {
      setDepartment(allowedDepts[0]);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  // Active people list for performer spotlight quick-selection
  const peopleList = peopleData?.people || [];

  const handleSelectPerson = (personName: string) => {
    setRecognizedPerson(personName);
    const person = peopleList.find((p) => p.name === personName);
    if (person && !title) {
      setTitle(`🏆 Performer Spotlight: ${person.name} (${person.role || 'Team Member'})`);
    }
  };

  const handleSelectTemplate = (tmpl: CrmScenarioTemplate) => {
    setSelectedTemplateNum(tmpl.scenarioNumber);
    setTitle(tmpl.headline);
    setContent(tmpl.content);
    setType(tmpl.type);
    if (tmpl.type === 'performer') {
      setRecognizedPerson(tmpl.defaultAuthor.name);
      setMilestoneMetric(tmpl.sampleMetric || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      // For performer spotlights, format the content nicely with recognized member and milestone context if available
      let finalContent = content.trim();
      if (type === 'performer' && recognizedPerson && milestoneMetric) {
        if (!finalContent.includes(milestoneMetric)) {
          finalContent = `Milestone: ${milestoneMetric}\n\n${finalContent}`;
        }
      }

      await addNewPost(
        title.trim(),
        finalContent,
        type,
        department as any,
        undefined,
        {
          name: currentUser.name || 'Leadership Office',
          avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          team: `${currentUser.department || department} Hub`
        }
      );

      setTitle('');
      setContent('');
      setSelectedTemplateNum(null);
      setRecognizedPerson('');
      setMilestoneMetric('');
      onClose();
    } catch (err) {
      console.error('Failed to broadcast post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#0D1829] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header with Enterprise Live Broadcast Signal */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
                Broadcast Corridor Update
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Official enterprise announcements & performance spotlights
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick CRM Scenario Templates from Master PDF */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                <span>CRM Scenario Templates (PDF Scenarios)</span>
              </div>
              {selectedTemplateNum && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplateNum(null);
                    setTitle('');
                    setContent('');
                    setType('announcement');
                    setRecognizedPerson('');
                    setMilestoneMetric('');
                  }}
                  className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
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
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                      isSelected
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                    }`}
                  >
                    <span>{tmpl.iconEmoji}</span>
                    <span>#{tmpl.scenarioNumber} {tmpl.scenarioName}</span>
                    {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Selector with Enterprise Icons */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              1. Select Broadcast Category
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Category 1: Official Announcement */}
              <button
                type="button"
                onClick={() => {
                  setType('announcement');
                  if (title.startsWith('🏆 Performer Spotlight:')) setTitle('');
                }}
                className={`p-3 rounded-xl border text-left font-medium transition-all cursor-pointer ${
                  type === 'announcement'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Megaphone className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-bold text-xs">Announcement</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Company directives, branch notices & town hall memos
                </p>
              </button>

              {/* Category 2: Performer Spotlight */}
              <button
                type="button"
                onClick={() => {
                  setType('performer');
                  if (!title && recognizedPerson) {
                    setTitle(`🏆 Performer Spotlight: ${recognizedPerson}`);
                  }
                }}
                className={`p-3 rounded-xl border text-left font-medium transition-all cursor-pointer ${
                  type === 'performer'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-bold text-xs">Performer Spotlight</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Deal closures, velocity milestones & team awards
                </p>
              </button>
            </div>
          </div>

          {/* Department & Author Attribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Target Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {allowedDepts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Author Attribution
              </label>
              <div className="text-xs px-3 py-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-300 truncate font-medium">
                {currentUser.name} ({currentUser.role || 'Admin'} · {currentUser.department || 'HQ'} Hub)
              </div>
            </div>
          </div>

          {/* Contextual Fields for Performer Spotlight */}
          {type === 'performer' && (
            <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 rounded-xl space-y-3">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 text-xs font-extrabold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>Recognition Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Recognized Team Member
                  </label>
                  {peopleList.length > 0 ? (
                    <select
                      value={recognizedPerson}
                      onChange={(e) => handleSelectPerson(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Select a team member...</option>
                      {peopleList.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name} ({p.role || p.department || 'Sales'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Meghana S / Abhishek K"
                      value={recognizedPerson}
                      onChange={(e) => {
                        setRecognizedPerson(e.target.value);
                        if (!title && e.target.value) {
                          setTitle(`🏆 Performer Spotlight: ${e.target.value}`);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Milestone / Output Metric
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ₹35L Villa Deal / 120% Quota"
                    value={milestoneMetric}
                    onChange={(e) => setMilestoneMetric(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Title Headline */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              Headline Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={
                type === 'performer'
                  ? 'e.g. 🏆 MVP Closer: Meghana Achieved 120% Quota Milestone'
                  : 'e.g. 📢 Q3 Executive Townhall & Revenue Milestone Broadcast'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
            />
          </div>

          {/* Content Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
              {type === 'performer' ? 'Leadership Citation & Shoutout' : 'Announcement Description'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder={
                type === 'performer'
                  ? 'Highlight this performer’s contribution, speed of closing, design excellence, or special project turnaround...'
                  : 'Detail company directives, operational schedules, branch policies, or executive memos...'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className={`flex items-center gap-1.5 px-5 py-2 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                type === 'performer'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Broadcasting...</span>
                </>
              ) : type === 'performer' ? (
                <>
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Broadcast Spotlight</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5" />
                  <span>Broadcast to HUB</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
