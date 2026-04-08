/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * SummaryTable.tsx — Two cross-epic summary tables at the top of the dashboard.
 * Story Summary shows total story counts per workflow state; Epic Status shows a
 * chevron progress bar and state badge per epic. Both tables have sortable columns.
 */
import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Epic } from '../types';

const STATE_ORDER = ['Backlog', 'Ready for Development', 'In Development', 'In Review', 'Ready for Release', 'Complete'];
const BACKLOG_STATES = ['backlog'];
const COMPLETE_STATES = ['complete', 'ready for release'];
const IN_PROGRESS_STATES = ['ready for development', 'in development', 'in review'];

function getGroup(name: string): 'backlog' | 'complete' | 'inprogress' | null {
  const n = (name || '').toLowerCase().trim();
  if (BACKLOG_STATES.includes(n)) return 'backlog';
  if (COMPLETE_STATES.includes(n)) return 'complete';
  if (IN_PROGRESS_STATES.includes(n)) return 'inprogress';
  return null;
}

interface ProgressBarProps {
  completePct: number;
  inProgressPct: number;
  backlogPct: number;
  total: number;
  completeCount: number;
  inProgressCount: number;
  backlogCount: number;
}

function ProgressBar({ completePct, inProgressPct, backlogPct, total, completeCount, inProgressCount, backlogCount }: ProgressBarProps): React.JSX.Element {
  return (
    <div className="summary-bar-wrapper">
      <div style={{ display: 'flex', height: '22px', borderRadius: '999px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        {total === 0 ? (
          <div style={{ width: '100%', background: '#f1f5f9' }} />
        ) : (
          <>
            {completePct > 0 && <div style={{ ...(inProgressPct > 0 || backlogPct > 0 ? { width: `${completePct}%`, clipPath: 'polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)', marginRight: '-7px' } : { flex: 1 }), background: '#059669', height: '100%', minWidth: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 3 }}>{completePct >= 8 && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', paddingRight: inProgressPct > 0 || backlogPct > 0 ? '7px' : '0' }}>{Math.round(completePct)}%</span>}</div>}
            {inProgressPct > 0 && <div style={{ ...(backlogPct > 0 ? { width: `${inProgressPct}%`, clipPath: 'polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)', marginRight: '-7px' } : { flex: 1 }), background: '#fde68a', height: '100%', minWidth: '2px', position: 'relative', zIndex: 2 }} />}
            {backlogPct > 0 && <div style={{ flex: 1, background: '#f1f5f9', height: '100%', minWidth: '2px', position: 'relative', zIndex: 1 }} />}
          </>
        )}
      </div>
      <div className="summary-bar-tooltip">
        {[
          { label: 'Complete', count: completeCount, pct: completePct, color: '#059669' },
          { label: 'In Progress', count: inProgressCount, pct: inProgressPct, color: '#fde68a' },
          { label: 'Backlog', count: backlogCount, pct: backlogPct, color: '#f1f5f9' },
        ].filter(({ count }) => count > 0).map(({ label, count, pct, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, flexShrink: 0, border: '1px solid rgba(255,255,255,0.3)', display: 'inline-block' }} />
            <span style={{ flex: 1 }}>{label}</span>
            <span style={{ fontWeight: 700, marginLeft: '0.75rem' }}>{count} ({Math.round(pct)}%)</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: '0.4rem', paddingTop: '0.4rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
          <div><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Complete:</strong> Complete + Ready for Release</div>
          <div><strong style={{ color: 'rgba(255,255,255,0.85)' }}>In Progress:</strong> Ready for Dev + In Dev + In Review</div>
          <div><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Backlog:</strong> Backlog</div>
        </div>
      </div>
    </div>
  );
}

function StoryTotalsSummary(): React.JSX.Element | null {
  const { allDisplayStories, workflowConfig, setModal, resetSortState } = useDashboard();

  if (allDisplayStories.length === 0) return null;

  const stateCounts: Record<string, number> = {};
  STATE_ORDER.forEach(s => { stateCounts[s] = 0; });
  allDisplayStories.forEach(story => {
    const name = workflowConfig.states[story.workflow_state_id];
    if (name && stateCounts[name] !== undefined) stateCounts[name]++;
  });

  const total = allDisplayStories.length;
  const completeCount = (stateCounts['Complete'] || 0) + (stateCounts['Ready for Release'] || 0);
  const inProgressCount = (stateCounts['Ready for Development'] || 0) + (stateCounts['In Development'] || 0) + (stateCounts['In Review'] || 0);
  const backlogCount = stateCounts['Backlog'] || 0;
  const completePct = total > 0 ? (completeCount / total) * 100 : 0;
  const inProgressPct = total > 0 ? (inProgressCount / total) * 100 : 0;
  const backlogPct = total > 0 ? (backlogCount / total) * 100 : 0;

  const tblStyle: React.CSSProperties = { width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', border: '1px solid #F0F0F7' };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', fontWeight: 600, color: '#1a202c' }}>Story Summary</h2>
      <table style={tblStyle}>
        <thead>
          <tr style={{ background: '#494BCB', color: 'white' }}>
            {STATE_ORDER.map((s, i) => (
              <th key={s} style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', borderRadius: i === 0 ? '8px 0 0 0' : undefined }}>
                {s.replace('Ready for Development', 'Ready for Dev')}
              </th>
            ))}
            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Total</th>
            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.8rem', borderRadius: '0 8px 0 0', minWidth: '160px' }}>Overall Progress</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {STATE_ORDER.map(s => {
              const clickable = s !== 'Complete' && stateCounts[s] > 0;
              return (
                <td
                  key={s}
                  onClick={clickable ? () => { setModal('storyDetailFilter', s); resetSortState('storyDetail'); } : undefined}
                  style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontSize: '0.875rem', borderBottom: '1px solid #F0F0F7', fontWeight: stateCounts[s] > 0 ? 600 : 400, color: clickable ? '#494BCB' : stateCounts[s] > 0 ? '#1a202c' : '#a0aec0', cursor: clickable ? 'pointer' : 'default', textDecoration: clickable ? 'underline' : 'none' }}
                >
                  {stateCounts[s]}
                </td>
              );
            })}
            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: 700, borderBottom: '1px solid #F0F0F7' }}>{total}</td>
            <td style={{ padding: '0.4rem 0.75rem', borderBottom: '1px solid #F0F0F7' }}>
              <ProgressBar
                completePct={completePct}
                inProgressPct={inProgressPct}
                backlogPct={backlogPct}
                total={total}
                completeCount={completeCount}
                inProgressCount={inProgressCount}
                backlogCount={backlogCount}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const resetIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px', verticalAlign: 'middle', display: 'inline-block' }}>
    <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.95-2.05L6.64 18.36A8.955 8.955 0 0 0 13 21a9 9 0 0 0 0-18z"/>
  </svg>
);

