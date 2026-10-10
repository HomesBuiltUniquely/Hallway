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
  Loader2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CrmApiError, crmDisplayName, loginToCrm, clearCrmSession } from '../../lib/crmApi';
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
  const passwordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleShowPassword = () => {
    if (showPassword) {
      setShowPassword(false);
      if (passwordTimerRef.current) clearTimeout(passwordTimerRef.current);
    } else {
      setShowPassword(true);
      if (passwordTimerRef.current) clearTimeout(passwordTimerRef.current);
      // Automatically mask password back after 3.5 seconds
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
    const id = identifier.trim();

    if (!id || !password) {
      setErrorMessage('Email and password are required');
      return;
    }

    setIsLoading(true);

    // 1. Kick off both Design Module and CRM authentications simultaneously in parallel
    const designAuthPromise = fetch('/api/design-module/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: id,
        password: password,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        return { ok: res.ok, status: res.status, data };
      })
      .catch(() => null);

    const crmAuthPromise = loginToCrm(id, password)
      .then((data) => ({ ok: true as const, data, error: null }))
      .catch((err) => ({ ok: false as const, data: null, error: err }));

    // 2. Fast-track check: If Design auth returns a dedicated Designer role, log in immediately
    const designFirst = await Promise.race([
      designAuthPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 500)),
    ]);

    if (designFirst?.ok && designFirst.data?.sessionId && designFirst.data?.user) {
      const designUser = designFirst.data.user as { email?: string; name?: string; role?: string };
      const roleUpper = (designUser?.role || '').toUpperCase();
      const isPureDesigner =
        roleUpper.includes('DESIGN') && !roleUpper.includes('ADMIN') && !roleUpper.includes('SUPER');

      if (isPureDesigner) {
        clearCrmSession();
        saveDesignHandoff(designFirst.data.user, designFirst.data.sessionId);
        login(
          designUser.email || id,
          designUser.name || designUser.email || id,
          designUser.role || 'DESIGN',
          'Design'
        );
        router.replace('/');
        return;
      }
    }

    // 3. Resolve both authentications concurrently
    const [crmResult, fullDesignResult] = await Promise.all([
      crmAuthPromise,
      designAuthPromise,
    ]);

    // 4. If CRM login succeeded (Sales / Admin)
    if (crmResult.ok && crmResult.data?.user) {
      const user = crmResult.data.user;
      clearDesignHandoff();

      // If user also has Design Studio access (e.g. Super Admin / Admin), link it
      if (fullDesignResult?.ok && fullDesignResult.data?.sessionId && fullDesignResult.data?.user) {
        saveDesignHandoff(fullDesignResult.data.user, fullDesignResult.data.sessionId);
      }

      login(
        user.email || user.username || id,
        crmDisplayName(user) || id,
        user.role || 'SALES',
        'Sales'
      );
      router.replace('/');
      return;
    }

    // 5. If CRM failed but Design succeeded
    if (fullDesignResult?.ok && fullDesignResult.data?.sessionId && fullDesignResult.data?.user) {
      clearCrmSession();
      saveDesignHandoff(fullDesignResult.data.user, fullDesignResult.data.sessionId);
      const designUser = fullDesignResult.data.user as { email?: string; name?: string; role?: string };
      login(
        designUser.email || id,
        designUser.name || designUser.email || id,
        designUser.role || 'DESIGN',
        'Design'
      );
      router.replace('/');
      return;
    }

    // 6. If both failed, display error
    setIsLoading(false);
    const crmErr = crmResult.error;
    if (crmErr instanceof CrmApiError) {
      if (crmErr.status === 401 || crmErr.status === 400) {
        setErrorMessage(
          crmErr.message && !/authorization failed|bad request/i.test(crmErr.message)
            ? crmErr.message
            : 'Invalid username or password'
        );
      } else {
        setErrorMessage(crmErr.message);
      }
    } else {
      setErrorMessage('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-[#f3e6dd] dark:bg-[#090d15] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none transition-colors duration-700">
      {/* Living Room Scene Background */}
      <LivingRoomScene isDark={theme === 'dark'} />

      {/* Floating Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2.5 rounded-2xl bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer z-20"
        title="Toggle Theme"
        aria-label="Toggle Theme"
      >
        {theme === 'dark' ? (
          <Sun className="w-4 h-4 text-amber-400" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700" />
        )}
      </button>

      {/* Main Container */}
      <div className="max-w-[480px] w-full z-10">
        {/* Pinterest-style Elevated Card */}
        <div className="bg-white/98 dark:bg-[#0F1523]/95 backdrop-blur-2xl border border-stone-200/90 dark:border-slate-800/80 rounded-[32px] p-8 sm:p-10 shadow-[0_28px_65px_-12px_rgba(55,40,30,0.16),0_10px_25px_-5px_rgba(55,40,30,0.08),0_0_0_1px_rgba(255,255,255,0.9)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_1px_1px_rgba(255,255,255,0.05)] space-y-6 sm:space-y-7 transition-all duration-300">
          
          {/* Brand Header */}
          <div className="text-center space-y-3">
            {/* Theme-aware HUB Logo */}
            <div className="flex justify-center items-center">
              <img
                src="/images/hub-logo-trimmed.png"
                alt="HUB"
                className="h-11 sm:h-12 w-auto object-contain transition-all duration-300 select-none"
              />
            </div>

            <div>
              <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 dark:text-white tracking-tight">
                Pulse of HUB
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium">
                Where deal momentum turns into dream homes.
              </p>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400 font-medium animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field 1: Username or Email */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 ml-0.5 tracking-wide">
                Username or Email
              </label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/90 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/80 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 dark:hover:border-slate-600 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-none focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 transition-all font-sans"
                  placeholder="username or abc@hubinterior.com"
                />
              </div>
            </div>

            {/* Field 2: Password with timed Eye Preview */}
            <div>
              <div className="flex items-center justify-between mb-1.5 ml-0.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                  Password
                </label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full pl-10 pr-11 py-3 bg-slate-50/90 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/80 border border-slate-300 hover:border-slate-400 dark:border-slate-700/80 dark:hover:border-slate-600 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-none focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-red-500 focus:ring-4 focus:ring-red-500/15 transition-all font-sans"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={toggleShowPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all cursor-pointer"
                  title={showPassword ? 'Hide password' : 'View password for a few seconds'}
                  aria-label={showPassword ? 'Hide password' : 'View password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-red-500" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-1 px-0.5">
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-700 text-red-600 accent-red-600 focus:ring-red-500/30 cursor-pointer"
                />
                <span className="group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors font-medium">
                  Remember me
                </span>
              </label>

              <button
                type="button"
                onClick={() => alert('Please contact your System Administrator or IT Support to reset your password.')}
                className="text-xs font-bold text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Primary Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-6 bg-gradient-to-r from-[#FF2B34] via-[#EE1D23] to-[#D50C13] hover:from-[#FF3D45] hover:via-[#F3282E] hover:to-[#E0131B] text-white rounded-2xl text-sm font-bold tracking-wide transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Enter Home</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </button>
          </form>

          {/* Access Help / Support Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Not a member?{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Contact your Admin for access
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
