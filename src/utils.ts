/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * utils.ts — Browser utility module. Provides a typed storage facade over localStorage
 * and sessionStorage, a dynamic API base URL helper (getApiBaseUrl), and an SVG
 * arc-path generator for pie chart slices (createPieSlice).
 */
import { WorkflowStorageConfig, EpicConfig, TeamConfig } from './types';

export const STORAGE_KEYS = {
  API_TOKEN: 'shortcut_api_token',
  WORKFLOW_CONFIG: 'shortcut_workflow_config',
  EPICS_CONFIG: 'shortcut_epics_config',
  MEMBERS_CACHE: 'shortcut_members_cache',
  TEAM_CONFIG: 'shortcut_team_config',
  TEAM_MEMBERS_CACHE: 'shortcut_team_members_cache',
  EPIC_WORKFLOW_CACHE: 'shortcut_epic_workflow_cache',
  IGNORED_USERS: 'shortcut_ignored_users'
} as const;

const migrateApiToken = (): void => {
  const legacy = localStorage.getItem(STORAGE_KEYS.API_TOKEN);
  if (legacy) {
    sessionStorage.setItem(STORAGE_KEYS.API_TOKEN, legacy);
    localStorage.removeItem(STORAGE_KEYS.API_TOKEN);
  }
};
migrateApiToken();

export const storage = {
  getApiToken: (): string | null => sessionStorage.getItem(STORAGE_KEYS.API_TOKEN),
  setApiToken: (token: string): void => { sessionStorage.setItem(STORAGE_KEYS.API_TOKEN, token); },

  getWorkflowConfig: (): WorkflowStorageConfig | null => {
    const data = localStorage.getItem(STORAGE_KEYS.WORKFLOW_CONFIG);
    return data ? JSON.parse(data) : null;
  },
  setWorkflowConfig: (config: WorkflowStorageConfig): void => { localStorage.setItem(STORAGE_KEYS.WORKFLOW_CONFIG, JSON.stringify(config)); },

  getEpicsConfig: (): EpicConfig | null => {
    const data = localStorage.getItem(STORAGE_KEYS.EPICS_CONFIG);
    return data ? JSON.parse(data) : null;
  },
  setEpicsConfig: (config: EpicConfig): void => { localStorage.setItem(STORAGE_KEYS.EPICS_CONFIG, JSON.stringify(config)); },

  getMembersCache: (): Record<string, string> => {
    const data = localStorage.getItem(STORAGE_KEYS.MEMBERS_CACHE);
    return data ? JSON.parse(data) : {};
  },
  setMembersCache: (cache: Record<string, string>): void => { localStorage.setItem(STORAGE_KEYS.MEMBERS_CACHE, JSON.stringify(cache)); },

  getTeamConfig: (): TeamConfig | null => {
    const data = localStorage.getItem(STORAGE_KEYS.TEAM_CONFIG);
    return data ? JSON.parse(data) : null;
  },
  setTeamConfig: (config: TeamConfig): void => { localStorage.setItem(STORAGE_KEYS.TEAM_CONFIG, JSON.stringify(config)); },

  getTeamMembersCache: (teamId: string): string[] | null => {
    const data = localStorage.getItem(STORAGE_KEYS.TEAM_MEMBERS_CACHE);
    if (!data) return null;
    const parsed: { teamId: string; memberIds: string[] } = JSON.parse(data);
    return parsed.teamId === teamId ? parsed.memberIds : null;
  },
  setTeamMembersCache: (teamId: string, memberIds: string[]): void => {
    localStorage.setItem(STORAGE_KEYS.TEAM_MEMBERS_CACHE, JSON.stringify({ teamId, memberIds }));
  },

  getEpicWorkflowCache: (): Record<number, { name: string; type: string }> | null => {
    const data = localStorage.getItem(STORAGE_KEYS.EPIC_WORKFLOW_CACHE);
    return data ? JSON.parse(data) : null;
  },
  setEpicWorkflowCache: (stateMap: Record<number, { name: string; type: string }>): void => {
    localStorage.setItem(STORAGE_KEYS.EPIC_WORKFLOW_CACHE, JSON.stringify(stateMap));
  },

  getIgnoredUsers: (): string[] => {
    const data = localStorage.getItem(STORAGE_KEYS.IGNORED_USERS);
    return data ? JSON.parse(data) : [];
  },
  setIgnoredUsers: (users: string[]): void => { localStorage.setItem(STORAGE_KEYS.IGNORED_USERS, JSON.stringify(users)); }
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
