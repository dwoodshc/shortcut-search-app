/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * useEpicsData.ts — Data-fetching hook for all Shortcut API calls. Runs epic searches
 * in parallel, loads nested stories, resolves member names (with localStorage caching),
 * detects rate-limit (HTTP 429) and auth errors, and supports request cancellation
 * via AbortController.
 */
import { useState, useRef, useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import { storage, getApiBaseUrl } from '../utils';
import { Epic, EpicState, LoadProgress, LoadStats } from '../types';

interface UseEpicsDataParams {
  epicNames: string[];
  loadSelectedWorkflow: () => void;
  setCollapsedCharts: Dispatch<SetStateAction<Record<string, boolean>>>;
  onRateLimit: () => void;
  setFilteredEpicNames: Dispatch<SetStateAction<string[]>>;
}

export function useEpicsData({ epicNames, loadSelectedWorkflow, setCollapsedCharts, onRateLimit, setFilteredEpicNames }: UseEpicsDataParams) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [members, setMembers] = useState<Record<string, string>>(() => storage.getMembersCache());
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState<LoadProgress>({ loaded: 0, total: 0 });
  const [loadStats, setLoadStats] = useState<LoadStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiTokenIssue, setApiTokenIssue] = useState(false);
  const [epicStates, setEpicStates] = useState<Record<number, EpicState>>({});
  const [teamMemberIds, setTeamMemberIds] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (Object.keys(members).length > 0) {
      storage.setMembersCache(members);
    }
  }, [members]);

  const handleApiError = useCallback(async (response: Response): Promise<boolean> => {
    if (response.status === 429) {
      abortControllerRef.current?.abort();
      setLoading(false);
      onRateLimit();
      return true;
    }
    if (response.status === 401 || response.status === 403) {
      setApiTokenIssue(true);
      setError('API Token Error: Unable to authenticate with Shortcut API. Please check your API token.');
      setLoading(false);
      return true;
    }
    try {
      const data = await response.json();
      if (data.error && ['token', 'unauthorized', 'authentication'].some((k: string) => data.error.toLowerCase().includes(k))) {
        setApiTokenIssue(true);
        setError(`API Token Error: ${data.error}`);
        setLoading(false);
        return true;
      }
    } catch (e) {}
    return false;
  }, [onRateLimit]);

  const fetchUserName = useCallback(async (userId: string): Promise<string> => {
    if (members[userId]) return members[userId];
    try {
      const token = storage.getApiToken();
      if (!token) return userId;
      const response = await fetch(`${getApiBaseUrl()}/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const user = await response.json();
        const userName: string = user.profile.name;
        setMembers(prev => ({ ...prev, [userId]: userName }));
        return userName;
      } else {
        await handleApiError(response);
      }
    } catch (err) {}
    return userId;
  }, [members, handleApiError]);

  useEffect(() => {
    const fetchOwnerNames = async () => {
      const ownerIds = new Set<string>();
      epics.forEach(epic => {
        if (epic.owner_ids) epic.owner_ids.forEach(id => ownerIds.add(id));
        if (epic.stories) epic.stories.forEach(story => {
          if (story.owner_ids) story.owner_ids.forEach(id => ownerIds.add(id));
        });
      });
      for (const ownerId of Array.from(ownerIds)) {
        if (!members[ownerId]) await fetchUserName(ownerId);
      }
    };
    if (epics.length > 0) fetchOwnerNames();
  }, [epics, members, fetchUserName]);

  const cancelSearch = (): void => {
    abortControllerRef.current?.abort();
  };

  const loadEpics = useCallback(async (): Promise<void> => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const searchStartTime = Date.now();

    setLoading(true);
    setLoadProgress({ loaded: 0, total: 0 });
    setError(null);
    setApiTokenIssue(false);
    setEpics([]);
    setLoadStats(null);

    try {
      loadSelectedWorkflow();

      let epicNamesToSearch = epicNames;
      const epicsConfig = storage.getEpicsConfig();
      if (epicsConfig?.epics) {
        epicNamesToSearch = epicsConfig.epics.map(e => e.name);
        setFilteredEpicNames(epicNamesToSearch);
      }

      const token = storage.getApiToken();

      const teamConfigs = storage.getTeamConfig();
      let teamApiCall = false;
      if (teamConfigs.length > 0) {
        const allMemberIds = new Set<string>();
        const uncachedTeamIds: string[] = [];
        for (const teamConfig of teamConfigs) {
          const cachedMemberIds = storage.getTeamMembersCache(teamConfig.id);
          if (cachedMemberIds) {
            cachedMemberIds.forEach(id => allMemberIds.add(id));
          } else {
            uncachedTeamIds.push(teamConfig.id);
          }
        }
        if (uncachedTeamIds.length > 0) {
          teamApiCall = true;
          try {
            const teamsRes = await fetch(`${getApiBaseUrl()}/api/teams`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (teamsRes.ok) {
              const teams = await teamsRes.json();
              for (const teamId of uncachedTeamIds) {
                const team = teams.find((t: { id: string; member_ids?: string[] }) => t.id === teamId);
                if (team?.member_ids) {
                  team.member_ids.forEach((id: string) => allMemberIds.add(id));
                  storage.setTeamMembersCache(teamId, team.member_ids);
                }
              }
            }
          } catch (err) {}
        }
        setTeamMemberIds(allMemberIds);
      }

      let workflowApiCall = false;
      const cachedEpicWorkflow = storage.getEpicWorkflowCache();
      if (cachedEpicWorkflow) {
        setEpicStates(cachedEpicWorkflow);
      } else {
        workflowApiCall = true;
        try {
          const ewResponse = await fetch(`${getApiBaseUrl()}/api/epic-workflow`, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: controller.signal
          });
          if (ewResponse.ok) {
            const ewData = await ewResponse.json();
            const stateMap: Record<number, EpicState> = {};
            (ewData.epic_states || []).forEach((s: { id: number; name: string; type: string }) => {
              stateMap[s.id] = { name: s.name, type: s.type };
            });
            setEpicStates(stateMap);
            storage.setEpicWorkflowCache(stateMap);
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.name !== 'AbortError') console.warn('Could not fetch epic workflow:', err.message);
        }
      }

      setLoadProgress({ loaded: 0, total: epicNamesToSearch.length });
      const epicsWithStories = await Promise.all(
        epicNamesToSearch.map(async (name): Promise<Epic | null> => {
          try {
            const searchResponse = await fetch(
              `${getApiBaseUrl()}/api/search/epics?query=${encodeURIComponent(name)}`,
              { headers: { 'Authorization': `Bearer ${token}` }, signal: controller.signal }
            );
            if (!searchResponse.ok) {
              await handleApiError(searchResponse);
              return null;
            }
            const searchData = await searchResponse.json();
            const results: Epic[] = searchData.data || [];
            const match = results.find(e => e.name.toLowerCase() === name.toLowerCase());
            if (!match) return null;

            try {
              const epicResponse = await fetch(`${getApiBaseUrl()}/api/epics/${match.id}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                signal: controller.signal
              });
              if (epicResponse.ok) {
                const epic: Epic = await epicResponse.json();
                try {
                  const storiesResponse = await fetch(`${getApiBaseUrl()}/api/epics/${epic.id}/stories`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: controller.signal
                  });
                  if (storiesResponse.ok) {
                    return { ...epic, stories: await storiesResponse.json() };
                  } else {
                    await handleApiError(storiesResponse);
                  }
                } catch (err) {}
                return epic;
              } else {
                await handleApiError(epicResponse);
              }
            } catch (err) {}
            return match;
          } catch (err) {
            return null;
          } finally {
            setLoadProgress(prev => ({ ...prev, loaded: prev.loaded + 1 }));
          }
        })
      );

      const allEpics: Epic[] = epicNamesToSearch.map((name, i) =>
        epicsWithStories[i] || { id: `not-found-${name}`, name, notFound: true, state: '' }
      );
      setEpics(allEpics);

      const foundCount = allEpics.filter(e => !e.notFound).length;
      const allOwnerIds = new Set(allEpics.flatMap(e => (e.stories || []).flatMap(s => s.owner_ids || [])));
      const cachedMemberIds = Object.keys(storage.getMembersCache());
      const uncachedMemberCalls = [...allOwnerIds].filter(id => !cachedMemberIds.includes(id)).length;
      const totalApiCalls = (teamApiCall ? 1 : 0) + (workflowApiCall ? 1 : 0) + epicNamesToSearch.length + (foundCount * 2) + uncachedMemberCalls;
      setLoadStats({ loadTime: Date.now() - searchStartTime, apiCallCount: totalApiCalls, loadedAt: new Date() });

      const newCollapsedState: Record<string, boolean> = { 'assignment-epic': true, 'assignment-member': true };
      allEpics.forEach(epic => {
        if (!epic.notFound) {
          newCollapsedState[`${epic.id}-stories`] = true;
          newCollapsedState[`${epic.id}-workflow-pie`] = true;
          newCollapsedState[`${epic.id}-type-pie`] = true;
        }
      });
      setCollapsedCharts(prev => ({ ...prev, ...newCollapsedState }));

    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') setError(err.message);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [epicNames, loadSelectedWorkflow, setCollapsedCharts, setFilteredEpicNames, handleApiError]);

  return {
    epics, setEpics,
    members, setMembers,
    loading, loadProgress, loadStats,
    error, setError,
    apiTokenIssue,
    epicStates,
    teamMemberIds, setTeamMemberIds,
    loadEpics, cancelSearch,
  };
}
