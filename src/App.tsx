/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * App.tsx — Root component and orchestration layer. Composes the five domain hooks,
 * assembles the shared DashboardContext value, and owns cross-hook logic: startup
 * configuration check, wipe-settings, and derived data (epicTeamData, memberEpicMap)
 * that depends on outputs from more than one hook.
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import './App.css';
import StoryDetailModal from './components/StoryDetailModal';
import SummaryTable from './components/SummaryTable';
import AssignmentTables from './components/AssignmentTables';
import EpicCard from './components/EpicCard';
import SetupWizard from './components/SetupWizard';
import AppHeader from './components/AppHeader';
import AppFooter from './components/AppFooter';
import MatrixRain from './components/MatrixRain';
import ThemeSelector from './components/ThemeSelector';
import { storage, getApiBaseUrl } from './utils';
import pkg from '../package.json';
import { useEpicsData } from './hooks/useEpicsData';
import { useWorkflowConfig } from './hooks/useWorkflowConfig';
import { useModals } from './hooks/useModals';
import { useFilters } from './hooks/useFilters';
import { useConfigIO } from './hooks/useConfigIO';
import { DashboardContext } from './context/DashboardContext';
import { Epic, EpicState } from './types';

const toTitleCase = (str: string): string =>
  str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function App(): React.JSX.Element {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<'normal' | 'dark' | 'star-trek' | 'matrix'>(() => storage.getDisplayMode());
  const darkMode = theme === 'dark';
  const starTrekMode = theme === 'star-trek';
  const matrixMode = theme === 'matrix';

  const toggleDarkMode = useCallback(() => {
    setTheme(prev => { const next = prev === 'dark' ? 'normal' : 'dark'; storage.setDisplayMode(next); return next; });
  }, []);

  const toggleStarTrekMode = useCallback(() => {
    setTheme(prev => { const next = prev === 'star-trek' ? 'normal' : 'star-trek'; storage.setDisplayMode(next); return next; });
  }, []);

  const toggleMatrixMode = useCallback(() => {
    setTheme(prev => { const next = prev === 'matrix' ? 'normal' : 'matrix'; storage.setDisplayMode(next); return next; });
  }, []);

  const selectTheme = useCallback((t: 'normal' | 'dark' | 'star-trek' | 'matrix') => {
    setTheme(t);
    storage.setDisplayMode(t);
  }, []);

  const {
    workflowConfig, setWorkflowConfig, setWorkflowField,
    shortcutWebUrl, setShortcutWebUrl,
    filteredEpicNames, setFilteredEpicNames,
    loadSelectedWorkflow,
    handleSelectWorkflow,
    filteredStateIds, summaryStateIds,
    generateShortcutUrl,
  } = useWorkflowConfig();

  const {
    filterByTeam, setFilterByTeam,
    filterIgnoredInTickets, setFilterIgnoredInTickets,
    ignoredUsers, setIgnoredUsers,
    selectedTeams, setSelectedTeams, selectedTeamIds, selectedTeamLabel,
    sortState, toggleSortState, resetSortState,
    collapsedCharts, setCollapsedCharts, toggleChart,
    getDisplayStories,
  } = useFilters();

  const {
    modals, setModal,
    setupWizardStep, setSetupWizardStep,
    readmeContent,
    handleOpenReadme,
  } = useModals();

  const {
    epics, setEpics,
    members, setMembers,
    loading, loadProgress, loadStats,
    error, setError,
    apiTokenIssue,
    epicStates,
    teamMemberIds, setTeamMemberIds,
    loadEpics: searchEpics, cancelSearch,
  } = useEpicsData({
    epicNames: filteredEpicNames,
    loadSelectedWorkflow,
    setCollapsedCharts,
    onRateLimit: () => setModal('rateLimit', true),
    setFilteredEpicNames,
  });

  const { importError, importSuccess, handleExportData, handleImportData } = useConfigIO();

  // Needs shortcutWebUrl from useWorkflowConfig and setError from useEpicsData
  const handleSaveShortcutUrl = useCallback(() => {
    const urlPattern = /^https?:\/\/.+/;
    if (!shortcutWebUrl || !urlPattern.test(shortcutWebUrl)) {
      setError('Please enter a valid URL starting with http:// or https://');
      return false;
    }
    const cleanUrl = shortcutWebUrl.replace(/\/$/, '');
    setShortcutWebUrl(cleanUrl);
    if (workflowConfig.selectedId) {
      try {
        const data = storage.getWorkflowConfig();
        if (data && data.workflow_id) {
          storage.setWorkflowConfig({
            workflow_name: data.workflow_name,
            workflow_id: data.workflow_id,
            shortcut_web_url: cleanUrl,
            states: data.states
          });
          setError(null);
        }
      } catch (err) {
        setError('Failed to save Shortcut Web URL');
        return false;
      }
    }
    return true;
  }, [shortcutWebUrl, setShortcutWebUrl, workflowConfig.selectedId, setError]);

  // Needs epics from useEpicsData and collapsedCharts from useFilters
  const toggleAllCharts = useCallback(() => {
    const chartTypes = ['workflow-pie', 'type-pie'];
    const allChartKeys = epics
      .filter(e => !e.notFound)
      .flatMap(epic => chartTypes.map(type => `${epic.id}-${type}`));
    const allCollapsed = allChartKeys.every(key => collapsedCharts[key]);
    const newState = { ...collapsedCharts };
    allChartKeys.forEach(key => { newState[key] = !allCollapsed; });
    setCollapsedCharts(newState);
  }, [epics, collapsedCharts, setCollapsedCharts]);

  const wipeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { return () => { if (wipeTimerRef.current) clearTimeout(wipeTimerRef.current); }; }, []);

  // Resets state from every hook — orchestration, belongs in App
  const handleWipeSettings = () => {
    localStorage.clear();
    sessionStorage.clear();
    setEpics([]);
    setFilteredEpicNames([]);
    setWorkflowConfig({ states: {}, stateOrder: [], stateIds: {}, workflows: [], selectedId: null, savedId: null });
    setMembers({});
    setShortcutWebUrl('');
    setSelectedTeams([]);
    setTeamMemberIds(new Set());
    setIgnoredUsers([]);
    setError(null);
    setModal('wipeConfirm', false);
    setSuccessMessage('All settings have been wiped successfully!');
    wipeTimerRef.current = setTimeout(() => {
      setSuccessMessage(null);
      window.location.reload();
    }, 2000);
  };

  // Intentional empty dep array: this runs once on mount only. searchEpics is stable
  // at mount time; adding it as a dep would cause re-runs as filteredEpicNames changes.
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const migrationDone = localStorage.getItem('migration_completed');
        if (!migrationDone) {
          try {
            const migrationResponse = await fetch(`${getApiBaseUrl()}/api/migrate-data`);
            if (migrationResponse.ok) {
              const migrationData = await migrationResponse.json();
              if (migrationData.apiToken && !storage.getApiToken()) storage.setApiToken(migrationData.apiToken);
              if (migrationData.workflowConfig && !storage.getWorkflowConfig()) storage.setWorkflowConfig(migrationData.workflowConfig);
              if (migrationData.epicsConfig && !storage.getEpicsConfig()) storage.setEpicsConfig(migrationData.epicsConfig);
            }
          } catch (migrationErr) {}
          localStorage.setItem('migration_completed', 'true');
        }

        const token = storage.getApiToken();
        const storedWorkflowConfig = storage.getWorkflowConfig();
        const epicsConfig = storage.getEpicsConfig();

        if (!token || !storedWorkflowConfig || !storedWorkflowConfig.workflow_id || !epicsConfig || !epicsConfig.epics || epicsConfig.epics.length === 0) {
          setModal('setupWizard', true);
          if (!token) {
            setSetupWizardStep(1);
          } else if (!storedWorkflowConfig || !storedWorkflowConfig.workflow_id) {
            setSetupWizardStep(2);
          } else {
            setSetupWizardStep(6);
          }
          return;
        }

        searchEpics();
      } catch (err) {
        setModal('setupWizard', true);
        setSetupWizardStep(1);
      }
    };

    checkConfig();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load epic names and workflow config from storage when wizard closes
  useEffect(() => {
    if (modals.setupWizard) return;
    try {
      const epicsConfig = storage.getEpicsConfig();
      if (epicsConfig && epicsConfig.epics) {
        setFilteredEpicNames(epicsConfig.epics.map(e => e.name));
      }
    } catch (err) {}
    loadSelectedWorkflow();
  }, [modals.setupWizard, loadSelectedWorkflow, setFilteredEpicNames]);

  // Epic state helpers
  const getEpicStateClass = useCallback((stateType: string, stateName: string): string => {
    const lowerName = (stateName || '').toLowerCase().trim();
    if (lowerName === 'blocked') return 'epic-state-blocked';
    if (lowerName === 'ready for release') return 'epic-state-ready-for-release';
    const lower = (stateType || '').toLowerCase();
    if (lower === 'started' || lower === 'in progress') return 'epic-state-in-progress';
    if (lower === 'done') return 'epic-state-done';
    return 'epic-state-default';
  }, []);

  const getEpicStateInfo = useCallback((epic: Epic): EpicState => {
    if (epic.epic_state_id && epicStates[epic.epic_state_id]) return epicStates[epic.epic_state_id];
    return { name: toTitleCase(epic.state || ''), type: epic.state || '' };
  }, [epicStates]);

  // Derived data that assembles outputs from multiple hooks
  const allDisplayStories = useMemo(() =>
    epics.filter(e => !e.notFound).flatMap(epic => getDisplayStories(epic)),
  [epics, getDisplayStories]);

  const epicTeamData = useMemo(() => {
    return epics.filter(e => !e.notFound).map(epic => ({
      id: epic.id,
      name: epic.name,
      isDone: getEpicStateInfo(epic).type === 'done',
      isReadyForRelease: getEpicStateInfo(epic).name.toLowerCase().trim() === 'ready for release',
      isBlocked: getEpicStateInfo(epic).name.toLowerCase().trim() === 'blocked',
      team: (epic.owner_ids || [])
        .filter(id => selectedTeamIds.length === 0 || teamMemberIds.has(id))
        .map(id => members[id] || id)
        .filter(name => !filterIgnoredInTickets || !ignoredUsers.includes(name)),
    }));
  }, [epics, selectedTeamIds, teamMemberIds, members, filterIgnoredInTickets, ignoredUsers, getEpicStateInfo]);

  const memberEpicMap = useMemo(() => {
    const map: Record<string, Array<{ id: number | string; name: string; isDone: boolean; isReadyForRelease: boolean; isBlocked: boolean }>> = {};
    epicTeamData.forEach(({ id, name, isDone, isReadyForRelease, isBlocked, team }) => {
      team.forEach(member => {
        if (!map[member]) map[member] = [];
        map[member].push({ id, name, isDone, isReadyForRelease, isBlocked });
      });
    });
    return map;
  }, [epicTeamData]);

  const dashboardContext = useMemo(() => ({
    // Data
    epics, members, epicStates, teamMemberIds, loadStats,
    workflowConfig, setWorkflowField,
    // UI state
    modals, setModal,
    sortState, toggleSortState, resetSortState,
    collapsedCharts, setCollapsedCharts, toggleChart,
    filterByTeam, setFilterByTeam,
    ignoredUsers, setIgnoredUsers,
    filterIgnoredInTickets, setFilterIgnoredInTickets,
    selectedTeams, setSelectedTeams, selectedTeamIds, selectedTeamLabel,
    shortcutWebUrl, setShortcutWebUrl,
    error, setError, loading, successMessage,
    filteredEpicNames, setFilteredEpicNames,
    setupWizardStep, setSetupWizardStep,
    // Derived / callbacks
    getDisplayStories, generateShortcutUrl,
    getEpicStateInfo, getEpicStateClass,
    filteredStateIds, summaryStateIds,
    epicTeamData, memberEpicMap, allDisplayStories,
    searchEpics,
    handleSaveShortcutUrl, handleSelectWorkflow,
    toggleAllCharts, handleOpenReadme,
    darkMode, toggleDarkMode,
    starTrekMode, toggleStarTrekMode,
    matrixMode, toggleMatrixMode,
    displayTheme: theme, selectTheme,
  }), [epics, members, epicStates, teamMemberIds, loadStats, workflowConfig, setWorkflowField, modals, setModal, sortState, toggleSortState, resetSortState, collapsedCharts, setCollapsedCharts, toggleChart, filterByTeam, setFilterByTeam, ignoredUsers, setIgnoredUsers, filterIgnoredInTickets, setFilterIgnoredInTickets, selectedTeams, setSelectedTeams, selectedTeamIds, selectedTeamLabel, shortcutWebUrl, setShortcutWebUrl, error, setError, loading, successMessage, filteredEpicNames, setFilteredEpicNames, setupWizardStep, setSetupWizardStep, getDisplayStories, generateShortcutUrl, getEpicStateInfo, getEpicStateClass, filteredStateIds, summaryStateIds, epicTeamData, memberEpicMap, allDisplayStories, searchEpics, handleSaveShortcutUrl, handleSelectWorkflow, toggleAllCharts, handleOpenReadme, darkMode, toggleDarkMode, starTrekMode, toggleStarTrekMode, matrixMode, toggleMatrixMode, theme, selectTheme]);

  return (
    <DashboardContext.Provider value={dashboardContext}>
    <div className="App" id="top" data-theme={theme}>
        {matrixMode && <MatrixRain />}
      {loading && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content text-center !px-12 !py-10" style={{ maxWidth: '360px' }}>
            <div className="text-[2.5rem] mb-4">⏳</div>
            <h2 className="m-0 mb-2 text-[1.2rem] text-[#03045E]">Loading Epics…</h2>
            <p className="text-[#718096] mb-6 text-[0.9rem]">
              {loadProgress.total > 0
                ? `Loading ${loadProgress.loaded} of ${loadProgress.total} epics`
                : 'Fetching epic and story data from Shortcut'}
            </p>
            <div className="w-full h-1 bg-slate-200 rounded-sm overflow-hidden mb-6">
              <div className="h-full bg-[#494BCB] rounded-sm" style={{ animation: 'loading-bar 1.5s ease-in-out infinite' }} />
            </div>
            <button className="btn-secondary min-w-[100px]" onClick={cancelSearch}>Cancel</button>
          </div>
        </div>
      )}

      <StoryDetailModal
        filter={modals.storyDetailFilter}
        onClose={() => setModal('storyDetailFilter', null)}
        epics={epics}
        workflowStates={workflowConfig.states}
        getDisplayStories={getDisplayStories}
        sort={sortState.storyDetail}
        onSort={(col) => toggleSortState('storyDetail', col)}
        onResetSort={() => resetSortState('storyDetail')}
      />

      {modals.rateLimit && (
        <div className="modal-overlay" onClick={() => setModal('rateLimit', false)}>
          <div className="modal-content text-center !px-12 !py-10" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="text-[3rem] mb-3">🚦</div>
            <h2 className="m-0 mb-3 text-[1.3rem] text-[#b91c1c]">Too Many Requests</h2>
            <p className="text-[#4a5568] mb-2">
              The Shortcut API has rate-limited this session <strong>(HTTP 429)</strong>.
            </p>
            <p className="text-[#718096] text-sm mb-7">
              This happens when too many API calls are made in a short period. Please wait a few minutes before trying again.
            </p>
            <button className="btn-primary min-w-[100px]" onClick={() => setModal('rateLimit', false)}>OK</button>
          </div>
        </div>
      )}

      {modals.setupWizard && (
        <SetupWizard
          step={setupWizardStep}
          onStepChange={setSetupWizardStep}
          onClose={() => { setModal('setupWizard', false); setSetupWizardStep(1); }}
        />
      )}

      {modals.about && (
        <div className="modal-overlay" onClick={() => setModal('about', false)}>
          <div className="modal-content modal-content-about" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <img src="/dave.png" alt="D.A.V.E." className="w-[72px] h-[72px] shrink-0" />
              <h2 className="m-0">About Shortcut Dashboard</h2>
            </div>
            <p>A React-based dashboard for tracking Shortcut.com epics, visualising progress, and monitoring team workload.</p>
            <ul>
              <li><strong>Story Summary:</strong> Overall story counts across all epics by workflow state</li>
              <li><strong>Epic Status Table:</strong> At-a-glance chevron progress bars and epic state for all tracked epics</li>
              <li><strong>Epic Owner Assignment:</strong> Maps each epic to its assigned team members</li>
              <li><strong>Team Member Assignment:</strong> Inverted view — each team member and their assigned epics</li>
              <li><strong>Ticket Status Breakdown:</strong> 3D column chart of story workflow states per epic</li>
              <li><strong>Workflow Status Pie Chart:</strong> Stories by workflow state with clickable Shortcut links</li>
              <li><strong>Story Type Breakdown:</strong> Feature / Bug / Chore pie chart per epic</li>
              <li><strong>Story Owners Table:</strong> Per-epic story owner counts including unassigned</li>
              <li><strong>Team Open Tickets:</strong> Open ticket counts per team member, excluding completed stories</li>
              <li><strong>User Story Board:</strong> Kanban view (Backlog → Complete) with collapsible story cards</li>
              <li><strong>Ignored Users:</strong> Configurable list of users excluded from assignment and ticket tables</li>
              <li><strong>Setup Wizard:</strong> 6-step guided setup — token, URL, workflow, team, ignored users, epic list</li>
              <li><strong>Configuration Management:</strong> Export / Import of all settings as JSON</li>
              <li><strong>Themes:</strong> Four display themes selectable via Settings → Theme</li>
            </ul>
            <p className="mt-4 text-sm text-[#718096]">
              Version {pkg.version} | Project D.A.V.E. (Dashboards Are Very Effective)
            </p>
            <div className="modal-buttons">
              <button type="button" onClick={() => setModal('about', false)} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {modals.exportImport && (
        <div className="modal-overlay" onClick={() => setModal('exportImport', false)}>
          <div className="modal-content modal-content-export-import" onClick={(e) => e.stopPropagation()}>
            <h2>Export/Import Configuration</h2>
            {importSuccess && (
              <div className="p-3 mb-4 bg-[#d1fae5] border border-[#6ee7b7] rounded-md text-[#065f46]">
                {importSuccess}
              </div>
            )}
            {importError && (
              <div className="p-3 mb-4 bg-[#fef2f2] border border-[#fca5a5] rounded-md text-[#dc2626]">
                {importError}
              </div>
            )}
            <div className="mb-8">
              <h3 className="mb-2">Export Configuration</h3>
              <p className="mb-4 text-[#64748b]">Download your current configuration as a JSON file for backup.</p>
              <button type="button" onClick={handleExportData} className="btn-primary">Export Configuration</button>
            </div>
            <div className="mb-6">
              <h3 className="mb-2">Import Configuration</h3>
              <p className="mb-4 text-[#64748b]">Upload a previously exported configuration file to restore your settings.</p>
              <input type="file" id="import-file-input" accept=".json" onChange={handleImportData} className="hidden" />
              <label htmlFor="import-file-input" className="btn-secondary inline-block text-center">
                Choose File
              </label>
            </div>
            <div className="modal-buttons">
              <button type="button" onClick={() => setModal('exportImport', false)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {modals.wipeConfirm && (
        <div className="modal-overlay" onClick={() => setModal('wipeConfirm', false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-[#dc2626]">Wipe All Settings?</h2>
            <p className="mb-6">This action will permanently delete all stored data including:</p>
            <ul className="mb-6 text-left pl-8">
              <li>API Token</li>
              <li>Workflow Configuration</li>
              <li>Epic List and Team Members</li>
              <li>All other settings</li>
            </ul>
            <p className="mb-6 font-bold text-[#dc2626]">
              This action cannot be undone. Are you sure you want to continue?
            </p>
            <div className="modal-buttons">
              <button type="button" onClick={() => setModal('wipeConfirm', false)} className="btn-secondary">Cancel</button>
              <button
                type="button"
                onClick={handleWipeSettings}
                className="bg-[#dc2626] text-white px-4 py-2 border-0 rounded-md cursor-pointer text-sm font-medium"
              >
                Yes, Wipe All Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {modals.readme && (
        <div className="modal-overlay" onClick={() => setModal('readme', false)}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <h2>README.md</h2>
            <div
              className="markdown-content max-h-[60vh] overflow-y-auto mb-4 bg-white p-6 rounded-md border border-slate-200"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(readmeContent || '') as string, { FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'], FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'javascript'] }) }}
            />
            <div className="modal-buttons">
              <button type="button" onClick={() => setModal('readme', false)} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      <ThemeSelector />

      <AppHeader />

      <main className="container">
        {successMessage && (
          <div className="bg-[#d1fae5] border border-[#6ee7b7] text-[#065f46] p-4 rounded-md mb-4">
            <p className="m-0">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>{error}</p>
            {apiTokenIssue && (
              <p className="mt-2">
                <button
                  onClick={() => { setModal('setupWizard', true); setSetupWizardStep(1); }}
                  className="btn-primary text-sm px-4 py-2"
                >
                  Open Setup
                </button>
              </p>
            )}
          </div>
        )}

        {epics.length > 0 && (
          <div className="epics-list">
            <SummaryTable />

            <div className="mb-2 pb-3 border-b-2 border-slate-200">
              <div className="flex items-center">
                <h2 className="m-0 text-[1.0rem]">
                  {epics.filter(e => !e.notFound).length === filteredEpicNames.length ? '✅ ' : '⚠️ '}
                  Found {epics.filter(e => !e.notFound).length} of {filteredEpicNames.length} Epic{filteredEpicNames.length !== 1 ? 's' : ''}
                </h2>
              </div>
              {epics.some(e => e.notFound) && (
                <div className="mt-[0.4rem] text-[0.8rem] text-[#dc2626]">
                  <span className="font-semibold">Not found: </span>
                  {epics.filter(e => e.notFound).map(e => e.name).join(', ')}
                </div>
              )}
            </div>

            <AssignmentTables />

            {epics.map((epic) => (
              <EpicCard key={epic.id as React.Key} epic={epic} />
            ))}
          </div>
        )}
      </main>

      {loadStats && (() => {
        const pageSizeBytes = new Blob([document.documentElement.outerHTML]).size;
        const pageSizeKb = (pageSizeBytes / 1024).toFixed(1);
        const handleDownload = () => {
          const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `shortcut-dashboard-${loadStats.loadedAt.toISOString().slice(0, 10)}.html`;
          a.click();
          URL.revokeObjectURL(url);
        };
        const statClass = "flex items-center gap-[0.35rem] text-[#718096] text-[0.78rem]";
        const divider = <span className="text-[#cbd5e0]">|</span>;
        return (
          <div className="bg-[#f8fafc] border-t border-slate-200 px-8 py-2 flex flex-wrap gap-4 items-center justify-center">
            <div className={statClass}><span>⏱</span><span>Load time: <strong>{(loadStats.loadTime / 1000).toFixed(2)}s</strong></span></div>
            {divider}
            <div className={statClass}><span>🔗</span><span>API calls: <strong>{loadStats.apiCallCount}</strong></span></div>
            {divider}
            <div className={statClass}><span>🕐</span><span>Generated: <strong>{loadStats.loadedAt.toLocaleString()}</strong></span></div>
            {divider}
            <div className={statClass}><span>📄</span><span>Page size: <strong>{pageSizeKb} KB</strong></span></div>
            {divider}
            <div className={statClass}>
              <span>💾</span>
              <button onClick={handleDownload} className="bg-transparent border-0 cursor-pointer text-[#494BCB] text-[0.78rem] font-semibold p-0 underline">
                Download page
              </button>
            </div>
          </div>
        );
      })()}

      <AppFooter />
    </div>
    </DashboardContext.Provider>
  );
}

export default App;
