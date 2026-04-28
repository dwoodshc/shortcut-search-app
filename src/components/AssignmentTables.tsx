/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * AssignmentTables.tsx — Three collapsible assignment tables. Epic Owner Assignments maps
 * each epic to its team members; Team Member Epic Assignments is the inverse view;
 * Team Member Ticket Assignments lists all open (non-complete) tickets per owner. All are
 * sortable and highlight ignored users as gray pills when visible.
 */
import React, { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { EpicTeamEntry, EpicRef } from '../types';
import { ResetIcon } from './icons';
import { COMPLETE_STATE_NAMES } from '../utils';

export default function AssignmentTables(): React.JSX.Element | null {
  const {
    epics, members, workflowConfig,
    epicTeamData, memberEpicMap,
    sortState, toggleSortState, resetSortState,
    collapsedCharts, setCollapsedCharts,
    filterByTeam, selectedTeamIds,
    filterIgnoredInTickets, ignoredUsers,
    getEpicStateClass,
  } = useDashboard();

  const memberTicketData = useMemo(() => {
    const map: Record<string, Array<{ id: number; name: string; app_url?: string; epicName: string; epicAppUrl?: string }>> = {};
    for (const epic of epics) {
      if (epic.notFound) continue;
      const stories = epic.stories || [];
      const filtered = filterByTeam && selectedTeamIds.length > 0
        ? stories.filter(s => !s.group_id || selectedTeamIds.includes(s.group_id))
        : stories;
      for (const story of filtered) {
        const stateName = (workflowConfig.states[story.workflow_state_id] || '').toLowerCase().trim();
        if (COMPLETE_STATE_NAMES.has(stateName)) continue;
        for (const ownerId of story.owner_ids || []) {
          const ownerName = members[ownerId] || ownerId;
          if (filterIgnoredInTickets && ignoredUsers.includes(ownerName)) continue;
          if (!map[ownerName]) map[ownerName] = [];
          map[ownerName].push({ id: story.id, name: story.name, app_url: story.app_url, epicName: epic.name, epicAppUrl: epic.app_url });
        }
      }
    }
    return Object.entries(map).map(([member, tickets]) => ({ member, tickets }));
  }, [epics, members, workflowConfig.states, filterByTeam, selectedTeamIds, filterIgnoredInTickets, ignoredUsers]);

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

  const sortedMemberTicket = [...memberTicketData].sort((a, b) => {
    if (!sortState.memberTicket.col) return 0;
    const dir = sortState.memberTicket.dir === 'asc' ? 1 : -1;
    if (sortState.memberTicket.col === 'member') return dir * a.member.localeCompare(b.member);
    if (sortState.memberTicket.col === 'count') return dir * (a.tickets.length - b.tickets.length);
    return 0;
  });

  const epicTeamHead = (
    <tr className="bg-[#494BCB]">
      <th className={`${thBaseClass} rounded-tl-lg`} onClick={() => toggleSortState('epicTeam', 'epic')}>
        Epic{makeSortIcon(sortState.epicTeam, 'epic')}
        <span className="summary-sort-icon ml-[6px] cursor-pointer" data-tooltip="Restore original order" onClick={(e) => { e.stopPropagation(); resetSortState('epicTeam'); }} style={{ opacity: sortState.epicTeam.col ? 1 : 0.4 }}>
          {ResetIcon}
        </span>
      </th>
      <th className={`${thBaseClass} rounded-tr-lg cursor-default`}>Team Members</th>
    </tr>
  );

  const memberEpicHead = (
    <tr className="bg-[#494BCB]">
      <th className={`${thBaseClass} rounded-tl-lg`} onClick={() => toggleSortState('memberEpic', 'member')}>
        Team Member{makeSortIcon(sortState.memberEpic, 'member')}
        <span className="summary-sort-icon ml-[6px] cursor-pointer" data-tooltip="Restore original order" onClick={(e) => { e.stopPropagation(); resetSortState('memberEpic'); }} style={{ opacity: sortState.memberEpic.col ? 1 : 0.4 }}>
          {ResetIcon}
        </span>
      </th>
      <th className={`${thBaseClass} text-center`} onClick={() => toggleSortState('memberEpic', 'count')}>
        Count{makeSortIcon(sortState.memberEpic, 'count', true)}
      </th>
      <th className={`${thBaseClass} rounded-tr-lg cursor-default`}>Epics</th>
    </tr>
  );

  const memberTicketHead = (
    <tr className="bg-[#494BCB]">
      <th className={`${thBaseClass} rounded-tl-lg`} onClick={() => toggleSortState('memberTicket', 'member')}>
        Team Member{makeSortIcon(sortState.memberTicket, 'member')}
        <span className="summary-sort-icon ml-[6px] cursor-pointer" data-tooltip="Restore original order" onClick={(e) => { e.stopPropagation(); resetSortState('memberTicket'); }} style={{ opacity: sortState.memberTicket.col ? 1 : 0.4 }}>
          {ResetIcon}
        </span>
      </th>
      <th className={`${thBaseClass} text-center`} onClick={() => toggleSortState('memberTicket', 'count')}>
        Count{makeSortIcon(sortState.memberTicket, 'count', true)}
      </th>
      <th className={`${thBaseClass} rounded-tr-lg cursor-default`}>Open Tickets</th>
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
          : <ul className="m-0 pl-0 list-none">{[...row.team].sort((a, b) => a.localeCompare(b)).map((m, i) => <li key={i}>{!filterIgnoredInTickets && ignoredUsers.includes(m) ? <span className="bg-[#e5e7eb] rounded-full px-2 py-[0.1rem] inline-block text-[#1a202c]">{m}</span> : m}</li>)}</ul>}
      </td>
    </tr>
  );

  const renderMemberEpicRow = (row: { member: string; epics: EpicRef[] }) => (
    <tr key={row.member}>
      <td className={tdClass}>
        {!filterIgnoredInTickets && ignoredUsers.includes(row.member)
          ? <span className="bg-[#e5e7eb] rounded-full px-2 py-[0.1rem] inline-block text-[#1a202c]">{row.member}</span>
          : row.member}
      </td>
      <td className={`${tdClass} text-center font-semibold`}>{row.epics.length}</td>
      <td className={tdClass}>
        <ul className="m-0 pl-0 list-none">
          {[...row.epics].sort((a, b) => a.name.localeCompare(b.name)).map((e) => (
            <li key={e.id as React.Key}><a href={`#epic-${e.id}`} className="text-[#1a202c] no-underline">{e.name}</a>{e.isDone && donePill}{e.isReadyForRelease && readyForReleasePill}{e.isBlocked && blockedPill}</li>
          ))}
        </ul>
      </td>
    </tr>
  );

  const renderMemberTicketRow = (row: { member: string; tickets: Array<{ id: number; name: string; app_url?: string; epicName: string; epicAppUrl?: string }> }) => (
    <tr key={row.member}>
      <td className={tdClass}>
        {!filterIgnoredInTickets && ignoredUsers.includes(row.member)
          ? <span className="bg-[#e5e7eb] rounded-full px-2 py-[0.1rem] inline-block text-[#1a202c]">{row.member}</span>
          : row.member}
      </td>
      <td className={`${tdClass} text-center font-semibold`}>{row.tickets.length}</td>
      <td className={tdClass}>
        {(() => {
          const byEpic: Record<string, typeof row.tickets> = {};
          for (const t of row.tickets) {
            if (!byEpic[t.epicName]) byEpic[t.epicName] = [];
            byEpic[t.epicName].push(t);
          }
          return Object.entries(byEpic).sort(([a], [b]) => a.localeCompare(b)).map(([epicName, tickets]) => (
            <div key={epicName} className="mb-1 last:mb-0">
              <div className="text-[0.85rem] font-semibold text-[#6b7280] mb-[0.1rem]">{tickets[0].epicAppUrl ? <a href={tickets[0].epicAppUrl} className="text-[#6b7280] no-underline" target="_blank" rel="noreferrer">{epicName}</a> : epicName} <span className="font-normal text-[0.75rem]">({tickets.length})</span></div>
              <ul className="m-0 pl-3 list-none">
                {[...tickets].sort((a, b) => a.name.localeCompare(b.name)).map((t) => (
                  <li key={t.id} className="text-[0.7rem]">
                    {t.app_url
                      ? <a href={t.app_url} className="text-[#1a202c] no-underline" target="_blank" rel="noreferrer">{t.name}</a>
                      : <span>{t.name}</span>
                    }
                  </li>
                ))}
              </ul>
            </div>
          ));
        })()}
      </td>
    </tr>
  );

  const epicTeamHalf = Math.ceil(sortedEpicTeam.length / 2);
  const memberEpicHalf = Math.ceil(sortedMemberEpic.length / 2);
  const memberTicketHalf = Math.ceil(sortedMemberTicket.length / 2);
  const colgroup = <colgroup><col style={{ width: '50%' }} /><col style={{ width: '50%' }} /></colgroup>;
  const memberEpicColgroup = <colgroup><col style={{ width: '25%' }} /><col style={{ width: '8%' }} /><col style={{ width: '67%' }} /></colgroup>;
  const memberTicketColgroup = <colgroup><col style={{ width: '25%' }} /><col style={{ width: '8%' }} /><col style={{ width: '67%' }} /></colgroup>;

  return (
    <>
      <div className="flex flex-col gap-4 mb-4">
        {/* Epic Owner Assignments */}
        <div>
          <h3
            onClick={() => setCollapsedCharts(prev => ({ ...prev, 'assignment-epic': !prev['assignment-epic'] }))}
            className="m-0 mb-2 text-base font-semibold cursor-pointer select-none flex items-center gap-[0.4rem]"
            title="Show or hide the Epic Owner Assignments table"
          >
            <span>{collapsedCharts['assignment-epic'] ? '▶' : '▼'}</span> Epic Owner Assignments
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

        {/* Team Member Epic Assignments */}
        <div>
          <h3
            onClick={() => setCollapsedCharts(prev => ({ ...prev, 'assignment-member': !prev['assignment-member'] }))}
            className="m-0 mb-2 text-base font-semibold cursor-pointer select-none flex items-center gap-[0.4rem]"
            title="Show or hide the Team Member Epic Assignments table"
          >
            <span>{collapsedCharts['assignment-member'] ? '▶' : '▼'}</span> Team Member Epic Assignments
          </h3>
          {!collapsedCharts['assignment-member'] && (
            <div className="summary-table-grid">
              <div>
                <table className={tableClass} style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                  {memberEpicColgroup}
                  <thead>{memberEpicHead}</thead>
                  <tbody>{sortedMemberEpic.slice(0, memberEpicHalf).map((row) => renderMemberEpicRow(row))}</tbody>
                </table>
              </div>
              <div>
                <table className={tableClass} style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                  {memberEpicColgroup}
                  <thead>{memberEpicHead}</thead>
                  <tbody>{sortedMemberEpic.slice(memberEpicHalf).map((row) => renderMemberEpicRow(row))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Team Member Ticket Assignments */}
        <div>
          <h3
            onClick={() => setCollapsedCharts(prev => ({ ...prev, 'assignment-ticket': !prev['assignment-ticket'] }))}
            className="m-0 mb-2 text-base font-semibold cursor-pointer select-none flex items-center gap-[0.4rem]"
            title="Show or hide the Team Member Ticket Assignments table"
          >
            <span>{collapsedCharts['assignment-ticket'] ? '▶' : '▼'}</span> Team Member Ticket Assignments
          </h3>
          {!collapsedCharts['assignment-ticket'] && (
            <div className="summary-table-grid">
              <div>
                <table className={tableClass} style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                  {memberTicketColgroup}
                  <thead>{memberTicketHead}</thead>
                  <tbody>{sortedMemberTicket.slice(0, memberTicketHalf).map((row) => renderMemberTicketRow(row))}</tbody>
                </table>
              </div>
              <div>
                <table className={tableClass} style={{ tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
                  {memberTicketColgroup}
                  <thead>{memberTicketHead}</thead>
                  <tbody>{sortedMemberTicket.slice(memberTicketHalf).map((row) => renderMemberTicketRow(row))}</tbody>
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
