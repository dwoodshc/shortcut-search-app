/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * SummaryTable.tsx — Two cross-epic summary tables at the top of the dashboard.
 * Story Summary shows total story counts per workflow state; Epic Status shows a
 * chevron progress bar and state badge per epic. Both tables have sortable columns.
 */
import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Epic, Story } from '../types';
import { ResetIcon } from './icons';
import { COMPLETE_STATE_NAMES } from '../utils';

const STATE_ORDER = ['Backlog', 'Ready for Development', 'In Development', 'In Review', 'Ready for Release', 'Complete'];
const BACKLOG_STATES = ['backlog'];
const IN_PROGRESS_STATES = ['ready for development', 'in development', 'in review'];

const STATE_PILL_COLORS: Record<string, { bg: string; text: string }> = {
  'backlog':               { bg: '#d1d5db', text: '#374151' },
  'ready for development': { bg: '#a7f3d0', text: '#374151' },
  'in development':        { bg: '#6ee7b7', text: '#374151' },
  'in review':             { bg: '#4ade80', text: '#374151' },
  'ready for release':     { bg: '#22c55e', text: '#374151' },
  'complete':              { bg: '#16a34a', text: '#ffffff' },
};
const DEFAULT_PILL = { bg: '#F1F5F9', text: '#475569' };

const TYPE_COLORS: Record<string, string> = {
  epic:    '#7c3aed',
  bug:     '#dc2626',
  chore:   '#64748b',
  feature: '#1d4ed8',
};

function getGroup(name: string): 'backlog' | 'complete' | 'inprogress' | null {
  const n = (name || '').toLowerCase().trim();
  if (BACKLOG_STATES.includes(n)) return 'backlog';
  if (COMPLETE_STATE_NAMES.has(n)) return 'complete';
  if (IN_PROGRESS_STATES.includes(n)) return 'inprogress';
  return null;
}

function getGroupCounts(
  stories: Story[],
  filteredStateIds: number[],
  stateNames: Record<number, string>,
): { backlogCount: number; inProgressCount: number; completeCount: number } {
  const stateCounts: Record<number, number> = {};
  stories.forEach(s => { stateCounts[s.workflow_state_id] = (stateCounts[s.workflow_state_id] || 0) + 1; });
  let backlogCount = 0, inProgressCount = 0, completeCount = 0;
  filteredStateIds.forEach(id => {
    const group = getGroup(stateNames[id]);
    const count = stateCounts[id] || 0;
    if (group === 'backlog') backlogCount += count;
    else if (group === 'inprogress') inProgressCount += count;
    else if (group === 'complete') completeCount += count;
  });
  return { backlogCount, inProgressCount, completeCount };
}

function applyTeamFilter(stories: Story[], filterByTeam: boolean, selectedTeamIds: string[]): Story[] {
  if (!filterByTeam) return stories;
  return stories.filter(s => !s.group_id || selectedTeamIds.includes(s.group_id));
}

interface ProgressBarProps {
  completePct: number;
  inProgressPct: number;
  backlogPct: number;
  total: number;
  completeCount: number;
  inProgressCount: number;
  backlogCount: number;
  noTooltip?: boolean;
}

function ProgressBar({ completePct, inProgressPct, backlogPct, total, completeCount, inProgressCount, backlogCount, noTooltip }: ProgressBarProps): React.JSX.Element {
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
        <div className="border-t border-white/15 mt-[0.4rem] pt-[0.4rem] text-[0.68rem] text-white/60 leading-[1.4]">
          <div><strong className="text-white/85">Complete:</strong> Complete + Ready for Release</div>
          <div><strong className="text-white/85">In Progress:</strong> Ready for Dev + In Dev + In Review</div>
          <div><strong className="text-white/85">Backlog:</strong> Backlog</div>
        </div>
      </div>}
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

  return (
    <div className="mb-6">
      <h2 className="m-0 mb-3 text-[1.1rem] font-semibold text-[#1a202c]">Story Summary</h2>
      <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.08)] border border-[#F0F0F7]" style={{ borderCollapse: 'separate' }}>
        <thead>
          <tr className="bg-[#494BCB] text-white">
            {STATE_ORDER.map((s, i) => (
              <th key={s} className={`px-2 py-2 text-center font-semibold text-[0.8rem]${i === 0 ? ' rounded-tl-lg' : ''}`}>
                {s.replace('Ready for Development', 'Ready for Dev')}
              </th>
            ))}
            <th className="px-2 py-2 text-center font-semibold text-[0.8rem]">Total</th>
            <th className="px-2 py-2 text-center font-semibold text-[0.8rem] rounded-tr-lg min-w-[100px]">Overall Progress</th>
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
                  className={`px-3 py-2 text-center text-sm border-b border-[#F0F0F7] ${stateCounts[s] > 0 ? 'font-semibold' : 'font-normal'} ${clickable ? 'text-[#494BCB] cursor-pointer underline' : stateCounts[s] > 0 ? 'text-[#1a202c] cursor-default no-underline' : 'text-[#a0aec0] cursor-default no-underline'}`}
                >
                  {stateCounts[s]}
                </td>
              );
            })}
            <td className="px-3 py-2 text-center text-sm font-bold border-b border-[#F0F0F7]">{total}</td>
            <td className="px-3 py-[0.4rem] border-b border-[#F0F0F7]">
              <ProgressBar
                completePct={completePct}
                inProgressPct={inProgressPct}
                backlogPct={backlogPct}
                total={total}
                completeCount={completeCount}
                inProgressCount={inProgressCount}
                backlogCount={backlogCount}
                noTooltip
              />
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );
}


