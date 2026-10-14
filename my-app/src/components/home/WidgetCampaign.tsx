'use client';

import React, { useState, useEffect } from 'react';
import { Gift, Clock, Sparkles, MapPin, ArrowRight, Pencil } from 'lucide-react';
import { openCrmDashboard } from '../../lib/modulePortals';
import { useApp } from '../../context/AppContext';
import { isAdmin, isSuperAdmin } from '../../lib/permissions';
import EditCampaignModal from './EditCampaignModal';

export default function WidgetCampaign() {
  const { currentUser, activeCampaign, updateActiveCampaign } = useApp();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 48,
    minutes: 12,
    seconds: 0,
  });

  const canEdit = isAdmin(currentUser) || isSuperAdmin(currentUser);
  const campaignBadge = activeCampaign?.discountPercent?.trim();

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      let target: Date;
      if (activeCampaign?.targetDate) {
        target = new Date(activeCampaign.targetDate);
        if (isNaN(target.getTime())) {
          target = new Date(now);
          const diff = (7 - now.getDay()) % 7;
          target.setDate(now.getDate() + diff);
          target.setHours(23, 59, 59, 999);
        }
      } else {
        target = new Date(now);
        const diff = (7 - now.getDay()) % 7;
        target.setDate(now.getDate() + diff);
        target.setHours(23, 59, 59, 999);
      }

      const totalMs = Math.max(0, target.getTime() - now.getTime());
      const totalSec = Math.floor(totalMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      setTimeLeft({ hours, minutes, seconds });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [activeCampaign?.targetDate]);

  return (
    <>
      <div className="group relative overflow-hidden rounded-2xl border-2 border-accent-gold/60 bg-gradient-to-br from-white via-white to-brand-soft/40 p-5 shadow-xs transition-all duration-300 hover:shadow-lg hover:shadow-brand/10 dark:border-accent-gold/35 dark:from-panel dark:via-[#1A1410] dark:to-surface-muted">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-accent-gold to-brand" />

        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-brand/10 blur-2xl dark:bg-brand/15" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-accent-gold/20 blur-2xl" />

        <div className="relative z-10 mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            <span className="rounded-md border border-accent-gold/50 bg-brand px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm shadow-brand/20">
              ACTIVE CAMPAIGN
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-accent-gold/40 bg-white px-2.5 py-0.5 text-[10px] font-bold text-ink shadow-2xs dark:border-accent-gold/25 dark:bg-surface-muted dark:text-slate-200">
              <MapPin className="h-2.5 w-2.5 text-brand" />
              <span>{activeCampaign?.branchName || 'Indiranagar Branch'}</span>
            </span>

            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="flex cursor-pointer items-center gap-1 rounded-md border border-accent-gold/50 bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand transition-colors hover:bg-brand hover:text-white dark:border-accent-gold/30"
                title="Edit active campaign (Admin Only)"
              >
                <Pencil className="h-2.5 w-2.5" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        <div className="relative z-10 mb-3">
          <h3 className="flex items-center gap-1.5 text-base font-black tracking-tight text-slate-900 dark:text-white">
            <span>{activeCampaign?.title || 'Indiranagar Launch Boost'}</span>
            <Sparkles className="h-4 w-4 fill-accent-gold/40 text-accent-gold" />
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {activeCampaign?.description ||
              'Exclusive limited-time discount for all new client deals closed in the new Indiranagar branch before Sunday night.'}
          </p>
        </div>

        {/* Generic spotlight — works for prizes, discounts, launches, festivals */}
        <div className="relative z-10 mb-3.5 flex items-center gap-3 rounded-xl border border-accent-gold/60 bg-gradient-to-r from-brand-soft/80 via-white to-accent-gold/15 p-3 shadow-2xs dark:border-accent-gold/30 dark:from-brand-soft/20 dark:via-surface-muted dark:to-accent-gold/10">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white shadow-xs shadow-brand/30 ring-1 ring-accent-gold/60">
            <Gift className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white">
                Campaign spotlight
              </span>
              {campaignBadge ? (
                <span className="rounded-md bg-accent-gold px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-ink">
                  {campaignBadge}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              Pitch this on every walk-in, site visit & quote follow-up
            </p>
          </div>
        </div>

        <div className="relative mb-3.5 overflow-hidden rounded-xl border border-brand/40 bg-[#1A0A0A] p-3.5 text-white shadow-xs dark:border-brand/30">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-brand/15 blur-xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-accent-gold">
                Time Remaining
              </span>
              <div className="flex items-baseline gap-1 font-mono text-2xl font-black tracking-tight text-white">
                <span>{timeLeft.hours}h</span>
                <span>{timeLeft.minutes.toString().padStart(2, '0')}m</span>
                <span className="text-xs font-semibold text-accent-gold/80">
                  {timeLeft.seconds.toString().padStart(2, '0')}s
                </span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-gold/40 bg-brand/20 text-accent-gold shadow-inner">
              <Clock className="h-5 w-5 animate-pulse text-accent-gold" />
            </div>
          </div>
          <p className="mt-1 text-[10px] font-medium text-white/55">
            Applies to all deals closed before deadline
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-accent-gold/25 pt-2 text-xs dark:border-accent-gold/15">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Apply in CRM deal quote
          </span>
          <button
            type="button"
            onClick={() => openCrmDashboard()}
            className="group/btn inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-brand transition-colors hover:text-brand-hover"
          >
            <span>Open CRM Deals</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
          </button>
        </div>
      </div>

      {canEdit && (
        <EditCampaignModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          campaign={activeCampaign}
          onSave={updateActiveCampaign}
        />
      )}
    </>
  );
}
