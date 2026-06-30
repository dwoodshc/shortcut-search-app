/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * AssignmentViewsRow.tsx — The "Assignments Views:" peek-icon row that toggles
 * visibility of the three assignment tables. Rendered separately from the
 * AssignmentTables tables themselves so it can sit at the top of the page.
 */
import React, { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { TargetIcon, UsersIcon, TicketIcon, BlockedIcon, LinkIcon } from './icons';
import PeekButton from './PeekButton';
import { ViewSettings } from '../types';

export default function AssignmentViewsRow(): React.JSX.Element {
  const { viewSettings, setViewSettings, epics, visibleEpicIds, filterByTeam, selectedTeamIds } = useDashboard();
  const updateViewSetting = (key: keyof ViewSettings, value: boolean) =>
    setViewSettings({ ...viewSettings, [key]: value });

  const blockedTicketsCount = useMemo(() => {
    let count = 0;
    for (const epic of epics) {
      if (epic.notFound || !visibleEpicIds.has(epic.id)) continue;
      const stories = epic.stories || [];
      const filtered = filterByTeam && selectedTeamIds.length > 0
        ? stories.filter(s => !s.group_id || selectedTeamIds.includes(s.group_id))
        : stories;
      for (const story of filtered) {
        if (story.blocked) count++;
      }
    }
    return count;
  }, [epics, visibleEpicIds, filterByTeam, selectedTeamIds]);

  const topBlockingCount = useMemo(() => {
    const storyMap = new Set<number>();
    for (const epic of epics) {
      for (const story of epic.stories || []) storyMap.add(story.id);
    }
    let count = 0;
    for (const epic of epics) {
      if (epic.notFound || !visibleEpicIds.has(epic.id)) continue;
      const stories = epic.stories || [];
      const filtered = (filterByTeam && selectedTeamIds.length > 0
        ? stories.filter(s => !s.group_id || selectedTeamIds.includes(s.group_id))
        : stories).filter(s => !s.archived);
      for (const story of filtered) {
        const resolvedBlockingCount = (story.story_links || [])
          .filter(l => l.verb === 'blocks' && l.subject_id === story.id && storyMap.has(l.object_id))
          .length;
        if (resolvedBlockingCount >= 2) count++;
      }
    }
    return count;
  }, [epics, visibleEpicIds, filterByTeam, selectedTeamIds]);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-1">
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
      <span className="text-[0.8rem] font-semibold text-[#64748b] ml-2">Ticket Views:</span>
      <span className="inline-flex items-center gap-1">
        <PeekButton
          icon={BlockedIcon}
          label="Blocked Epics"
          tooltip={viewSettings.showBlockedEpics ? 'Hide Blocked Epics' : 'Show epics marked as "Blocked", or have a blocked relationship to another ticket'}
          onClick={() => updateViewSetting('showBlockedEpics', !viewSettings.showBlockedEpics)}
          hidden={!viewSettings.showBlockedEpics}
        />
        {blockedTicketsCount > 0 && (
          <span className="text-[0.6rem] font-bold px-1.5 py-[0.1rem] rounded-full text-white" style={{ backgroundColor: '#dc2626' }}>
            {blockedTicketsCount}
          </span>
        )}
      </span>
      <span className="inline-flex items-center gap-1">
        <PeekButton
          icon={LinkIcon}
          label="Top Blocking Tickets"
          tooltip={viewSettings.showTopBlockingTickets ? 'Hide Top Blocking Tickets' : 'Show tickets that are blocking 2 or more other tickets'}
          onClick={() => updateViewSetting('showTopBlockingTickets', !viewSettings.showTopBlockingTickets)}
          hidden={!viewSettings.showTopBlockingTickets}
        />
        {topBlockingCount > 0 && (
          <span className="text-[0.6rem] font-bold px-1.5 py-[0.1rem] rounded-full text-white" style={{ backgroundColor: '#dc2626' }}>
            {topBlockingCount}
          </span>
        )}
      </span>
    </div>
  );
}
