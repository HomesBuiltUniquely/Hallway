'use client';

import React from 'react';
import { Briefcase, Palette, ArrowUpRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { openCrmDashboard, openDesignDashboard } from '../../lib/modulePortals';

export default function ModuleLaunch() {
  const { currentUser, loginPortal } = useApp();
  const isDesigner = loginPortal === 'design' || currentUser.department === 'Design';

  if (isDesigner) {
    return (
      <button
        type="button"
        onClick={() => openDesignDashboard(currentUser)}
        className="group w-full max-w-md flex items-center justify-between gap-3 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-4 py-3.5 text-left shadow-xs hover:border-rose-400 dark:hover:border-rose-700 hover:shadow-md transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
            <Palette className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">Design Module</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Open your Design Studio dashboard
            </p>
          </div>
        </div>
        <ArrowUpRight className="w-4 h-4 text-rose-600 dark:text-rose-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openCrmDashboard(currentUser)}
      className="group w-full max-w-md flex items-center justify-between gap-3 rounded-2xl border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/40 px-4 py-3.5 text-left shadow-xs hover:border-sky-400 dark:hover:border-sky-700 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
          <Briefcase className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">CRM</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Open CRM Leads
            </p>
        </div>
      </div>
      <ArrowUpRight className="w-4 h-4 text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
    </button>
  );
}
