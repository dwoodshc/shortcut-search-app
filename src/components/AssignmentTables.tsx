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
import SortIcon from './SortIcon';
import { COMPLETE_STATE_NAMES } from '../utils';

const TICKET_STATE_COLORS: Record<string, { bg: string; text: string }> = {
  'backlog':               { bg: '#d1d5db', text: '#374151' },
  'ready for development': { bg: '#a7f3d0', text: '#374151' },
  'in development':        { bg: '#6ee7b7', text: '#374151' },
  'in review':             { bg: '#4ade80', text: '#374151' },
};
const DEFAULT_TICKET_STATE_COLOR = { bg: '#F1F5F9', text: '#475569' };

export default function AssignmentTables(): React.JSX.Element | null {
  const {
    epics, members, workflowConfig,
    epicTeamData, memberEpicMap,
    sortState, toggleSortState, resetSortState,
    filterByTeam, selectedTeamIds,
    getEpicStateClass,
    visibleEpicIds,
    viewSettings,
  } = useDashboard();

  const blockedTicketsData = useMemo(() => {
    const map: Record<string, { epicId: number | string; epicName: string; epicAppUrl?: string; tickets: Array<{ id: number; name: string; app_url?: string; owners: string[]; stateName: string }> }> = {};
    for (const epic of epics) {
      if (epic.notFound || !visibleEpicIds.has(epic.id)) continue;
      const stories = epic.stories || [];
      const filtered = filterByTeam && selectedTeamIds.length > 0
        ? stories.filter(s => !s.group_id || selectedTeamIds.includes(s.group_id))
        : stories;
      for (const story of filtered) {
        if (!story.blocked) continue;
        const key = String(epic.id);
        if (!map[key]) map[key] = { epicId: epic.id, epicName: epic.name, epicAppUrl: epic.app_url, tickets: [] };
        map[key].tickets.push({
          id: story.id,
          name: story.name,
          app_url: story.app_url,
          owners: (story.owner_ids || []).map(id => members[id] || id),
          stateName: workflowConfig.states[story.workflow_state_id] || '',
        });
      }
    }
    return Object.values(map);
  }, [epics, visibleEpicIds, members, workflowConfig.states, filterByTeam, selectedTeamIds]);

  const memberTicketData = useMemo(() => {
    const map: Record<string, Array<{ id: number; name: string; app_url?: string; epicName: string; epicAppUrl?: string; stateName: string; blocked?: boolean }>> = {};
    for (const epic of epics) {
      if (epic.notFound || !visibleEpicIds.has(epic.id)) continue;
      const stories = epic.stories || [];
      const filtered = filterByTeam && selectedTeamIds.length > 0
        ? stories.filter(s => !s.group_id || selectedTeamIds.includes(s.group_id))
        : stories;
      for (const story of filtered) {
        const stateName = (workflowConfig.states[story.workflow_state_id] || '').toLowerCase().trim();
        if (COMPLETE_STATE_NAMES.has(stateName)) continue;
        for (const ownerId of story.owner_ids || []) {
          const ownerName = members[ownerId] || ownerId;
          if (!map[ownerName]) map[ownerName] = [];
          map[ownerName].push({ id: story.id, name: story.name, app_url: story.app_url, epicName: epic.name, epicAppUrl: epic.app_url, stateName: workflowConfig.states[story.workflow_state_id] || '', blocked: story.blocked });
        }
      }
    }
    return Object.entries(map).map(([member, tickets]) => ({ member, tickets }));
  }, [epics, visibleEpicIds, members, workflowConfig.states, filterByTeam, selectedTeamIds]);

  const donePill = <span className={`epic-state ${getEpicStateClass('done', 'Done')} !text-[0.75rem] !py-[0.15rem] !px-2 ml-[0.4rem]`}>Done ✓</span>;
  const blockedPill = <span className={`epic-state ${getEpicStateClass('', 'blocked')} !text-[0.75rem] !py-[0.15rem] !px-2 ml-[0.4rem]`}>Blocked</span>;

  if (epicTeamData.length === 0) return null;

  const memberEpicData = Object.entries(memberEpicMap).map(([member, epicsForMember]) => ({ member, epics: epicsForMember }));
  if (memberEpicData.length === 0) return null;

  const tableClass = "w-full bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.08)] border border-[#F0F0F7]";
  const thBaseClass = "px-3 py-2 font-semibold text-sm text-left cursor-pointer select-none whitespace-nowrap text-white";
  const tdClass = "px-3 py-[0.4rem] text-sm border-b border-[#F0F0F7] break-words overflow-hidden";


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

  const sortedBlockedTickets = [...blockedTicketsData].sort((a, b) => {
    if (!sortState.blockedTickets.col) return 0;
    const dir = sortState.blockedTickets.dir === 'asc' ? 1 : -1;
    if (sortState.blockedTickets.col === 'epic') return dir * a.epicName.localeCompare(b.epicName);
    if (sortState.blockedTickets.col === 'count') return dir * (a.tickets.length - b.tickets.length);
    return 0;
  });

  // Shared header renderer for the three assignment tables. Each table has a
  // sortable first column (with restore icon), an optional sortable Count
  // column in the middle, and a static label column on the right.
  const renderHead = (
    sortKey: 'epicTeam' | 'memberEpic' | 'memberTicket' | 'blockedTickets',
    firstCol: { sortField: string; label: string },
    lastCol: { label: string },
    showCount: boolean,
  ): React.JSX.Element => {
    const sort = sortState[sortKey];
    return (
      <tr className="bg-[#494BCB]">
        <th className={`${thBaseClass} rounded-tl-lg`} onClick={() => toggleSortState(sortKey, firstCol.sortField)}>
          {firstCol.label}<SortIcon sort={sort} col={firstCol.sortField} />
          <span className="summary-sort-icon ml-[6px] cursor-pointer" data-tooltip="Restore original order" onClick={(e) => { e.stopPropagation(); resetSortState(sortKey); }} style={{ opacity: sort.col ? 1 : 0.4 }}>
            {ResetIcon}
          </span>
        </th>
        {showCount && (
          <th className={`${thBaseClass} text-center`} onClick={() => toggleSortState(sortKey, 'count')}>
            Count<SortIcon sort={sort} col="count" isNumeric />
          </th>
        )}
        <th className={`${thBaseClass} rounded-tr-lg cursor-default`}>{lastCol.label}</th>
      </tr>
    );
  };

  const epicTeamHead = renderHead('epicTeam', { sortField: 'epic', label: 'Epic' }, { label: 'Team Members' }, false);
  const memberEpicHead = renderHead('memberEpic', { sortField: 'member', label: 'Team Member' }, { label: 'Epics' }, true);
  const memberTicketHead = renderHead('memberTicket', { sortField: 'member', label: 'Team Member' }, { label: 'Open Tickets' }, true);
  const blockedTicketsHead = renderHead('blockedTickets', { sortField: 'epic', label: 'Epic' }, { label: 'Blocked Tickets' }, true);

  const renderEpicTeamRow = (row: EpicTeamEntry) => (
    <tr key={row.id as React.Key} className={row.team.length === 0 ? 'bg-[#fff9c4]' : ''}>
      <td className={`${tdClass} whitespace-nowrap`}>
        <a href={`#epic-${row.id}`} className="text-[#1a202c] no-underline">{row.name}</a>
        {row.isDone && donePill}
        {row.isBlocked && blockedPill}
      </td>
      <td className={`${tdClass} whitespace-nowrap`}>
        {row.team.length === 0
          ? <span className="text-[#1a202c]">None</span>
          : <ul className="m-0 pl-0 list-none">{[...row.team].sort((a, b) => a.localeCompare(b)).map((m, i) => <li key={i} className="whitespace-nowrap">{m}</li>)}</ul>}
      </td>
    </tr>
  );

  const renderMemberEpicRow = (row: { member: string; epics: EpicRef[] }) => (
    <tr key={row.member}>
      <td className={`${tdClass} whitespace-nowrap`}>{row.member}</td>
      <td className={`${tdClass} text-center font-semibold`}>{row.epics.length}</td>
      <td className={`${tdClass} whitespace-nowrap`}>
        <ul className="m-0 pl-0 list-none">
          {[...row.epics].sort((a, b) => a.name.localeCompare(b.name)).map((e) => (
            <li key={e.id as React.Key} className="whitespace-nowrap"><a href={`#epic-${e.id}`} className="text-[#1a202c] no-underline">{e.name}</a>{e.isDone && donePill}{e.isBlocked && blockedPill}</li>
          ))}
        </ul>
      </td>
    </tr>
  );

  const renderMemberTicketRow = (row: { member: string; tickets: Array<{ id: number; name: string; app_url?: string; epicName: string; epicAppUrl?: string; stateName: string; blocked?: boolean }> }) => (
    <tr key={row.member}>
      <td className={`${tdClass} whitespace-nowrap`}>{row.member}</td>
      <td className={`${tdClass} text-center font-semibold`}>{row.tickets.length}</td>
      <td className={`${tdClass} whitespace-nowrap`}>
        {(() => {
          const byEpic: Record<string, typeof row.tickets> = {};
          for (const t of row.tickets) {
            if (!byEpic[t.epicName]) byEpic[t.epicName] = [];
            byEpic[t.epicName].push(t);
          }
          return Object.entries(byEpic).sort(([a], [b]) => a.localeCompare(b)).map(([epicName, tickets]) => (
            <div key={epicName} className="mb-1 last:mb-0">
              <div className="text-[0.85rem] font-semibold text-[#6b7280] mb-[0.1rem] whitespace-nowrap">{tickets[0].epicAppUrl ? <a href={tickets[0].epicAppUrl} className="text-[#6b7280] no-underline" target="_blank" rel="noreferrer">{epicName}</a> : epicName} <span className="font-normal text-[0.75rem]">({tickets.length})</span></div>
              <ul className="m-0 pl-3 list-none">
                {[...tickets].sort((a, b) => a.name.localeCompare(b.name)).map((t) => {
                  const sc = TICKET_STATE_COLORS[t.stateName.toLowerCase()] ?? DEFAULT_TICKET_STATE_COLOR;
                  return (
                    <li key={t.id} className="text-[0.7rem] whitespace-nowrap">
                      {t.blocked && <span className="text-[0.6rem] font-bold px-1.5 py-[0.1rem] rounded-full text-white mr-1" style={{ backgroundColor: '#dc2626', whiteSpace: 'nowrap' }}>Blocked</span>}
                      {t.app_url
                        ? <a href={t.app_url} className="text-[#1a202c] no-underline" target="_blank" rel="noreferrer">{t.name}</a>
                        : <span>{t.name}</span>
                      }
                      {t.stateName && <span className="ml-1 text-[0.6rem] font-medium px-1 py-[0.05rem] rounded" style={{ backgroundColor: sc.bg, color: sc.text }}>{t.stateName}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ));
        })()}
      </td>
    </tr>
  );

  const renderBlockedTicketRow = (row: typeof sortedBlockedTickets[number]) => (
    <tr key={String(row.epicId)}>
      <td className={`${tdClass} whitespace-nowrap`}>
        {row.epicAppUrl
          ? <a href={`#epic-${row.epicId}`} className="text-[#1a202c] no-underline">{row.epicName}</a>
          : <span>{row.epicName}</span>}
      </td>
      <td className={`${tdClass} text-center font-semibold`}>{row.tickets.length}</td>
      <td className={`${tdClass} whitespace-nowrap`}>
        <ul className="m-0 pl-0 list-none">
          {[...row.tickets].sort((a, b) => a.name.localeCompare(b.name)).map((t) => {
            const sc = TICKET_STATE_COLORS[t.stateName.toLowerCase()] ?? DEFAULT_TICKET_STATE_COLOR;
            return (
              <li key={t.id} className="text-[0.7rem] whitespace-nowrap">
                {t.app_url
                  ? <a href={t.app_url} className="text-[#1a202c] no-underline" target="_blank" rel="noreferrer">{t.name}</a>
                  : <span>{t.name}</span>}
                {t.stateName && <span className="ml-1 text-[0.6rem] font-medium px-1 py-[0.05rem] rounded" style={{ backgroundColor: sc.bg, color: sc.text }}>{t.stateName}</span>}
                {t.owners.length > 0 && <span className="ml-1 text-[0.6rem] text-[#6b7280]">{t.owners.join(', ')}</span>}
              </li>
            );
          })}
        </ul>
      </td>
    </tr>
  );

  const epicTeamHalf = Math.ceil(sortedEpicTeam.length / 2);
  const memberEpicHalf = Math.ceil(sortedMemberEpic.length / 2);
  const memberTicketHalf = Math.ceil(sortedMemberTicket.length / 2);
  const blockedTicketsHalf = Math.ceil(sortedBlockedTickets.length / 2);

  return (
    <>
      <div className="flex flex-col gap-4 mb-1">
        {/* Epic Owner Assignments */}
        {viewSettings.showEpicOwnerAssignments && (
          <div>
            <h3 className="m-0 mb-2 text-base font-semibold">Epic Owner Assignments</h3>
            <div className="summary-table-grid">
              <div>
                <table className={tableClass} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>{epicTeamHead}</thead>
                  <tbody>{sortedEpicTeam.slice(0, epicTeamHalf).map((row) => renderEpicTeamRow(row))}</tbody>
                </table>
              </div>
              <div>
                <table className={tableClass} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>{epicTeamHead}</thead>
                  <tbody>{sortedEpicTeam.slice(epicTeamHalf).map((row) => renderEpicTeamRow(row))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Team Member Epic Assignments */}
        {viewSettings.showTeamMemberEpicAssignments && (
          <div>
            <h3 className="m-0 mb-2 text-base font-semibold">Team Member Epic Assignments</h3>
            <div className="summary-table-grid">
              <div>
                <table className={tableClass} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>{memberEpicHead}</thead>
                  <tbody>{sortedMemberEpic.slice(0, memberEpicHalf).map((row) => renderMemberEpicRow(row))}</tbody>
                </table>
              </div>
              <div>
                <table className={tableClass} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>{memberEpicHead}</thead>
                  <tbody>{sortedMemberEpic.slice(memberEpicHalf).map((row) => renderMemberEpicRow(row))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Team Member Ticket Assignments */}
        {viewSettings.showTeamMemberTicketAssignments && (
          <div>
            <h3 className="m-0 mb-2 text-base font-semibold">Team Member Ticket Assignments</h3>
            <div className="summary-table-grid">
              <div>
                <table className={tableClass} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>{memberTicketHead}</thead>
                  <tbody>{sortedMemberTicket.slice(0, memberTicketHalf).map((row) => renderMemberTicketRow(row))}</tbody>
                </table>
              </div>
              <div>
                <table className={tableClass} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>{memberTicketHead}</thead>
                  <tbody>{sortedMemberTicket.slice(memberTicketHalf).map((row) => renderMemberTicketRow(row))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Blocked Tickets */}
        {viewSettings.showBlockedTickets && (
          <div>
            <h3 className="m-0 mb-2 text-base font-semibold">Blocked Tickets</h3>
            {sortedBlockedTickets.length === 0
              ? <p className="text-sm text-[#6b7280] italic">No blocked tickets found.</p>
              : (
                <div className="summary-table-grid">
                  <div>
                    <table className={tableClass} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                      <thead>{blockedTicketsHead}</thead>
                      <tbody>{sortedBlockedTickets.slice(0, blockedTicketsHalf).map((row) => renderBlockedTicketRow(row))}</tbody>
                    </table>
                  </div>
                  <div>
                    <table className={tableClass} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                      <thead>{blockedTicketsHead}</thead>
                      <tbody>{sortedBlockedTickets.slice(blockedTicketsHalf).map((row) => renderBlockedTicketRow(row))}</tbody>
                    </table>
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
      <hr className="border-0 border-t-2 border-slate-200 mb-2" />
    </>
  );
}
