/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * SummaryTable.tsx — Two cross-epic summary tables at the top of the dashboard.
 * Story Summary shows total story counts per workflow state; Epic Status shows a
 * chevron progress bar and state badge per epic. Both tables have sortable columns.
 */
import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Epic, Story, ViewSettings } from '../types';
import { ResetIcon, TargetActiveIcon, CheckCircleIcon, BlockedIcon, ExpandAllIcon, CollapseAllIcon } from './icons';
import { daysAgo, formatDaysAgo, STATE_PILL_COLORS, DEFAULT_PILL, storage } from '../utils';
import SortIcon from './SortIcon';
import PeekButton from './PeekButton';
import CycleProgress from './CycleProgress';
import { ProgressBar, getGroupCounts } from './ProgressBar';

const STATE_ORDER = ['Backlog', 'Ready for Development', 'In Development', 'In Review', 'Complete'];



function applyTeamFilter(stories: Story[], filterByTeam: boolean, selectedTeamIds: string[]): Story[] {
  if (!filterByTeam) return stories;
  return stories.filter(s => !s.group_id || selectedTeamIds.includes(s.group_id));
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
  const completeCount = stateCounts['Complete'] || 0;
  const inProgressCount = (stateCounts['Ready for Development'] || 0) + (stateCounts['In Development'] || 0) + (stateCounts['In Review'] || 0);
  const backlogCount = stateCounts['Backlog'] || 0;
  const completePct = total > 0 ? (completeCount / total) * 100 : 0;
  const inProgressPct = total > 0 ? (inProgressCount / total) * 100 : 0;
  const backlogPct = total > 0 ? (backlogCount / total) * 100 : 0;

  return (
    <div className="mb-1">
      <h2 className="m-0 mb-1 text-[1.1rem] font-semibold text-[#1a202c]">Story Summary</h2>
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
            {STATE_ORDER.map((s, i) => (
              <th key={s} className={`px-2 py-2 text-center font-semibold text-[0.8rem]${i === 0 ? ' rounded-tl-lg' : ''}`}>
                {s.replace('Ready for Development', 'Ready for Dev')}
              </th>
            ))}
            <th className="px-2 py-2 text-center font-semibold text-[0.8rem]">Total</th>
            <th className="px-2 py-2 text-center font-semibold text-[0.8rem] rounded-tr-lg">Overall Progress</th>
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
      <hr className="border-0 border-t-2 border-slate-200 mt-4 mb-4" />
    </div>
  );
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
  const { epics, objectives, members, workflowConfig, filteredStateIds, filteredEpicNames, getDisplayStories, getEpicStateInfo, getEpicStateClass, sortState, toggleSortState, resetSortState, filterByTeam, selectedTeamIds, viewSettings, setViewSettings, epicSearchQuery, setEpicSearchQuery, deselectedObjectiveIds, setDeselectedObjectiveIds, visibleEpicIds, collapsedGroups, setCollapsedGroups } = useDashboard();
  const updateViewSetting = (key: keyof ViewSettings, value: boolean) =>
    setViewSettings({ ...viewSettings, [key]: value });
  const [openPopover, setOpenPopover] = useState<number | string | null>(null);
  const [objectiveSearchQuery, setObjectiveSearchQuery] = useState('');

  const toggleGroupCollapse = (groupTitle: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupTitle)) next.delete(groupTitle);
      else next.add(groupTitle);
      return next;
    });
  };
  useEffect(() => {
    if (!openPopover) return;
    const close = () => setOpenPopover(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openPopover]);

  const foundEpics = epics.filter(e => !e.notFound);
  if (foundEpics.length === 0 || filteredStateIds.length === 0) return null;

  // Objectives present in the loaded epics, sorted by name
  const epicObjectiveIdSet = new Set(foundEpics.flatMap(e => e.objective_ids || []));
  const relevantObjectives = objectives
    .filter(o => !o.archived && epicObjectiveIdSet.has(o.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const hasUnObjectived = foundEpics.some(e => !e.objective_ids || e.objective_ids.length === 0);
  const showObjectiveFilter = relevantObjectives.length > 0;

  const toggleObjective = (id: number | -1) => {
    setDeselectedObjectiveIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const epicConfig = storage.getEpicsConfig();
  const epicGroups = new Map<string | undefined, Epic[]>();
  for (const epic of foundEpics) {
    const group = epicConfig?.epics.find(e => e.name === epic.name)?.group;
    if (!epicGroups.has(group)) epicGroups.set(group, []);
    epicGroups.get(group)!.push(epic);
  }

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

  const renderRow = (epic: Epic) => {
    const epicDisplayStories = getDisplayStories(epic);
    const { backlogCount, inProgressCount, completeCount } = getGroupCounts(epicDisplayStories, filteredStateIds, workflowConfig.states);
    const total = epicDisplayStories.length;
    const backlogPct = total > 0 ? (backlogCount / total) * 100 : 0;
    const inProgressPct = total > 0 ? (inProgressCount / total) * 100 : 0;
    const completePct = total > 0 ? (completeCount / total) * 100 : 0;
    const epicStateCounts: Record<number, number> = {};
    epicDisplayStories.forEach(s => { epicStateCounts[s.workflow_state_id] = (epicStateCounts[s.workflow_state_id] || 0) + 1; });
    const stateBreakdown = filteredStateIds
      .map(id => ({ stateName: workflowConfig.states[id] || String(id), count: epicStateCounts[id] || 0 }))
      .filter(s => s.count > 0);
    const hasBlockedTickets = epicDisplayStories.some(s => s.blocked);
    const si = getEpicStateInfo(epic);
    const teamFilteredStories = applyTeamFilter(epic.stories || [], filterByTeam, selectedTeamIds);
    const lastChanged = getEpicLastChanged(teamFilteredStories);
    const recentItems = teamFilteredStories
      .filter(s => s.updated_at)
      .map(s => ({
        id: s.id,
        name: s.name,
        updated_at: s.updated_at!,
        app_url: s.app_url,
        stateName: workflowConfig.states[s.workflow_state_id] || '',
        ownerNames: (s.owner_ids || []).map(id => members[id] || id),
      }))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5);
    return (
      <tr key={epic.id as React.Key}>
        <td className="px-3 py-2 text-sm sm:whitespace-nowrap border-b border-[#F0F0F7] relative">
          {hasBlockedTickets ? (
            <span className="has-tooltip" data-tooltip="This Epic has Blocked Tickets">
              <a href={`#epic-${epic.id}`} className="no-underline text-white font-semibold px-2 py-[0.15rem] rounded-full" style={{ backgroundColor: '#dc2626' }}>
                {epic.name}
              </a>
            </span>
          ) : (
            <a href={`#epic-${epic.id}`} className="text-[#1a202c] no-underline">
              {epic.name}
            </a>
          )}
        </td>
        <td className="px-3 py-[0.4rem] text-center border-b border-[#F0F0F7] whitespace-nowrap">
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
              style={{ top: 'calc(100% + 4px)', left: '5px', minWidth: '560px' }}
            >
              <div className="text-xs font-semibold text-[#64748b] mb-2 uppercase tracking-wide">Recent Changes</div>
              <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="pb-1 pr-2 text-[0.6rem] font-semibold text-[#94a3b8] uppercase tracking-wide text-left">Ticket</th>
                    <th className="pb-1 pr-2 text-[0.6rem] font-semibold text-[#94a3b8] uppercase tracking-wide text-center" style={{ whiteSpace: 'nowrap' }}>Owner</th>
                    <th className="pb-1 pr-2 text-[0.6rem] font-semibold text-[#94a3b8] uppercase tracking-wide text-center" style={{ whiteSpace: 'nowrap' }}>Status</th>
                    <th className="pb-1 text-[0.6rem] font-semibold text-[#94a3b8] uppercase tracking-wide text-right" style={{ whiteSpace: 'nowrap' }}>Changed</th>
                  </tr>
                </thead>
                <tbody>
                  {recentItems.map((item) => {
                    const sc = STATE_PILL_COLORS[item.stateName.toLowerCase()] ?? DEFAULT_PILL;
                    return (
                      <tr key={item.id} className="border-b border-[#F0F0F7] last:border-0">
                        <td className="py-[0.3rem] pr-2 align-middle" style={{ width: '99%' }}>
                          {item.app_url ? (
                            <a href={item.app_url} target="_blank" rel="noopener noreferrer" className="text-[#494BCB] text-xs hover:underline">{item.name}</a>
                          ) : (
                            <span className="text-xs text-[#1a202c]">{item.name}</span>
                          )}
                        </td>
                        <td className="py-[0.3rem] pr-2 align-middle" style={{ width: '1%', whiteSpace: 'nowrap', textAlign: 'center' }}>
                          {item.ownerNames.length > 0
                            ? <span className="text-[0.65rem] text-[#475569]">{item.ownerNames.join(', ')}</span>
                            : <span className="text-[0.65rem] text-[#cbd5e0] italic">Unassigned</span>}
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
            stateBreakdown={stateBreakdown}
          />
        </td>
      </tr>
    );
  };

  const visibleEpics = sortedEpics.filter(e => visibleEpicIds.has(e.id));

  const splitGroupsAcrossColumns = (epics: Epic[]) => {
    const groups: Array<{ groupTitle: string | undefined; epics: Epic[] }> = [];
    const uniqueGroups = Array.from(new Set(epics.map(e => epicConfig?.epics.find(ec => ec.name === e.name)?.group)));

    for (const groupTitle of uniqueGroups) {
      const groupEpics = epics.filter(e => (epicConfig?.epics.find(ec => ec.name === e.name)?.group || undefined) === groupTitle);
      groups.push({ groupTitle, epics: groupEpics });
    }

    let leftEpics: Epic[] = [];
    let rightEpics: Epic[] = [];
    const targetSize = Math.ceil(epics.length / 2);
    let leftCount = 0;

    for (const group of groups) {
      const groupSize = group.epics.length + 1; // +1 for group header row
      if (leftCount + groupSize <= targetSize) {
        leftEpics.push(...group.epics);
        leftCount += groupSize;
      } else {
        rightEpics.push(...group.epics);
      }
    }

    return { leftEpics, rightEpics };
  };

  const { leftEpics: splitLeftEpics, rightEpics: splitRightEpics } = splitGroupsAcrossColumns(visibleEpics);

  const renderEpicTableRows = (epics: Epic[]) => {
    const rows: React.ReactNode[] = [];
    const uniqueGroups = Array.from(new Set(epics.map(e => epicConfig?.epics.find(ec => ec.name === e.name)?.group)));

    for (const groupTitle of uniqueGroups) {
      const groupEpics = epics.filter(e => (epicConfig?.epics.find(ec => ec.name === e.name)?.group || undefined) === groupTitle);
      const isCollapsed = groupTitle ? collapsedGroups.has(groupTitle) : false;

      if (groupTitle) {
        rows.push(
          <tr key={`group-${groupTitle}`} className="epic-group-header">
            <td colSpan={4} className="px-3 py-2 border-b border-[#F0F0F7]">
              <button
                onClick={() => toggleGroupCollapse(groupTitle)}
                className="bg-transparent border-0 cursor-pointer p-0 font-semibold text-[#1a202c] flex items-center gap-1"
              >
                <span className="text-[0.8rem]">{isCollapsed ? '▶' : '▼'}</span>
                <span className="text-sm">{groupTitle}</span>
                <span className="text-[0.75rem] text-[#64748b]">({groupEpics.length})</span>
              </button>
            </td>
          </tr>
        );
      }

      if (!isCollapsed) {
        for (const epic of groupEpics) {
          rows.push(renderRow(epic));
        }
      }
    }

    return rows;
  };

  // Remove old split logic - now using splitGroupsAcrossColumns

  const tableClass = "w-full bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.08)] border border-[#F0F0F7]";
  const theadRow = (
    <tr className="bg-[#494BCB] text-white">
      <th className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-sm rounded-tl-lg w-[60%]">
        <span onClick={() => toggleSortState('summary', 'name')} className="cursor-pointer select-none">Epic Name<SortIcon sort={sortState.summary} col="name" /></span>
        <span className="summary-sort-icon ml-[6px] cursor-pointer" data-tooltip="Restore original order" onClick={(e) => { e.stopPropagation(); resetSortState('summary'); }} style={{ opacity: sortState.summary.col ? 1 : 0.4 }}>
          {ResetIcon}
        </span>
      </th>
      <th onClick={() => toggleSortState('summary', 'status')} className="cursor-pointer select-none px-3 py-2 text-center font-semibold text-sm w-[17%] whitespace-nowrap">Epic Status<SortIcon sort={sortState.summary} col="status" /></th>
      <th onClick={() => toggleSortState('summary', 'lastchanged')} className="cursor-pointer select-none px-3 py-2 text-center font-semibold text-sm whitespace-nowrap w-[15%]">Last Changed<SortIcon sort={sortState.summary} col="lastchanged" /></th>
      <th onClick={() => toggleSortState('summary', 'progress')} className="cursor-pointer select-none px-3 py-2 text-center font-semibold text-sm rounded-tr-lg w-[33%]">Epic Progress<SortIcon sort={sortState.summary} col="progress" isNumeric /></th>
    </tr>
  );

  return (
    <div id="summary-table" className="mb-4">
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="m-0 text-[1.1rem] font-semibold text-[#1a202c]">Epic Status</h2>
            {(() => {
              const groupTitles = visibleEpics.map(e => epicConfig?.epics.find(ec => ec.name === e.name)?.group);
              const uniqueGroupTitles = Array.from(new Set(groupTitles)).filter((g): g is string => g !== undefined);
              const hasGroups = uniqueGroupTitles.length > 0;

              if (!hasGroups) return null;

              if (collapsedGroups.size > 0) {
                return (
                  <button
                    onClick={() => setCollapsedGroups(new Set())}
                    className="text-[0.75rem] text-[#494BCB] bg-transparent border-0 cursor-pointer p-0 hover:text-[#3a37aa] flex items-center gap-1"
                  >
                    {ExpandAllIcon}
                    Expand All
                  </button>
                );
              } else {
                return (
                  <button
                    onClick={() => setCollapsedGroups(new Set(uniqueGroupTitles))}
                    className="text-[0.75rem] text-[#494BCB] bg-transparent border-0 cursor-pointer p-0 hover:text-[#3a37aa] flex items-center gap-1"
                  >
                    {CollapseAllIcon}
                    Collapse All
                  </button>
                );
              }
            })()}
          </div>
          {showObjectiveFilter && (
            <PeekButton
              icon={TargetActiveIcon}
              label="Filter Objectives"
              tooltip={viewSettings.showObjectivesFilter ? 'Hide Objectives Filter' : 'Show Objectives Filter'}
              onClick={() => updateViewSetting('showObjectivesFilter', !viewSettings.showObjectivesFilter)}
              hidden={!viewSettings.showObjectivesFilter}
              activeColor={deselectedObjectiveIds.size > 0 ? '#dc2626' : undefined}
            />
          )}
          <PeekButton
            icon={BlockedIcon}
            label={viewSettings.showBlockedOnly ? 'Show All Epics' : 'Show Only Blocked Epics'}
            tooltip={viewSettings.showBlockedOnly ? 'Show all epics' : 'Show only epics that have blocked tickets'}
            onClick={() => {
              const next = !viewSettings.showBlockedOnly;
              setViewSettings({
                ...viewSettings,
                showBlockedOnly: next,
                // Mutually exclusive with "Hide Done": turning Show Blocked on restores Done visibility
                showDoneEpics: next ? true : viewSettings.showDoneEpics,
              });
            }}
            activeColor={viewSettings.showBlockedOnly ? '#dc2626' : undefined}
          />
          <PeekButton
            icon={CheckCircleIcon}
            label={viewSettings.showDoneEpics ? 'Hide Done Epics' : 'Show Done Epics'}
            tooltip={viewSettings.showDoneEpics ? 'Hide Done epics' : 'Show Done epics'}
            onClick={() => {
              const nextShowDone = !viewSettings.showDoneEpics;
              setViewSettings({
                ...viewSettings,
                showDoneEpics: nextShowDone,
                // Mutually exclusive with "Show Blocked": enabling Hide Done disables Show Blocked
                showBlockedOnly: !nextShowDone ? false : viewSettings.showBlockedOnly,
              });
            }}
            activeColor={viewSettings.showDoneEpics ? undefined : '#16a34a'}
          />
          <input
            type="text"
            placeholder="Filter epics…"
            value={epicSearchQuery}
            onChange={e => setEpicSearchQuery(e.target.value)}
            className="border border-[#E2E8F0] rounded px-2 py-[0.2rem] text-sm text-[#1a202c] bg-white focus:outline-none focus:border-[#494BCB]"
            style={{ width: '200px' }}
          />
          {epicSearchQuery && (
            <button
              onClick={() => setEpicSearchQuery('')}
              className="text-[0.75rem] text-[#94a3b8] bg-transparent border-0 cursor-pointer p-0 hover:text-[#475569]"
              title="Clear filter"
            >✕ clear</button>
          )}
        </div>
      </div>
      {viewSettings.showObjectivesFilter && showObjectiveFilter && (() => {
        const trimmed = objectiveSearchQuery.trim().toLowerCase();
        const visibleObjectives = trimmed
          ? relevantObjectives.filter(o => o.name.toLowerCase().includes(trimmed))
          : relevantObjectives;
        const showUnObjectivedRow = hasUnObjectived && (!trimmed || 'no objective'.includes(trimmed));
        const handleObjectiveSearchChange = (text: string) => {
          setObjectiveSearchQuery(text);
          const t = text.trim().toLowerCase();
          if (!t) {
            setDeselectedObjectiveIds(new Set());
            return;
          }
          const nonMatching = new Set<number | -1>();
          relevantObjectives.forEach(o => {
            if (!o.name.toLowerCase().includes(t)) nonMatching.add(o.id);
          });
          if (hasUnObjectived && !'no objective'.includes(t)) nonMatching.add(-1);
          setDeselectedObjectiveIds(nonMatching);
        };
        return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
          <span className="text-xs font-semibold text-[#64748b] uppercase tracking-wide whitespace-nowrap">Objectives:</span>
          <input
            type="text"
            placeholder="Filter objectives…"
            value={objectiveSearchQuery}
            onChange={e => handleObjectiveSearchChange(e.target.value)}
            className="border border-[#E2E8F0] rounded px-2 py-[0.2rem] text-sm text-[#1a202c] bg-white focus:outline-none focus:border-[#494BCB]"
            style={{ width: '160px' }}
          />
          {objectiveSearchQuery && (
            <button
              onClick={() => handleObjectiveSearchChange('')}
              className="text-[0.75rem] text-[#94a3b8] bg-transparent border-0 cursor-pointer p-0 hover:text-[#475569] whitespace-nowrap"
              title="Clear filter"
            >✕ clear</button>
          )}
          {visibleObjectives.map(obj => (
            <label key={obj.id} className="flex items-center gap-1 cursor-pointer text-sm text-[#1a202c] whitespace-nowrap">
              <input
                type="checkbox"
                checked={!deselectedObjectiveIds.has(obj.id)}
                onChange={() => toggleObjective(obj.id)}
                className="cursor-pointer"
              />
              {obj.name}
            </label>
          ))}
          {showUnObjectivedRow && (
            <label className="flex items-center gap-1 cursor-pointer text-sm text-[#94a3b8] italic whitespace-nowrap">
              <input
                type="checkbox"
                checked={!deselectedObjectiveIds.has(-1)}
                onChange={() => toggleObjective(-1)}
                className="cursor-pointer"
              />
              No Objective
            </label>
          )}
          <span className="text-[#cbd5e0] text-xs select-none">|</span>
          <button
            onClick={() => setDeselectedObjectiveIds(new Set())}
            className="text-[0.75rem] text-[#494BCB] bg-transparent border-0 cursor-pointer p-0 hover:underline whitespace-nowrap"
          >Select all</button>
          <button
            onClick={() => setDeselectedObjectiveIds(new Set([...relevantObjectives.map(o => o.id as number | -1), ...(hasUnObjectived ? [-1 as const] : [])]))}
            className="text-[0.75rem] text-[#494BCB] bg-transparent border-0 cursor-pointer p-0 hover:underline whitespace-nowrap"
          >Clear all</button>
          <span className="text-[#cbd5e0] text-xs select-none">|</span>
          <button
            onClick={() => { updateViewSetting('showObjectivesFilter', false); setDeselectedObjectiveIds(new Set()); }}
            className="text-[0.75rem] text-[#94a3b8] bg-transparent border-0 cursor-pointer p-0 hover:text-[#475569] whitespace-nowrap"
            title="Hide objectives filter"
          >✕ hide</button>
        </div>
        );
      })()}
      {epicSearchQuery.trim() || deselectedObjectiveIds.size > 0 || !viewSettings.showDoneEpics || viewSettings.showBlockedOnly ? (
        <table className={tableClass} style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
          <thead>{theadRow}</thead>
          <tbody>
            {renderEpicTableRows(visibleEpics)}
            <tr>
              <td colSpan={4} className="px-3 py-2 text-sm text-[#1e40af] text-left rounded-b-lg" style={{ background: '#dbeafe' }}>
                <span className="font-semibold">
                  {visibleEpics.length === 0 ? 'No epics match your filter.' : `${visibleEpics.length} epic${visibleEpics.length === 1 ? '' : 's'} found.`}
                </span>
                {epicSearchQuery.trim() && (
                  <span className="ml-3 text-[#3b82f6]">Search: <span className="italic">"{epicSearchQuery.trim()}"</span></span>
                )}
                {deselectedObjectiveIds.size > 0 && (() => {
                  const selectedNames = relevantObjectives
                    .filter(o => !deselectedObjectiveIds.has(o.id))
                    .map(o => o.name);
                  if (hasUnObjectived && !deselectedObjectiveIds.has(-1)) selectedNames.push('No Objective');
                  return selectedNames.length > 0
                    ? <span className="ml-3 text-[#3b82f6]">Objectives: <span className="italic">{selectedNames.join(', ')}</span></span>
                    : null;
                })()}
                {viewSettings.showBlockedOnly && (
                  <span className="ml-3 text-[#3b82f6]">Showing only epics with <span className="italic">blocked tickets</span></span>
                )}
                {!viewSettings.showDoneEpics && (
                  <span className="ml-3 text-[#3b82f6]">Hiding <span className="italic">Done</span> epics</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEpicSearchQuery('');
                    setDeselectedObjectiveIds(new Set());
                    setViewSettings({ ...viewSettings, showDoneEpics: true, showBlockedOnly: false });
                  }}
                  className="ml-3 text-[#1e40af] underline decoration-dotted bg-transparent border-0 cursor-pointer p-0 font-semibold"
                  title="Clear all filters and show all epics"
                >
                  ✕ Clear all filters
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <div className="summary-table-grid">
          <div className="flex-1">
            <table className={tableClass} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>{theadRow}</thead>
              <tbody>{renderEpicTableRows(splitLeftEpics)}</tbody>
            </table>
          </div>
          <div className="flex-1">
            <table className={tableClass} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>{theadRow}</thead>
              <tbody>{renderEpicTableRows(splitRightEpics)}</tbody>
            </table>
          </div>
        </div>
      )}
      <div className="mt-2 text-[0.78rem] text-[#475569]">
        {epics.filter(e => !e.notFound).length === filteredEpicNames.length ? '✅ ' : '⚠️ '}
        Tracking {epics.filter(e => !e.notFound).length} of {filteredEpicNames.length} Epic{filteredEpicNames.length !== 1 ? 's' : ''}
      </div>
      {epics.filter(e => e.notFound).map(e => (
        <div key={e.id as React.Key} className="epic-not-found mt-2">
          <h3>{e.name}</h3>
          <p>Epic not found in Shortcut</p>
        </div>
      ))}
      <hr className="border-0 border-t-2 border-slate-200 mt-1" />
    </div>
  );
}

export default function SummaryTable(): React.JSX.Element {
  const { viewSettings } = useDashboard();
  return (
    <>
      <EpicStatusTable />
      <StoryTotalsSummary />
      {viewSettings.showCycleProgress && <CycleProgress />}
    </>
  );
}
