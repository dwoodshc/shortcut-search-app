/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * AssignmentViewsRow.tsx — The "Assignments Views:" peek-icon row that toggles
 * visibility of the three assignment tables. Rendered separately from the
 * AssignmentTables tables themselves so it can sit at the top of the page.
 */
import React from 'react';
import { useDashboard } from '../context/DashboardContext';
import { TargetIcon, UsersIcon, TicketIcon } from './icons';
import PeekButton from './PeekButton';
import { ViewSettings } from '../types';

export default function AssignmentViewsRow(): React.JSX.Element {
  const { viewSettings, setViewSettings } = useDashboard();
  const updateViewSetting = (key: keyof ViewSettings, value: boolean) =>
    setViewSettings({ ...viewSettings, [key]: value });

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
    </div>
  );
}
