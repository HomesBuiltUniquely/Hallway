'use client';

import React, { useState, useEffect } from 'react';
import { X, Tag, MapPin, Calendar, Percent, Check, Sparkles } from 'lucide-react';
import { ActiveCampaign } from '../../types';

interface EditCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: ActiveCampaign;
  onSave: (updated: Partial<ActiveCampaign>) => void;
}

const inputClass =
  'w-full px-3 py-2 bg-white dark:bg-surface-muted border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors';

export default function EditCampaignModal({
  isOpen,
  onClose,
  campaign,
  onSave,
}: EditCampaignModalProps) {
  const [title, setTitle] = useState(campaign.title);
  const [branchName, setBranchName] = useState(campaign.branchName);
  const [description, setDescription] = useState(campaign.description);
  const [discountPercent, setDiscountPercent] = useState(campaign.discountPercent);
  const [targetDate, setTargetDate] = useState(() => {
    try {
      const d = new Date(campaign.targetDate);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    } catch {
      return '';
    }
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(campaign.title);
      setBranchName(campaign.branchName);
      setDescription(campaign.description);
      setDiscountPercent(campaign.discountPercent);
      try {
        const d = new Date(campaign.targetDate);
        setTargetDate(
          new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
        );
      } catch {
        setTargetDate('');
      }
      setSavedSuccess(false);
    }
  }, [isOpen, campaign]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let isoDate = campaign.targetDate;
    if (targetDate) {
      try {
        isoDate = new Date(targetDate).toISOString();
      } catch {
        /* keep previous */
      }
    }

    onSave({
      id: campaign.id || `camp-${Date.now()}`,
      title: title.trim() || campaign.title,
      branchName: branchName.trim() || 'All Hubs',
      description: description.trim(),
      discountPercent: discountPercent.trim(),
      targetDate: isoDate,
      isActive: true,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const BRANCH_PRESETS = [
    'Indiranagar Branch',
    'Sarjapura Hub',
    'JP Nagar Hub',
    'HBR Layout Hub',
    'All Hubs',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border-2 border-accent-gold/70 bg-white p-6 shadow-2xl dark:border-accent-gold/40 dark:bg-panel">
        {/* Gold accent bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-accent-gold to-brand" />

        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-accent-gold/25 pb-3.5 dark:border-accent-gold/15">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm shadow-brand/25 ring-2 ring-accent-gold/50">
              <Tag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="flex items-center gap-1.5 text-base font-extrabold text-slate-900 dark:text-white">
                Edit Active Campaign
                <Sparkles className="h-3.5 w-3.5 text-accent-gold" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update active incentive voucher, timer & branch parameters
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-slate-400 transition-colors hover:bg-brand-soft hover:text-brand"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="mb-1 block text-xs font-bold text-ink dark:text-slate-300">
              Campaign Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="e.g. Indiranagar Launch Boost"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-bold text-ink dark:text-slate-300">
                <MapPin className="h-3 w-3 text-brand" />
                <span>Applicable Branch</span>
              </label>
              <select
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className={inputClass}
              >
                {BRANCH_PRESETS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-bold text-ink dark:text-slate-300">
                <Percent className="h-3 w-3 text-accent-gold" />
                <span>Campaign Badge</span>
              </label>
              <input
                type="text"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className={inputClass}
                placeholder="e.g. GRAND PRIZE · FREE INTERIOR · 10% OFF"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1 text-xs font-bold text-ink dark:text-slate-300">
              <Calendar className="h-3 w-3 text-accent-gold" />
              <span>Expiry Date & Time</span>
            </label>
            <input
              type="datetime-local"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-ink dark:text-slate-300">
              Campaign Description / Pitch
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} resize-none font-normal leading-relaxed`}
              placeholder="Explain the offer terms for sales executive pitching..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-accent-gold/25 pt-3 dark:border-accent-gold/15">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:text-ink dark:text-slate-400 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm shadow-brand/25 ring-1 ring-accent-gold/60 transition-all hover:bg-brand-hover"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-4 w-4 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
