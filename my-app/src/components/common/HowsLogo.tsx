'use client';

import React from 'react';

export default function HowsLogo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* HOWS Authentic Badge Image */}
      <div
        style={{ width: size, height: size }}
        className="shrink-0 select-none flex items-center justify-center"
      >
        <img
          src="/hows-logo.png?v=5"
          alt="HOWS Logo"
          className="w-full h-full object-contain"
        />
      </div>

      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight font-sans">
            Hows ERP
          </span>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-300/60 dark:border-sky-800">
            HUB
          </span>
        </div>
        <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium tracking-wide mt-1 truncate">
          Digital Corridor
        </span>
      </div>
    </div>
  );
}
