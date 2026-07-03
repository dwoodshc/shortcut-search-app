/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * ProgressBar.tsx — Shared chevron progress bar used by both SummaryTable
 * (Epic Progress column) and EpicCard (inline meta bar).
 */
import React from 'react';
import { Story } from '../types';
import { COMPLETE_STATE_NAMES } from '../utils';

const BACKLOG_STATES = ['backlog'];
const IN_PROGRESS_STATES = ['ready for development', 'in development', 'in review'];

const STATE_PILL_COLORS: Record<string, { bg: string; text: string }> = {
  'backlog':               { bg: '#d1d5db', text: '#374151' },
  'ready for development': { bg: '#a7f3d0', text: '#374151' },
  'in development':        { bg: '#6ee7b7', text: '#374151' },
  'in review':             { bg: '#4ade80', text: '#374151' },
  'complete':              { bg: '#16a34a', text: '#ffffff' },
};

function getGroup(name: string): 'backlog' | 'complete' | 'inprogress' | null {
  const n = (name || '').toLowerCase().trim();
  if (BACKLOG_STATES.includes(n)) return 'backlog';
  if (COMPLETE_STATE_NAMES.has(n)) return 'complete';
  if (IN_PROGRESS_STATES.includes(n)) return 'inprogress';
  return null;
}

export function getGroupCounts(
  stories: Story[],
  filteredStateIds: number[],
  stateNames: Record<number, string>,
): { backlogCount: number; inProgressCount: number; completeCount: number } {
  const stateCounts: Record<number, number> = {};
  stories.forEach(s => { stateCounts[s.workflow_state_id] = (stateCounts[s.workflow_state_id] || 0) + 1; });
  let backlogCount = 0, inProgressCount = 0, completeCount = 0;
  filteredStateIds.forEach(id => {
    const count = stateCounts[id] || 0;
    const group = getGroup(stateNames[id]);
    if (group === 'backlog') backlogCount += count;
    else if (group === 'inprogress') inProgressCount += count;
    else if (group === 'complete') completeCount += count;
  });
  return { backlogCount, inProgressCount, completeCount };
}

export interface ProgressBarProps {
  completePct: number;
  inProgressPct: number;
  backlogPct: number;
  total: number;
  completeCount: number;
  inProgressCount: number;
  backlogCount: number;
  noTooltip?: boolean;
  stateBreakdown?: Array<{ stateName: string; count: number }>;
}

export function ProgressBar({ completePct, inProgressPct, backlogPct, total, completeCount, inProgressCount, backlogCount, noTooltip, stateBreakdown }: ProgressBarProps): React.JSX.Element {
  return (
    <div className="summary-bar-wrapper">
      <div className="flex h-[22px] rounded-full overflow-hidden border border-slate-200">
        {total === 0 ? (
          <div className="w-full bg-slate-100 progress-bar-empty" />
        ) : (
          <>
            {completePct > 0 && <div style={{ ...(inProgressPct > 0 || backlogPct > 0 ? { width: `${completePct}%`, clipPath: 'polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)', marginRight: '-7px' } : { flex: 1 }), background: '#059669', height: '100%', minWidth: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 3 }}>{completePct >= 8 && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', paddingRight: inProgressPct > 0 || backlogPct > 0 ? '7px' : '0' }}>{Math.round(completePct)}%</span>}</div>}
            {inProgressPct > 0 && <div style={{ ...(backlogPct > 0 ? { width: `${inProgressPct}%`, clipPath: 'polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)', marginRight: '-7px' } : { flex: 1 }), background: '#fde68a', height: '100%', minWidth: '2px', position: 'relative', zIndex: 2 }} />}
            {backlogPct > 0 && <div className="progress-bar-backlog" style={{ flex: 1, background: '#f1f5f9', height: '100%', minWidth: '2px', position: 'relative', zIndex: 1 }} />}
          </>
        )}
      </div>
      {!noTooltip && <div className="summary-bar-tooltip">
        {stateBreakdown ? (
          stateBreakdown.map(({ stateName, count }) => {
            const color = STATE_PILL_COLORS[stateName.toLowerCase()]?.bg ?? '#cbd5e0';
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={stateName} className="flex items-center gap-2 py-[0.15rem]">
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, flexShrink: 0, border: '1px solid rgba(255,255,255,0.3)', display: 'inline-block' }} />
                <span className="flex-1">{stateName}</span>
                <span className="font-bold ml-3">{count} ({Math.round(pct)}%)</span>
              </div>
            );
          })
        ) : (
          <>
            {[
              { label: 'Complete', count: completeCount, pct: completePct, color: '#059669' },
              { label: 'In Progress', count: inProgressCount, pct: inProgressPct, color: '#fde68a' },
              { label: 'Backlog', count: backlogCount, pct: backlogPct, color: '#f1f5f9' },
            ].filter(({ count }) => count > 0).map(({ label, count, pct, color }) => (
              <div key={label} className="flex items-center gap-2 py-[0.15rem]">
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, flexShrink: 0, border: '1px solid rgba(255,255,255,0.3)', display: 'inline-block' }} />
                <span className="flex-1">{label}</span>
                <span className="font-bold ml-3">{count} ({Math.round(pct)}%)</span>
              </div>
            ))}
          </>
        )}
      </div>}
    </div>
  );
}
