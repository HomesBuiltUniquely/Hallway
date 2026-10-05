'use client';

import React from 'react';

const AVATAR_PALETTE = [
  'bg-indigo-600 text-white',
  'bg-sky-600 text-white',
  'bg-violet-600 text-white',
  'bg-emerald-600 text-white',
  'bg-rose-600 text-white',
  'bg-amber-600 text-white',
  'bg-teal-600 text-white',
  'bg-blue-600 text-white',
  'bg-slate-700 text-white',
];

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return '—';
  const clean = name.trim().replace(/^@/, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getPaletteClass(name?: string): string {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

interface UserAvatarProps {
  name?: string;
  avatar?: string | null;
  size?: number; // size in px, default 28
  className?: string;
  initials?: string;
}

export default function UserAvatar({
  name = 'User',
  avatar,
  size = 28,
  className = '',
  initials: explicitInitials,
}: UserAvatarProps) {
  const displayInitials = explicitInitials || getInitials(name);
  const palette = getPaletteClass(name);

  // If a valid, non-stock profile image is provided, display it
  const isStockOrAiPhoto =
    !avatar ||
    avatar.includes('unsplash.com') ||
    avatar.includes('thispersondoesnotexist') ||
    avatar.includes('placeholder') ||
    avatar.trim() === '';

  if (!isStockOrAiPhoto && avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`rounded-full object-cover shrink-0 ring-1 ring-slate-200/80 dark:ring-slate-700/80 ${className}`}
      />
    );
  }

  // Enterprise default: Clean, polished initials badge
  const fontSize = Math.max(10, Math.round(size * 0.38));

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${fontSize}px`,
      }}
      className={`rounded-full ${palette} font-bold inline-flex items-center justify-center shrink-0 select-none shadow-2xs ring-1 ring-white/10 ${className}`}
      title={name}
    >
      <span>{displayInitials}</span>
    </div>
  );
}
