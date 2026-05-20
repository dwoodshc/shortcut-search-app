/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * EpicCard.tsx — Dashboard card for a single epic. Renders a 3D ticket status bar
 * chart, collapsible workflow-status and story-type pie charts, a story owners table,
 * a team open-tickets table, and a collapsible six-column kanban story board
 * (Backlog → Complete).
 */
import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { createPieSlice, COMPLETE_STATE_NAMES, daysAgo, formatDaysAgo, storage, getApiBaseUrl } from '../utils';
import { Epic, ViewSettings, PullRequest } from '../types';
import { TargetIcon, UserIcon, HashIcon, KanbanIcon, PieIcon, ChartIcon, PullRequestIcon, BarChartIcon, UsersIcon, TicketIcon } from './icons';
import PeekButton from './PeekButton';
import SortIcon from './SortIcon';

interface Props {
  epic: Epic;
}

const STORY_COLUMNS = ['Backlog', 'Ready for Development', 'In Development', 'In Review', 'Complete'];

const STATE_COLORS: Record<string, string> = {
  'backlog': '#d1d5db',
  'ready for development': '#a7f3d0',
  'in development': '#6ee7b7',
  'in review': '#4ade80',
  'complete': '#16a34a',
};

const TYPE_COLORS: Record<string, string> = {
  'feature': '#86efac',
  'chore': '#fef08a',
  'bug': '#fca5a5',
};

interface WorkflowSegment {
  stateId: number;
  stateName: string;
  count: number;
  percentage: number;
  startAngle: number;
  angle: number;
}

interface TypeSegment {
  type: string;
  typeName: string;
  count: number;
  percentage: number;
  startAngle: number;
  angle: number;
}