function daysAgo(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const then = new Date(dateStr);
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thenDay = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  return Math.round((nowDay.getTime() - thenDay.getTime()) / 86_400_000);
}

function formatDaysAgo(days: number | null): string {
  if (days === null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

function getEpicLastChanged(stories: Story[]): number | null {
  const candidates: (string | undefined)[] = stories.map(s => s.updated_at);
  let mostRecentDaysAgo: number | null = null;
  for (const d of candidates) {
    if (!d) continue;
    const days = daysAgo(d);
    if (days !== null && (mostRecentDaysAgo === null || days < mostRecentDaysAgo)) mostRecentDaysAgo = days;
  }
  return mostRecentDaysAgo;
}

function EpicStatusTable(): React.JSX.Element | null {
  const { epics, workflowConfig, filteredStateIds, getDisplayStories, getEpicStateInfo, getEpicStateClass, sortState, toggleSortState, resetSortState, teamNameMap, filterByTeam, selectedTeamIds } = useDashboard();
  const [openPopover, setOpenPopover] = useState<number | string | null>(null);
  useEffect(() => {
    if (!openPopover) return;
    const close = () => setOpenPopover(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openPopover]);

  const foundEpics = epics.filter(e => !e.notFound);
  if (foundEpics.length === 0 || filteredStateIds.length === 0) return null;

  const getCompletePct = (epic: Epic): number => {
    const stories = getDisplayStories(epic);
    const { completeCount } = getGroupCounts(stories, filteredStateIds, workflowConfig.states);
    return stories.length > 0 ? (completeCount / stories.length) * 100 : 0;
  };

  const sortedEpics = [...foundEpics].sort((a, b) => {
    if (!sortState.summary.col) return 0;
    const dir = sortState.summary.dir === 'asc' ? 1 : -1;
    if (sortState.summary.col === 'name') return dir * a.name.localeCompare(b.name);
    if (sortState.summary.col === 'status') return dir * getEpicStateInfo(a).name.localeCompare(getEpicStateInfo(b).name);
    if (sortState.summary.col === 'progress') return dir * (getCompletePct(a) - getCompletePct(b));
    if (sortState.summary.col === 'lastchanged') {
      const da = getEpicLastChanged(applyTeamFilter(a.stories || [], filterByTeam, selectedTeamIds)) ?? Infinity;
      const db = getEpicLastChanged(applyTeamFilter(b.stories || [], filterByTeam, selectedTeamIds)) ?? Infinity;
      return dir * (da - db);
    }
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

  const renderRow = (epic: Epic) => {
    const epicDisplayStories = getDisplayStories(epic);
    const { backlogCount, inProgressCount, completeCount } = getGroupCounts(epicDisplayStories, filteredStateIds, workflowConfig.states);
    const total = epicDisplayStories.length;
    const backlogPct = total > 0 ? (backlogCount / total) * 100 : 0;
    const inProgressPct = total > 0 ? (inProgressCount / total) * 100 : 0;
    const completePct = total > 0 ? (completeCount / total) * 100 : 0;
    const si = getEpicStateInfo(epic);
    const teamFilteredStories = applyTeamFilter(epic.stories || [], filterByTeam, selectedTeamIds);
    const lastChanged = getEpicLastChanged(teamFilteredStories);
    const recentItems = teamFilteredStories
      .filter(s => s.updated_at)
      .map(s => ({
        id: s.id,
        name: s.name,
        type: s.story_type,
        updated_at: s.updated_at!,
        app_url: s.app_url,
        stateName: workflowConfig.states[s.workflow_state_id] || '',
        teamName: (s.group_id ? teamNameMap[s.group_id] : '') || '',
      }))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
    return (
      <tr key={epic.id as React.Key}>
        <td className="px-3 py-2 text-sm sm:whitespace-nowrap border-b border-[#F0F0F7]">
          <a href={`#epic-${epic.id}`} className="text-[#1a202c] no-underline">
            {epic.name}
          </a>
        </td>
        <td className="px-3 py-[0.4rem] text-center border-b border-[#F0F0F7]">
          {si.name ? (
            <span className={`epic-state ${getEpicStateClass(si.type, si.name)} !text-[0.75rem] !py-[0.15rem] !px-2`}>
              {si.type.toLowerCase() === 'done' ? 'Done ✓' : si.name}
            </span>
          ) : null}
        </td>
        <td className="px-3 py-2 text-center text-sm border-b border-[#F0F0F7] whitespace-nowrap relative">
          <button
            onClick={(e) => { e.stopPropagation(); setOpenPopover(openPopover === epic.id ? null : epic.id); }}
            className={`underline decoration-dotted cursor-pointer bg-transparent border-0 p-0 font-inherit text-sm ${lastChanged === 0 ? 'text-[#16a34a] font-semibold' : lastChanged !== null && lastChanged <= 3 ? 'text-[#0369a1]' : 'text-[#64748b]'}`}
          >
            {formatDaysAgo(lastChanged)}
          </button>
          {openPopover === epic.id && recentItems.length > 0 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute z-50 bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.15)] border border-[#E2E8F0] p-3 text-left"
              style={{ top: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)', minWidth: '560px' }}
            >
              <div className="text-xs font-semibold text-[#64748b] mb-2 uppercase tracking-wide">Recent Changes</div>
              <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <tbody>
                  {recentItems.map((item) => {
                    const sc = STATE_PILL_COLORS[item.stateName.toLowerCase()] ?? DEFAULT_PILL;
                    return (
                      <tr key={`${item.type}-${item.id}`} className="border-b border-[#F0F0F7] last:border-0">
                        <td className="py-[0.3rem] pr-2 align-middle" style={{ width: '1%', whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <span className="text-[0.65rem] font-semibold px-1.5 py-[0.1rem] rounded-full text-white" style={{ backgroundColor: TYPE_COLORS[item.type] ?? TYPE_COLORS.feature }}>
                            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                          </span>
                        </td>
                        <td className="py-[0.3rem] pr-2 align-middle" style={{ width: '99%' }}>
                          {item.app_url ? (
                            <a href={item.app_url} target="_blank" rel="noopener noreferrer" className="text-[#494BCB] text-xs hover:underline">{item.name}</a>
                          ) : (
                            <span className="text-xs text-[#1a202c]">{item.name}</span>
                          )}
                        </td>
                        <td className="py-[0.3rem] pr-2 align-middle" style={{ width: '1%', whiteSpace: 'nowrap', textAlign: 'center' }}>
                          {item.teamName && (
                            <span className="text-[0.65rem] font-medium px-1.5 py-[0.1rem] rounded bg-[#EEF2FF] text-[#4338CA]">{item.teamName}</span>
                          )}
                        </td>
                        <td className="py-[0.3rem] pr-2 align-middle" style={{ width: '1%', whiteSpace: 'nowrap', textAlign: 'center' }}>
                          {item.stateName && (
                            <span className="text-[0.65rem] font-medium px-1.5 py-[0.1rem] rounded" style={{ backgroundColor: sc.bg, color: sc.text }}>{item.stateName}</span>
                          )}
                        </td>
                        <td className="py-[0.3rem] align-middle" style={{ width: '1%', whiteSpace: 'nowrap', textAlign: 'right' }}>
                          <span className="text-[0.65rem] text-[#94a3b8]">{formatDaysAgo(daysAgo(item.updated_at))}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </td>
        <td className="px-3 py-[0.4rem] w-full border-b border-[#F0F0F7]">
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

  const tableClass = "w-full bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.08)] border border-[#F0F0F7]";
  const theadRow = (
    <tr className="bg-[#494BCB] text-white">
      <th className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-sm rounded-tl-lg w-[35%]">
        <span onClick={() => toggleSortState('summary', 'name')} className="cursor-pointer select-none">Epic Name{sortIcon('name')}</span>
        <span className="summary-sort-icon ml-[6px] cursor-pointer" data-tooltip="Restore original order" onClick={(e) => { e.stopPropagation(); resetSortState('summary'); }} style={{ opacity: sortState.summary.col ? 1 : 0.4 }}>
          {ResetIcon}
        </span>
      </th>
      <th onClick={() => toggleSortState('summary', 'status')} className="cursor-pointer select-none px-3 py-2 text-center font-semibold text-sm w-[20%] whitespace-nowrap">Epic Status{sortIcon('status')}</th>
      <th onClick={() => toggleSortState('summary', 'lastchanged')} className="cursor-pointer select-none px-3 py-2 text-center font-semibold text-sm whitespace-nowrap w-[15%]">Last Changed{sortIcon('lastchanged')}</th>
      <th onClick={() => toggleSortState('summary', 'progress')} className="cursor-pointer select-none px-3 py-2 text-center font-semibold text-sm rounded-tr-lg w-[33%]">Epic Progress{sortIcon('progress', true)}</th>
    </tr>
  );

  return (
    <div id="summary-table" className="mb-4">
      <h2 className="m-0 mb-3 text-[1.1rem] font-semibold text-[#1a202c]">Epic Status</h2>
      <div className="summary-table-grid">
        <div className="flex-1">
          <table className={tableClass} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>{theadRow}</thead>
            <tbody>{leftEpics.map((epic) => renderRow(epic))}</tbody>
          </table>
        </div>
        <div className="flex-1">
          <table className={tableClass} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>{theadRow}</thead>
            <tbody>{rightEpics.map((epic) => renderRow(epic))}</tbody>
          </table>
        </div>
      </div>
      <hr className="border-0 border-t-2 border-slate-200 mt-4" />
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
