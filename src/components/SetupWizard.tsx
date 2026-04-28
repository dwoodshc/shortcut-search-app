/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * SetupWizard.tsx — 7-step guided setup modal. Steps: API token (verified against the
 * API), workspace URL, workflow selection, team selection, ignored users, my Shortcut
 * name (for unwatched ticket detection), and epic list.
 * Local form state is initialised from storage on mount; each step persists to
 * localStorage before advancing.
 */
import React, { useState } from 'react';
import { storage, getApiBaseUrl } from '../utils';
import { useDashboard } from '../context/DashboardContext';
import { Team } from '../types';

interface Props {
  step: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
}

export default function SetupWizard({ step, onStepChange, onClose }: Props): React.JSX.Element {
  const {
    ignoredUsers, setIgnoredUsers,
    selectedTeams, setSelectedTeams, selectedTeamIds,
    shortcutWebUrl, setShortcutWebUrl,
    workflowConfig, setWorkflowField,
    handleSaveShortcutUrl, handleSelectWorkflow,
    setFilteredEpicNames,
    error, setError,
    loading,
    successMessage,
    searchEpics,
  } = useDashboard();

  const [apiToken, setApiToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [hasExistingToken, setHasExistingToken] = useState(() => !!storage.getApiToken());
  const [epicListError, setEpicListError] = useState('');
  const [epicsText, setEpicsText] = useState(() => (storage.getEpicsConfig()?.epics || []).map(e => e.name).join('\n'));
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [myName, setMyName] = useState(() => storage.getMyName());
  const [ignoredUsersText, setIgnoredUsersText] = useState(() => ignoredUsers.join('\n'));

  const handleSaveEpicList = () => {
    setEpicListError('');
    try {
      const epics = epicsText.split('\n').filter(name => name.trim() !== '').map(name => ({ name: name.trim() }));
      const lowerNames = epics.map(e => e.name.toLowerCase());
      const duplicateLowers = lowerNames.filter((n, i) => lowerNames.indexOf(n) !== i);
      if (duplicateLowers.length > 0) {
        const displayNames = [...new Set(duplicateLowers)].map(lower => epics.find(e => e.name.toLowerCase() === lower)!.name);
        setEpicListError(`Duplicate epic${displayNames.length > 1 ? 's' : ''}: ${displayNames.join(', ')}`);
        return false;
      }
      storage.setEpicsConfig({ epics });
      setFilteredEpicNames(epics.map(e => e.name));
      return true;
    } catch (err) {
      setEpicListError('Failed to save epics configuration. Please try again.');
      return false;
    }
  };

  const handleStep1Next = async () => {
    const existingToken = storage.getApiToken();
    if (!apiToken.trim() && !existingToken) {
      setTokenError('Please enter an API token');
      return;
    }
    const tokenToVerify = apiToken.trim() || existingToken;
    if (apiToken.trim()) storage.setApiToken(apiToken.trim());
    try {
      setTokenError('Verifying token...');
      const response = await fetch(`${getApiBaseUrl()}/api/workflows`, {
        headers: { 'Authorization': `Bearer ${tokenToVerify}` }
      });
      if (!response.ok) {
        setTokenError(response.status === 401 || response.status === 403
          ? 'Invalid API token. Please check your token and try again.'
          : 'Failed to verify token. Please check your connection and try again.');
        return;
      }
      setTokenError('');
      onStepChange(2);
    } catch (err) {
      setTokenError('Exception - Failed to verify token. Please check your connection and try again.');
    }
  };

  const handleStep2Next = async () => {
    const savedUrl = handleSaveShortcutUrl();
    if (savedUrl === false) return;
    try {
      const token = storage.getApiToken();
      const workflowsResponse = await fetch(`${getApiBaseUrl()}/api/workflows`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (workflowsResponse.ok) {
        setWorkflowField('workflows', await workflowsResponse.json());
      } else {
        setError('Failed to load workflows. You may need to go back and retry.');
      }
    } catch (err) {
      setError('Failed to load workflows. Check your connection and try again.');
    }
    onStepChange(3);
  };

  const handleStep3Next = async () => {
    if (!workflowConfig.selectedId) { setError('Please select a workflow'); return; }
    const selectedWorkflow = workflowConfig.workflows.find(w => w.id === workflowConfig.selectedId);
    if (!selectedWorkflow) return;
    handleSelectWorkflow(selectedWorkflow);
    try {
      const token = storage.getApiToken();
      const teamsRes = await fetch(`${getApiBaseUrl()}/api/teams`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (teamsRes.ok) setAllTeams(await teamsRes.json());
      else setError('Failed to load teams. You can still proceed and skip team selection.');
    } catch (err) {
      setError('Failed to load teams. Check your connection and try again.');
    }
    onStepChange(4);
  };

  const handleNext = async () => {
    if (step === 1) { await handleStep1Next(); }
    else if (step === 2) { await handleStep2Next(); }
    else if (step === 3) { await handleStep3Next(); }
    else if (step === 4) { storage.setTeamConfig(selectedTeams); onStepChange(5); }
    else if (step === 5) {
      const parsed = ignoredUsersText.split('\n').map(u => u.trim()).filter(Boolean);
      setIgnoredUsers(parsed);
      storage.setIgnoredUsers(parsed);
      onStepChange(6);
    }
    else if (step === 6) { storage.setMyName(myName.trim()); onStepChange(7); }
    else if (step === 7) { const saved = handleSaveEpicList(); if (saved) { onClose(); searchEpics(); } }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-large">
        <h2>Setup Wizard</h2>
        <p className="text-[#718096] mb-6">
          Configure your Shortcut connection and epic tracking
        </p>

        {/* Step Indicator */}
        <div className="flex justify-between mb-8 relative">
          {[1, 2, 3, 4, 5, 6, 7].map((stepNum) => (
            <div
              key={stepNum}
              className="flex-1 flex flex-col items-center relative cursor-pointer"
              onClick={() => onStepChange(stepNum)}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 z-10 border-2"
                style={{
                  backgroundColor: step === stepNum ? '#494BCB' : step > stepNum ? '#22c55e' : '#e2e8f0',
                  color: step >= stepNum ? 'white' : '#94a3b8',
                  borderColor: step === stepNum ? '#494BCB' : 'transparent'
                }}
              >
                {step > stepNum ? '✓' : stepNum}
              </div>
              <div
                className={`mt-2 text-[0.65rem] text-center select-none ${step === stepNum ? 'text-[#494BCB] font-semibold' : 'text-[#64748b] font-normal'}`}
              >
                {stepNum === 1 && 'API Token'}
                {stepNum === 2 && 'Shortcut URL'}
                {stepNum === 3 && 'Workflow'}
                {stepNum === 4 && 'Select Team'}
                {stepNum === 5 && 'Ignore Users'}
                {stepNum === 6 && 'My Name'}
                {stepNum === 7 && 'Epic List'}
              </div>
              {stepNum < 7 && (
                <div
                  className="absolute top-4 left-[60%] h-[2px] transition-all duration-300 z-0"
                  style={{
                    width: 'calc(100% - 16px)',
                    backgroundColor: step > stepNum ? '#22c55e' : '#e2e8f0',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="h-[450px] overflow-y-auto flex flex-col">
          {/* Step 1: API Token */}
          {step === 1 && (
            <div>
              <h3 className="text-[#1e293b] mb-4">Step 1: API Token</h3>
              <p>To use this application, you need to provide a Shortcut API token.</p>

              <ol>
                <li>Go to <a href="https://app.shortcut.com/settings/account/api-tokens" target="_blank" rel="noopener noreferrer">Shortcut Settings → API Tokens</a></li>
                <li>Give it a name (e.g., "Epic Viewer")</li>
                <li>Click "Generate Token"</li>
                <li>Copy the generated token</li>
                <li>Paste it below</li>
              </ol>

              <div className="form-group">
                <label htmlFor="apiToken">API Token:</label>
                <input
                  type="text"
                  id="apiToken"
                  value={hasExistingToken && !apiToken ? '*'.repeat(storage.getApiToken()?.length || 0) : apiToken}
                  onChange={(e) => {
                    if (hasExistingToken && !apiToken) {
                      setHasExistingToken(false);
                    }
                    setApiToken(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (apiToken.trim()) {
                        storage.setApiToken(apiToken.trim());
                        setHasExistingToken(true);
                      }
                    }
                  }}
                  className="input-field"
                  placeholder={hasExistingToken ? "Enter new API token to replace existing" : "Enter your Shortcut API token"}
                  autoFocus
                />
                {hasExistingToken && (
                  <p className="text-xs text-[#64748b] mt-2 mb-0">
                    Token is currently set. Enter a new token to replace it.
                  </p>
                )}
                {tokenError && (
                  <div className="text-[#c33] mt-2 text-sm">
                    {tokenError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Shortcut URL */}
          {step === 2 && (
            <div>
              <h3 className="text-[#1e293b] mb-4">Step 2: Shortcut URL</h3>
              <p className="mb-6">Enter your Shortcut workspace URL. This will be used to generate hyperlinks to your epics.</p>

              <div className="form-group">
                <label htmlFor="shortcutWebUrl">Shortcut URL:</label>
                <input
                  type="text"
                  id="shortcutWebUrl"
                  value={shortcutWebUrl}
                  onChange={(e) => setShortcutWebUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://app.shortcut.com/your-workspace"
                />
                <p className="text-xs text-[#64748b] mt-2">
                  Example: https://app.shortcut.com/your-workspace
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Select Workflow */}
          {step === 3 && (
            <div>
              <h3 className="text-[#1e293b] mb-4">Step 3: Select Workflow</h3>
              <p className="mb-6">Choose the workflow you want to use for tracking epic progress.</p>

              {error && (
                <div className="bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] p-3 rounded-lg mb-4 text-sm">
                  {error}
                </div>
              )}

              <div>
                {workflowConfig.workflows.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[#94a3b8] italic">
                      {loading ? 'Loading workflows...' : 'No workflows found'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {workflowConfig.workflows.map((workflow) => (
                      <div
                        key={workflow.id}
                        className="flex flex-col gap-3 p-4 rounded-lg transition-all duration-200 cursor-pointer"
                        style={{
                          backgroundColor: workflowConfig.selectedId === workflow.id ? '#eff6ff' : '#ffffff',
                          border: workflowConfig.selectedId === workflow.id ? '2px solid #494BCB' : '1px solid #e2e8f0',
                        }}
                        onClick={() => setWorkflowField('selectedId', workflow.id)}
                      >
                        <div className="flex-1">
                          <h4 className="text-[#494BCB] mb-2 text-base font-semibold flex items-center gap-2">
                            {workflow.name}
                            {workflowConfig.selectedId === workflow.id && (
                              <span className="text-green-500 text-sm font-normal">
                                ✓ Selected
                              </span>
                            )}
                          </h4>
                          {workflow.description && (
                            <p className="text-[#64748b] text-sm mb-3 leading-[1.4]">
                              {workflow.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {workflow.states && workflow.states.map((state) => (
                              <div
                                key={state.id}
                                className="text-white px-3 py-1 rounded-full text-xs font-semibold inline-block whitespace-nowrap"
                                style={{
                                  backgroundColor: state.color === 'green' ? '#22c55e' :
                                                 state.color === 'yellow' ? '#fbbf24' :
                                                 state.color === 'red' ? '#ef4444' :
                                                 state.color === 'blue' ? '#3b82f6' : '#6b7280',
                                }}
                              >
                                {state.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Select Teams */}
          {step === 4 && (
            <div>
              <h3 className="text-[#1e293b] mb-4">Step 4: Select Teams</h3>
              <p className="mb-6">Choose one or more Shortcut teams to track in this dashboard.</p>
              {allTeams.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#94a3b8] italic mb-4">No teams found. You can skip this step if you don't use teams.</p>
                  <button
                    type="button"
                    className="btn-secondary text-[0.8rem]"
                    onClick={async () => {
                      try {
                        const token = storage.getApiToken();
                        const teamsRes = await fetch(`${getApiBaseUrl()}/api/teams`, {
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (teamsRes.ok) setAllTeams(await teamsRes.json());
                        else setError('Failed to load teams. Check your connection and try again.');
                      } catch (err) {
                        setError('Failed to load teams. Check your connection and try again.');
                      }
                    }}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {allTeams.map((team) => {
                    const isSelected = selectedTeamIds.includes(team.id);
                    return (
                      <div
                        key={team.id}
                        onClick={() => setSelectedTeams(prev =>
                          prev.some(t => t.id === team.id)
                            ? prev.filter(t => t.id !== team.id)
                            : [...prev, { id: team.id, name: team.name }]
                        )}
                        className="px-4 py-3 rounded-lg cursor-pointer transition-all duration-150"
                        style={{
                          backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                          border: isSelected ? '2px solid #494BCB' : '1px solid #e2e8f0',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[0.95rem] text-[#494BCB]">{team.name}</span>
                          {isSelected && (
                            <span className="text-green-500 text-[0.8rem]">✓ Selected</span>
                          )}
                        </div>
                        {team.description && (
                          <p className="text-[#64748b] text-[0.85rem] mt-1 mb-0">{team.description}</p>
                        )}
                      </div>
                    );
                  })}
                  {selectedTeamIds.length > 1 && (
                    <p className="text-[#64748b] text-[0.85rem] mt-1 mb-0">
                      {selectedTeamIds.length} teams selected
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Ignore Users */}
          {step === 5 && (
            <div className="flex flex-col h-full">
              <h3 className="text-[#1e293b] mb-[0.4rem]">Step 5: Ignore Users</h3>
              <p className="mb-[0.15rem]">Enter the names of Shortcut users to exclude from the assignment tables (one per line).</p>
              <div className="flex-1 flex flex-col min-h-0">
                <textarea
                  className="input-field flex-1 w-full resize-none font-inherit text-base px-3 py-2 box-border"
                  value={ignoredUsersText}
                  onChange={(e) => setIgnoredUsersText(e.target.value)}
                  placeholder={"John Smith\nJane Doe"}
                />
              </div>
            </div>
          )}

          {/* Step 6: My Name */}
          {step === 6 && (
            <div>
              <h3 className="text-[#1e293b] mb-4">Step 6: Your Shortcut Name</h3>
              <p className="mb-6">Enter your name exactly as it appears in Shortcut. This will be used to find open tickets in your selected teams that you are not watching.</p>
              <div className="form-group">
                <label htmlFor="myName">Your name in Shortcut:</label>
                <input
                  type="text"
                  id="myName"
                  value={myName}
                  onChange={(e) => setMyName(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Jane Smith"
                />
                <p className="text-xs text-[#64748b] mt-2">
                  This is optional. Leave blank to skip unwatched ticket tracking.
                </p>
              </div>
            </div>
          )}

          {/* Step 7: Epic List */}
          {step === 7 && (
            <div className="flex flex-col h-full">
              <h3 className="text-[#1e293b] mb-[0.4rem]">Step 7: Epic List</h3>
              <p className="mb-[0.15rem]">Add the epics you want to track.</p>

              <div className="flex-1 flex flex-col min-h-0">
                <textarea
                  className="input-field flex-1 w-full resize-none font-inherit text-base px-3 py-2 box-border"
                  value={epicsText}
                  onChange={(e) => setEpicsText(e.target.value)}
                  placeholder={"Epic Alpha\nEpic Beta\nEpic Gamma"}
                />
              </div>

              {epicListError && (
                <div className="text-[#c33] mt-2 text-sm bg-[#fee] border border-[#fcc] p-3 rounded-md whitespace-pre-line max-h-[150px] overflow-y-auto">
                  {epicListError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Success message display */}
        {successMessage && (
          <div className="bg-[#d1fae5] border border-[#6ee7b7] text-[#065f46] p-3 rounded-lg mt-4 text-sm">
            {successMessage}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="modal-buttons mt-6 flex justify-between">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => onStepChange(step - 1)}
                className="btn-secondary"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="btn-primary"
            >
              {step < 7 ? 'Next' : 'Finish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
