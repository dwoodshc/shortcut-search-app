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
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[14px] h-[14px] align-middle inline-block">
    <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.95-2.05L6.64 18.36A8.955 8.955 0 0 0 13 21a9 9 0 0 0 0-18z"/>
  </svg>
);

export default function AssignmentTables(): React.JSX.Element | null {
  const {
    epicTeamData, memberEpicMap,
    sortState, toggleSortState, resetSortState,
    collapsedCharts, setCollapsedCharts,
    filterIgnoredInTickets, ignoredUsers,
    getEpicStateClass,
  } = useDashboard();

  const donePill = <span className={`epic-state ${getEpicStateClass('done', 'Done')} !text-[0.75rem] !py-[0.15rem] !px-2 ml-[0.4rem]`}>Done ✓</span>;
  const readyForReleasePill = <span className={`epic-state ${getEpicStateClass('', 'Ready for Release')} !text-[0.75rem] !py-[0.15rem] !px-2 ml-[0.4rem]`}>Ready for Release</span>;
  const blockedPill = <span className={`epic-state ${getEpicStateClass('', 'blocked')} !text-[0.75rem] !py-[0.15rem] !px-2 ml-[0.4rem]`}>Blocked</span>;

  if (epicTeamData.length === 0) return null;

  const memberEpicData = Object.entries(memberEpicMap).map(([member, epicsForMember]) => ({ member, epics: epicsForMember }));
  if (memberEpicData.length === 0) return null;

  const tableClass = "w-full bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.08)] border border-[#F0F0F7]";
  const thBaseClass = "px-3 py-2 font-semibold text-sm text-left cursor-pointer select-none whitespace-nowrap text-white";
  const tdClass = "px-3 py-[0.4rem] text-sm border-b border-[#F0F0F7] break-words overflow-hidden";

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
    <tr className="bg-[#494BCB]">
      <th className={`${thBaseClass} rounded-tl-lg`} onClick={() => toggleSortState('epicTeam', 'epic')}>
        Epic{makeSortIcon(sortState.epicTeam, 'epic')}
        <span className="summary-sort-icon ml-[6px] cursor-pointer" data-tooltip="Restore original order" onClick={(e) => { e.stopPropagation(); resetSortState('epicTeam'); }} style={{ opacity: sortState.epicTeam.col ? 1 : 0.4 }}>
          {resetIcon}
        </span>
      </th>
      <th className={`${thBaseClass} rounded-tr-lg cursor-default`}>Team Members</th>
    </tr>
  );

  const memberEpicHead = (
    <tr className="bg-[#494BCB]">
      <th className={`${thBaseClass} rounded-tl-lg`} onClick={() => toggleSortState('memberEpic', 'member')}>
        Team Member{makeSortIcon(sortState.memberEpic, 'member')}
      </th>
      <th className={`${thBaseClass} rounded-tr-lg cursor-default`}>Epics</th>
    </tr>
  );

  const renderEpicTeamRow = (row: EpicTeamEntry) => (
    <tr key={row.id as React.Key} className={row.team.length === 0 ? 'bg-[#fff9c4]' : ''}>
      <td className={tdClass}>
        <a href={`#epic-${row.id}`} className="text-[#1a202c] no-underline">{row.name}</a>
        {row.isDone && donePill}
        {row.isReadyForRelease && readyForReleasePill}
        {row.isBlocked && blockedPill}
      </td>
      <td className={tdClass}>
        {row.team.length === 0
          ? <span className="text-[#1a202c]">None</span>
          : <ul className="m-0 pl-5">{[...row.team].sort((a, b) => a.localeCompare(b)).map((m, i) => <li key={i}>{!filterIgnoredInTickets && ignoredUsers.includes(m) ? <span className="bg-[#e5e7eb] rounded-full px-2 py-[0.1rem] inline-block text-[#1a202c]">{m}</span> : m}</li>)}</ul>}
      </td>
    </tr>
  );

  const renderMemberEpicRow = (row: { member: string; epics: EpicRef[] }) => (
    <tr key={row.member}>
      <td className={tdClass}>
        {!filterIgnoredInTickets && ignoredUsers.includes(row.member)
          ? <span className="bg-[#e5e7eb] rounded-full px-2 py-[0.1rem] inline-block text-[#1a202c]">{row.member}</span>
          : row.member}{' '}
        <span className="text-[#1a202c] text-[0.8rem]">({row.epics.length})</span>
      </td>
      <td className={tdClass}>
        <ul className="m-0 pl-5">
          {[...row.epics].sort((a, b) => a.name.localeCompare(b.name)).map((e) => (
            <li key={e.id as React.Key}><a href={`#epic-${e.id}`} className="text-[#1a202c] no-underline">{e.name}</a>{e.isDone && donePill}{e.isReadyForRelease && readyForReleasePill}{e.isBlocked && blockedPill}</li>
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
      <div className="flex flex-col gap-4 mb-4">
        {/* Epic Owner Assignment */}
        <div>
          <h3
            onClick={() => setCollapsedCharts(prev => ({ ...prev, 'assignment-epic': !prev['assignment-epic'] }))}
            className="m-0 mb-2 text-base font-semibold cursor-pointer select-none flex items-center gap-[0.4rem]"
            title="Show or hide the Epic Owner Assignment table"
          >
            <span>{collapsedCharts['assignment-epic'] ? '▶' : '▼'}</span> Epic Owner Assignment
          </h3>
          {!collapsedCharts['assignment-epic'] && (
            <div className="summary-table-grid">
              <div>
                <table className={tableClass} style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                  {colgroup}
                  <thead>{epicTeamHead}</thead>
                  <tbody>{sortedEpicTeam.slice(0, epicTeamHalf).map((row) => renderEpicTeamRow(row))}</tbody>
                </table>
              </div>
              <div>
                <table className={tableClass} style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                  {colgroup}
                  <thead>{epicTeamHead}</thead>
                  <tbody>{sortedEpicTeam.slice(epicTeamHalf).map((row) => renderEpicTeamRow(row))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Team Member Assignment */}
        <div>
          <h3
            onClick={() => setCollapsedCharts(prev => ({ ...prev, 'assignment-member': !prev['assignment-member'] }))}
            className="m-0 mb-2 text-base font-semibold cursor-pointer select-none flex items-center gap-[0.4rem]"
            title="Show or hide the Team Member Assignment table"
          >
            <span>{collapsedCharts['assignment-member'] ? '▶' : '▼'}</span> Team Member Assignment
          </h3>
          {!collapsedCharts['assignment-member'] && (
            <div className="summary-table-grid">
              <div>
                <table className={tableClass} style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                  {memberColgroup}
                  <thead>{memberEpicHead}</thead>
                  <tbody>{sortedMemberEpic.slice(0, memberEpicHalf).map((row) => renderMemberEpicRow(row))}</tbody>
                </table>
              </div>
              <div>
                <table className={tableClass} style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                  {memberColgroup}
                  <thead>{memberEpicHead}</thead>
                  <tbody>{sortedMemberEpic.slice(memberEpicHalf).map((row) => renderMemberEpicRow(row))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      <hr className="border-0 border-t-2 border-slate-200 mb-4" />
    </>
  );
}
