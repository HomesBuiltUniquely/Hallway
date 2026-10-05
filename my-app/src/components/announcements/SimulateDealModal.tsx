'use client';

import React, { useState } from 'react';
import {
  Zap,
  X,
  Sparkles,
  CheckCircle2,
  Building2,
  User,
  DollarSign,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { usePeople } from '../../hooks/usePeople';
import { CRM_ANNOUNCEMENT_TEMPLATES } from '../../lib/crmAnnouncementsGenerator';

interface SimulateDealModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SimulateDealModal({ isOpen, onClose }: SimulateDealModalProps) {
  const { simulateDynamicDeal } = useApp();
  const { data: peopleData } = usePeople();

  const crmPeople = (peopleData?.people || []).filter(
    (p) => (p.department || 'Sales').toLowerCase() === 'sales' && p.active !== false
  );

  const [scenarioNumber, setScenarioNumber] = useState<number>(1);
  const [repName, setRepName] = useState<string>(crmPeople[0]?.name || 'Jayashree');
  const [amount, setAmount] = useState<string>('₹14.8L');
  const [branch, setBranch] = useState<string>('Sarjapura');
  const [projectTag, setProjectTag] = useState<string>('#5230');
  const [customDetails, setCustomDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const activeTemplate =
    CRM_ANNOUNCEMENT_TEMPLATES.find((t) => t.scenarioNumber === scenarioNumber) ||
    CRM_ANNOUNCEMENT_TEMPLATES[0];

  const handleScenarioChange = (num: number) => {
    setScenarioNumber(num);
    const tmpl = CRM_ANNOUNCEMENT_TEMPLATES.find((t) => t.scenarioNumber === num);
    if (tmpl) {
      if (num === 2) setAmount('₹24.6L');
      else if (num === 4) setAmount('₹28L');
      else if (num === 10) setAmount('₹7.8L');
      else if (num === 16) setAmount('₹12.5L');
      else if (num === 21) setAmount('₹68L');
      else if (num === 23) setAmount('₹18L');
      else setAmount('₹14.8L');
    }
  };

  const handleRepChange = (name: string) => {
    setRepName(name);
    const person = crmPeople.find((p) => p.name === name);
    if (person?.branchId) {
      if (/sarjapur/i.test(person.branchId)) setBranch('Sarjapura');
      else if (/hbr/i.test(person.branchId)) setBranch('HBR');
      else if (/jp/i.test(person.branchId)) setBranch('JP Nagar');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await simulateDynamicDeal({
        scenarioNumber,
        repName: repName.trim() || 'Jayashree',
        amount: amount.trim() || '₹14.8L',
        branchName: branch.trim() || 'Sarjapura',
        projectTag: projectTag.trim() || '#5230',
        customDetails: customDetails.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to simulate deal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#0D1829] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40 shrink-0">
              <Zap className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">
                Simulate Live CRM Event
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Trigger real-time dynamic deal closures and milestone calculations
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

        {success ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-in zoom-in" />
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Live Announcement Generated!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dynamic CRM post successfully broadcasted into the live corridor stream.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* 1. Pick Scenario */}
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                1. Select PDF CRM Scenario
              </label>
              <select
                value={scenarioNumber}
                onChange={(e) => handleScenarioChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              >
                {CRM_ANNOUNCEMENT_TEMPLATES.map((tmpl) => (
                  <option key={tmpl.scenarioNumber} value={tmpl.scenarioNumber}>
                    {tmpl.iconEmoji} {tmpl.scenarioName} ({tmpl.departmentTag})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Executive & Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Sales Executive
                </label>
                {crmPeople.length > 0 ? (
                  <select
                    value={repName}
                    onChange={(e) => handleRepChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {crmPeople.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} ({p.role || 'Sales'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                )}
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Corridor Branch
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Sarjapura">Sarjapura Hub</option>
                  <option value="HBR">HBR Layout Hub</option>
                  <option value="JP Nagar">JP Nagar Hub</option>
                  <option value="Indiranagar">Indiranagar Hub</option>
                  <option value="Team Renova">Renova Vertical</option>
                </select>
              </div>
            </div>

            {/* 3. Deal Amount & Project Tag */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Dynamic Deal Amount
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ₹14.8L or ₹24.6L"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Project Reference
                </label>
                <input
                  type="text"
                  placeholder="#5230"
                  value={projectTag}
                  onChange={(e) => setProjectTag(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>
            </div>

            {/* 4. Live Formula Preview Box */}
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-900/40 rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wider text-[10px]">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Live Dynamic Formula Output</span>
              </div>
              <p className="font-bold text-slate-900 dark:text-white text-xs">
                {activeTemplate.iconEmoji} {scenarioNumber === 1
                  ? `New Booking: ${amount} by ${branch} Team!`
                  : scenarioNumber === 2
                  ? `Big One Closed: ${amount}!`
                  : scenarioNumber === 3
                  ? 'First One on the Board!'
                  : scenarioNumber === 4
                  ? 'Hat-Trick of Closures!'
                  : scenarioNumber === 5
                  ? `${branch} Hits 85%!`
                  : scenarioNumber === 9
                  ? 'This Week’s Top Performer'
                  : scenarioNumber === 10
                  ? 'Spot Closure!'
                  : scenarioNumber === 16
                  ? 'Renova Strikes Again!'
                  : scenarioNumber === 21
                  ? 'A New HUB Record Has Been Written'
                  : scenarioNumber === 22
                  ? '3 Months. 3 Targets.'
                  : scenarioNumber === 23
                  ? `${amount} Away From ₹3 Crore`
                  : activeTemplate.headline}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                {scenarioNumber === 1
                  ? `${repName} just closed Project ${projectTag}. Another home joins HUB. Great work, team!`
                  : scenarioNumber === 2
                  ? `${repName} just brought home a ${amount} interior project. That’s how you move the scoreboard.`
                  : scenarioNumber === 3
                  ? `${repName} has closed her first HUB booking. The first of many. Congratulations!`
                  : scenarioNumber === 4
                  ? `3 bookings. One day. ${amount} added to the board by Team ${branch}.`
                  : scenarioNumber === 5
                  ? `${branch} has crossed 85% of its monthly target. The finish line is getting closer.`
                  : scenarioNumber === 9
                  ? `${repName} leads the board with ${amount} in closures this week. Outstanding consistency.`
                  : scenarioNumber === 10
                  ? `The customer walked in today and booked today. ${amount} closed by Team ${branch}.`
                  : scenarioNumber === 16
                  ? `Another renovation project has joined the HUB family. ${amount} booked by Team Renova.`
                  : scenarioNumber === 21
                  ? `${amount} by ${repName} in a single month—the newest entry in the HUB Book of Records.`
                  : scenarioNumber === 22
                  ? `Team ${branch} has achieved its target for the third consecutive month. Consistency wins.`
                  : scenarioNumber === 23
                  ? `One final push. HUB is just ${amount} away from the monthly ₹3 Cr milestone.`
                  : activeTemplate.content}
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-2 font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 text-white bg-amber-600 hover:bg-amber-700 rounded-xl font-bold transition-all shadow-md shadow-amber-900/20 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Posting...' : 'Trigger Dynamic Event'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
