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
import { createPieSlice, COMPLETE_STATE_NAMES } from '../utils';
import { Epic } from '../types';

interface Props {
  epic: Epic;
}

const STORY_COLUMNS = ['Backlog', 'Ready for Development', 'In Development', 'In Review', 'Ready for Release', 'Complete'];
const NON_CLICKABLE_STATES = ['complete'];

const STATE_COLORS: Record<string, string> = {
  'backlog': '#d1d5db',
  'ready for development': '#a7f3d0',
  'in development': '#6ee7b7',
  'in review': '#4ade80',
  'ready for release': '#22c55e',
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

export default function EpicCard({ epic }: Props): React.JSX.Element {
  const {
    members, workflowConfig, filteredStateIds,
    collapsedCharts, toggleChart,
    generateShortcutUrl, shortcutWebUrl,
    getDisplayStories, getEpicStateInfo, getEpicStateClass,
    selectedTeamIds, selectedTeamLabel, teamMemberIds, teamNameMap, filterByTeam, filterIgnoredInTickets, ignoredUsers,
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
  const sortedOwners = Object.entries(ownerCounts).sort((a, b) => b[1] - a[1]);

  // --- Team open tickets table ---
  const nameList = (epic.owner_ids || [])
    .filter(id => selectedTeamIds.length === 0 || teamMemberIds.has(id))
    .map(id => members[id] || id)
    .filter(name => !filterIgnoredInTickets || !ignoredUsers.includes(name));

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
  const sortedNames = Object.entries(nameCounts).sort((a, b) => b[1] - a[1]);
  const teamConfigName = selectedTeamIds.length > 0 ? (filterByTeam ? selectedTeamLabel : 'All Teams') : null;

  return (
    <div id={`epic-${epic.id}`} className="epic-card">
      <div className="epic-header">
        <div className="epic-title">
          <h3>
            {epic.app_url ? (
              <a href={epic.app_url} target="_blank" rel="noopener noreferrer">{epic.name}</a>
            ) : (
              epic.name
            )}
          </h3>
        </div>
        <div className="epic-meta">
          <span className="epic-owner">
            <strong>{epic.owner_ids && epic.owner_ids.length > 1 ? 'Owners: ' : 'Owner: '}</strong>
            {epic.owner_ids && epic.owner_ids.length > 0
              ? epic.owner_ids.map(id => members[id] || id).join(', ')
              : 'No Owner'}
          </span>
          <span className="story-count">{displayStories.length} stories</span>
          <span className={`epic-state ${getEpicStateClass(si.type, si.name)}`}>
            {si.type.toLowerCase() === 'done' ? 'Done ✓' : si.name}
          </span>
        </div>
      </div>

      {epic.stories && workflowConfig.stateOrder.length > 0 && (
        <div className="epic-stats-container">
          <div className="workflow-status-chart-container">
            <h4>Ticket Status Breakdown</h4>
            <div className="workflow-status-chart mt-2" style={{ position: 'relative' }}>
              {filteredStateIds.map(stateId => {
                const count = workflowStateCounts[stateId] || 0;
                const percentage = workflowTotal > 0 ? (count / workflowTotal) * 100 : 0;
                const stateName = workflowConfig.states[stateId] || String(stateId);
                const isNonClickable = NON_CLICKABLE_STATES.includes(stateName.toLowerCase().trim());
                const isActive = clickedBarStateId === stateId;
                return (
                  <div
                    key={stateId}
                    className={`status-bar-item${!isNonClickable ? ' cursor-pointer' : ''}`}
                    onClick={!isNonClickable ? (e) => { e.stopPropagation(); setClickedBarStateId(prev => prev === stateId ? null : stateId); } : undefined}
                    title={!isNonClickable ? `View ${count} ticket${count !== 1 ? 's' : ''} in ${stateName}` : undefined}
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

            {/* Workflow Pie Chart */}
            <div className="mt-[0.8rem]">
              <h4 className="cursor-pointer select-none flex items-center gap-[0.4rem]" onClick={() => toggleChart(epic.id, 'workflow-pie')} title="Show or hide the Workflow Status Pie Chart for this epic">
                <span>{collapsedCharts[`${epic.id}-workflow-pie`] ? '▶' : '▼'}</span> Workflow Status Pie Chart
              </h4>
              {!collapsedCharts[`${epic.id}-workflow-pie`] && workflowTotal > 0 && (
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

            {/* Story Type Pie Chart */}
            <div className="mt-[0.8rem]">
              <h4 className="cursor-pointer select-none flex items-center gap-[0.4rem]" onClick={() => toggleChart(epic.id, 'type-pie')} title="Show or hide the Story Type Breakdown chart for this epic">
                <span>{collapsedCharts[`${epic.id}-type-pie`] ? '▶' : '▼'}</span> Story Type Breakdown
              </h4>
              {!collapsedCharts[`${epic.id}-type-pie`] && typeTotal > 0 && (
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
          </div>

          <div className="tables-container">
            {/* Story Owners */}
            <div className="story-owners-table">
              <h4>Story Owners</h4>
              {sortedOwners.length > 0 || unassignedCount > 0 ? (
                <>
                  <table className="mt-2">
                    <thead>
                      <tr>
                        <th>Owner</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedOwners.map(([owner, count]) => (
                        <tr key={owner}>
                          <td>{owner}</td>
                          <td>{count}</td>
                        </tr>
                      ))}
                      <tr>
                        <td>Unassigned</td>
                        <td>{unassignedCount}</td>
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

            {/* Team Open Tickets */}
            <div className="email-ticket-counts-table">
              <h4>Team Open Tickets{teamConfigName ? ` — ${teamConfigName}` : ''}</h4>
              {nameList.length === 0 ? (
                <p className="text-[#718096] text-sm italic">No epic owners assigned</p>
              ) : (
                <>
                  <table className="mt-2">
                    <thead>
                      <tr>
                        <th>Owner</th>
                        <th>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedNames.map(([name, count]) => (
                        <tr key={name} className={count === 0 ? 'zero-count-row' : ''}>
                          <td>
                            {!filterIgnoredInTickets && ignoredUsers.includes(name)
                              ? <span className="bg-[#e5e7eb] rounded-full px-2 py-[0.1rem] inline-block">{name}</span>
                              : name}
                          </td>
                          <td>{count}</td>
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
          </div>
        </div>
      )}

      {/* User Story Board */}
      {epic.stories && (
        <div className="stories-section">
          <h4 className="cursor-pointer select-none flex items-center gap-[0.4rem]" onClick={() => toggleChart(epic.id, 'stories')} title="Show or hide the User Story Board for this epic">
            <span>{collapsedCharts[`${epic.id}-stories`] ? '▶' : '▼'}</span> User Story Board
          </h4>
          {!collapsedCharts[`${epic.id}-stories`] && (
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
          )}
        </div>
      )}

      <div className="text-left mt-2">
        <a href="#top" className="text-[#494BCB] text-[0.8rem] no-underline font-medium">
          ↑ Top of Page
        </a>
      </div>
    </div>
  );
}
