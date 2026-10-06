'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, AlertCircle, X, Loader2, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { loginToCrm, setCrmSession } from '../../lib/crmApi';
import { isSuperAdmin, isRestrictedFromDesign } from '../../lib/permissions';
import {
  openCrmDashboard,
  openDesignDashboard,
  getValidCrmSession,
  getValidDesignSession,
  saveDesignHandoff,
} from '../../lib/modulePortals';

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
  const { currentUser, loginPortal } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isSuper = isSuperAdmin(currentUser);
  const isDesigner = !isSuper && (currentUser.department === 'Design' || loginPortal === 'design');
  const isCrmSales = !isSuper && (currentUser.department === 'Sales' || loginPortal === 'crm');

  // Module authentication prompt state
  const [authModalModule, setAuthModalModule] = useState<'crm' | 'design' | null>(null);
  const [authIdentifier, setAuthIdentifier] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  const openAuthPrompt = (module: 'crm' | 'design') => {
    if (module === 'design' && isRestrictedFromDesign(currentUser)) return;
    if (!isSuper) {
      if (module === 'crm' && isDesigner) return;
      if (module === 'design' && isCrmSales) return;
    }
    setAuthModalModule(module);
    setAuthIdentifier(currentUser.email || currentUser.name || '');
    setAuthPassword('');
    setAuthError(null);
    setIsOpen(false);
  };

  const handleCrmClick = () => {
    setIsOpen(false);
    if (!isSuper && isDesigner) {
      alert('Access Denied: Designers do not have access to the CRM module.');
      return;
    }
    // Admins have unconditional, direct access to CRM
    if (isSuper) {
      openCrmDashboard(currentUser);
      return;
    }
    // Check if the current user already has verified CRM credentials
    const validSession = getValidCrmSession(currentUser);
    if (validSession) {
      openCrmDashboard(currentUser);
    } else {
      openAuthPrompt('crm');
    }
  };

  const handleDesignClick = () => {
    setIsOpen(false);
    if (isRestrictedFromDesign(currentUser)) {
      alert('Access Denied: You do not have access to the Design Studio module.');
      return;
    }
    if (!isSuper && isCrmSales) {
      alert('Access Denied: CRM personnel do not have access to the Design Studio module.');
      return;
    }
    // Admins have unconditional, direct access to Design Studio
    if (isSuper) {
      openDesignDashboard(currentUser);
      return;
    }
    // Check if the current user already has verified Design Studio credentials
    const validSession = getValidDesignSession(currentUser);
    if (validSession) {
      openDesignDashboard(currentUser);
    } else {
      openAuthPrompt('design');
    }
  };

  const handleHrClick = () => {
    setIsOpen(false);
    const hrUrl = process.env.NEXT_PUBLIC_HR_PORTAL_URL || 'https://hubinterior.keka.com/';
    window.location.assign(hrUrl);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authIdentifier.trim() || !authPassword) {
      setAuthError('Username/email and password are required');
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    if (authModalModule === 'crm') {
      try {
        const data = await loginToCrm(authIdentifier.trim(), authPassword);
        if (data?.token && data?.user) {
          setCrmSession(data.token, data.user);
          setAuthModalModule(null);
          openCrmDashboard(currentUser);
          return;
        }
        setAuthError('Access Denied: Credentials do not match CRM data.');
      } catch (err: any) {
        setAuthError(
          'Access Denied: Your credentials do not match CRM data. Only authorized CRM personnel can access this module.'
        );
      } finally {
        setAuthLoading(false);
      }
    } else if (authModalModule === 'design') {
      try {
        const res = await fetch('/api/design-module/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authIdentifier.trim(),
            password: authPassword,
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.sessionId && data?.user) {
          saveDesignHandoff(data.user, data.sessionId);
          setAuthModalModule(null);
          openDesignDashboard(currentUser);
          return;
        }
        setAuthError(
          'Access Denied: Your credentials do not match Design Studio data. Only authorized designers can access this module.'
        );
      } catch (err: any) {
        setAuthError('Access Denied: Could not verify Design credentials.');
      } finally {
        setAuthLoading(false);
      }
    }
  };

  const allModules = [
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

  // Strict cross-module isolation:
  // - Admin and Sachin have Design access explicitly removed (CRM + HR only)
  // - CRM / Sales users see CRM + HR (Design is completely hidden)
  // - Design users see Design + HR (CRM is completely hidden)
  const modules = allModules.filter((m) => {
    if (m.id === 'hr') return true;
    if (m.id === 'design' && isRestrictedFromDesign(currentUser)) return false;
    if (isSuper) return true;
    if (isCrmSales && m.id === 'design') return false;
    if (isDesigner && m.id === 'crm') return false;
    return true;
  });

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

      {/* Module Authentication Dialog */}
      {authModalModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0D1829] rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setAuthModalModule(null)}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {authModalModule === 'crm' ? 'CRM Authorization' : 'Design Studio Authorization'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You are currently logged in as <strong className="text-slate-700 dark:text-slate-300">{currentUser.name}</strong> ({currentUser.department}). To access the{' '}
                {authModalModule === 'crm' ? 'CRM' : 'Design Studio'} module, please verify your credentials.
              </p>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 ml-0.5">
                  {authModalModule === 'crm' ? 'CRM Username or Email' : 'Design Module Email'}
                </label>
                <input
                  type="text"
                  required
                  value={authIdentifier}
                  onChange={(e) => {
                    setAuthIdentifier(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="username or abc@hubinterior.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 ml-0.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => {
                    setAuthPassword(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAuthModalModule(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {authLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Verify & Access</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
