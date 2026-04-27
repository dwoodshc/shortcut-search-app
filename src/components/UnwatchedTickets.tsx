/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * UnwatchedTickets.tsx — Scans all loaded epics and their stories for open tickets
 * in the selected teams that the configured user (storage.getMyName) is not watching.
 * Resolves the user's member UUID via the members cache or a full /api/members fetch.
 */
import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { storage, getApiBaseUrl, COMPLETE_STATE_NAMES } from '../utils';
import { Epic, Story } from '../types';

interface UnwatchedTicket {
  id: number | string;
  displayId: string;
  type: string;
  name: string;
  app_url?: string;
  epicAnchor?: string;
}

function collectUnwatched(
  epics: Epic[],
  selectedTeamIds: string[],
  stateNames: Record<number, string>,
  myMemberId: string,
  getEpicStateDone: (epic: Epic) => boolean,
): UnwatchedTicket[] {
  const tickets: UnwatchedTicket[] = [];

  for (const epic of epics) {
    if (epic.notFound) continue;

    const epicInScope = selectedTeamIds.length === 0 ||
      (epic.stories || []).some(s => s.group_id && selectedTeamIds.includes(s.group_id));

    if (epicInScope && !getEpicStateDone(epic) && !(epic.follower_ids || []).includes(myMemberId)) {
      tickets.push({
        id: epic.id,
        displayId: `Epic #${epic.id}`,
        type: 'Epic',
        name: epic.name,
        app_url: epic.app_url,
        epicAnchor: `#epic-${epic.id}`,
      });
    }

    for (const story of epic.stories || []) {
      if (selectedTeamIds.length > 0 && (!story.group_id || !selectedTeamIds.includes(story.group_id))) continue;
      const stateName = (stateNames[story.workflow_state_id] || '').toLowerCase().trim();
      if (COMPLETE_STATE_NAMES.has(stateName)) continue;
      if ((story.follower_ids || []).includes(myMemberId)) continue;
      tickets.push({
        id: story.id,
        displayId: `SC-${story.id}`,
        type: story.story_type.charAt(0).toUpperCase() + story.story_type.slice(1),
        name: story.name,
        app_url: story.app_url,
      });
    }
  }

  return tickets;
}

export default function UnwatchedTickets(): React.JSX.Element | null {
  const { epics, members, selectedTeamIds, workflowConfig, getEpicStateInfo } = useDashboard();
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [nameNotFound, setNameNotFound] = useState(false);

  const myName = storage.getMyName();

  useEffect(() => {
    if (!myName || myMemberId) return;

    const cached = Object.entries(members).find(
      ([, name]) => name.toLowerCase() === myName.toLowerCase()
    );
    if (cached) { setMyMemberId(cached[0]); return; }

    const token = storage.getApiToken();
    if (!token) return;
    fetch(`${getApiBaseUrl()}/api/members`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((all: { id: string; profile: { name: string } }[] | null) => {
        if (!all) return;
        const match = all.find(m => m.profile.name.toLowerCase() === myName.toLowerCase());
        if (match) setMyMemberId(match.id);
        else setNameNotFound(true);
      })
      .catch(() => {});
  }, [myName, myMemberId, members]);

  if (!myName || epics.length === 0) return null;
  if (!myMemberId) return nameNotFound ? (
    <div className="mb-4 text-sm text-[#dc2626]">
      Unwatched tickets: could not find Shortcut member matching name &ldquo;{myName}&rdquo;.
    </div>
  ) : null;

  const getEpicStateDone = (epic: Epic) => getEpicStateInfo(epic).type?.toLowerCase() === 'done';
  const tickets = collectUnwatched(epics, selectedTeamIds, workflowConfig.states, myMemberId, getEpicStateDone);

  if (tickets.length === 0) return null;

  const tableClass = 'w-full bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.08)] border border-[#F0F0F7]';
  const tdClass = 'px-3 py-[0.4rem] text-sm border-b border-[#F0F0F7]';

  const typeColor = (type: string) => {
    if (type === 'Epic') return '#7c3aed';
    if (type === 'Bug') return '#dc2626';
    if (type === 'Chore') return '#64748b';
    return '#1d4ed8';
  };

  return (
    <div className="mb-4">
      <h3 className="m-0 mb-2 text-base font-semibold">
        ⚠️ Unwatched Open Tickets — {myName}
      </h3>
      <div className="lcars-table-frame">
        <table className={tableClass} style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <colgroup>
            <col style={{ width: '12%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '78%' }} />
          </colgroup>
          <thead>
            <tr className="bg-[#494BCB]">
              <th className="px-3 py-2 font-semibold text-sm text-left text-white rounded-tl-lg whitespace-nowrap">Ticket ID</th>
              <th className="px-3 py-2 font-semibold text-sm text-left text-white whitespace-nowrap">Type</th>
              <th className="px-3 py-2 font-semibold text-sm text-left text-white rounded-tr-lg">Description</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={`${t.type}-${t.id}`}>
                <td className={tdClass}>
                  {t.app_url ? (
                    <a href={t.app_url} target="_blank" rel="noopener noreferrer" className="text-[#494BCB] no-underline hover:underline font-mono text-xs">
                      {t.displayId}
                    </a>
                  ) : t.epicAnchor ? (
                    <a href={t.epicAnchor} className="text-[#494BCB] no-underline hover:underline font-mono text-xs">
                      {t.displayId}
                    </a>
                  ) : (
                    <span className="font-mono text-xs text-[#64748b]">{t.displayId}</span>
                  )}
                </td>
                <td className={tdClass}>
                  <span
                    className="text-xs font-semibold px-2 py-[0.15rem] rounded-full text-white"
                    style={{ backgroundColor: typeColor(t.type) }}
                  >
                    {t.type}
                  </span>
                </td>
                <td className={`${tdClass} break-words`}>{t.name}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="px-3 py-2 text-xs text-[#64748b] font-semibold border-t border-[#F0F0F7]">
                {tickets.length} unwatched ticket{tickets.length !== 1 ? 's' : ''} in selected teams
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <hr className="border-0 border-t-2 border-slate-200 mt-4" />
    </div>
  );
}