function EpicStatusTable(): React.JSX.Element | null {
  const { epics, workflowConfig, summaryStateIds, getDisplayStories, getEpicStateInfo, getEpicStateClass, sortState, toggleSortState, resetSortState } = useDashboard();

  const foundEpics = epics.filter(e => !e.notFound);
  if (foundEpics.length === 0 || summaryStateIds.length === 0) return null;

  const getCompletePct = (epic: Epic): number => {
    const stateCounts: Record<number, number> = {};
    summaryStateIds.forEach(id => { stateCounts[id] = 0; });
    getDisplayStories(epic).forEach(story => {
      if (stateCounts[story.workflow_state_id] !== undefined) stateCounts[story.workflow_state_id]++;
    });
    const total = Object.values(stateCounts).reduce((a, b) => a + b, 0);
    let completeCount = 0;
    summaryStateIds.forEach(id => {
      if (getGroup(workflowConfig.states[id]) === 'complete') completeCount += stateCounts[id];
    });
    return total > 0 ? (completeCount / total) * 100 : 0;
  };

  const sortedEpics = [...foundEpics].sort((a, b) => {
    if (!sortState.summary.col) return 0;
    const dir = sortState.summary.dir === 'asc' ? 1 : -1;
    if (sortState.summary.col === 'name') return dir * a.name.localeCompare(b.name);
    if (sortState.summary.col === 'status') return dir * getEpicStateInfo(a).name.localeCompare(getEpicStateInfo(b).name);
    if (sortState.summary.col === 'progress') return dir * (getCompletePct(a) - getCompletePct(b));
    return 0;
  });

  const sortIcon = (col: string, isNumeric = false) => {
    const unsorted = 'Click to sort';
    const ascLabel = isNumeric ? 'Sorted low→high, click to reverse' : 'Sorted A→Z, click to reverse';
    const descLabel = isNumeric ? 'Sorted high→low, click to reverse' : 'Sorted Z→A, click to reverse';
    const label = sortState.summary.col !== col ? unsorted : sortState.summary.dir === 'asc' ? ascLabel : descLabel;
    const icon = sortState.summary.col !== col ? ' ↕' : sortState.summary.dir === 'asc' ? ' ↑' : ' ↓';
    return <span className="summary-sort-icon" data-tooltip={label}>{icon}</span>;
  };

  const renderRow = (epic: Epic, idx: number) => {
    const stateCounts: Record<number, number> = {};
    const epicDisplayStories = getDisplayStories(epic);
    epicDisplayStories.forEach(story => {
      stateCounts[story.workflow_state_id] = (stateCounts[story.workflow_state_id] || 0) + 1;
    });
    const total = epicDisplayStories.length;
    let backlogCount = 0, inProgressCount = 0, completeCount = 0;
    summaryStateIds.forEach(stateId => {
      const group = getGroup(workflowConfig.states[stateId]);
      const count = stateCounts[stateId] || 0;
      if (group === 'backlog') backlogCount += count;
      else if (group === 'inprogress') inProgressCount += count;
      else if (group === 'complete') completeCount += count;
    });
    const backlogPct = total > 0 ? (backlogCount / total) * 100 : 0;
    const inProgressPct = total > 0 ? (inProgressCount / total) * 100 : 0;
    const completePct = total > 0 ? (completeCount / total) * 100 : 0;
    const si = getEpicStateInfo(epic);
    return (
      <tr key={epic.id as React.Key} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', borderBottom: '1px solid #F0F0F7' }}>
          <a href={`#epic-${epic.id}`} style={{ color: '#494BCB', textDecoration: 'none' }}>
            {epic.name}
          </a>
        </td>
        <td style={{ padding: '0.4rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid #F0F0F7' }}>
          {si.name ? (
            <span className={`epic-state ${getEpicStateClass(si.type, si.name)}`} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
              {si.type.toLowerCase() === 'done' ? 'Done ✓' : si.name}
            </span>
          ) : null}
        </td>
        <td style={{ padding: '0.4rem 0.75rem', width: '100%', borderBottom: '1px solid #F0F0F7' }}>
          <ProgressBar
            completePct={completePct}
            inProgressPct={inProgressPct}
            backlogPct={backlogPct}
            total={total}
            completeCount={completeCount}
            inProgressCount={inProgressCount}
            backlogCount={backlogCount}
          />
        </td>
      </tr>
    );
  };

  const half = Math.ceil(sortedEpics.length / 2);
  const leftEpics = sortedEpics.slice(0, half);
  const rightEpics = sortedEpics.slice(half);

  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', border: '1px solid #F0F0F7' };
  const thStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none' };
  const theadRow = (
    <tr style={{ background: '#494BCB', color: 'white' }}>
      <th style={{ ...thStyle, padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', borderRadius: '8px 0 0 0' }}>
        <span onClick={() => toggleSortState('summary', 'name')} style={{ cursor: 'pointer', userSelect: 'none' }}>Epic Name{sortIcon('name')}</span>
        <span className="summary-sort-icon" data-tooltip="Restore original order" onClick={(e) => { e.stopPropagation(); resetSortState('summary'); }} style={{ marginLeft: '6px', cursor: 'pointer', opacity: sortState.summary.col ? 1 : 0.4 }}>
          {resetIcon}
        </span>
      </th>
      <th onClick={() => toggleSortState('summary', 'status')} style={{ ...thStyle, padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>Epic Status{sortIcon('status')}</th>
      <th onClick={() => toggleSortState('summary', 'progress')} style={{ ...thStyle, padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', borderRadius: '0 8px 0 0' }}>Epic Progress{sortIcon('progress', true)}</th>
    </tr>
  );

  return (
    <div id="summary-table" style={{ marginBottom: '1rem' }}>
      <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', fontWeight: 600, color: '#1a202c' }}>Epic Status</h2>
      <div className="summary-table-grid">
        <div style={{ flex: 1 }}>
          <table style={tableStyle}>
            <thead>{theadRow}</thead>
            <tbody>{leftEpics.map((epic, idx) => renderRow(epic, idx))}</tbody>
          </table>
        </div>
        <div style={{ flex: 1 }}>
          <table style={tableStyle}>
            <thead>{theadRow}</thead>
            <tbody>{rightEpics.map((epic, idx) => renderRow(epic, idx))}</tbody>
          </table>
        </div>
      </div>
      <hr style={{ border: 'none', borderTop: '2px solid #e2e8f0', marginTop: '1rem' }} />
    </div>
  );
}

export default function SummaryTable(): React.JSX.Element {
  return (
    <>
      <StoryTotalsSummary />
      <EpicStatusTable />
    </>
  );
}
