'use client';

import React from 'react';
import { useFeed } from '../../hooks/useFeed';
import { CorridorBanner, CorridorSkeleton, PersonAvatar } from '../hallway/CorridorGate';
import type { HallwayFeedItem } from '../../types/hallway';

function DealCard({ item }: { item: HallwayFeedItem }) {
  return (
    <div className="bg-white dark:bg-panel border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-emerald-500" />
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {item.title}
          </h3>
        </div>
        <span className="text-[11px] font-medium text-slate-400 shrink-0 whitespace-nowrap">
          {item.timestamp}
        </span>
      </div>
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
        {item.content}
      </p>
      {item.author && (
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <PersonAvatar name={item.author.name} src={item.author.avatar} size={22} />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{item.author.name}</span>
          {item.author.team && <span>· {item.author.team}</span>}
        </div>
      )}
    </div>
  );
}

export default function DealFeed({
  limit = 20,
  filter,
}: {
  limit?: number;
  filter?: string;
}) {
  const { data, loading, error } = useFeed({ limit });
  const items = (data?.feed || []).filter((item) => {
    if (!filter || filter === 'ALL') return true;
    if (filter === 'BOOKINGS') return (item.type || 'booking') === 'booking';
    return true;
  });

  if (loading) return <CorridorSkeleton rows={4} />;

  return (
    <div className="space-y-4">
      <CorridorBanner error={error} />
      {items.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <p className="text-sm font-semibold text-slate-500">No live deal events in the last 7 days.</p>
        </div>
      ) : (
        items.map((item) => <DealCard key={item.id} item={item} />)
      )}
    </div>
  );
}
