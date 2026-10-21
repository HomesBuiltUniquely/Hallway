'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { HallwayIndividualRecord, HallwayTeamRecord } from '../../types/hallway';

type RankedTeam = HallwayTeamRecord & { rank: number };

type BookSpread = {
  id: string;
  tab: string;
  label: string;
  title: string;
  definition: string;
  holdersName: string;
  holdersRole: string;
  holdersInactive: boolean;
  avatarInitials: string;
  avatarColor: string;
  value: string;
  meta: string;
  verified: boolean;
  details: [string, string][];
  breakHint: string;
  isTeam?: boolean;
};

const AVATAR_COLORS = ['#EF0101', '#0ea5e9', '#32261C', '#00B0ED', '#C88A3E'];

function initials(name: string): string {
  const clean = name.replace(/\(Inactive\)/gi, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (clean[0] || 'H').toUpperCase();
}

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function cleanName(name: string): { display: string; inactive: boolean } {
  const inactive = /\(Inactive\)/i.test(name);
  const display = name
    .replace(/\s*\(Inactive\)/gi, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { display, inactive };
}

/** Register definitions — not raw CRM notes or internal IDs. */
function definitionFor(record: HallwayIndividualRecord): string {
  const id = (record.id || '').toLowerCase();
  const title = (record.title || '').toLowerCase();

  if (id === 'highest_deal_value' || /highest.*deal/.test(title)) {
    return 'The largest single interior contract closed by one salesperson, verified from the company ledger.';
  }
  if (id === 'fastest_deal_close' || /fastest/.test(title)) {
    return 'The shortest time from a new lead to a verified booking, held by one salesperson.';
  }
  if (id === 'sales_execution_streak' || /streak/.test(title)) {
    return 'The longest run of consecutive days with a closed deal, held by one salesperson.';
  }

  const raw = (record.description || '').trim();
  const looksInternal =
    /[0-9a-f]{8}-[0-9a-f]{4}-/i.test(raw) ||
    /glead\/|deal id|crm corridor|uuid/i.test(raw);
  if (raw && !looksInternal && raw.length <= 160) return raw;
  return 'A verified all-time sales milestone held in the Hub Book of Records.';
}

function breakHintFor(record: HallwayIndividualRecord): string {
  if (record.id === 'highest_deal_value') {
    return `Close one verified interior booking above ${record.value}.`;
  }
  if (record.id === 'fastest_deal_close') {
    return `Close a deal in under ${record.value} from lead creation.`;
  }
  if (record.id === 'sales_execution_streak') {
    return `Post closed-won deals on more consecutive days than ${record.value}.`;
  }
  return `Set a new mark above ${record.value}.`;
}

function shortTab(title: string): string {
  if (/highest.*deal/i.test(title)) return 'Highest value';
  if (/fastest/i.test(title)) return 'Fastest close';
  if (/streak/i.test(title)) return 'Streak';
  if (/team/i.test(title)) return 'Team records';
  return title.split(' ').slice(0, 2).join(' ');
}

function buildSpreads(
  individuals: HallwayIndividualRecord[],
  teams: RankedTeam[]
): BookSpread[] {
  const spreads: BookSpread[] = individuals.map((r, idx) => {
    const { display, inactive } = cleanName(r.holderName);
    const sub =
      r.id === 'fastest_deal_close' && r.subValue === 'M-777'
        ? 'Lead #M-777 · Marketing Lead'
        : r.subValue || '';

    const details: [string, string][] = [
      ['Department', r.department || 'Sales'],
      ['Holder', display],
    ];
    if (sub) {
      const parts = sub
        .split(/\s*[•·|]\s*/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length >= 2 && /^(HBR|SARJAPUR|JP)/i.test(parts[0])) {
        details.push(['Branch', parts[0]], ['Noted', parts.slice(1).join(' · ')]);
      } else if (/lead/i.test(sub)) {
        details.push(['Lead', sub.replace(/^Lead\s*/i, '')]);
      } else {
        details.push(['Context', sub]);
      }
    }

    return {
      id: r.id,
      tab: shortTab(r.title),
      label: `RECORD ${String(idx + 1).padStart(2, '0')} OF ${String(individuals.length).padStart(2, '0')}`,
      title: r.title,
      definition: definitionFor(r),
      holdersName: display,
      holdersRole: r.holderRole || 'Sales Executive',
      holdersInactive: inactive,
      avatarInitials: initials(display),
      avatarColor: colorFor(display),
      value: r.value,
      meta: sub,
      verified: Boolean(r.verified),
      details,
      breakHint: breakHintFor(r),
    };
  });

  if (teams.length > 0) {
    const lead = teams[0];
    const leadTitle = lead.teamName;
    const leadBy = lead.leadName ? `Led by ${lead.leadName}` : 'Hub squad';
    const dealsClosed =
      typeof lead.dealsClosed === 'number' ? lead.dealsClosed : undefined;
    const winRate =
      typeof lead.winRate === 'number' && Number.isFinite(lead.winRate)
        ? lead.winRate
        : undefined;

    const teamDetails: [string, string][] = [
      ['Gross booking', lead.value],
      ...(dealsClosed != null
        ? [['Deals closed', String(dealsClosed)] as [string, string]]
        : []),
      ...(winRate != null
        ? [['Win rate', `${winRate.toFixed(1)}%`] as [string, string]]
        : []),
      ['Team', leadTitle],
      ...(lead.leadName ? [['Lead', leadBy] as [string, string]] : []),
    ];

    spreads.push({
      id: 'team_all_time',
      tab: 'Team records',
      label: 'TEAM RECORD',
      title: lead.metricLabel || 'Highest Team Gross',
      definition:
        'The highest all-time gross bookings held by a single Hub team, verified from the company ledger.',
      holdersName: leadTitle,
      holdersRole: leadBy,
      holdersInactive: false,
      avatarInitials: initials(lead.leadName || leadTitle),
      avatarColor: '#EF0101',
      value: lead.value,
      meta: leadBy,
      verified: lead.verified !== false,
      details: teamDetails,
      breakHint: `Deliver more than ${lead.value} in all-time team gross to set the new mark.`,
      isTeam: true,
    });
  }

  return spreads;
}

export default function BookOfRecordsBook({
  individuals,
  teams,
}: {
  individuals: HallwayIndividualRecord[];
  teams: RankedTeam[];
}) {
  const spreads = useMemo(() => buildSpreads(individuals, teams), [individuals, teams]);
  const [page, setPage] = useState(-1);
  const [turnDir, setTurnDir] = useState<'next' | 'prev'>('next');
  const [flipKey, setFlipKey] = useState(0);
  const turnLock = useRef(false);

  useEffect(() => {
    setPage(-1);
  }, [individuals, teams]);

  const goTo = (next: number) => {
    if (turnLock.current) return;
    if (next < -1 || next > spreads.length - 1) return;
    if (next === page) return;
    turnLock.current = true;
    setTurnDir(next > page ? 'next' : 'prev');
    setPage(next);
    setFlipKey((k) => k + 1);
    window.setTimeout(() => {
      turnLock.current = false;
    }, 520);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(page + 1);
      if (e.key === 'ArrowLeft') goTo(page - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goTo closes over page
  }, [page, spreads.length]);

  if (spreads.length === 0) return null;

  const spread = page >= 0 ? spreads[page] : null;
  const edition = new Date().getFullYear();

  return (
    <div className="hub-bor overflow-x-auto px-2 py-8 dark:bg-transparent">
      <div className="mx-auto flex w-max flex-col items-center gap-5">
        {/* Closed hardcover */}
        {page < 0 && (
          <div className="hub-bor-stage relative">
            <button
              type="button"
              onClick={() => goTo(0)}
              className="hub-bor-cover group relative flex h-[min(520px,78vw)] w-[min(360px,58vw)] cursor-pointer flex-col items-center justify-center gap-3 text-center text-white"
              aria-label="Open Book of Records"
            >
              <span className="hub-bor-cover-block" aria-hidden />
              <span className="hub-bor-cover-foil" aria-hidden />
              <span className="hub-bor-cover-inner" aria-hidden />

              <span className="relative z-10 mt-2 text-[9px] font-bold uppercase tracking-[0.42em] text-[#f6d98a]">
                Official edition {edition}
              </span>

              <span className="hub-bor-medallion relative z-10 mt-3 grid h-[88px] w-[88px] place-items-center">
                <span className="text-[28px] font-black tracking-[0.12em]">HUB</span>
              </span>

              <span
                className="relative z-10 mt-4 font-black uppercase leading-none tracking-[0.06em]"
                style={{
                  fontSize: 'clamp(1.35rem, 3.5vw, 1.75rem)',
                  color: '#f6d98a',
                  textShadow: '0 2px 0 rgba(80,0,0,0.35)',
                }}
              >
                Book of
                <br />
                Records
              </span>

              <span className="relative z-10 mt-3 max-w-[200px] text-[11px] font-semibold leading-snug text-white/85">
                The definitive register of Hub interiors sales milestones
              </span>

              <span className="relative z-10 mt-6 text-[10px] font-bold uppercase tracking-[0.28em] text-[#f6d98a]/opacity-90 transition group-hover:opacity-100">
                Open the register →
              </span>

              <i className="hub-bor-ribbon" aria-hidden />
            </button>
          </div>
        )}

        {/* Open spread */}
        {page >= 0 && spread && (
          <div className="relative" style={{ marginRight: 108 }}>
            <div
              key={flipKey}
              className={`hub-bor-open relative flex h-[min(500px,74vw)] w-[min(860px,94vw)] ${
                turnDir === 'next' ? 'hub-bor-turning-next' : 'hub-bor-turning-prev'
              }`}
            >
              {/* Left board / back pages */}
              <div className="hub-bor-board-l pointer-events-none absolute inset-y-0 left-0 w-3" aria-hidden />
              {/* Right page stack */}
              <div className="hub-bor-stack pointer-events-none absolute inset-y-2 right-[-10px] w-[10px]" aria-hidden />

              <div className="hub-bor-spread relative z-[1] flex h-full w-full overflow-hidden rounded-sm">
                {/* LEFT PAGE — category / definition */}
                <button
                  type="button"
                  className="hub-bor-page hub-bor-page-l relative flex flex-1 cursor-w-resize flex-col px-5 py-5 text-left sm:px-7 sm:py-6"
                  onClick={() => goTo(page - 1)}
                  aria-label={page === 0 ? 'Close the book' : 'Previous page'}
                >
                  <div className="flex items-center gap-2">
                    <span className="hub-bor-seal-mini" aria-hidden>
                      ★
                    </span>
                    <span className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#9a7a72]">
                      {spread.label}
                    </span>
                  </div>

                  <h3 className="mt-3 text-[clamp(1.15rem,2.4vw,1.55rem)] font-black leading-tight tracking-tight text-[#1d1a17]">
                    {spread.title}
                  </h3>

                  <p className="mt-2 text-[12px] leading-relaxed text-[#5b463e]">{spread.definition}</p>

                  <div className="mt-8 flex flex-1 flex-col justify-end">
                    <div className="rounded-md border border-dashed border-[#e8caca] bg-[#fff8f6] px-3 py-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#b80203]">
                        Category brief
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#5b463e]">
                        This page defines the record. The facing leaf names the holder and the
                        current mark.
                      </p>
                    </div>
                  </div>

                  <span className="mt-auto pt-4 text-[10px] font-bold tabular-nums text-[#b8a49d]">
                    {page * 2 + 2}
                  </span>
                </button>

                <div className="hub-bor-gutter shrink-0" aria-hidden />

                {/* RIGHT PAGE — certificate */}
                <button
                  type="button"
                  className="hub-bor-page hub-bor-page-r relative flex flex-1 cursor-e-resize flex-col px-5 py-5 text-left sm:px-7 sm:py-6"
                  onClick={() =>
                    page < spreads.length - 1 ? goTo(page + 1) : undefined
                  }
                  aria-label={
                    page < spreads.length - 1 ? 'Next page' : 'End of the register'
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-extrabold text-white shadow-[0_2px_0_rgba(0,0,0,0.12)]"
                        style={{ background: spread.avatarColor }}
                      >
                        {spread.avatarInitials}
                        <span className="absolute -bottom-1 -right-1 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-[#fffdfb] bg-[#f6d98a] text-[10px] text-[#2b1d14]">
                          ★
                        </span>
                      </span>
                      <div className="min-w-0">
                        <div className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#9a7a72]">
                          Record holder
                        </div>
                        <div className="text-[20px] font-semibold leading-tight tracking-[-0.01em] text-[#1a1614]">
                          {spread.holdersName}
                          {spread.holdersInactive && (
                            <span className="ml-1 font-sans text-[10px] font-bold text-[#9a7a72]">
                              (inactive)
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[12px] font-semibold text-[#9a7a72]">
                          {spread.holdersRole}
                        </div>
                      </div>
                    </div>

                    {spread.verified && (
                      <span className="hub-bor-wax shrink-0" title="Officially verified">
                        <span>OFFICIAL</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <div className="text-[22px] font-semibold leading-none tracking-tight text-[#c40001]">
                      {spread.value}
                    </div>
                    {spread.meta && (
                      <div className="mt-1.5 text-[11px] font-medium text-[#7a5b48]">
                        {spread.meta}
                      </div>
                    )}
                  </div>

                  {spread.verified && (
                    <span className="mt-2.5 inline-flex w-fit items-center gap-1.5 border border-[#f4a3a3] bg-[#fff5f5] px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[#b80203]">
                      <span aria-hidden>✓</span> Officially verified
                    </span>
                  )}

                  <div className="mt-4">
                    <div className="mb-1.5 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#9a7a72]">
                      Record particulars
                    </div>
                    <div className="grid grid-cols-[88px_1fr] gap-x-2 gap-y-1.5 border-t border-[#ead9d2] pt-2 text-xs">
                      {spread.details.map(([k, v]) => (
                        <React.Fragment key={k}>
                          <span className="text-[#9a7a72]">{k}</span>
                          <b className="font-bold text-[#1d1a17]">{v}</b>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-4">
                    <div className="rounded-md border border-[#f0c9a0] bg-gradient-to-br from-[#fff8ee] to-[#fff1f1] px-3 py-2.5 text-xs">
                      <div className="mb-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#9a4b12]">
                        Set the new mark
                      </div>
                      <p className="text-[#2b1d14]">{spread.breakHint}</p>
                    </div>
                    <span className="mt-3 block text-right text-[10px] font-bold tabular-nums text-[#b8a49d]">
                      {page * 2 + 3}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Chapter tabs */}
            <div className="absolute right-[-104px] top-10 flex flex-col gap-1.5 max-[920px]:hidden">
              {spreads.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`hub-bor-tab ${i === page ? 'hub-bor-tab-on' : ''}`}
                >
                  {s.tab}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Paging controls */}
        {page >= 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button type="button" onClick={() => goTo(page - 1)} className="hub-bor-ctl">
              {page === 0 ? 'Close cover' : '← Turn back'}
            </button>
            <span className="min-w-[7.5rem] text-center text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a5b48]">
              Leaf {page + 1} / {spreads.length}
            </span>
            <button
              type="button"
              onClick={() => goTo(page + 1)}
              disabled={page >= spreads.length - 1}
              className="hub-bor-ctl disabled:cursor-default disabled:opacity-35"
            >
              Turn page →
            </button>
          </div>
        )}

        {page >= 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 min-[921px]:hidden">
            {spreads.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                className={`rounded-sm px-3 py-1 text-[11px] font-bold ${
                  i === page
                    ? 'bg-[#c40001] text-white'
                    : 'border border-[#e8caca] bg-white text-[#b80203]'
                }`}
              >
                {s.tab}
              </button>
            ))}
          </div>
        )}

        {page < 0 && (
          <p className="max-w-md text-center text-[11px] text-[#7a5b48]">
            Click the cover to open · arrow keys turn the leaves
          </p>
        )}
      </div>
    </div>
  );
}
