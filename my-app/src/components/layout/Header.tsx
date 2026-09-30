'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, X, Megaphone, Users, Award, Briefcase, Sun, Moon, PanelLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { leaderboardMembersMock, individualRecordsMock } from '../../data/mockData';
import LoginAuthIcon from '../common/LoginAuthIcon';
import ModuleLauncher from './ModuleLauncher';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    sidebarCollapsed,
    isSidebarHovered,
    toggleSidebar,
    searchQuery,
    setSearchQuery,
    feedPosts,
    crmLeads,
    notificationsCount,
    clearNotifications,
    theme,
    toggleTheme,
    logout,
  } = useApp();

  const isExpanded = !sidebarCollapsed || isSidebarHovered;

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      } else if (e.key === 'Escape') {
        setIsSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageInfo = () => {
    if (pathname === '/leaderboards') return { module: 'HUB Velocity', title: 'Performance Leaderboards' };
    if (pathname === '/records') return { module: 'HUB Archive', title: 'Book of Records' };
    if (pathname === '/targets') return { module: 'HUB Operations', title: 'Operating Targets' };
    if (pathname === '/people') return { module: 'HUB Directory', title: 'People & Directory' };
    if (pathname === '/announcements') return { module: 'HUB Broadcasts', title: 'Announcements' };
    if (pathname === '/crm-erp') return { module: 'Hows CRM', title: 'Lead Management' };
    if (pathname === '/insights') return { module: 'Hows CRM', title: 'CRM Insights' };
    if (pathname === '/design-erp') return { module: 'Hows Design', title: '3D Spatial Studio' };
    return { module: 'HUB Live', title: 'Home Feed' };
  };

  const pageInfo = getPageInfo();
  const q = searchQuery.trim().toLowerCase();

  // Search Results aggregation
  const matchingAnnouncements = q
    ? feedPosts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.author?.name.toLowerCase().includes(q)
      )
    : [];

  const matchingMembers = q
    ? leaderboardMembersMock.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q) ||
          m.department.toLowerCase().includes(q)
      )
    : [];

  const matchingRecords = q
    ? individualRecordsMock.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.holderName.toLowerCase().includes(q) ||
          r.value.toLowerCase().includes(q)
      )
    : [];

  const matchingLeads = q
    ? crmLeads.filter(
        (l) =>
          l.leadName.toLowerCase().includes(q) ||
          l.leadCode.toLowerCase().includes(q) ||
          l.owner.toLowerCase().includes(q)
      )
    : [];

  const totalResultsCount =
    matchingAnnouncements.length +
    matchingMembers.length +
    matchingRecords.length +
    matchingLeads.length;

  const handleSelectResult = (path: string) => {
    setIsSearchFocused(false);
    router.push(path);
  };

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-white dark:bg-[#0B1320] border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between px-6 transition-all duration-300 ease-in-out font-sans ${
        isExpanded ? 'left-[240px]' : 'left-[76px]'
      }`}
    >
      {/* Left: Sidebar Toggle + Breadcrumb Badge */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider font-sans">
          {pageInfo.module}
        </span>
        <span className="text-slate-300 dark:text-slate-600 text-xs font-bold">›</span>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-full text-xs font-bold border border-slate-200/80 dark:border-slate-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          <span>{pageInfo.title}</span>
        </div>
      </div>

      {/* Center: Global Search Bar with Live Command Palette Dropdown */}
      <div ref={searchContainerRef} className="flex-1 max-w-md mx-6 relative">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search HUB, members, records or leads... (⌘K)"
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchFocused(true);
            }}
            className="w-full pl-10 pr-10 py-2 bg-slate-100/90 dark:bg-[#101E33] border border-slate-200/80 dark:border-slate-700/60 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Global Search Results Dropdown Overlay */}
        {isSearchFocused && q.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#0D1829] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in duration-100 max-h-96 overflow-y-auto">
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
              <span>Found {totalResultsCount} matching {totalResultsCount === 1 ? 'item' : 'items'}</span>
              <span className="font-mono text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">ESC to close</span>
            </div>

            {totalResultsCount === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No results found for &ldquo;{searchQuery}&rdquo;.
              </div>
            ) : (
              <div className="p-2 space-y-3">
                {/* 1. Announcements & Posts */}
                {matchingAnnouncements.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-500">
                      <Megaphone className="w-3 h-3" />
                      <span>Announcements & Corridor Updates</span>
                    </div>
                    <div className="space-y-1">
                      {matchingAnnouncements.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => handleSelectResult(post.type === 'announcement' ? '/announcements' : '/')}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: post.categoryColor }}
                              />
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                {post.title}
                              </p>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate pl-4">
                              {post.content}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">{post.commentsCount} comments</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Team Members */}
                {matchingMembers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">
                      <Users className="w-3 h-3" />
                      <span>People & Directory</span>
                    </div>
                    <div className="space-y-1">
                      {matchingMembers.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => handleSelectResult('/people')}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                {m.name}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {m.role} • {m.department}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                            {m.revenueFormatted}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Book of Records */}
                {matchingRecords.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
                      <Award className="w-3 h-3" />
                      <span>Book of Records</span>
                    </div>
                    <div className="space-y-1">
                      {matchingRecords.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => handleSelectResult('/records')}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {r.title}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              Record Holder: {r.holderName} ({r.department})
                            </p>
                          </div>
                          <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400 shrink-0">
                            {r.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. CRM Leads */}
                {matchingLeads.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-500">
                      <Briefcase className="w-3 h-3" />
                      <span>CRM & Presales Leads</span>
                    </div>
                    <div className="space-y-1">
                      {matchingLeads.map((l) => (
                        <div
                          key={l.id}
                          onClick={() => handleSelectResult('/crm-erp')}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {l.leadName}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              Code: {l.leadCode} • Owner: {l.owner}
                            </p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold shrink-0">
                            {l.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Action Controls: Module Switcher, Theme Toggle, Notifications, Login/Profile Icon */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Module Switcher: CRM, Design, HR */}
        <ModuleLauncher />

        {/* Theme Toggle: Light and Dark Mode beside notifications */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors border border-slate-200 dark:border-slate-700/60 flex items-center justify-center cursor-pointer shadow-xs"
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 text-sky-400 fill-sky-400/20" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          )}
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              if (notificationsCount > 0) clearNotifications();
            }}
            className="w-9 h-9 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors relative border border-slate-200 dark:border-slate-700/60 flex items-center justify-center cursor-pointer shadow-xs"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-[#EF4444] text-white text-[9px] font-black rounded-full shadow-xs">
                {notificationsCount > 9 ? '9+' : notificationsCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Activity Alerts</span>
                <span className="text-[11px] text-sky-500 font-semibold cursor-pointer hover:underline" onClick={() => setIsNotifOpen(false)}>Done</span>
              </div>
              <div className="space-y-2">
                <p className="p-2.5 text-xs text-slate-400 text-center">No activity alerts.</p>
              </div>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={() => {
            logout();
            router.push('/login');
          }}
          className="w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700/60 flex items-center justify-center cursor-pointer shadow-xs group relative overflow-hidden"
          title="Sign out"
        >
          <LoginAuthIcon size={22} className="transition-transform group-hover:scale-105" />
        </button>
      </div>
    </header>
  );
}

