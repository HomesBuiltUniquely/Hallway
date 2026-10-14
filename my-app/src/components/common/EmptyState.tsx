'use client';

import React from 'react';

export default function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="text-center py-12 px-6 bg-white dark:bg-panel rounded-2xl border border-slate-200 dark:border-slate-800">
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{title}</p>
      {description && (
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">{description}</p>
      )}
    </div>
  );
}
