'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { openCrmDashboard, openDesignDashboard } from '../../lib/modulePortals';

/** 4-tile launcher icon as in HOWS / CrmInceneration */
function HowsHubLauncherIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="12" height="12" rx="3.5" fill="#1DA1E6" />
      <rect x="18" y="2" width="12" height="12" rx="3.5" fill="#1DA1E6" />
      <rect x="2" y="18" width="12" height="12" rx="3.5" fill="#1DA1E6" />
      <rect x="18" y="18" width="12" height="12" rx="3.5" fill="#1DA1E6" />
    </svg>
  );
}

export default function ModuleLauncher() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleCrmClick = () => {
    setIsOpen(false);
    openCrmDashboard();
  };

  const handleDesignClick = () => {
    setIsOpen(false);
    openDesignDashboard();
  };

  const handleHrClick = () => {
    setIsOpen(false);
    const hrUrl = process.env.NEXT_PUBLIC_HR_PORTAL_URL || 'https://hubinterior.keka.com/';
    window.location.assign(hrUrl);
  };

  const modules = [
    {
      id: 'crm',
      label: 'CRM',
      iconSrc: '/icons/module-crm.png',
      onClick: handleCrmClick,
      tooltip: 'CRM Sales & Leads',
    },
    {
      id: 'design',
      label: 'Design',
      iconSrc: '/icons/module-design.png',
      onClick: handleDesignClick,
      tooltip: 'Design Studio & Modules',
    },
    {
      id: 'hr',
      label: 'HR',
      iconSrc: '/icons/module-hr.svg',
      onClick: handleHrClick,
      tooltip: 'HR Portal (Keka)',
    },
  ];

  return (
    <div className="relative" ref={containerRef}>
      {/* 4-tile Launcher Trigger Icon */}
      <button
        type="button"
        aria-label="Open App Launcher"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-sky-50 dark:hover:bg-slate-800 focus:outline-none cursor-pointer group"
      >
        <HowsHubLauncherIcon
          className={`w-6 h-6 transition-transform duration-200 ease-out group-hover:scale-110 ${
            isOpen ? 'scale-110' : 'scale-100'
          }`}
        />
      </button>

      {/* Floating Module Toolbar / Pill Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="HOWS Modules"
          className="absolute right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-[#0D1829]/95 backdrop-blur-xl px-2 py-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.14)] animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center gap-1.5">
            {modules.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={m.onClick}
                title={m.tooltip}
                aria-label={m.label}
                className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] border border-transparent transition-all duration-200 hover:scale-[1.08] hover:border-[#bfdbfe] hover:bg-[#eff6ff] dark:hover:bg-sky-950/40 dark:hover:border-sky-800/80 hover:shadow-[0_4px_12px_rgba(37,99,235,0.12)] active:scale-95 cursor-pointer"
              >
                <div className="flex h-[34px] w-[34px] items-center justify-center overflow-hidden rounded-[9px] transition-transform duration-200 group-hover:scale-105">
                  <img
                    src={m.iconSrc}
                    alt={m.label}
                    className="h-[34px] w-[34px] object-contain select-none pointer-events-none"
                  />
                </div>

                {/* Tooltip */}
                <span className="pointer-events-none absolute -bottom-7 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#111827] dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
