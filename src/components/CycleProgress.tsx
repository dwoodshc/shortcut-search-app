/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * CycleProgress.tsx — Displays the current 6-week cycle and progress through it.
 * Cycle 1 starts on the date configured in the Setup Wizard (defaults to the
 * first weekday of the current year); each cycle is 42 calendar days long. The
 * table shows cycle number, start/end dates, days elapsed/remaining, and a
 * percentage progress bar.
 */
import React, { useMemo } from 'react';
import { getCurrentCycleWindow, getCycle1StartDate, storage } from '../utils';
import PercentBar from './PercentBar';

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
  // All cycle math is pure, deterministic for the current day, and depends only
  // on localStorage. Compute once per mount; storage changes happen only via the
  // Setup Wizard which forces a full reload.
  const { cycle1Start, cycleNumber, cycleStart, cycleEnd, totalDays, daysElapsed, daysRemaining, pctRounded, cycleLengthWeeks } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const c1 = getCycle1StartDate();
    const weeks = storage.getCycleWeeks();
    const { start, end, number } = getCurrentCycleWindow(today);
    // Weekday-only counts (Mon–Fri); excludes Saturdays and Sundays.
    const total = countWeekdays(start, end);
    const elapsedTo = today.getTime() > end.getTime() ? end : today;
    const elapsed = today.getTime() < start.getTime() ? 0 : countWeekdays(start, elapsedTo);
    const remaining = Math.max(0, total - elapsed);
    const pct = total === 0 ? 0 : Math.min(100, Math.max(0, (elapsed / total) * 100));
    return {
      cycle1Start: c1,
      cycleNumber: number,
      cycleStart: start,
      cycleEnd: end,
      totalDays: total,
      daysElapsed: elapsed,
      daysRemaining: remaining,
      pctRounded: Math.round(pct),
      cycleLengthWeeks: weeks[number - 1] ?? 6,
    };
  }, []);

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
              <td className="px-3 py-2 text-center text-sm font-semibold text-[#1a202c] border-b border-[#F0F0F7]" title={`Cycle ${cycleNumber} is ${cycleLengthWeeks} weeks (${cycleLengthWeeks * 7} days) starting from ${formatDate(cycle1Start)}.`}>
                Cycle {cycleNumber}
              </td>
              <td className="px-3 py-2 text-center text-sm border-b border-[#F0F0F7] whitespace-nowrap">{formatDate(cycleStart)}</td>
              <td className="px-3 py-2 text-center text-sm border-b border-[#F0F0F7] whitespace-nowrap">{formatDate(cycleEnd)}</td>
              <td className="px-3 py-2 text-center text-sm font-semibold text-[#1a202c] border-b border-[#F0F0F7]" title="Mon–Fri only; weekends excluded">{totalDays}</td>
              <td className="px-3 py-2 text-center text-sm font-semibold text-[#1a202c] border-b border-[#F0F0F7]" title="Mon–Fri only">{daysElapsed}</td>
              <td className="px-3 py-2 text-center text-sm font-semibold text-[#1a202c] border-b border-[#F0F0F7]" title="Mon–Fri only">{daysRemaining}</td>
              <td className="px-3 py-[0.4rem] border-b border-[#F0F0F7]">
                <PercentBar pct={pctRounded} fillColor="#059669" showLabel title={`${pctRounded}% of cycle complete`} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <hr className="border-0 border-t-2 border-slate-200 mt-4 mb-4" />
    </div>
  );
}
