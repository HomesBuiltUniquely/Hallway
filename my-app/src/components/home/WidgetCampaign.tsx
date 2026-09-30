'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tag, Copy, Check, Clock, Sparkles, MapPin, ArrowRight, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { openCrmDashboard } from '../../lib/modulePortals';

export default function WidgetCampaign() {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 48,
    minutes: 12,
    seconds: 0,
  });

  useEffect(() => {
    // Dynamic countdown targeting Sunday night (23:59:59)
    const calculateTimeRemaining = () => {
      const now = new Date();
      const target = new Date(now);
      const day = now.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
      const diff = (7 - day) % 7; // Friday -> 2 days to Sunday
      target.setDate(now.getDate() + diff);
      target.setHours(23, 59, 59, 999);

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
  }, []);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText('INDIRA10');
      setCopied(true);

      if (typeof window !== 'undefined') {
        confetti({
          particleCount: 30,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#10B981', '#34D399', '#059669', '#F59E0B'],
        });
      }

      setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 dark:from-slate-900 dark:via-[#0a1a13] dark:to-slate-900 border border-emerald-300/80 dark:border-emerald-700/60 p-5 shadow-xs hover:shadow-lg hover:shadow-emerald-500/10 dark:hover:shadow-emerald-950/40 transition-all duration-300 group">
      {/* Top highlight bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400" />

      {/* Subtle radiant ambient glows */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/15 dark:bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-teal-500/10 dark:bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Badges */}
      <div className="flex items-center justify-between mb-3.5 relative z-10">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-100/80 dark:bg-emerald-950/70 border border-emerald-300/80 dark:border-emerald-700/60 text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 font-sans">
            ACTIVE CAMPAIGN
          </span>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 text-[10px] font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
          <MapPin className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
          <span>Indiranagar Branch</span>
        </span>
      </div>

      {/* Campaign Title & Hook */}
      <div className="mb-3 relative z-10">
        <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
          <span>Indiranagar Launch Boost</span>
          <Sparkles className="w-4 h-4 text-emerald-500 fill-emerald-500/30" />
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
          Exclusive limited-time discount for all new client deals closed in the new Indiranagar branch before Sunday night.
        </p>
      </div>

      {/* Voucher / Coupon Code Card */}
      <div className="mb-3.5 p-3 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-dashed border-emerald-300 dark:border-emerald-600/70 shadow-2xs flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs shadow-emerald-600/30">
            <Tag className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-black tracking-wider text-slate-900 dark:text-white select-all">
                INDIRA10
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white dark:bg-emerald-500">
                10% OFF
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Launch discount voucher
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyCode}
          className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
            copied
              ? 'bg-emerald-600 text-white shadow-xs scale-105'
              : 'bg-emerald-50 dark:bg-slate-700/80 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-slate-700 border border-emerald-200/90 dark:border-emerald-700/80 active:scale-95'
          }`}
          title="Copy coupon code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Time Remaining Block (Inspired by Screenshot 2) */}
      <div className="rounded-xl bg-[#091510] text-white p-3.5 mb-3.5 border border-emerald-900/80 relative overflow-hidden shadow-xs">
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-emerald-500/10 blur-xl pointer-events-none" />
        <div className="flex items-center justify-between relative z-10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 block mb-0.5">
              Time Remaining
            </span>
            <div className="font-mono text-2xl font-black tracking-tight text-emerald-400 flex items-baseline gap-1">
              <span>{timeLeft.hours}h</span>
              <span>{timeLeft.minutes.toString().padStart(2, '0')}m</span>
              <span className="text-xs font-semibold text-emerald-500/70">
                {timeLeft.seconds.toString().padStart(2, '0')}s
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-950/90 border border-emerald-800/80 flex items-center justify-center text-emerald-400 shadow-inner">
            <Clock className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
        </div>
        <p className="text-[10px] text-emerald-400/70 mt-1 font-medium">
          Applies to all deals closed before Sunday night (11:59 PM)
        </p>
      </div>

      {/* Footer Link & Action */}
      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs relative z-10">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Apply in CRM deal quote
        </span>
        <button
          type="button"
          onClick={() => openCrmDashboard()}
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer group/btn"
        >
          <span>Open CRM Deals</span>
          <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

