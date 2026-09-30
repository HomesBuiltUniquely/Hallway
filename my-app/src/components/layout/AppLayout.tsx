'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { useApp } from '../../context/AppContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, authReady, sidebarCollapsed, isSidebarHovered } = useApp();
  const isExpanded = !sidebarCollapsed || isSidebarHovered;
  const isLoginRoute = pathname === '/login';

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated && !isLoginRoute) {
      router.replace('/login');
    } else if (isAuthenticated && isLoginRoute) {
      router.replace('/');
    }
  }, [authReady, isAuthenticated, isLoginRoute, router]);

  if (!authReady) {
    return <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#060B13]" />;
  }

  if (isLoginRoute) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#060B13] text-slate-900 dark:text-slate-100 font-sans">
        {children}
      </main>
    );
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-[#F9FAFB] dark:bg-[#060B13]" />;
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#060B13] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Sidebar />
      <Header />
      <main className={`flex-1 pt-16 transition-all duration-300 ease-in-out ${
        isExpanded ? 'pl-[240px]' : 'pl-[76px]'
      }`}>
        <div className="max-w-[1440px] mx-auto p-5 sm:p-6 lg:p-7">
          {children}
        </div>
      </main>
    </div>
  );
}
