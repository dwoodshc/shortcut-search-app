/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * types.ts — Central type definitions for the application. Covers all shared shapes:
 * Epic, Story, Workflow, WorkflowConfig, ModalState, SortState, DashboardContextValue,
 * and the supporting types referenced by hooks and components.
 */

export interface Story {
  id: number;
  name: string;
  story_type: 'feature' | 'bug' | 'chore';
  workflow_state_id: number;
  owner_ids: string[];
  group_id: string | null;
  app_url?: string;
  description?: string;
  archived?: boolean;
}

export interface Epic {
  id: number | string;
  name: string;
  state: string;
  epic_state_id?: number;
  owner_ids?: string[];
  stories?: Story[];
  notFound?: boolean;
  app_url?: string;
  stats?: { num_stories_total?: number };
}

export interface WorkflowState {
  id: number;
  name: string;
  color?: string;
  description?: string;
}

export interface Workflow {
  id: number;
  name: string;
  description?: string;
  states: WorkflowState[];
}

export interface WorkflowConfig {
  states: Record<number, string>;
  stateOrder: number[];
  stateIds: Record<string, number>;
  workflows: Workflow[];
  selectedId: number | null;
  savedId: number | null;
}

export interface EpicState {
  name: string;
  type: string;
}

export interface LoadStats {
  loadTime: number;
  apiCallCount: number;
  loadedAt: Date;
}

export interface LoadProgress {
  loaded: number;
  total: number;
}

export interface EpicTeamEntry {
  id: number | string;
  name: string;
  isDone: boolean;
  isReadyForRelease: boolean;
  isBlocked: boolean;
  team: string[];
}

export interface EpicRef {
  id: number | string;
  name: string;
  isDone: boolean;
  isReadyForRelease: boolean;
  isBlocked: boolean;
}

export interface ModalState {
  settingsMenu: boolean;
  about: boolean;
  readme: boolean;
  exportImport: boolean;
  wipeConfirm: boolean;
  setupWizard: boolean;
  rateLimit: boolean;
  storyDetailFilter: string | null;
}

export type ModalKey = keyof ModalState;

export interface SortEntry {
  col: string | null;
  dir: 'asc' | 'desc';
}

export interface SortState {
  summary: SortEntry;
  epicTeam: SortEntry;
  memberEpic: SortEntry;
  storyDetail: SortEntry;
}

export type SortStateKey = keyof SortState;

export interface TeamConfig {
  id: string;
  name: string;
}

export interface EpicConfig {
  epics: Array<{ name: string }>;
}

export interface WorkflowStorageConfig {
  workflow_id: number;
  workflow_name: string;
  shortcut_web_url: string;
  states: Array<{ id: number; name: string }>;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  member_ids?: string[];
}

export interface DashboardContextValue {
  // Data
  epics: Epic[];
  members: Record<string, string>;
  epicStates: Record<number, EpicState>;
  teamMemberIds: Set<string>;
  loadStats: LoadStats | null;
  workflowConfig: WorkflowConfig;
  setWorkflowField: (key: keyof WorkflowConfig, value: WorkflowConfig[keyof WorkflowConfig]) => void;
  // UI state
  modals: ModalState;
  setModal: (key: ModalKey, value: ModalState[ModalKey]) => void;
  sortState: SortState;
  toggleSortState: (key: SortStateKey, col: string) => void;
  resetSortState: (key: SortStateKey) => void;
  collapsedCharts: Record<string, boolean>;
  setCollapsedCharts: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  toggleChart: (epicId: number | string, chartType: string) => void;
  filterByTeam: boolean;
  setFilterByTeam: React.Dispatch<React.SetStateAction<boolean>>;
  ignoredUsers: string[];
  setIgnoredUsers: React.Dispatch<React.SetStateAction<string[]>>;
  filterIgnoredInTickets: boolean;
  setFilterIgnoredInTickets: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTeams: TeamConfig[];
  setSelectedTeams: React.Dispatch<React.SetStateAction<TeamConfig[]>>;
  selectedTeamIds: string[];
  selectedTeamLabel: string;
  shortcutWebUrl: string;
  setShortcutWebUrl: React.Dispatch<React.SetStateAction<string>>;
  showSidebar: boolean;
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  loading: boolean;
  successMessage: string | null;
  filteredEpicNames: string[];
  setFilteredEpicNames: React.Dispatch<React.SetStateAction<string[]>>;
  setupWizardStep: number;
  setSetupWizardStep: React.Dispatch<React.SetStateAction<number>>;
  // Derived / callbacks
  getDisplayStories: (epic: Epic) => Story[];
  generateShortcutUrl: (epicId: number | string, stateName?: string) => string;
  getEpicStateInfo: (epic: Epic) => EpicState;
  getEpicStateClass: (stateType: string, stateName: string) => string;
  filteredStateIds: number[];
  summaryStateIds: number[];
  epicTeamData: EpicTeamEntry[];
  memberEpicMap: Record<string, EpicRef[]>;
  allDisplayStories: Story[];
  searchEpics: () => void;
  scrollToEpic: (epicId: number | string) => void;
  handleSaveShortcutUrl: () => boolean | void;
  handleSelectWorkflow: (workflow: Workflow) => void;
  toggleAllCharts: () => void;
  handleOpenReadme: () => Promise<void>;
  darkMode: boolean;
  toggleDarkMode: () => void;
}
