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
                ? 'bg-[#00E676] text-slate-950 font-bold shadow-xs hover:bg-[#00c853]'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {dept}
          </button>
        );
      })}
    </div>
  );
}
