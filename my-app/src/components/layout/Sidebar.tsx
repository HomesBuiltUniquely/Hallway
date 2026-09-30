'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  BarChart2,
  Award,
  Target,
  Users,
  Megaphone,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

/** 4-tile launcher icon as in HOWS CRM */
function Hows4TileIcon({ className }: { className?: string }) {
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

export default function Sidebar() {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    isSidebarHovered,
    setIsSidebarHovered,
  } = useApp();

  const [isModuleMenuOpen, setIsModuleMenuOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const moduleMenuRef = useRef<HTMLDivElement>(null);

  // Effective expanded state: either hovered or pinned
  const isExpanded = !sidebarCollapsed || isSidebarHovered || isModuleMenuOpen;

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsSidebarHovered(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Safety buffer (120ms) so quick cursor slips don't trigger jarring collapses
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isModuleMenuOpen) {
        setIsSidebarHovered(false);
      }
    }, 120);
  };

  // Close module popup on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moduleMenuRef.current && !moduleMenuRef.current.contains(e.target as Node)) {
        setIsModuleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mainNavItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Leaderboards', href: '/leaderboards', icon: BarChart2 },
    { name: 'Book of Records', href: '/records', icon: Award },
    { name: 'Targets', href: '/targets', icon: Target },
    { name: 'People', href: '/people', icon: Users },
    { name: 'Announcements', href: '/announcements', icon: Megaphone },
  ];

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed top-0 left-0 bottom-0 z-40 bg-white dark:bg-[#0B1320] text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800/80 flex flex-col transition-all duration-300 ease-in-out select-none font-sans ${
        isExpanded ? 'w-[240px] shadow-2xl' : 'w-[76px] shadow-xs'
      }`}
    >
      {/* Top Section: HOWS Logo */}
      <div className="h-16 px-3 flex items-center border-b border-slate-100 dark:border-slate-800/70 shrink-0 overflow-hidden">
        {isExpanded ? (
          <Link
            href="/"
            className="flex items-center gap-3 min-w-0 animate-in fade-in duration-200"
          >
            {/* HOWS Authentic Logo Image - wide, clear, and unconfined */}
            <div className="w-11 h-11 shrink-0 select-none flex items-center justify-center">
              <img
                src="/hows-logo.png?v=5"
                alt="HOWS Logo"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-col min-w-0 justify-center">
              <div className="flex items-center gap-1 leading-none">
                <span className="font-extrabold text-slate-900 dark:text-white text-[16px] tracking-tight font-sans">
                  Hows ERP
                </span>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium tracking-wide mt-0.5 truncate">
                Digital Corridor
              </span>
            </div>
          </Link>
        ) : (
          /* Collapsed Centered HOWS Logo */
          <Link
            href="/"
            title="Hows ERP"
            className="w-11 h-11 flex items-center justify-center mx-auto shrink-0 hover:scale-105 transition-transform cursor-pointer select-none"
          >
            <img
              src="/hows-logo.png?v=5"
              alt="HOWS Logo"
              className="w-full h-full object-contain"
            />
          </Link>
        )}
      </div>

      {/* ALL MODULES Launcher Card (Image 1 & 2) */}
      <div className="px-3 pt-3 pb-1 shrink-0 relative" ref={moduleMenuRef}>
        {isExpanded ? (
          <button
            type="button"
            onClick={() => setIsModuleMenuOpen(!isModuleMenuOpen)}
            title="Switch Module"
            className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/70 hover:bg-sky-50 dark:hover:bg-slate-800 hover:border-sky-300 dark:hover:border-sky-700 transition-all px-3 py-2 flex items-center justify-between shadow-2xs cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                <Hows4TileIcon className="w-5 h-5 transition-transform group-hover:scale-105" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">
                  ALL MODULES
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight mt-0.5 truncate">
                  CRM
                </span>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        ) : (
          /* Collapsed 4-tile Button */
          <button
            type="button"
            onClick={() => setIsModuleMenuOpen(!isModuleMenuOpen)}
            title="All Modules"
            className="w-11 h-11 mx-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850 hover:bg-sky-50 dark:hover:bg-slate-800 hover:border-sky-300 dark:hover:border-sky-700 transition-all flex items-center justify-center cursor-pointer shadow-2xs group"
          >
            <Hows4TileIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
          </button>
        )}

      </div>

      {/* Main Navigation List */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={!isExpanded ? item.name : undefined}
              className={`flex items-center rounded-xl text-xs sm:text-sm font-semibold transition-all group relative overflow-hidden ${
                isExpanded ? 'px-3.5 py-2.5' : 'px-0 py-2.5 justify-center'
              } ${
                isActive
                  ? 'bg-[#E8F1FD] dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className={`flex items-center justify-center shrink-0 ${isExpanded ? 'w-5 h-5 mr-3' : 'w-10 h-10'}`}>
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-600 dark:text-slate-400'
                  }`}
                />
              </div>

              {isExpanded && (
                <>
                  <span className="truncate flex-1 tracking-tight whitespace-nowrap animate-in fade-in duration-150">
                    {item.name}
                  </span>

                  {/* Active Blue Dot Indicator (Image 2) */}
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 ml-1.5" />
                  )}
                </>
              )}
            </Link>
          );
        })}

      </nav>

    </aside>
  );
}
