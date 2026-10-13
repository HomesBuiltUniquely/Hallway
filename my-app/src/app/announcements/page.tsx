'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AnnouncementsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex items-center gap-3 text-slate-400 text-sm font-semibold">
        <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
        <span>Redirecting to HUB Live Feed...</span>
      </div>
    </div>
  );
}
