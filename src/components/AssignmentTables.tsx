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
import { ResetIcon, TargetIcon, UsersIcon, TicketIcon } from './icons';
import PeekButton from './PeekButton';
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
    viewSettings, setViewSettings,
  } = useDashboard();
  const updateViewSetting = (key: keyof typeof viewSettings, value: boolean) =>
    setViewSettings({ ...viewSettings, [key]: value });

  const memberTicketData = useMemo(() => {
    const map: Record<string, Array<{ id: number; name: string; app_url?: string; epicName: string; epicAppUrl?: string; stateName: string }>> = {};
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
          map[ownerName].push({ id: story.id, name: story.name, app_url: story.app_url, epicName: epic.name, epicAppUrl: epic.app_url, stateName: workflowConfig.states[story.workflow_state_id] || '' });
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

  const epicTeamHead = (
    <tr className="bg-[#494BCB]">
      <th className={`${thBaseClass} rounded-tl-lg`} onClick={() => toggleSortState('epicTeam', 'epic')}>
        Epic<SortIcon sort={sortState.epicTeam} col="epic" />
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
        Team Member<SortIcon sort={sortState.memberEpic} col="member" />
        <span className="summary-sort-icon ml-[6px] cursor-pointer" data-tooltip="Restore original order" onClick={(e) => { e.stopPropagation(); resetSortState('memberEpic'); }} style={{ opacity: sortState.memberEpic.col ? 1 : 0.4 }}>
          {ResetIcon}
        </span>
      </th>
      <th className={`${thBaseClass} text-center`} onClick={() => toggleSortState('memberEpic', 'count')}>
        Count<SortIcon sort={sortState.memberEpic} col="count" isNumeric />
      </th>
      <th className={`${thBaseClass} rounded-tr-lg cursor-default`}>Epics</th>
    </tr>
  );

  const memberTicketHead = (
    <tr className="bg-[#494BCB]">
      <th className={`${thBaseClass} rounded-tl-lg`} onClick={() => toggleSortState('memberTicket', 'member')}>
        Team Member<SortIcon sort={sortState.memberTicket} col="member" />
        <span className="summary-sort-icon ml-[6px] cursor-pointer" data-tooltip="Restore original order" onClick={(e) => { e.stopPropagation(); resetSortState('memberTicket'); }} style={{ opacity: sortState.memberTicket.col ? 1 : 0.4 }}>
          {ResetIcon}
        </span>
      </th>
      <th className={`${thBaseClass} text-center`} onClick={() => toggleSortState('memberTicket', 'count')}>
        Count<SortIcon sort={sortState.memberTicket} col="count" isNumeric />
      </th>
      <th className={`${thBaseClass} rounded-tr-lg cursor-default`}>Open Tickets</th>
    </tr>
  );

  const renderEpicTeamRow = (row: EpicTeamEntry) => (
    <tr key={row.id as React.Key} className={row.team.length === 0 ? 'bg-[#fff9c4]' : ''}>
      <td className={tdClass}>
        <a href={`#epic-${row.id}`} className="text-[#1a202c] no-underline">{row.name}</a>
        {row.isDone && donePill}
        {row.isBlocked && blockedPill}
      </td>
      <td className={tdClass}>
        {row.team.length === 0
          ? <span className="text-[#1a202c]">None</span>
          : <ul className="m-0 pl-0 list-none">{[...row.team].sort((a, b) => a.localeCompare(b)).map((m, i) => <li key={i}>{m}</li>)}</ul>}
      </td>
    </tr>
  );

  const renderMemberEpicRow = (row: { member: string; epics: EpicRef[] }) => (
    <tr key={row.member}>
      <td className={tdClass}>{row.member}</td>
      <td className={`${tdClass} text-center font-semibold`}>{row.epics.length}</td>
      <td className={tdClass}>
        <ul className="m-0 pl-0 list-none">
          {[...row.epics].sort((a, b) => a.name.localeCompare(b.name)).map((e) => (
            <li key={e.id as React.Key}><a href={`#epic-${e.id}`} className="text-[#1a202c] no-underline">{e.name}</a>{e.isDone && donePill}{e.isBlocked && blockedPill}</li>
          ))}
        </ul>
      </td>
    </tr>
  );

  const renderMemberTicketRow = (row: { member: string; tickets: Array<{ id: number; name: string; app_url?: string; epicName: string; epicAppUrl?: string; stateName: string }> }) => (
    <tr key={row.member}>
      <td className={tdClass}>{row.member}</td>
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
                {[...tickets].sort((a, b) => a.name.localeCompare(b.name)).map((t) => {
                  const sc = TICKET_STATE_COLORS[t.stateName.toLowerCase()] ?? DEFAULT_TICKET_STATE_COLOR;
                  return (
                    <li key={t.id} className="text-[0.7rem]">
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

  const epicTeamHalf = Math.ceil(sortedEpicTeam.length / 2);
  const memberEpicHalf = Math.ceil(sortedMemberEpic.length / 2);
  const memberTicketHalf = Math.ceil(sortedMemberTicket.length / 2);
  const colgroup = <colgroup><col style={{ width: '50%' }} /><col style={{ width: '50%' }} /></colgroup>;
  const memberEpicColgroup = <colgroup><col style={{ width: '25%' }} /><col style={{ width: '8%' }} /><col style={{ width: '67%' }} /></colgroup>;
  const memberTicketColgroup = <colgroup><col style={{ width: '25%' }} /><col style={{ width: '8%' }} /><col style={{ width: '67%' }} /></colgroup>;

  return (
    <>
      <div className="flex flex-col gap-4 mb-4">
        {/* Peek-icon row: toggles for the three assignment tables */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.8rem] font-semibold text-[#64748b]">Assignments Views:</span>
          <PeekButton
            icon={TargetIcon}
            label="Epic Owner Assignments"
            tooltip={viewSettings.showEpicOwnerAssignments ? 'Hide Epic Owner Assignments' : 'Show Epic Owner Assignments'}
            onClick={() => updateViewSetting('showEpicOwnerAssignments', !viewSettings.showEpicOwnerAssignments)}
            hidden={!viewSettings.showEpicOwnerAssignments}
          />
          <PeekButton
            icon={UsersIcon}
            label="Team Member Epic Assignments"
            tooltip={viewSettings.showTeamMemberEpicAssignments ? 'Hide Team Member Epic Assignments' : 'Show Team Member Epic Assignments'}
            onClick={() => updateViewSetting('showTeamMemberEpicAssignments', !viewSettings.showTeamMemberEpicAssignments)}
            hidden={!viewSettings.showTeamMemberEpicAssignments}
          />
          <PeekButton
            icon={TicketIcon}
            label="Team Member Ticket Assignments"
            tooltip={viewSettings.showTeamMemberTicketAssignments ? 'Hide Team Member Ticket Assignments' : 'Show Team Member Ticket Assignments'}
            onClick={() => updateViewSetting('showTeamMemberTicketAssignments', !viewSettings.showTeamMemberTicketAssignments)}
            hidden={!viewSettings.showTeamMemberTicketAssignments}
          />
        </div>

        {/* Epic Owner Assignments */}
        {viewSettings.showEpicOwnerAssignments && (
          <div>
            <h3 className="m-0 mb-2 text-base font-semibold">Epic Owner Assignments</h3>
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
          </div>
        )}

        {/* Team Member Epic Assignments */}
        {viewSettings.showTeamMemberEpicAssignments && (
          <div>
            <h3 className="m-0 mb-2 text-base font-semibold">Team Member Epic Assignments</h3>
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
          </div>
        )}

        {/* Team Member Ticket Assignments */}
        {viewSettings.showTeamMemberTicketAssignments && (
          <div>
            <h3 className="m-0 mb-2 text-base font-semibold">Team Member Ticket Assignments</h3>
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
          </div>
        )}
      </div>
      <hr className="border-0 border-t-2 border-slate-200 mb-4" />
    </>
  );
}
