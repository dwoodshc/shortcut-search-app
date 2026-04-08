/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * App.tsx — Root component and orchestration layer. Composes the five domain hooks,
 * assembles the shared DashboardContext value, and owns cross-hook logic: startup
 * configuration check, wipe-settings, and derived data (epicTeamData, memberEpicMap)
 * that depends on outputs from more than one hook.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import './App.css';
import StoryDetailModal from './components/StoryDetailModal';
import SummaryTable from './components/SummaryTable';
import AssignmentTables from './components/AssignmentTables';
import EpicCard from './components/EpicCard';
import SetupWizard from './components/SetupWizard';
import EpicSidebar from './components/EpicSidebar';
import AppHeader from './components/AppHeader';
import AppFooter from './components/AppFooter';
import { storage, getApiBaseUrl } from './utils';
import pkg from '../package.json';
import { useEpicsData } from './hooks/useEpicsData';
import { useWorkflowConfig } from './hooks/useWorkflowConfig';
import { useModals } from './hooks/useModals';
import { useFilters } from './hooks/useFilters';
import { useConfigIO } from './hooks/useConfigIO';
import { DashboardContext } from './context/DashboardContext';
import { Epic, EpicState } from './types';

function App(): React.JSX.Element {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    showSidebar, setShowSidebar,
    sortState, toggleSortState, resetSortState,
    collapsedCharts, setCollapsedCharts, toggleChart,
    scrollToEpic,
    getDisplayStories,
  } = useFilters();

  const {
    modals, setModal,
    setupWizardStep, setSetupWizardStep,
    readmeContent,
    handleOpenReadme,
  } = useModals({ showSidebar, setShowSidebar });

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
    setTimeout(() => {
      setSuccessMessage(null);
      window.location.reload();
    }, 2000);
  };

  // Check if API token and config exist on mount, trigger setup wizard if not
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
  const toTitleCase = (str: string): string => str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

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
  }, [epicStates]); // eslint-disable-line react-hooks/exhaustive-deps

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
      team: (epic.owner_ids || [])
        .filter(id => selectedTeamIds.length === 0 || teamMemberIds.has(id))
        .map(id => members[id] || id)
        .filter(name => !filterIgnoredInTickets || !ignoredUsers.includes(name)),
    }));
  }, [epics, selectedTeamIds, teamMemberIds, members, filterIgnoredInTickets, ignoredUsers, getEpicStateInfo]);

  const memberEpicMap = useMemo(() => {
    const map: Record<string, Array<{ id: number | string; name: string; isDone: boolean; isReadyForRelease: boolean }>> = {};
    epicTeamData.forEach(({ id, name, isDone, isReadyForRelease, team }) => {
      team.forEach(member => {
        if (!map[member]) map[member] = [];
        map[member].push({ id, name, isDone, isReadyForRelease });
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
    showSidebar, setShowSidebar,
    error, setError, loading, successMessage,
    filteredEpicNames, setFilteredEpicNames,
    setupWizardStep, setSetupWizardStep,
    // Derived / callbacks
    getDisplayStories, generateShortcutUrl,
    getEpicStateInfo, getEpicStateClass,
    filteredStateIds, summaryStateIds,
    epicTeamData, memberEpicMap, allDisplayStories,
    searchEpics, scrollToEpic,
    handleSaveShortcutUrl, handleSelectWorkflow,
    toggleAllCharts, handleOpenReadme,
  }), [epics, members, epicStates, teamMemberIds, loadStats, workflowConfig, setWorkflowField, modals, setModal, sortState, toggleSortState, resetSortState, collapsedCharts, setCollapsedCharts, toggleChart, filterByTeam, setFilterByTeam, ignoredUsers, setIgnoredUsers, filterIgnoredInTickets, setFilterIgnoredInTickets, selectedTeams, setSelectedTeams, selectedTeamIds, selectedTeamLabel, shortcutWebUrl, setShortcutWebUrl, showSidebar, setShowSidebar, error, setError, loading, successMessage, filteredEpicNames, setFilteredEpicNames, setupWizardStep, setSetupWizardStep, getDisplayStories, generateShortcutUrl, getEpicStateInfo, getEpicStateClass, filteredStateIds, summaryStateIds, epicTeamData, memberEpicMap, allDisplayStories, searchEpics, scrollToEpic, handleSaveShortcutUrl, handleSelectWorkflow, toggleAllCharts, handleOpenReadme]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DashboardContext.Provider value={dashboardContext}>
    <div className="App" id="top">
      {loading && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ textAlign: 'center', padding: '2.5rem 3rem', maxWidth: '360px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏳</div>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: '#03045E' }}>Loading Epics…</h2>
            <p style={{ color: '#718096', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              {loadProgress.total > 0
                ? `Loading ${loadProgress.loaded} of ${loadProgress.total} epics`
                : 'Fetching epic and story data from Shortcut'}
            </p>
            <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div style={{ height: '100%', background: '#494BCB', borderRadius: '2px', animation: 'loading-bar 1.5s ease-in-out infinite' }} />
            </div>
            <button className="btn-secondary" onClick={cancelSearch} style={{ minWidth: '100px' }}>Cancel</button>
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', padding: '2.5rem 3rem', maxWidth: '420px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🚦</div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.3rem', color: '#b91c1c' }}>Too Many Requests</h2>
            <p style={{ color: '#4a5568', marginBottom: '0.5rem' }}>
              The Shortcut API has rate-limited this session <strong>(HTTP 429)</strong>.
            </p>
            <p style={{ color: '#718096', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
              This happens when too many API calls are made in a short period. Please wait a few minutes before trying again.
            </p>
            <button className="btn-primary" onClick={() => setModal('rateLimit', false)} style={{ minWidth: '100px' }}>OK</button>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <img src="/dave.png" alt="D.A.V.E." style={{ width: '72px', height: '72px', flexShrink: 0 }} />
              <h2 style={{ margin: 0 }}>About Shortcut Dashboard</h2>
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
              <li><strong>Sidebar Navigation:</strong> Slide-out panel for quick jumping between epics</li>
              <li><strong>Ignored Users:</strong> Configurable list of users excluded from assignment and ticket tables</li>
              <li><strong>Setup Wizard:</strong> 6-step guided setup — token, URL, workflow, team, ignored users, epic list</li>
              <li><strong>Configuration Management:</strong> Export / Import of all settings as JSON</li>
            </ul>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#718096' }}>
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
              <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '0.375rem', color: '#065f46' }}>
                {importSuccess}
              </div>
            )}
            {importError && (
              <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '0.375rem', color: '#dc2626' }}>
                {importError}
              </div>
            )}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Export Configuration</h3>
              <p style={{ marginBottom: '1rem', color: '#64748b' }}>Download your current configuration as a JSON file for backup.</p>
              <button type="button" onClick={handleExportData} className="btn-primary">Export Configuration</button>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Import Configuration</h3>
              <p style={{ marginBottom: '1rem', color: '#64748b' }}>Upload a previously exported configuration file to restore your settings.</p>
              <input type="file" id="import-file-input" accept=".json" onChange={handleImportData} style={{ display: 'none' }} />
              <label htmlFor="import-file-input" className="btn-secondary" style={{ display: 'inline-block', textAlign: 'center' }}>
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
            <h2 style={{ color: '#dc2626' }}>Wipe All Settings?</h2>
            <p style={{ marginBottom: '1.5rem' }}>This action will permanently delete all stored data including:</p>
            <ul style={{ marginBottom: '1.5rem', textAlign: 'left', paddingLeft: '2rem' }}>
              <li>API Token</li>
              <li>Workflow Configuration</li>
              <li>Epic List and Team Members</li>
              <li>All other settings</li>
            </ul>
            <p style={{ marginBottom: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>
              This action cannot be undone. Are you sure you want to continue?
            </p>
            <div className="modal-buttons">
              <button type="button" onClick={() => setModal('wipeConfirm', false)} className="btn-secondary">Cancel</button>
              <button
                type="button"
                onClick={handleWipeSettings}
                style={{ backgroundColor: '#dc2626', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '500' }}
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
              className="markdown-content"
              style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: '1rem', backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked(readmeContent || '') as string) }}
            />
            <div className="modal-buttons">
              <button type="button" onClick={() => setModal('readme', false)} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      <AppHeader />
      <EpicSidebar />

      <main className="container">
        {successMessage && (
          <div style={{ backgroundColor: '#d1fae5', border: '1px solid #6ee7b7', color: '#065f46', padding: '1rem', borderRadius: '6px', marginBottom: '1rem' }}>
            <p style={{ margin: 0 }}>{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>{error}</p>
            {apiTokenIssue && (
              <p style={{ marginTop: '0.5rem' }}>
                <button
                  onClick={() => { setModal('setupWizard', true); setSetupWizardStep(1); }}
                  className="btn-primary"
                  style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
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

            <div style={{ marginBottom: '0.5rem', paddingBottom: '0.75rem', borderBottom: '2px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.0rem' }}>
                  {epics.filter(e => !e.notFound).length === filteredEpicNames.length ? '✅ ' : '⚠️ '}
                  Found {epics.filter(e => !e.notFound).length} of {filteredEpicNames.length} Epic{filteredEpicNames.length !== 1 ? 's' : ''}
                </h2>
              </div>
              {epics.some(e => e.notFound) && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', color: '#dc2626' }}>
                  <span style={{ fontWeight: 600 }}>Not found: </span>
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
        const statStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#718096', fontSize: '0.78rem' };
        const divider = <span style={{ color: '#cbd5e0' }}>|</span>;
        return (
          <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '0.5rem 2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
            <div style={statStyle}><span>⏱</span><span>Load time: <strong>{(loadStats.loadTime / 1000).toFixed(2)}s</strong></span></div>
            {divider}
            <div style={statStyle}><span>🔗</span><span>API calls: <strong>{loadStats.apiCallCount}</strong></span></div>
            {divider}
            <div style={statStyle}><span>🕐</span><span>Generated: <strong>{loadStats.loadedAt.toLocaleString()}</strong></span></div>
            {divider}
            <div style={statStyle}><span>📄</span><span>Page size: <strong>{pageSizeKb} KB</strong></span></div>
            {divider}
            <div style={statStyle}>
              <span>💾</span>
              <button onClick={handleDownload} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#494BCB', fontSize: '0.78rem', fontWeight: 600, padding: 0, textDecoration: 'underline' }}>
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
