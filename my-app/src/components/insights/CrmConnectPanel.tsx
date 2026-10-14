'use client';

import React, { useState } from 'react';
import { KeyRound, LogIn } from 'lucide-react';

export function CrmConnectPanel({
  onLogin,
  onToken,
  error,
  title = 'CRM Insights',
  description = 'Sign in with your CRM account (or paste a Bearer token) to load live sales analytics.',
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  onToken: (token: string) => void;
  error?: string | null;
  title?: string;
  description?: string;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLocalError(null);
    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'CRM login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {title}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {description}
        </p>
      </div>

      <form
        onSubmit={handleLogin}
        className="bg-white dark:bg-panel border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3"
      >
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">CRM login</p>
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
        />
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
        />
        {(localError || error) && (
          <p className="text-xs font-semibold text-rose-500">{localError || error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <LogIn className="w-3.5 h-3.5" />
          {submitting ? 'Connecting…' : 'Connect CRM'}
        </button>
      </form>

      <div className="bg-white dark:bg-panel border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          Dev token
        </p>
        <div className="flex gap-2">
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Bearer token"
            className="flex-1 px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={() => onToken(token)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Use
          </button>
        </div>
      </div>
    </div>
  );
}
