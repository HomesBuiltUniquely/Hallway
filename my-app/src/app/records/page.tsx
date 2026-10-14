'use client';

import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { useRecords } from '../../hooks/useRecords';
import type { HallwayIndividualRecord, HallwayTeamRecord } from '../../types/hallway';
import EmptyState from '../../components/common/EmptyState';
import BookOfRecordsBook from '../../components/records/BookOfRecordsBook';
import {
  CorridorBanner,
  CorridorGate,
  CorridorSkeleton,
} from '../../components/hallway/CorridorGate';
import DepartmentPills, {
  isSalesCrmDepartment,
} from '../../components/common/DepartmentPills';
import { useApp } from '../../context/AppContext';

function isTestLeadRecord(record: HallwayIndividualRecord): boolean {
  const testRegex = /\btest\b/i;
  if (testRegex.test(record.holderName || '') || testRegex.test(record.subValue || '')) {
    return true;
  }
  if (record.id === 'fastest_deal_close') {
    const valNum = parseFloat((record.value || '').replace(/[^0-9.]/g, ''));
    if (
      valNum <= 0.05 ||
      (record.subValue || '').toLowerCase().includes('g-2607') ||
      (record.holderName || '').toLowerCase().includes('shalny')
    ) {
      return true;
    }
  }
  return false;
}

interface RankedTeamRecord extends HallwayTeamRecord {
  rank: number;
}

function formatTeamTitle(raw: string): string {
  if (!raw) return raw;
  return raw
    .replace(/JP_NAGAR/i, 'JP NAGAR')
    .replace(/SARJAPUR(?!\w)/i, 'SARJAPURA')
    .replace(/\s*—\s*|\s*-\s*/g, ' — ')
    .trim();
}

function RecordsInner() {
  const { activeDepartment } = useApp();
  // All-time book — load full CRM records (no branch scope UI on this page)
  const { data, loading, error, refetch: refetchRecords } = useRecords();

  const omittedIds = useMemo(
    () => new Set((data?.omittedCategories || []).map((item) => item.id)),
    [data?.omittedCategories]
  );

  const individualRecords = useMemo(() => {
    return (data?.individualRecords || [])
      .filter((record) => !omittedIds.has(record.id) && record.id !== 'highest_single_booking')
      .filter((record) => !isTestLeadRecord(record));
  }, [data?.individualRecords, omittedIds]);

  const rankedTeams: RankedTeamRecord[] = useMemo(() => {
    const rawTeamRecords = (data?.teamRecords || []).filter(
      (record) => !omittedIds.has(record.id || record.metricLabel)
    );
    return rawTeamRecords.map((r, i) => ({
      ...r,
      rank: i + 1,
      metricLabel: r.metricLabel || 'All-Time Highest Revenue',
      teamName: formatTeamTitle(r.teamName),
    }));
  }, [data?.teamRecords, omittedIds]);

  const showBook = individualRecords.length > 0 || rankedTeams.length > 0;

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/20 bg-brand-soft text-brand shadow-xs">
            <Trophy className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-ink dark:text-white sm:text-3xl">
            HUB BOOK OF RECORDS
          </h1>
        </div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 sm:text-sm">
          Open the register — live CRM all-time sales milestones across Hub interiors.
        </p>
      </div>

      <DepartmentPills />

      {!isSalesCrmDepartment(activeDepartment) ? (
        <EmptyState
          title="No individual standings yet"
          description="Live sales records appear here when Sales is selected."
        />
      ) : (
        <>
          {error ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand/25 bg-brand-soft px-4 py-3 text-xs text-brand dark:border-brand/40">
              <span>
                {error instanceof Error ? error.message : 'CRM connection issue.'}
              </span>
              <button
                type="button"
                onClick={() => void refetchRecords()}
                className="rounded-xl bg-brand px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs transition-colors hover:bg-brand-hover"
              >
                Retry
              </button>
            </div>
          ) : (
            <CorridorBanner error={error} />
          )}

          {loading && !showBook ? (
            <CorridorSkeleton rows={4} />
          ) : !showBook ? (
            <EmptyState
              title="No records yet"
              description="Verified personal and team benchmarks will appear here when CRM publishes them."
            />
          ) : (
            <BookOfRecordsBook individuals={individualRecords} teams={rankedTeams} />
          )}
        </>
      )}
    </div>
  );
}

export default function BookOfRecordsPage() {
  return (
    <CorridorGate>
      <RecordsInner />
    </CorridorGate>
  );
}
