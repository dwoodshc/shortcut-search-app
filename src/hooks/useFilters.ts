/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * useFilters.ts — UI filter and view-state hook. Manages the team filter, ignored-user
 * list, per-table sort state, chart collapse flags, and smooth-scroll navigation.
 * Exposes getDisplayStories, which applies the active team filter to a given epic's
 * story list.
 */
import { useState, useCallback } from 'react';
import { storage } from '../utils';
import { Epic, Story, SortState, SortStateKey, TeamConfig } from '../types';

export function useFilters() {
  const [filterByTeam, setFilterByTeam] = useState(false);
  const [filterIgnoredInTickets, setFilterIgnoredInTickets] = useState(true);
  const [ignoredUsers, setIgnoredUsers] = useState<string[]>(() => storage.getIgnoredUsers());
  const [selectedTeams, setSelectedTeams] = useState<TeamConfig[]>(() => storage.getTeamConfig());
  const [sortState, setSortState] = useState<SortState>({
    summary:    { col: null, dir: 'asc' },
    epicTeam:   { col: null, dir: 'asc' },
    memberEpic: { col: 'member', dir: 'asc' },
    storyDetail:{ col: null, dir: 'asc' },
  });
  const [collapsedCharts, setCollapsedCharts] = useState<Record<string, boolean>>({});

  const selectedTeamIds = selectedTeams.map(t => t.id);
  const selectedTeamLabel = selectedTeams.map(t => t.name).join(' & ');

  const toggleSortState = useCallback((key: SortStateKey, col: string) => setSortState(prev => {
    const curr = prev[key];
    return { ...prev, [key]: curr.col === col && curr.dir === 'asc' ? { col, dir: 'desc' as const } : { col, dir: 'asc' as const } };
  }), []);

  const resetSortState = useCallback((key: SortStateKey) => setSortState(prev => ({ ...prev, [key]: { col: null, dir: 'asc' as const } })), []);

  const toggleChart = useCallback((epicId: number | string, chartType: string) => {
    setCollapsedCharts(prev => ({
      ...prev,
      [`${epicId}-${chartType}`]: !prev[`${epicId}-${chartType}`]
    }));
  }, []);

  const getDisplayStories = useCallback((epic: Epic): Story[] => {
    if (!filterByTeam || selectedTeamIds.length === 0) return epic.stories || [];
    return (epic.stories || []).filter(story => !story.group_id || selectedTeamIds.includes(story.group_id));
  }, [filterByTeam, selectedTeamIds]);

  return {
    filterByTeam, setFilterByTeam,
    filterIgnoredInTickets, setFilterIgnoredInTickets,
    ignoredUsers, setIgnoredUsers,
    selectedTeams, setSelectedTeams,
    selectedTeamIds,
    selectedTeamLabel,
    sortState, toggleSortState, resetSortState,
    collapsedCharts, setCollapsedCharts, toggleChart,
    getDisplayStories,
  };
}
