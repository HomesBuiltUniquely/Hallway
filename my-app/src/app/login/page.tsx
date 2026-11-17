'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  User,
  Sun,
  Moon,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { clearCrmSession, setCrmSession } from '../../lib/crmApi';
import { saveDesignHandoff, clearDesignHandoff } from '../../lib/modulePortals';
import { LivingRoomScene } from '../../components/login/LivingRoomScene';

export default function LoginPage() {
  const router = useRouter();
  const { login, theme, toggleTheme } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const passwordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleShowPassword = () => {
    if (showPassword) {
      setShowPassword(false);
      if (passwordTimerRef.current) clearTimeout(passwordTimerRef.current);
    } else {
      setShowPassword(true);
      if (passwordTimerRef.current) clearTimeout(passwordTimerRef.current);
      passwordTimerRef.current = setTimeout(() => {
        setShowPassword(false);
      }, 3500);
    }
  };

  useEffect(() => {
    return () => {
      if (passwordTimerRef.current) clearTimeout(passwordTimerRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    const id = identifier.trim();

    if (!id || !password) {
      setErrorMessage('Email and password are required');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/hallway/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id, password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setIsLoading(false);
        setErrorMessage(
          (data && typeof data.message === 'string' && data.message) ||
            'Invalid email or password'
        );
        return;
      }

      const portal = data.portal === 'design' ? 'design' : 'crm';
      const department = portal === 'design' ? 'Design' : 'Sales';
      const user = data.user || {};
      const role = user.role || data.role || (portal === 'design' ? 'DESIGNER' : 'SALES');

      if (portal === 'design') {
        clearCrmSession();
        if (data.designSession?.sessionId && data.designSession?.user) {
          saveDesignHandoff(data.designSession.user, data.designSession.sessionId);
        } else {
          clearDesignHandoff();
        }
      } else {
        clearDesignHandoff();
        if (data.crmSession?.token) {
          setCrmSession(data.crmSession.token, data.crmSession.user || user);
        }
      }

      login(user.email || id, user.name || user.email || id, role, department);

      if (typeof data.notice === 'string' && data.notice) {
        // Persist briefly so home can show if needed; login navigates away immediately.
        try {
          window.sessionStorage.setItem('hallway-login-notice', data.notice);
        } catch {
          /* ignore */
        }
      }

      router.replace('/');
    } catch {
      setIsLoading(false);
      setErrorMessage('Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-surface-login text-app-fg flex items-center justify-center p-4 relative overflow-hidden font-sans select-none transition-colors duration-700">
      <LivingRoomScene isDark={theme === 'dark'} />

      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2.5 rounded-2xl bg-white/90 dark:bg-panel/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer z-20"
        title="Toggle Theme"
        aria-label="Toggle Theme"
      >
        {theme === 'dark' ? (
          <Sun className="w-4 h-4 text-accent-gold" />
        ) : (
          <Moon className="w-4 h-4 text-ink" />
        )}
      </button>

      <div className="max-w-[480px] w-full z-10">
        <div className="bg-surface/98 dark:bg-panel/95 backdrop-blur-2xl border border-surface-warm/90 dark:border-slate-800/80 rounded-[32px] p-8 sm:p-10 shadow-[0_28px_65px_-12px_rgba(50,38,28,0.16),0_10px_25px_-5px_rgba(50,38,28,0.08),0_0_0_1px_rgba(255,255,255,0.9)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_1px_1px_rgba(255,255,255,0.05)] space-y-6 sm:space-y-7 transition-all duration-300">
          <div className="text-center space-y-3">
            <div className="flex justify-center items-center">
              <img
                src="/images/hub-logo-trimmed.png"
                alt="HUB"
                className="h-11 sm:h-12 w-auto object-contain transition-all duration-300 select-none"
              />
            </div>

            <div>
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink dark:text-white tracking-tight">
                Pulse of HUB
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                Where deal momentum turns into dream homes.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-brand-soft border border-brand/30 rounded-2xl flex items-center gap-2.5 text-xs text-brand font-medium animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-brand" />
              <span>{errorMessage}</span>
            </div>
          )}

          {infoMessage && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-0.5">
                Username / Email
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-3.5 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/40"
                  placeholder="you@hubinterior.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-0.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/40"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={toggleShowPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-brand focus:ring-brand/40"
                />
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 rounded-2xl bg-brand hover:bg-brand/90 disabled:opacity-60 text-white text-sm font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Enter Home</span>
              {!isLoading ? <ArrowRight className="w-4 h-4" /> : null}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
