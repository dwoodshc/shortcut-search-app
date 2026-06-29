/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * utils.ts — Browser utility module. Provides a typed storage facade over localStorage,
 * a dynamic API base URL helper (getApiBaseUrl), and an SVG arc-path generator for
 * pie chart slices (createPieSlice).
 */
import { WorkflowStorageConfig, EpicConfig, TeamConfig, ViewSettings } from './types';

export const COMPLETE_STATE_NAMES = new Set(['complete']);

export const STORAGE_KEYS = {
  API_TOKEN: 'shortcut_api_token',
  WORKFLOW_CONFIG: 'shortcut_workflow_config',
  EPICS_CONFIG: 'shortcut_epics_config',
  MEMBERS_CACHE: 'shortcut_members_cache',
  TEAM_CONFIG: 'shortcut_team_config',
  TEAM_MEMBERS_CACHE: 'shortcut_team_members_cache',
  EPIC_WORKFLOW_CACHE: 'shortcut_epic_workflow_cache',
  DISPLAY_MODE: 'shortcut_display_mode',
  MY_NAME: 'shortcut_my_name',
  CYCLE1_START: 'shortcut_cycle1_start',
  CYCLE_WEEKS: 'shortcut_cycle_weeks',
  MIGRATION_COMPLETED: 'migration_completed',
  VIEW_SETTINGS: 'shortcut_view_settings',
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
      } catch (err) { console.warn('Failed to parse team members cache; resetting:', err); }
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

  getDisplayMode: (): 'normal' | 'dark' | 'star-trek' | 'matrix' => {
    const val = localStorage.getItem(STORAGE_KEYS.DISPLAY_MODE);
    if (val === 'dark' || val === 'star-trek' || val === 'matrix') return val;
    return 'normal';
  },
  setDisplayMode: (mode: 'normal' | 'dark' | 'star-trek' | 'matrix'): void => { localStorage.setItem(STORAGE_KEYS.DISPLAY_MODE, mode); },

  getMyName: (): string => localStorage.getItem(STORAGE_KEYS.MY_NAME) || '',
  setMyName: (name: string): void => { localStorage.setItem(STORAGE_KEYS.MY_NAME, name); },

  getCycle1Start: (): string => localStorage.getItem(STORAGE_KEYS.CYCLE1_START) || '',
  setCycle1Start: (date: string): void => { localStorage.setItem(STORAGE_KEYS.CYCLE1_START, date); },

  getCycleWeeks: (): number[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CYCLE_WEEKS);
    if (data) {
      try {
        const arr: unknown = JSON.parse(data);
        if (Array.isArray(arr) && arr.length === 8 && arr.every((n): n is number => typeof n === 'number' && n > 0)) return arr;
      } catch {}
    }
    return [6, 6, 6, 7, 6, 7, 6, 6];
  },
  setCycleWeeks: (weeks: number[]): void => { localStorage.setItem(STORAGE_KEYS.CYCLE_WEEKS, JSON.stringify(weeks)); },

  getViewSettings: (): ViewSettings => {
    const data = localStorage.getItem(STORAGE_KEYS.VIEW_SETTINGS);
    const defaults: ViewSettings = { showObjectivesFilter: true, showDoneEpics: true, showBlockedOnly: false, showEpicObjective: true, showEpicOwners: true, showEpicStoryCount: true, showEpicOwnerAssignments: false, showTeamMemberEpicAssignments: false, showTeamMemberTicketAssignments: false, showTicketStatusBreakdown: true, showStoryOwners: true, showTeamOpenTickets: true, showWorkflowStatusPieChart: true, showStoryTypeBreakdown: true, showTopOfPageLink: false, showCycleProgress: true, showBlockedTickets: false, showTopBlockingTickets: false };
    if (!data) return defaults;
    try { return { ...defaults, ...JSON.parse(data) }; } catch { return defaults; }
  },
  setViewSettings: (settings: ViewSettings): void => {
    localStorage.setItem(STORAGE_KEYS.VIEW_SETTINGS, JSON.stringify(settings));
  },
};

export const getApiBaseUrl = (): string => `http://${window.location.hostname}:3001`;

/** Shared colour map for Shortcut story types — used both for pie-chart
 *  segment fills (in EpicCard) and for the ticket-type pill background
 *  (in UnwatchedTickets). White text is assumed on top of these colours. */
export const STORY_TYPE_COLORS: Record<string, string> = {
  feature: '#1d4ed8',  // blue-700
  bug:     '#dc2626',  // red-600
  chore:   '#64748b',  // slate-500
  epic:    '#7c3aed',  // violet-600
};

/** Default weeks per cycle: 8 cycles, cycles 5 & 6 are 7 weeks, rest are 6. */
export const DEFAULT_CYCLE_WEEKS = [6, 6, 6, 7, 6, 7, 6, 6];

/** Returns the Cycle 1 start date stored by the Setup Wizard (YYYY-MM-DD),
 *  or the first weekday of the current year as a fallback. */
export function getCycle1StartDate(): Date {
  const stored = storage.getCycle1Start();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(stored);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!Number.isNaN(d.getTime())) { d.setHours(0, 0, 0, 0); return d; }
  }
  const d = new Date(new Date().getFullYear(), 0, 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Returns the start (inclusive), end (inclusive), and length in days for cycle `n` (1-indexed). */
export function getCycleWindow(n: number, cycle1: Date, weeks: number[]): { start: Date; end: Date; lengthDays: number } {
  let offsetDays = 0;
  for (let i = 0; i < n - 1; i++) offsetDays += (weeks[i] ?? 6) * 7;
  const start = new Date(cycle1.getTime() + offsetDays * MS_PER_DAY);
  const lengthDays = (weeks[n - 1] ?? 6) * 7;
  const end = new Date(start.getTime() + (lengthDays - 1) * MS_PER_DAY);
  return { start, end, lengthDays };
}

/** Returns the start (inclusive), end (inclusive), and 1-indexed number of the
 *  cycle that contains `today`, using the per-cycle week counts from storage. */
export function getCurrentCycleWindow(today: Date = new Date()): { start: Date; end: Date; number: number } {
  const cycle1 = getCycle1StartDate();
  const weeks = storage.getCycleWeeks();
  const t = new Date(today); t.setHours(0, 0, 0, 0);
  for (let n = 1; n <= 8; n++) {
    const { start, end } = getCycleWindow(n, cycle1, weeks);
    if (t.getTime() <= end.getTime()) return { start, end, number: n };
  }
  const last = getCycleWindow(8, cycle1, weeks);
  return { start: last.start, end: last.end, number: 8 };
}

export function daysAgo(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const now = new Date();
  const then = new Date(dateStr);
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thenDay = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  return Math.round((nowDay.getTime() - thenDay.getTime()) / 86_400_000);
}

export function formatDaysAgo(days: number | null): string {
  if (days === null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

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
