/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * AssignmentTables.tsx — Two collapsible assignment tables. Epic Owner Assignment maps
 * each epic to its team members; Team Member Assignment is the inverse view. Both are
 * sortable, show Done / Ready-for-Release state badges, and highlight ignored users
 * as gray pills when visible.
 */
import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { EpicTeamEntry, EpicRef } from '../types';

const resetIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px', verticalAlign: 'middle', display: 'inline-block' }}>
    <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.95-2.05L6.64 18.36A8.955 8.955 0 0 0 13 21a9 9 0 0 0 0-18z"/>
  </svg>
);

const donePill = <span style={{ marginLeft: '0.4rem', backgroundColor: '#86efac', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 500, display: 'inline-block', verticalAlign: 'middle' }}>Done</span>;
const readyForReleasePill = <span style={{ marginLeft: '0.4rem', backgroundColor: '#bbf7d0', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 500, display: 'inline-block', verticalAlign: 'middle' }}>Ready for Release</span>;

export default function AssignmentTables(): React.JSX.Element | null {
  const {
    epicTeamData, memberEpicMap,
    sortState, toggleSortState, resetSortState,
    collapsedCharts, setCollapsedCharts,
    filterIgnoredInTickets, ignoredUsers,
  } = useDashboard();

  if (epicTeamData.length === 0) return null;

  const memberEpicData = Object.entries(memberEpicMap).map(([member, epicsForMember]) => ({ member, epics: epicsForMember }));
  if (memberEpicData.length === 0) return null;

  const tableStyle: React.CSSProperties = { width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', border: '1px solid #F0F0F7' };
  const thBase: React.CSSProperties = { padding: '0.5rem 0.75rem', fontWeight: 600, fontSize: '0.875rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', color: 'white' };
  const tdStyle: React.CSSProperties = { padding: '0.4rem 0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #F0F0F7', wordBreak: 'break-word', overflow: 'hidden' };

  const makeSortIcon = (sort: { col: string | null; dir: string }, col: string, isNumeric = false) => {
    const unsorted = 'Click to sort';
    const ascLabel = isNumeric ? 'Sorted low→high, click to reverse' : 'Sorted A→Z, click to reverse';
    const descLabel = isNumeric ? 'Sorted high→low, click to reverse' : 'Sorted Z→A, click to reverse';
    const label = sort.col !== col ? unsorted : sort.dir === 'asc' ? ascLabel : descLabel;
    const icon = sort.col !== col ? ' ↕' : sort.dir === 'asc' ? ' ↑' : ' ↓';
    return <span className="summary-sort-icon" data-tooltip={label}>{icon}</span>;
  };

  const sortedEpicTeam = [...epicTeamData].sort((a, b) => {
    if (!sortState.epicTeam.col) return 0;
    const dir = sortState.epicTeam.dir === 'asc' ? 1 : -1;
    if (sortState.epicTeam.col === 'epic') return dir * a.name.localeCompare(b.name);
    if (sortState.epicTeam.col === 'count') return dir * (a.team.length - b.team.length);
    return 0;
  });

  const sortedMemberEpic = [...memberEpicData].sort((a, b) => {
    if (!sortState.memberEpic.col) return 0;
    const dir = sortState.memberEpic.dir === 'asc' ? 1 : -1;
    if (sortState.memberEpic.col === 'member') return dir * a.member.localeCompare(b.member);
    if (sortState.memberEpic.col === 'count') return dir * (a.epics.length - b.epics.length);
    return 0;
  });

  const epicTeamHead = (
    <tr style={{ background: '#494BCB' }}>
      <th style={{ ...thBase, borderRadius: '8px 0 0 0' }} onClick={() => toggleSortState('epicTeam', 'epic')}>
        Epic{makeSortIcon(sortState.epicTeam, 'epic')}
        <span className="summary-sort-icon" data-tooltip="Restore original order" onClick={(e) => { e.stopPropagation(); resetSortState('epicTeam'); }} style={{ marginLeft: '6px', cursor: 'pointer', opacity: sortState.epicTeam.col ? 1 : 0.4 }}>
          {resetIcon}
        </span>
      </th>
      <th style={{ ...thBase, borderRadius: '0 8px 0 0', cursor: 'default' }}>Team Members</th>
    </tr>
  );

  const memberEpicHead = (
    <tr style={{ background: '#494BCB' }}>
      <th style={{ ...thBase, borderRadius: '8px 0 0 0' }} onClick={() => toggleSortState('memberEpic', 'member')}>
        Team Member{makeSortIcon(sortState.memberEpic, 'member')}
      </th>
      <th style={{ ...thBase, borderRadius: '0 8px 0 0', cursor: 'default' }}>Epics</th>
    </tr>
  );

  const renderEpicTeamRow = (row: EpicTeamEntry, idx: number) => (
    <tr key={row.id as React.Key} style={{ background: row.team.length === 0 ? '#fff9c4' : idx % 2 === 0 ? 'white' : '#fafafa' }}>
      <td style={{ ...tdStyle, fontWeight: 600 }}>
        <a href={`#epic-${row.id}`} style={{ color: '#494BCB', textDecoration: 'none' }}>{row.name}</a>
        {row.isDone && donePill}
        {row.isReadyForRelease && readyForReleasePill}
      </td>
      <td style={tdStyle}>
        {row.team.length === 0
          ? <span style={{ color: '#a0aec0', fontStyle: 'italic' }}>None</span>
          : <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>{[...row.team].sort((a, b) => a.localeCompare(b)).map((m, i) => <li key={i}>{!filterIgnoredInTickets && ignoredUsers.includes(m) ? <span style={{ backgroundColor: '#e5e7eb', borderRadius: '999px', padding: '0.1rem 0.5rem', display: 'inline-block' }}>{m}</span> : m}</li>)}</ul>}
      </td>
    </tr>
  );

  const renderMemberEpicRow = (row: { member: string; epics: EpicRef[] }, idx: number) => (
    <tr key={row.member} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
      <td style={{ ...tdStyle, fontWeight: 600 }}>
        {!filterIgnoredInTickets && ignoredUsers.includes(row.member)
          ? <span style={{ backgroundColor: '#e5e7eb', borderRadius: '999px', padding: '0.1rem 0.5rem', display: 'inline-block' }}>{row.member}</span>
          : row.member}{' '}
        <span style={{ fontWeight: 400, color: '#718096', fontSize: '0.8rem' }}>({row.epics.length})</span>
      </td>
      <td style={tdStyle}>
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          {[...row.epics].sort((a, b) => a.name.localeCompare(b.name)).map((e) => (
            <li key={e.id as React.Key}><a href={`#epic-${e.id}`} style={{ color: '#494BCB', textDecoration: 'none' }}>{e.name}</a>{e.isDone && donePill}{e.isReadyForRelease && readyForReleasePill}</li>
          ))}
        </ul>
      </td>
    </tr>
  );

  const epicTeamHalf = Math.ceil(sortedEpicTeam.length / 2);
  const memberEpicHalf = Math.ceil(sortedMemberEpic.length / 2);
  const colgroup = <colgroup><col style={{ width: '50%' }} /><col style={{ width: '50%' }} /></colgroup>;
  const memberColgroup = <colgroup><col style={{ width: '30%' }} /><col style={{ width: '70%' }} /></colgroup>;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        {/* Epic Owner Assignment */}
        <div>
          <h3
            onClick={() => setCollapsedCharts(prev => ({ ...prev, 'assignment-epic': !prev['assignment-epic'] }))}
            style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Show or hide the Epic Owner Assignment table"
          >
            <span>{collapsedCharts['assignment-epic'] ? '▶' : '▼'}</span> Epic Owner Assignment
          </h3>
          {!collapsedCharts['assignment-epic'] && (
            <div className="summary-table-grid">
              <div>
                <table style={tableStyle}>
                  {colgroup}
                  <thead>{epicTeamHead}</thead>
                  <tbody>{sortedEpicTeam.slice(0, epicTeamHalf).map((row, idx) => renderEpicTeamRow(row, idx))}</tbody>
                </table>
              </div>
              <div>
                <table style={tableStyle}>
                  {colgroup}
                  <thead>{epicTeamHead}</thead>
                  <tbody>{sortedEpicTeam.slice(epicTeamHalf).map((row, idx) => renderEpicTeamRow(row, idx))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Team Member Assignment */}
        <div>
          <h3
            onClick={() => setCollapsedCharts(prev => ({ ...prev, 'assignment-member': !prev['assignment-member'] }))}
            style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Show or hide the Team Member Assignment table"
          >
            <span>{collapsedCharts['assignment-member'] ? '▶' : '▼'}</span> Team Member Assignment
          </h3>
          {!collapsedCharts['assignment-member'] && (
            <div className="summary-table-grid">
              <div>
                <table style={tableStyle}>
                  {memberColgroup}
                  <thead>{memberEpicHead}</thead>
                  <tbody>{sortedMemberEpic.slice(0, memberEpicHalf).map((row, idx) => renderMemberEpicRow(row, idx))}</tbody>
                </table>
              </div>
              <div>
                <table style={tableStyle}>
                  {memberColgroup}
                  <thead>{memberEpicHead}</thead>
                  <tbody>{sortedMemberEpic.slice(memberEpicHalf).map((row, idx) => renderMemberEpicRow(row, idx))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      <hr style={{ border: 'none', borderTop: '2px solid #e2e8f0', margin: '0 0 1rem' }} />
    </>
  );
}
