/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * utils.ts — Browser utility module. Provides a typed storage facade over localStorage,
 * a dynamic API base URL helper (getApiBaseUrl), and an SVG arc-path generator for
 * pie chart slices (createPieSlice).
 */
import { WorkflowStorageConfig, EpicConfig, TeamConfig } from './types';

export const COMPLETE_STATE_NAMES = new Set(['complete']);

export const STORAGE_KEYS = {
  API_TOKEN: 'shortcut_api_token',
  WORKFLOW_CONFIG: 'shortcut_workflow_config',
  EPICS_CONFIG: 'shortcut_epics_config',
  MEMBERS_CACHE: 'shortcut_members_cache',
  TEAM_CONFIG: 'shortcut_team_config',
  TEAM_MEMBERS_CACHE: 'shortcut_team_members_cache',
  EPIC_WORKFLOW_CACHE: 'shortcut_epic_workflow_cache',
  IGNORED_USERS: 'shortcut_ignored_users',
  DISPLAY_MODE: 'shortcut_display_mode',
  MY_NAME: 'shortcut_my_name',
  MIGRATION_COMPLETED: 'migration_completed',
} as const;

const migrateApiToken = (): void => {
  const inSession = sessionStorage.getItem(STORAGE_KEYS.API_TOKEN);
  if (inSession) {
    localStorage.setItem(STORAGE_KEYS.API_TOKEN, inSession);
    sessionStorage.removeItem(STORAGE_KEYS.API_TOKEN);
  }
};
migrateApiToken();

export const storage = {
  getApiToken: (): string | null => localStorage.getItem(STORAGE_KEYS.API_TOKEN),
  setApiToken: (token: string): void => { localStorage.setItem(STORAGE_KEYS.API_TOKEN, token); },

  getWorkflowConfig: (): WorkflowStorageConfig | null => {
    const data = localStorage.getItem(STORAGE_KEYS.WORKFLOW_CONFIG);
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
  },
  setWorkflowConfig: (config: WorkflowStorageConfig): void => { localStorage.setItem(STORAGE_KEYS.WORKFLOW_CONFIG, JSON.stringify(config)); },

  getEpicsConfig: (): EpicConfig | null => {
    const data = localStorage.getItem(STORAGE_KEYS.EPICS_CONFIG);
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
  },
  setEpicsConfig: (config: EpicConfig): void => { localStorage.setItem(STORAGE_KEYS.EPICS_CONFIG, JSON.stringify(config)); },

  getMembersCache: (): Record<string, string> => {
    const data = localStorage.getItem(STORAGE_KEYS.MEMBERS_CACHE);
    if (!data) return {};
    try { return JSON.parse(data); } catch { return {}; }
  },
  setMembersCache: (cache: Record<string, string>): void => { localStorage.setItem(STORAGE_KEYS.MEMBERS_CACHE, JSON.stringify(cache)); },

  getTeamConfig: (): TeamConfig[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TEAM_CONFIG);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      // Migrate from old single-team format { id, name } to array
      if (Array.isArray(parsed)) return parsed;
      return [parsed];
    } catch { return []; }
  },
  setTeamConfig: (configs: TeamConfig[]): void => { localStorage.setItem(STORAGE_KEYS.TEAM_CONFIG, JSON.stringify(configs)); },

  getTeamMembersCache: (teamId: string): string[] | null => {
    const data = localStorage.getItem(STORAGE_KEYS.TEAM_MEMBERS_CACHE);
    if (!data) return null;
    try {
      const parsed = JSON.parse(data);
      // Old format had a 'memberIds' key — not compatible with new map format
      if ('memberIds' in parsed) return null;
      return parsed[teamId] || null;
    } catch { return null; }
  },
  setTeamMembersCache: (teamId: string, memberIds: string[]): void => {
    const data = localStorage.getItem(STORAGE_KEYS.TEAM_MEMBERS_CACHE);
    let cache: Record<string, string[]> = {};
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (!('memberIds' in parsed)) cache = parsed;
      } catch {}
    }
    cache[teamId] = memberIds;
    localStorage.setItem(STORAGE_KEYS.TEAM_MEMBERS_CACHE, JSON.stringify(cache));
  },

  getEpicWorkflowCache: (): Record<number, { name: string; type: string }> | null => {
    const data = localStorage.getItem(STORAGE_KEYS.EPIC_WORKFLOW_CACHE);
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
  },
  setEpicWorkflowCache: (stateMap: Record<number, { name: string; type: string }>): void => {
    localStorage.setItem(STORAGE_KEYS.EPIC_WORKFLOW_CACHE, JSON.stringify(stateMap));
  },

  getIgnoredUsers: (): string[] => {
    const data = localStorage.getItem(STORAGE_KEYS.IGNORED_USERS);
    if (!data) return [];
    try { return JSON.parse(data); } catch { return []; }
  },
  setIgnoredUsers: (users: string[]): void => { localStorage.setItem(STORAGE_KEYS.IGNORED_USERS, JSON.stringify(users)); },

  getDisplayMode: (): 'normal' | 'dark' | 'star-trek' | 'matrix' => {
    const val = localStorage.getItem(STORAGE_KEYS.DISPLAY_MODE);
    if (val === 'dark' || val === 'star-trek' || val === 'matrix') return val;
    return 'normal';
  },
  setDisplayMode: (mode: 'normal' | 'dark' | 'star-trek' | 'matrix'): void => { localStorage.setItem(STORAGE_KEYS.DISPLAY_MODE, mode); },

  getMyName: (): string => localStorage.getItem(STORAGE_KEYS.MY_NAME) || '',
  setMyName: (name: string): void => { localStorage.setItem(STORAGE_KEYS.MY_NAME, name); },
};

export const getApiBaseUrl = (): string => `http://${window.location.hostname}:3001`;

export const createPieSlice = (startAngle: number, angle: number, radius = 80): string => {
  const centerX = 100;
  const centerY = 100;
  if (angle >= 359.9) {
    const startRad = (startAngle - 90) * Math.PI / 180;
    const midRad   = (startAngle + 180 - 90) * Math.PI / 180;
    const endRad   = (startAngle + 360 - 90) * Math.PI / 180;
    const x1 = centerX + radius * Math.cos(startRad), y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(midRad),   y2 = centerY + radius * Math.sin(midRad);
    const x3 = centerX + radius * Math.cos(endRad),   y3 = centerY + radius * Math.sin(endRad);
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} A ${radius} ${radius} 0 0 1 ${x3} ${y3} Z`;
  }
  const startRad = (startAngle - 90) * Math.PI / 180;
  const endRad   = (startAngle + angle - 90) * Math.PI / 180;
  const x1 = centerX + radius * Math.cos(startRad), y1 = centerY + radius * Math.sin(startRad);
  const x2 = centerX + radius * Math.cos(endRad),   y2 = centerY + radius * Math.sin(endRad);
  return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${angle > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
};