export default function EpicCard({ epic }: Props): React.JSX.Element {
  const {
    members, objectives, workflowConfig, filteredStateIds,
    generateShortcutUrl, shortcutWebUrl,
    getDisplayStories, getEpicStateInfo, getEpicStateClass,
    selectedTeamIds, selectedTeamLabel, teamMemberIds, teamNameMap, filterByTeam,
    viewSettings, setViewSettings,
    incrementApiCalls,
    sortState, toggleSortState,
  } = useDashboard();

  const [hoveredPieSegment, setHoveredPieSegment] = useState<WorkflowSegment | null>(null);
  const [hoveredTypeSegment, setHoveredTypeSegment] = useState<TypeSegment | null>(null);
  const [clickedBarStateId, setClickedBarStateId] = useState<number | null>(null);

  useEffect(() => {
    if (clickedBarStateId === null) return;
    const close = () => setClickedBarStateId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [clickedBarStateId]);

  const [cardCollapsed, setCardCollapsed] = useState(() => getEpicStateInfo(epic).type.toLowerCase() === 'done');
  const [showPRs, setShowPRs] = useState(false);
  const [showUserStoryBoard, setShowUserStoryBoard] = useState(false);
  const [storyPrs, setStoryPrs] = useState<Record<number, PullRequest[]>>({});
  const [prsLoading, setPrsLoading] = useState(false);
  const [prsLoaded, setPrsLoaded] = useState(false);

  useEffect(() => {
    if (!showPRs || prsLoaded || !epic.stories || epic.stories.length === 0) return;
    const token = storage.getApiToken();
    if (!token) return;
    let cancelled = false;
    setPrsLoading(true);
    Promise.all(
      epic.stories.map(s =>
        fetch(`${getApiBaseUrl()}/api/stories/${s.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
          .then(r => (r.ok ? r.json() : null))
          .then(full => ({ id: s.id, prs: (full?.pull_requests || []) as PullRequest[], ok: full !== null }))
          .catch(() => ({ id: s.id, prs: [] as PullRequest[], ok: false }))
      )
    ).then(results => {
      if (cancelled) return;
      const map: Record<number, PullRequest[]> = {};
      let successful = 0;
      for (const r of results) {
        map[r.id] = r.prs;
        if (r.ok) successful++;
      }
      setStoryPrs(map);
      setPrsLoaded(true);
      setPrsLoading(false);
      incrementApiCalls('GET /api/stories/:id', successful);
    });
    return () => { cancelled = true; };
  }, [showPRs, prsLoaded, epic.stories?.length, incrementApiCalls]);

  if (epic.notFound) {
    return (
      <div className="epic-not-found">
        <h3>{epic.name}</h3>
        <p>Epic not found in Shortcut</p>
      </div>
    );
  }

  const displayStories = getDisplayStories(epic);
  const si = getEpicStateInfo(epic);
  const updateViewSetting = (key: keyof ViewSettings, value: boolean) =>
    setViewSettings({ ...viewSettings, [key]: value });
  const objectiveNames = (epic.objective_ids || [])
    .map(id => objectives.find(o => o.id === id)?.name)
    .filter(Boolean) as string[];
  const objectiveEl = objectiveNames.length === 0 ? null
    : !viewSettings.showEpicObjective
      ? <PeekButton icon={TargetIcon} tooltip="Show Objective" onClick={() => updateViewSetting('showEpicObjective', true)} />
      : <span className="epic-owner" style={{ cursor: 'pointer' }} onClick={() => updateViewSetting('showEpicObjective', false)} title="Click to hide">
          <strong>{objectiveNames.length > 1 ? 'Objectives: ' : 'Objective: '}</strong>{objectiveNames.join(', ')}
        </span>;

  // --- Workflow status bar chart ---
  const workflowStateCounts: Record<number, number> = {};
  displayStories.forEach(story => {
    workflowStateCounts[story.workflow_state_id] = (workflowStateCounts[story.workflow_state_id] || 0) + 1;
  });
  const workflowTotal = displayStories.length;
  const clickedStateName = clickedBarStateId !== null ? (workflowConfig.states[clickedBarStateId] || '') : '';
  const clickedStories = clickedBarStateId !== null
    ? displayStories
        .filter(s => s.workflow_state_id === clickedBarStateId)
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())
    : [];

  // --- Workflow pie chart ---
  const workflowSegments = filteredStateIds.map(stateId => {
    const count = workflowStateCounts[stateId] || 0;
    const percentage = workflowTotal > 0 ? (count / workflowTotal) * 100 : 0;
    const stateName = workflowConfig.states[stateId] || String(stateId);
    return { stateId, stateName, count, percentage };
  }).filter(seg => seg.count > 0);

  let cumAngle = 0;
  const workflowSegmentsWithAngles: WorkflowSegment[] = workflowSegments.map(seg => {
    const angle = (seg.percentage / 100) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    return { ...seg, startAngle, angle };
  });

  // --- Story type pie chart ---
  const typeCounts: Record<string, number> = {};
  displayStories.forEach(story => {
    const t = story.story_type || 'unknown';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });
  const typeSegmentsBase = ['feature', 'chore', 'bug']
    .map(type => ({ type, typeName: type.charAt(0).toUpperCase() + type.slice(1), count: typeCounts[type] || 0, percentage: 0 }))
    .filter(seg => seg.count > 0);
  const typeTotal = typeSegmentsBase.reduce((sum, seg) => sum + seg.count, 0);
  typeSegmentsBase.forEach(seg => { seg.percentage = typeTotal > 0 ? (seg.count / typeTotal) * 100 : 0; });

  let cumTypeAngle = 0;
  const typeSegmentsWithAngles: TypeSegment[] = typeSegmentsBase.map(seg => {
    const angle = (seg.percentage / 100) * 360;
    const startAngle = cumTypeAngle;
    cumTypeAngle += angle;
    return { ...seg, startAngle, angle };
  });

  // --- Story owners table ---
  const ownerCounts: Record<string, number> = {};
  let unassignedCount = 0;
  displayStories.forEach(story => {
    if (story.owner_ids && story.owner_ids.length > 0) {
      story.owner_ids.forEach(ownerId => {
        const ownerName = members[ownerId] || ownerId;
        ownerCounts[ownerName] = (ownerCounts[ownerName] || 0) + 1;
      });
    } else {
      unassignedCount++;
    }
  });
  const sortedOwners = (() => {
    const sort = sortState.storyOwners;
    const dir = sort.dir === 'asc' ? 1 : -1;
    const arr = Object.entries(ownerCounts);
    if (sort.col === 'owner') arr.sort((a, b) => dir * a[0].localeCompare(b[0]));
    else arr.sort((a, b) => dir * (a[1] - b[1]));
    return arr;
  })();

  // --- Team open tickets table ---
  const nameList = (epic.owner_ids || [])
    .filter(id => selectedTeamIds.length === 0 || teamMemberIds.has(id))
    .map(id => members[id] || id);

  const nameCounts: Record<string, number> = {};
  nameList.forEach(name => { nameCounts[name] = 0; });
  displayStories.forEach(story => {
    const stateName = (workflowConfig.states[story.workflow_state_id] || '').toLowerCase().trim();
    if (!COMPLETE_STATE_NAMES.has(stateName) && story.owner_ids && story.owner_ids.length > 0) {
      story.owner_ids.forEach(ownerId => {
        const ownerName = members[ownerId] || ownerId;
        if (Object.prototype.hasOwnProperty.call(nameCounts, ownerName)) {
          nameCounts[ownerName]++;
        }
      });
    }
  });
  const sortedNames = (() => {
    const sort = sortState.teamOpenTickets;
    const dir = sort.dir === 'asc' ? 1 : -1;
    const arr = Object.entries(nameCounts);
    if (sort.col === 'owner') arr.sort((a, b) => dir * a[0].localeCompare(b[0]));
    else arr.sort((a, b) => dir * (a[1] - b[1]));
    return arr;
  })();
  const teamConfigName = selectedTeamIds.length > 0 ? (filterByTeam ? selectedTeamLabel : 'All Teams') : null;

  return (
    <div id={`epic-${epic.id}`} className="epic-card">
      <div className="epic-header">
        <div className="epic-title">
          <span className="expand-icon cursor-pointer select-none" onClick={() => setCardCollapsed(prev => !prev)} title={cardCollapsed ? 'Expand' : 'Collapse'}>
            {cardCollapsed ? '▶' : '▼'}
          </span>
          <h3>
            {epic.app_url ? (
              <a href={epic.app_url} target="_blank" rel="noopener noreferrer">{epic.name}</a>
            ) : (
              epic.name
            )}
          </h3>
        </div>
        <div className="epic-meta">
          {objectiveEl}
          {viewSettings.showEpicOwners
            ? <span className="epic-owner" style={{ cursor: 'pointer' }} onClick={() => updateViewSetting('showEpicOwners', false)} title="Click to hide">
                <strong>{epic.owner_ids && epic.owner_ids.length > 1 ? 'Owners: ' : 'Owner: '}</strong>
                {epic.owner_ids && epic.owner_ids.length > 0 ? epic.owner_ids.map(id => members[id] || id).join(', ') : 'No Owner'}
              </span>
            : <PeekButton icon={UserIcon} tooltip="Show Owners" onClick={() => updateViewSetting('showEpicOwners', true)} />
          }
          {viewSettings.showEpicStoryCount
            ? <span className="story-count" style={{ cursor: 'pointer' }} onClick={() => updateViewSetting('showEpicStoryCount', false)} title="Click to hide">{displayStories.length} stories</span>
            : <PeekButton icon={HashIcon} tooltip="Show Story Count" onClick={() => updateViewSetting('showEpicStoryCount', true)} />
          }
          <span className={`epic-state ${getEpicStateClass(si.type, si.name)}`}>
            {si.type.toLowerCase() === 'done' ? 'Done ✓' : si.name}
          </span>
        </div>
      </div>

      {!cardCollapsed && (<>

      {/* Peek-icon row: toggles for the per-epic sections (global, affects all cards) */}
      <div className="mt-2 mb-1 flex flex-wrap items-center gap-2">
        <span className="text-[0.8rem] font-semibold text-[#64748b]">Global Additional Views:</span>
        <PeekButton
          icon={BarChartIcon}
          label="Ticket Status Breakdown"
          tooltip={viewSettings.showTicketStatusBreakdown ? 'Hide Ticket Status Breakdown' : 'Show Ticket Status Breakdown'}
          onClick={() => updateViewSetting('showTicketStatusBreakdown', !viewSettings.showTicketStatusBreakdown)}
          hidden={!viewSettings.showTicketStatusBreakdown}
        />
        <PeekButton
          icon={UsersIcon}
          label="Story Owners"
          tooltip={viewSettings.showStoryOwners ? 'Hide Story Owners' : 'Show Story Owners'}
          onClick={() => updateViewSetting('showStoryOwners', !viewSettings.showStoryOwners)}
          hidden={!viewSettings.showStoryOwners}
        />
        <PeekButton
          icon={TicketIcon}
          label="Team Open Tickets"
          tooltip={viewSettings.showTeamOpenTickets ? 'Hide Team Open Tickets' : 'Show Team Open Tickets'}
          onClick={() => updateViewSetting('showTeamOpenTickets', !viewSettings.showTeamOpenTickets)}
          hidden={!viewSettings.showTeamOpenTickets}
        />
        <PeekButton
          icon={PieIcon}
          label="Workflow Status Pie Chart"
          tooltip={viewSettings.showWorkflowStatusPieChart ? 'Hide Workflow Status Pie Chart' : 'Show Workflow Status Pie Chart'}
          onClick={() => updateViewSetting('showWorkflowStatusPieChart', !viewSettings.showWorkflowStatusPieChart)}
          hidden={!viewSettings.showWorkflowStatusPieChart}
        />
        <PeekButton
          icon={ChartIcon}
          label="Story Type Breakdown"
          tooltip={viewSettings.showStoryTypeBreakdown ? 'Hide Story Type Breakdown' : 'Show Story Type Breakdown'}
          onClick={() => updateViewSetting('showStoryTypeBreakdown', !viewSettings.showStoryTypeBreakdown)}
          hidden={!viewSettings.showStoryTypeBreakdown}
        />
        <span className="text-[0.8rem] font-semibold text-[#64748b] ml-2">Local Additional Views:</span>
        <PeekButton
          icon={PullRequestIcon}
          label="Pull Requests"
          tooltip={showPRs ? 'Hide Pull Requests (this epic only)' : 'Show Pull Requests (this epic only)'}
          onClick={() => setShowPRs(prev => !prev)}
          hidden={!showPRs}
        />
        <PeekButton
          icon={KanbanIcon}
          label="User Story Board"
          tooltip={showUserStoryBoard ? 'Hide User Story Board (this epic only)' : 'Show User Story Board (this epic only)'}
          onClick={() => setShowUserStoryBoard(prev => !prev)}
          hidden={!showUserStoryBoard}
        />
      </div>

      {epic.stories && workflowConfig.stateOrder.length > 0 && (
        <div className="epic-stats-container">
          <div className="workflow-status-chart-container">
            {viewSettings.showTicketStatusBreakdown && (<>
            <h4>Ticket Status Breakdown</h4>
            <div className="relative">
            <div className="workflow-status-chart mt-2">
              {filteredStateIds.map(stateId => {
                const count = workflowStateCounts[stateId] || 0;
                const percentage = workflowTotal > 0 ? (count / workflowTotal) * 100 : 0;
                const stateName = workflowConfig.states[stateId] || String(stateId);
                const isActive = clickedBarStateId === stateId;
                return (
                  <div
                    key={stateId}
                    className="status-bar-item cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setClickedBarStateId(prev => prev === stateId ? null : stateId); }}
                    title={`View ${count} ticket${count !== 1 ? 's' : ''} in ${stateName}`}
                    style={isActive ? { outline: '2px solid #494BCB', borderRadius: '4px' } : undefined}
                  >
                    <div className="column-3d-wrapper">
                      <div className="column-3d-container">
                        <div className="column-3d-fill" style={{ height: `${percentage}%` }}>
                          <div className="status-count-label">{count}</div>
                          <div className="column-3d-top"></div>
                          <div className="column-3d-front"></div>
                          <div className="column-3d-side"></div>
                        </div>
                      </div>
                    </div>
                    <div className="status-bar-label">
                      <span className="status-name">{stateName.replace(/Development/g, 'Dev')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
              {clickedBarStateId !== null && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute z-50 bg-white rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.15)] border border-[#E2E8F0] p-3 text-left"
                  style={{ top: 'calc(100% + 8px)', left: 0, minWidth: '560px' }}
                >
                  <div className="text-xs font-semibold text-[#64748b] mb-2 uppercase tracking-wide">
                    {clickedStateName} — {clickedStories.length} ticket{clickedStories.length !== 1 ? 's' : ''}
                  </div>
                  {clickedStories.length === 0 ? (
                    <p className="text-xs text-[#94a3b8] italic">No tickets in this state</p>
                  ) : (
                    <div style={clickedStories.length > 5 ? { maxHeight: '220px', overflowY: 'auto' } : undefined}>
                    <table className="w-full" style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
                      <tbody>
                        {clickedStories.map(story => (
                          <tr key={story.id} className="border-b border-[#F0F0F7] last:border-0">
                            <td className="py-[0.3rem] pr-2 align-middle" style={{ width: '1%', whiteSpace: 'nowrap', textAlign: 'center' }}>
                              <span className="text-[0.65rem] font-semibold px-1.5 py-[0.1rem] rounded-full text-white" style={{ backgroundColor: TYPE_COLORS[story.story_type] ?? TYPE_COLORS.feature }}>
                                {story.story_type.charAt(0).toUpperCase() + story.story_type.slice(1)}
                              </span>
                            </td>
                            <td className="py-[0.3rem] pr-2 align-middle" style={{ width: '99%' }}>
                              {story.app_url ? (
                                <a href={story.app_url} target="_blank" rel="noopener noreferrer" className="text-[#494BCB] text-xs hover:underline">{story.name}</a>
                              ) : (
                                <span className="text-xs text-[#1a202c]">{story.name}</span>
                              )}
                            </td>
                            <td className="py-[0.3rem] pr-2 align-middle" style={{ width: '1%', whiteSpace: 'nowrap' }}>
                              <span className="text-[0.65rem] text-[#475569]">
                                {story.owner_ids && story.owner_ids.length > 0
                                  ? story.owner_ids.map(id => members[id] || id).join(', ')
                                  : <span className="text-[#cbd5e0] italic">Unassigned</span>}
                              </span>
                            </td>
                            <td className="py-[0.3rem] pr-2 align-middle" style={{ width: '1%', whiteSpace: 'nowrap', textAlign: 'center' }}>
                              {story.group_id && teamNameMap[story.group_id] && (
                                <span className="text-[0.65rem] font-medium px-1.5 py-[0.1rem] rounded bg-[#EEF2FF] text-[#4338CA]">{teamNameMap[story.group_id]}</span>
                              )}
                            </td>
                            <td className="py-[0.3rem] pr-3 align-middle" style={{ width: '1%', whiteSpace: 'nowrap', textAlign: 'right' }}>
                              <span className="text-[0.65rem] text-[#94a3b8]">{formatDaysAgo(daysAgo(story.updated_at))}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>
              )}
            </div>
            </>)}

            {/* Workflow Pie Chart */}
            {viewSettings.showWorkflowStatusPieChart && (
            <div className="mt-[0.8rem]">
              <h4>Workflow Status Pie Chart</h4>
              {workflowTotal > 0 && (
                <div className="workflow-status-pie-chart mt-2">
                  <div className="pie-chart-wrapper">
                    <div className="relative">
                      <svg viewBox="0 0 200 200" className="pie-chart-svg">
                        {workflowSegmentsWithAngles.map(seg => (
                          <g key={seg.stateId}>
                            <path
                              d={createPieSlice(seg.startAngle, seg.angle)}
                              fill={STATE_COLORS[seg.stateName.toLowerCase()] || '#667eea'}
                              stroke="#fff"
                              strokeWidth="2"
                              style={{ cursor: 'pointer' }}
                              onMouseEnter={() => setHoveredPieSegment(seg)}
                              onMouseLeave={() => setHoveredPieSegment(null)}
                            />
                          </g>
                        ))}
                      </svg>
                      {hoveredPieSegment && (
                        <div className="pie-chart-tooltip">
                          <div className="tooltip-title">{hoveredPieSegment.stateName}</div>
                          <div className="tooltip-details">
                            <div>Count: {hoveredPieSegment.count}</div>
                            <div>Percentage: {hoveredPieSegment.percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="pie-chart-legend">
                      {workflowSegments.map(seg => {
                        const color = STATE_COLORS[seg.stateName.toLowerCase()] || '#667eea';
                        const epicUrl = generateShortcutUrl(epic.id, seg.stateName);
                        return (
                          <a
                            key={seg.stateId}
                            href={epicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="legend-item no-underline text-inherit"
                            title={`View ${epic.name} filtered by ${seg.stateName} in Shortcut`}
                          >
                            <span className="legend-color" style={{ backgroundColor: color }}></span>
                            <span className="legend-label">{seg.stateName}</span>
                            <span className="legend-value">{seg.count} ({seg.percentage.toFixed(1)}%)</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Story Type Pie Chart */}
            {viewSettings.showStoryTypeBreakdown && (
            <div className="mt-[0.8rem]">
              <h4>Story Type Breakdown</h4>
              {typeTotal > 0 && (
                <div>
                  <div className="workflow-status-pie-chart">
                    <div className="pie-chart-wrapper">
                      <div className="relative">
                        <svg viewBox="0 0 200 200" className="pie-chart-svg">
                          {typeSegmentsWithAngles.map(seg => (
                            <g key={seg.type}>
                              <path
                                d={createPieSlice(seg.startAngle, seg.angle)}
                                fill={TYPE_COLORS[seg.type] || '#667eea'}
                                stroke="#fff"
                                strokeWidth="2"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredTypeSegment(seg)}
                                onMouseLeave={() => setHoveredTypeSegment(null)}
                              />
                            </g>
                          ))}
                        </svg>
                        {hoveredTypeSegment && (
                          <div className="pie-chart-tooltip">
                            <div className="tooltip-title">{hoveredTypeSegment.typeName}</div>
                            <div className="tooltip-details">
                              <div>Count: {hoveredTypeSegment.count}</div>
                              <div>Percentage: {hoveredTypeSegment.percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="pie-chart-legend">
                        {typeSegmentsBase.map(seg => {
                          const color = TYPE_COLORS[seg.type] || '#667eea';
                          const storyTypeUrl = `${shortcutWebUrl}/epic/${epic.id}?group_by=story_type`;
                          return (
                            <a
                              key={seg.type}
                              href={storyTypeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="legend-item no-underline text-inherit"
                              title={`View ${epic.name} grouped by story type in Shortcut`}
                            >
                              <span className="legend-color" style={{ backgroundColor: color }}></span>
                              <span className="legend-label">{seg.typeName}</span>
                              <span className="legend-value">{seg.count} ({seg.percentage.toFixed(1)}%)</span>
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            )}
          </div>

          <div className="tables-container">
            {/* Story Owners */}
            {viewSettings.showStoryOwners && (
            <div className="story-owners-table">
              <h4>Story Owners</h4>
              {sortedOwners.length > 0 || unassignedCount > 0 ? (
                <>
                  <table className="w-full mt-2 bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.08)] border border-[#F0F0F7]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead className="bg-[#494BCB] text-white">
                      <tr>
                        <th onClick={() => toggleSortState('storyOwners', 'owner')} className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-sm rounded-tl-lg">Owner<SortIcon sort={sortState.storyOwners} col="owner" /></th>
                        <th onClick={() => toggleSortState('storyOwners', 'count')} className="cursor-pointer select-none px-3 py-2 text-right font-semibold text-sm rounded-tr-lg">Count<SortIcon sort={sortState.storyOwners} col="count" isNumeric /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedOwners.map(([owner, count]) => (
                        <tr key={owner}>
                          <td className="px-3 py-2 text-sm border-b border-[#F0F0F7]">{owner}</td>
                          <td className="px-3 py-2 text-sm text-right font-semibold text-[#494BCB] border-b border-[#F0F0F7]">{count}</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="px-3 py-2 text-sm">Unassigned</td>
                        <td className="px-3 py-2 text-sm text-right font-semibold text-[#494BCB]">{unassignedCount}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-[#718096] text-xs italic mt-2">
                    NOTE: Counts may not add up if a story has more than one owner
                  </p>
                </>
              ) : (
                <p className="text-[#718096] text-sm italic">No assigned owners</p>
              )}
            </div>
            )}

            {/* Team Open Tickets */}
            {viewSettings.showTeamOpenTickets && (
            <div className="email-ticket-counts-table">
              <h4>Team Open Tickets{teamConfigName ? ` — ${teamConfigName}` : ''}</h4>
              {nameList.length === 0 ? (
                <p className="text-[#718096] text-sm italic">No epic owners assigned</p>
              ) : (
                <>
                  <table className="w-full mt-2 bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.08)] border border-[#F0F0F7]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead className="bg-[#494BCB] text-white">
                      <tr>
                        <th onClick={() => toggleSortState('teamOpenTickets', 'owner')} className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-sm rounded-tl-lg">Owner<SortIcon sort={sortState.teamOpenTickets} col="owner" /></th>
                        <th onClick={() => toggleSortState('teamOpenTickets', 'count')} className="cursor-pointer select-none px-3 py-2 text-right font-semibold text-sm rounded-tr-lg">Count<SortIcon sort={sortState.teamOpenTickets} col="count" isNumeric /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedNames.map(([name, count]) => (
                        <tr key={name} className={count === 0 ? 'zero-count-row' : ''}>
                          <td className="px-3 py-2 text-sm border-b border-[#F0F0F7]">{name}</td>
                          <td className="px-3 py-2 text-sm text-right font-semibold text-[#494BCB] border-b border-[#F0F0F7]">{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[#718096] text-xs italic mt-2">
                    NOTE: This table shows the count of open tickets only for the team
                  </p>
                </>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      {/* Pull Requests */}
      {showPRs && epic.stories && (
        <div className="pull-requests-section mt-3">
          <h4>Pull Requests</h4>
          <div className="border-t-2 border-slate-200 pt-3">
              {epic.stories.length === 0 ? (
                <p className="text-[#718096] text-sm italic">No stories</p>
              ) : (
                (() => {
                  const totalPrs = prsLoaded ? Object.values(storyPrs).reduce((sum, arr) => sum + arr.length, 0) : 0;
                  const prSort = sortState.epicPrs;
                  const sortedStories = (() => {
                    if (!prSort.col || !epic.stories) return epic.stories || [];
                    const dir = prSort.dir === 'asc' ? 1 : -1;
                    const arr = [...epic.stories];
                    if (prSort.col === 'ticket') {
                      arr.sort((a, b) => dir * a.name.localeCompare(b.name));
                    } else if (prSort.col === 'prs') {
                      arr.sort((a, b) => dir * ((storyPrs[a.id]?.length || 0) - (storyPrs[b.id]?.length || 0)));
                    }
                    return arr;
                  })();
                  return (
                    <table className="w-full bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.08)] border border-[#F0F0F7]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                      <thead className="bg-[#494BCB] text-white">
                        <tr>
                          <th onClick={() => toggleSortState('epicPrs', 'ticket')} className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-sm rounded-tl-lg w-1/2">Ticket<SortIcon sort={prSort} col="ticket" /></th>
                          <th onClick={() => toggleSortState('epicPrs', 'prs')} className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-sm rounded-tr-lg w-1/2">Pull Requests<SortIcon sort={prSort} col="prs" isNumeric /></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStories.map(story => {
                          const prs = storyPrs[story.id] || [];
                          return (
                            <tr key={story.id}>
                              <td className="px-3 py-2 text-sm border-b border-[#F0F0F7] align-top">
                                {story.app_url
                                  ? <a href={story.app_url} target="_blank" rel="noopener noreferrer" className="text-[#494BCB] hover:underline">{story.name}</a>
                                  : story.name}
                              </td>
                              <td className="px-3 py-2 text-sm border-b border-[#F0F0F7] align-top">
                                {prsLoading && !prsLoaded
                                  ? <span className="text-[#94a3b8] italic">Loading…</span>
                                  : prs.length === 0
                                    ? <span className="text-[#94a3b8]">—</span>
                                    : prs.map((pr, i) => (
                                        <span key={pr.id}>
                                          {i > 0 && ', '}
                                          <a
                                            href={pr.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#494BCB] hover:underline"
                                            title={pr.title}
                                          >#{pr.number}{pr.merged ? ' ✓' : pr.closed ? ' ✕' : pr.draft ? ' (draft)' : ''}</a>
                                        </span>
                                      ))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {prsLoaded && (
                        <tfoot>
                          <tr>
                            <td className="px-3 py-2 text-sm font-semibold text-[#1e40af] rounded-bl-lg" style={{ background: '#dbeafe' }}>
                              Ticket Count: {epic.stories.length}
                            </td>
                            <td className="px-3 py-2 text-sm font-semibold text-[#1e40af] rounded-br-lg" style={{ background: '#dbeafe' }}>
                              Pull Request Count: {totalPrs}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  );
                })()
              )}
          </div>
        </div>
      )}

      {/* User Story Board */}
      {showUserStoryBoard && epic.stories && (
        <div className="stories-section">
          <h4>User Story Board</h4>
          <div className="border-t-2 border-slate-200 pt-3">
              {displayStories.length === 0 ? (
                <p className="no-stories">No stories found for this epic</p>
              ) : (
                <div className="stories-columns">
                  {STORY_COLUMNS.map(columnState => {
                    const storiesInColumn = displayStories.filter(story => {
                      const storyState = (workflowConfig.states[story.workflow_state_id] || '').toLowerCase().trim();
                      return storyState === columnState.toLowerCase().trim();
                    });
                    return (
                      <div key={columnState} className="story-column">
                        <div className="story-column-header">
                          <h5>{columnState}</h5>
                          <span className="story-column-count">{storiesInColumn.length}</span>
                        </div>
                        <div className="story-column-content">
                          {storiesInColumn.length === 0 ? (
                            <p className="no-stories-in-column">No stories</p>
                          ) : (
                            storiesInColumn.map(story => (
                              <div key={story.id} className="story-card">
                                <div className="story-card-name">
                                  {story.app_url ? (
                                    <a href={story.app_url} target="_blank" rel="noopener noreferrer">{story.name}</a>
                                  ) : (
                                    story.name
                                  )}
                                </div>
                                {story.description && (
                                  <p className="story-card-description">
                                    {story.description.substring(0, 80)}{story.description.length > 80 ? '...' : ''}
                                  </p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        </div>
      )}

      </>)}

      {viewSettings.showTopOfPageLink && (
        <div className="text-left mt-2">
          <a href="#top" className="text-[#494BCB] text-[0.8rem] no-underline font-medium">
            ↑ Top of Page
          </a>
        </div>
      )}
    </div>
  );
}
