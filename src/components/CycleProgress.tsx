/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * CycleProgress.tsx — Displays the current 6-week cycle and progress through it.
 * Cycle 1 starts on the date configured in the Setup Wizard (defaults to the
 * first weekday of the current year); each cycle is 42 calendar days long. The
 * table shows cycle number, start/end dates, days elapsed/remaining, and a
 * percentage progress bar.
 */
import React from 'react';
import { storage } from '../utils';

const CYCLE_LENGTH_DAYS = 42;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function firstWorkingDayOfYear(year: number): Date {
  const d = new Date(year, 0, 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseCycle1Start(value: string): Date | null {
  // Expecting YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/** Count weekdays (Mon–Fri) between two dates, inclusive on both ends. */
function countWeekdays(from: Date, to: Date): number {
  if (from.getTime() > to.getTime()) return 0;
  let count = 0;
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (d.getTime() <= end.getTime()) {
    if (!isWeekend(d)) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CycleProgress(): React.JSX.Element {
  const today = startOfDay(new Date());
  const stored = parseCycle1Start(storage.getCycle1Start());
  const cycle1Start = stored ?? firstWorkingDayOfYear(today.getFullYear());
  const daysSinceCycle1 = Math.floor((today.getTime() - cycle1Start.getTime()) / MS_PER_DAY);
  const cycleNumber = Math.max(1, Math.floor(daysSinceCycle1 / CYCLE_LENGTH_DAYS) + 1);
  const cycleStart = addDays(cycle1Start, (cycleNumber - 1) * CYCLE_LENGTH_DAYS);
  const cycleEnd = addDays(cycleStart, CYCLE_LENGTH_DAYS - 1);
  // Weekday-only counts (Mon–Fri); excludes Saturdays and Sundays.
  const totalDays = countWeekdays(cycleStart, cycleEnd);
  const elapsedTo = today.getTime() > cycleEnd.getTime() ? cycleEnd : today;
  const daysElapsed = today.getTime() < cycleStart.getTime() ? 0 : countWeekdays(cycleStart, elapsedTo);
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const pctComplete = totalDays === 0 ? 0 : Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
  const pctRounded = Math.round(pctComplete);

  return (
    <div className="mb-1">
      <h2 className="m-0 mb-1 text-[1.1rem] font-semibold text-[#1a202c]">Cycle Progress</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.08)] border border-[#F0F0F7]" style={{ borderCollapse: 'separate', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '40%' }} />
          </colgroup>
          <thead>
            <tr className="bg-[#494BCB] text-white">
              <th className="px-2 py-2 text-center font-semibold text-[0.8rem] rounded-tl-lg">Current Cycle</th>
              <th className="px-2 py-2 text-center font-semibold text-[0.8rem]">Start Date</th>
              <th className="px-2 py-2 text-center font-semibold text-[0.8rem]">End Date</th>
              <th className="px-2 py-2 text-center font-semibold text-[0.8rem]">Total Working Days</th>
              <th className="px-2 py-2 text-center font-semibold text-[0.8rem]">Working Days Elapsed</th>
              <th className="px-2 py-2 text-center font-semibold text-[0.8rem]">Working Days Remaining</th>
              <th className="px-2 py-2 text-center font-semibold text-[0.8rem] rounded-tr-lg">Overall Progress</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-2 text-center text-sm font-semibold text-[#1a202c] border-b border-[#F0F0F7]" title={`Cycles are 6 weeks (${CYCLE_LENGTH_DAYS} days) starting from ${formatDate(cycle1Start)}.`}>
                Cycle {cycleNumber}
              </td>
              <td className="px-3 py-2 text-center text-sm border-b border-[#F0F0F7] whitespace-nowrap">{formatDate(cycleStart)}</td>
              <td className="px-3 py-2 text-center text-sm border-b border-[#F0F0F7] whitespace-nowrap">{formatDate(cycleEnd)}</td>
              <td className="px-3 py-2 text-center text-sm font-semibold text-[#1a202c] border-b border-[#F0F0F7]" title="Mon–Fri only; weekends excluded">{totalDays}</td>
              <td className="px-3 py-2 text-center text-sm font-semibold text-[#1a202c] border-b border-[#F0F0F7]" title="Mon–Fri only">{daysElapsed}</td>
              <td className="px-3 py-2 text-center text-sm font-semibold text-[#1a202c] border-b border-[#F0F0F7]" title="Mon–Fri only">{daysRemaining}</td>
              <td className="px-3 py-[0.4rem] border-b border-[#F0F0F7]">
                <div className="flex h-[22px] rounded-full overflow-hidden border border-slate-200" title={`${pctRounded}% of cycle complete`}>
                  <div
                    style={{
                      width: `${pctRounded}%`,
                      background: '#059669',
                      height: '100%',
                      minWidth: pctRounded > 0 ? '2px' : '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {pctRounded >= 8 && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap' }}>{pctRounded}%</span>
                    )}
                  </div>
                  {pctRounded < 100 && (
                    <div style={{ flex: 1, background: '#f1f5f9', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {pctRounded < 8 && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>{pctRounded}%</span>
                      )}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <hr className="border-0 border-t-2 border-slate-200 mt-4 mb-4" />
    </div>
  );
}
