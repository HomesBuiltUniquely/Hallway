'use client';

import React, { useState, useEffect } from 'react';
import { X, Tag, MapPin, Calendar, Percent, Check } from 'lucide-react';
import { ActiveCampaign } from '../../types';

interface EditCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: ActiveCampaign;
  onSave: (updated: Partial<ActiveCampaign>) => void;
}

export default function EditCampaignModal({
  isOpen,
  onClose,
  campaign,
  onSave,
}: EditCampaignModalProps) {
  const [title, setTitle] = useState(campaign.title);
  const [branchName, setBranchName] = useState(campaign.branchName);
  const [description, setDescription] = useState(campaign.description);
  const [voucherCode, setVoucherCode] = useState(campaign.voucherCode);
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
      setVoucherCode(campaign.voucherCode);
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
    if (!title.trim() || !voucherCode.trim()) return;

    let isoDate = campaign.targetDate;
    if (targetDate) {
      try {
        isoDate = new Date(targetDate).toISOString();
      } catch {}
    }

    onSave({
      title: title.trim(),
      branchName: branchName.trim() || 'All Hubs',
      description: description.trim(),
      voucherCode: voucherCode.trim().toUpperCase(),
      discountPercent: discountPercent.trim() || '10% OFF',
      targetDate: isoDate,
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
      <div className="bg-white dark:bg-[#0D1829] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Edit Active Campaign
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update active incentive voucher, timer & branch parameters
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campaign Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Campaign Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Indiranagar Launch Boost"
            />
          </div>

          {/* Branch & Voucher Code Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-500" />
                <span>Applicable Branch</span>
              </label>
              <select
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                {BRANCH_PRESETS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-emerald-500" />
                <span>Voucher Code</span>
              </label>
              <input
                type="text"
                required
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-black text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 uppercase tracking-wider"
                placeholder="e.g. INDIRA10"
              />
            </div>
          </div>

          {/* Discount & Expiry Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Percent className="w-3 h-3 text-emerald-500" />
                <span>Discount Badge</span>
              </label>
              <input
                type="text"
                required
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. 10% OFF"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-500" />
                <span>Expiry Date & Time</span>
              </label>
              <input
                type="datetime-local"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Campaign Description / Pitch
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed"
              placeholder="Explain the offer terms for sales executive pitching..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-emerald-900/20 transition-all cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
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
