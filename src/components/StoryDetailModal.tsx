/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * StoryDetailModal.tsx — Story detail modal. Shows all stories matching a selected
 * workflow state across every loaded epic. Story name and epic name columns are
 * independently sortable, with a reset button to restore the original load order.
 */
import React from 'react';
import { Epic, Story, SortEntry } from '../types';

interface Props {
  filter: string | null;
  onClose: () => void;
  epics: Epic[];
  workflowStates: Record<number, string>;
  getDisplayStories: (epic: Epic) => Story[];
  sort: SortEntry;
  onSort: (col: string) => void;
  onResetSort: () => void;
}

/**
 * Modal that shows all stories matching a given workflow state across all epics.
 */
export default function StoryDetailModal({
  filter,
  onClose,
  epics,
  workflowStates,
  getDisplayStories,
  sort,
  onSort,
  onResetSort,
}: Props): React.JSX.Element | null {
  if (!filter) return null;

  const rawStories = epics
    .filter(e => !e.notFound)
    .flatMap(epic =>
      getDisplayStories(epic)
        .filter(story => workflowStates[story.workflow_state_id] === filter)
        .map(story => ({ ...story, epicName: epic.name, epicId: epic.id }))
    );

  const sortedStories = [...rawStories].sort((a, b) => {
    if (!sort.col) return 0;
    const dir = sort.dir === 'asc' ? 1 : -1;
    if (sort.col === 'story') return dir * a.name.localeCompare(b.name);
    if (sort.col === 'epic') return dir * a.epicName.localeCompare(b.epicName);
    return 0;
  });

  const sortIcon = (col: string) => {
    const label = sort.col !== col ? 'Click to sort' : sort.dir === 'asc' ? 'Sorted A→Z, click to reverse' : 'Sorted Z→A, click to reverse';
    const icon = sort.col !== col ? ' ↕' : sort.dir === 'asc' ? ' ↑' : ' ↓';
    return <span className="summary-sort-icon" data-tooltip={label}>{icon}</span>;
  };

  const resetIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[14px] h-[14px] align-middle inline-block">
      <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.95-2.05L6.64 18.36A8.955 8.955 0 0 0 13 21a9 9 0 0 0 0-18z"/>
    </svg>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-large flex flex-col" onClick={e => e.stopPropagation()} style={{ maxWidth: '925px', width: '90%', maxHeight: '80vh' }}>
        <div className="flex justify-between items-center mb-[0.25rem]">
          <h2 className="m-0 text-[1.2rem]">Stories — {filter}</h2>
          <button onClick={onClose} className="bg-transparent border-0 text-[1.25rem] cursor-pointer text-[#718096] leading-none">✕</button>
        </div>
        <p className="text-[#718096] text-[0.8rem] m-0 mb-3">{rawStories.length} {rawStories.length === 1 ? 'story' : 'stories'}</p>
        <div className="overflow-y-auto flex-1">
          <table className="w-full border border-[#F0F0F7] rounded-lg" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr className="bg-[#494BCB] text-white sticky top-0">
                <th onClick={() => onSort('story')} className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-sm rounded-tl-lg">
                  Story{sortIcon('story')}
                  {sort.col === 'story' && (
                    <span className="summary-sort-icon ml-[6px] cursor-pointer" data-tooltip="Restore original order" onClick={e => { e.stopPropagation(); onResetSort(); }}>
                      {resetIcon}
                    </span>
                  )}
                </th>
                <th onClick={() => onSort('epic')} className="cursor-pointer select-none px-3 py-2 text-left font-semibold text-sm whitespace-nowrap rounded-tr-lg">
                  Epic{sortIcon('epic')}
                  {sort.col === 'epic' && (
                    <span className="summary-sort-icon ml-[6px] cursor-pointer" data-tooltip="Restore original order" onClick={e => { e.stopPropagation(); onResetSort(); }}>
                      {resetIcon}
                    </span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStories.map((story, idx) => (
                <tr key={story.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
                  <td className="px-3 py-[0.4rem] text-sm border-b border-[#F0F0F7]">
                    {story.app_url
                      ? <a href={story.app_url} target="_blank" rel="noopener noreferrer" className="text-[#494BCB]">{story.name}</a>
                      : story.name}
                  </td>
                  <td className="px-3 py-[0.4rem] text-sm border-b border-[#F0F0F7] whitespace-nowrap">
                    <a href={`#epic-${story.epicId}`} onClick={onClose} className="text-[#494BCB] no-underline">{story.epicName}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
