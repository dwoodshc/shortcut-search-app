/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * AppHeader.tsx — Sticky page header. Contains the logo, dashboard title, and team
 * subtitle, plus three icon buttons (refresh, edit epic list, settings menu) and the
 * action toolbar for toggling assignments, charts, ignored-user visibility, and team
 * filtering.
 */
import React from 'react';
import { useDashboard } from '../context/DashboardContext';

export default function AppHeader(): React.JSX.Element {
  const {
    epics,
    modals, setModal,
    collapsedCharts, setCollapsedCharts,
    filterByTeam, setFilterByTeam,
    filterIgnoredInTickets, setFilterIgnoredInTickets,
    selectedTeamIds, selectedTeamLabel,
    searchEpics,
    toggleAllCharts,
    handleOpenReadme,
    setSetupWizardStep,
  } = useDashboard();

  return (
    <header className="App-header">
      <div className="header-logo">
        <a href="#top" title="Back to top">
          <img
            src="https://images.squarespace-cdn.com/content/v1/608324e4b63c5e7e1b49aedf/4b87281c-8610-48e1-8f67-b3b3f20b2567/Slice-Logo-Screen_Yellow-BlackType.png?format=1500w"
            alt="Slice Logo"
            className="logo-image"
          />
        </a>
      </div>
      <div className="header-center">
        <h1>Shortcut Dashboard</h1>
        {selectedTeamLabel && (
          <div className="text-[1.4rem] font-normal opacity-85 mt-[0.15rem] tracking-[0.03em]">
            {filterByTeam ? `${selectedTeamLabel} Only` : 'All Teams'}
          </div>
        )}
      </div>
      <div className="settings-container">
        <div className="settings-icon-row">
          <button
            className="settings-icon"
            aria-label="Refresh Epics"
            data-tooltip="Refresh Epics"
            onClick={() => searchEpics()}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </button>
          <button
            className="settings-icon"
            aria-label="Edit Epic List"
            data-tooltip="Edit Epic List"
            onClick={() => {
              setModal('setupWizard', true);
              setSetupWizardStep(6);
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 5h2v2H3V5zm4 0h14v2H7V5zM3 11h2v2H3v-2zm4 0h14v2H7v-2zM3 17h2v2H3v-2zm4 0h14v2H7v-2z"/>
            </svg>
          </button>
          <button
            className="settings-icon"
            onClick={() => setModal('settingsMenu', !modals.settingsMenu)}
            aria-label="Settings"
            data-tooltip="Settings"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
          </button>
          {modals.settingsMenu && (
            <div className="settings-menu">
              <button
                className="settings-menu-item"
                onClick={() => {
                  setModal('settingsMenu', false);
                  setModal('setupWizard', true);
                  setSetupWizardStep(1);
                }}
              >
                Setup Wizard
              </button>
              <button
                className="settings-menu-item"
                onClick={() => {
                  setModal('settingsMenu', false);
                  handleOpenReadme();
                }}
              >
                README.md
              </button>
              <button
                className="settings-menu-item"
                onClick={() => {
                  setModal('settingsMenu', false);
                  setModal('themeSelector', true);
                }}
              >
                Theme
              </button>
              <button
                className="settings-menu-item"
                onClick={() => {
                  setModal('settingsMenu', false);
                  setModal('exportImport', true);
                }}
              >
                Export/Import
              </button>
              <button
                className="settings-menu-item !text-red-600"
                onClick={() => {
                  setModal('settingsMenu', false);
                  setModal('wipeConfirm', true);
                }}
              >
                Wipe Settings
              </button>
              <button
                className="settings-menu-item"
                onClick={() => {
                  setModal('settingsMenu', false);
                  setModal('about', true);
                }}
              >
                About
              </button>
            </div>
          )}
        </div>
      </div>
      {epics.length > 0 && (
        <div className="header-actions-row">
          <button
            onClick={() => {
              const bothCollapsed = collapsedCharts['assignment-epic'] && collapsedCharts['assignment-member'];
              setCollapsedCharts(prev => ({ ...prev, 'assignment-epic': !bothCollapsed, 'assignment-member': !bothCollapsed }));
            }}
            className={`header-action-btn${!(collapsedCharts['assignment-epic'] && collapsedCharts['assignment-member']) ? ' active' : ''}`}
            title="Show or hide the Epic Owner Assignment and Team Member Assignment tables"
          >
            {collapsedCharts['assignment-epic'] && collapsedCharts['assignment-member'] ? 'Expand Assignments' : 'Collapse Assignments'}
          </button>
          <button
            onClick={() => setFilterIgnoredInTickets(prev => !prev)}
            className={`header-action-btn${!filterIgnoredInTickets ? ' active' : ''}`}
            title={filterIgnoredInTickets ? 'Currently hiding ignored users — click to show them highlighted in assignment and ticket tables' : 'Currently showing ignored users — click to hide them from assignment and ticket tables'}
          >
            {filterIgnoredInTickets ? 'Show Ignored Users' : 'Hide Ignored Users'}
          </button>
          <button
            onClick={toggleAllCharts}
            className={`header-action-btn${(() => { const keys = epics.filter(e => !e.notFound).flatMap(e => ['workflow-pie','type-pie'].map(t => `${e.id}-${t}`)); return !keys.every(k => collapsedCharts[k]); })() ? ' active' : ''}`}
            title="Show or hide the Workflow Status Pie Chart and Story Type Breakdown across all epics"
          >
            {(() => {
              const allChartKeys = epics.filter(e => !e.notFound).flatMap(e => ['workflow-pie','type-pie'].map(t => `${e.id}-${t}`));
              return allChartKeys.every(key => collapsedCharts[key]) ? 'Expand Charts' : 'Collapse Charts';
            })()}
          </button>
          {selectedTeamIds.length > 0 && (
            <button
              onClick={() => setFilterByTeam(prev => !prev)}
              className={`header-action-btn${filterByTeam ? ' active' : ''}`}
              title={filterByTeam
                ? `Currently showing only ${selectedTeamLabel || 'team'} tickets — click to show all tickets`
                : `Currently showing all tickets — click to show only tickets assigned to ${selectedTeamLabel || 'team'}`}
            >
              {filterByTeam ? 'Show All Teams' : `Show ${selectedTeamLabel || 'Team'} Only`}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
