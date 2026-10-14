'use client';

import React from 'react';
import { useApp } from '../../context/AppContext';

export const DEPARTMENTS = [
  'All Departments',
  'Sales',
  'Design',
  'Operations',
  'HR',
  'Finance',
] as const;

/** Hallway currently only has CRM Sales data; other dept tabs show an empty state. */
export function isSalesCrmDepartment(department: string | null | undefined): boolean {
  return !department || department === 'All Departments' || department === 'Sales';
}

export default function DepartmentPills({ className = '' }: { className?: string }) {
  const { activeDepartment, setActiveDepartment } = useApp();

  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none ${className}`}>
      {DEPARTMENTS.map((dept) => {
        const isActive = activeDepartment === dept;
        return (
          <button
            key={dept}
            type="button"
            onClick={() => setActiveDepartment(dept)}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
              isActive
                ? 'bg-brand text-white font-bold shadow-xs hover:bg-brand-hover'
                : 'bg-white dark:bg-panel text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 hover:bg-surface-muted dark:hover:bg-slate-700'
            }`}
          >
            {dept}
          </button>
        );
      })}
    </div>
  );
}
