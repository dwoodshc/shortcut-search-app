/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * SetupWizard.tsx — 6-step guided setup modal. Steps: API token (verified against the
 * API), workspace URL, workflow selection, team selection, ignored users, and epic list.
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
    selectedTeamId, setSelectedTeamId,
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
  const [epicsList, setEpicsList] = useState<Array<{ name: string }>>(() => storage.getEpicsConfig()?.epics || []);
  const [allTeams, setAllTeams] = useState<Team[]>([]);

  const handleSaveEpicList = () => {
    setEpicListError('');
    try {
      storage.setEpicsConfig({ epics: epicsList });
      setFilteredEpicNames(epicsList.map(e => e.name));
      return true;
    } catch (err) {
      setEpicListError('Failed to save epics configuration. Please try again.');
      return false;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-content-large">
        <h2>Setup Wizard</h2>
        <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
          Configure your Shortcut connection and epic tracking
        </p>

        {/* Step Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          position: 'relative'
        }}>
          {[1, 2, 3, 4, 5, 6].map((stepNum) => (
            <div
              key={stepNum}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', cursor: 'pointer' }}
              onClick={() => onStepChange(stepNum)}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: step === stepNum ? '#494BCB' : step > stepNum ? '#22c55e' : '#e2e8f0',
                color: step >= stepNum ? 'white' : '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                zIndex: 1,
                border: step === stepNum ? '2px solid #494BCB' : '2px solid transparent'
              }}>
                {step > stepNum ? '✓' : stepNum}
              </div>
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: step === stepNum ? '#494BCB' : '#64748b',
                fontWeight: step === stepNum ? '600' : 'normal',
                textAlign: 'center',
                userSelect: 'none'
              }}>
                {stepNum === 1 && 'API Token'}
                {stepNum === 2 && 'Shortcut URL'}
                {stepNum === 3 && 'Workflow'}
                {stepNum === 4 && 'Select Team'}
                {stepNum === 5 && 'Ignore Users'}
                {stepNum === 6 && 'Epic List'}
              </div>
              {stepNum < 6 && (
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  left: '60%',
                  width: 'calc(100% - 20px)',
                  height: '2px',
                  backgroundColor: step > stepNum ? '#22c55e' : '#e2e8f0',
                  transition: 'all 0.3s ease',
                  zIndex: 0
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div style={{ height: '450px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {/* Step 1: API Token */}
          {step === 1 && (
            <div>
              <h3 style={{ color: '#1e293b', marginBottom: '1rem' }}>Step 1: API Token</h3>
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
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', marginBottom: 0 }}>
                    Token is currently set. Enter a new token to replace it.
                  </p>
                )}
                {tokenError && (
                  <div style={{ color: '#c33', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    {tokenError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Shortcut URL */}
          {step === 2 && (
            <div>
              <h3 style={{ color: '#1e293b', marginBottom: '1rem' }}>Step 2: Shortcut URL</h3>
              <p style={{ marginBottom: '1.5rem' }}>Enter your Shortcut workspace URL. This will be used to generate hyperlinks to your epics.</p>

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
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Example: https://app.shortcut.com/your-workspace
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Select Workflow */}
          {step === 3 && (
            <div>
              <h3 style={{ color: '#1e293b', marginBottom: '1rem' }}>Step 3: Select Workflow</h3>
              <p style={{ marginBottom: '1.5rem' }}>Choose the workflow you want to use for tracking epic progress.</p>

              {error && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.875rem'
                }}>
                  {error}
                </div>
              )}

              <div>
                {workflowConfig.workflows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                      {loading ? 'Loading workflows...' : 'No workflows found'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {workflowConfig.workflows.map((workflow) => (
                      <div
                        key={workflow.id}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          padding: '1rem',
                          backgroundColor: workflowConfig.selectedId === workflow.id ? '#eff6ff' : '#ffffff',
                          border: workflowConfig.selectedId === workflow.id ? '2px solid #494BCB' : '1px solid #e2e8f0',
                          borderRadius: '8px',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                        onClick={() => setWorkflowField('selectedId', workflow.id)}
                      >
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            color: '#494BCB',
                            marginBottom: '0.5rem',
                            fontSize: '1rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            {workflow.name}
                            {workflowConfig.selectedId === workflow.id && (
                              <span style={{ color: '#22c55e', fontSize: '0.875rem', fontWeight: 'normal' }}>
                                ✓ Selected
                              </span>
                            )}
                          </h4>
                          {workflow.description && (
                            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                              {workflow.description}
                            </p>
                          )}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {workflow.states && workflow.states.map((state) => (
                              <div
                                key={state.id}
                                style={{
                                  backgroundColor: state.color === 'green' ? '#22c55e' :
                                                 state.color === 'yellow' ? '#fbbf24' :
                                                 state.color === 'red' ? '#ef4444' :
                                                 state.color === 'blue' ? '#3b82f6' : '#6b7280',
                                  color: 'white',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  display: 'inline-block',
                                  whiteSpace: 'nowrap'
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

          {/* Step 4: Select Team */}
          {step === 4 && (
            <div>
              <h3 style={{ color: '#1e293b', marginBottom: '1rem' }}>Step 4: Select Team</h3>
              <p style={{ marginBottom: '1.5rem' }}>Choose the Shortcut team you want to track in this dashboard.</p>
              {allTeams.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <p style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: '1rem' }}>No teams found. You can skip this step if you don't use teams.</p>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem' }}
                    onClick={async () => {
                      try {
                        const token = storage.getApiToken();
                        const teamsRes = await fetch(`${getApiBaseUrl()}/api/teams`, {
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (teamsRes.ok) setAllTeams(await teamsRes.json());
                      } catch (err) {}
                    }}
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {allTeams.map((team) => (
                    <div
                      key={team.id}
                      onClick={() => setSelectedTeamId(team.id)}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: selectedTeamId === team.id ? '#eff6ff' : '#ffffff',
                        border: selectedTeamId === team.id ? '2px solid #494BCB' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#494BCB' }}>{team.name}</span>
                        {selectedTeamId === team.id && (
                          <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>✓ Selected</span>
                        )}
                      </div>
                      {team.description && (
                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>{team.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Ignore Users */}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 style={{ color: '#1e293b', marginBottom: '0.4rem' }}>Step 5: Ignore Users</h3>
              <p style={{ marginBottom: '0.15rem' }}>Enter the names of Shortcut users to exclude from the assignment tables (one per line).</p>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <textarea
                  className="input-field"
                  value={ignoredUsers.join('\n')}
                  onChange={(e) => setIgnoredUsers(e.target.value.split('\n').filter(u => u.trim() !== ''))}
                  placeholder={"John Smith\nJane Doe"}
                  style={{ flex: 1, width: '100%', resize: 'none', fontFamily: 'inherit', fontSize: '1rem', padding: '0.5rem 0.75rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {/* Step 6: Epic List */}
          {step === 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <h3 style={{ color: '#1e293b', marginBottom: '0.4rem' }}>Step 6: Epic List</h3>
              <p style={{ marginBottom: '0.15rem' }}>Add the epics you want to track.</p>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <textarea
                  className="input-field"
                  value={epicsList.map(e => e.name).join('\n')}
                  onChange={(e) => setEpicsList(e.target.value.split('\n').filter(name => name.trim() !== '').map(name => ({ name })))}
                  placeholder={"Epic Alpha\nEpic Beta\nEpic Gamma"}
                  style={{ flex: 1, width: '100%', resize: 'none', fontFamily: 'inherit', fontSize: '1rem', padding: '0.5rem 0.75rem', boxSizing: 'border-box' }}
                />
              </div>

              {epicListError && (
                <div style={{
                  color: '#c33',
                  marginTop: '0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  whiteSpace: 'pre-line',
                  maxHeight: '150px',
                  overflowY: 'auto'
                }}>
                  {epicListError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Success message display */}
        {successMessage && (
          <div style={{
            backgroundColor: '#d1fae5',
            border: '1px solid #6ee7b7',
            color: '#065f46',
            padding: '0.75rem',
            borderRadius: '8px',
            marginTop: '1rem',
            fontSize: '0.875rem'
          }}>
            {successMessage}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="modal-buttons" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
              onClick={async () => {
                if (step === 1) {
                  const existingToken = storage.getApiToken();
                  if (!apiToken.trim() && !existingToken) {
                    setTokenError('Please enter an API token');
                    return;
                  }

                  const tokenToVerify = apiToken.trim() || existingToken;

                  if (apiToken.trim()) {
                    storage.setApiToken(apiToken);
                  }

                  try {
                    setTokenError('Verifying token...');
                    const response = await fetch(`${getApiBaseUrl()}/api/workflows`, {
                      headers: { 'Authorization': `Bearer ${tokenToVerify}` }
                    });

                    if (!response.ok) {
                      if (response.status === 401 || response.status === 403) {
                        setTokenError('Invalid API token. Please check your token and try again.');
                      } else {
                        setTokenError('Failed to verify token. Please check your connection and try again.');
                      }
                      return;
                    }

                    setTokenError('');
                    onStepChange(2);
                  } catch (err) {
                    setTokenError('Exception - Failed to verify token. Please check your connection and try again.');
                    return;
                  }
                } else if (step === 2) {
                  const savedUrl = handleSaveShortcutUrl();
                  if (savedUrl !== false) {
                    try {
                      const token = storage.getApiToken();
                      const workflowsResponse = await fetch(`${getApiBaseUrl()}/api/workflows`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      if (workflowsResponse.ok) {
                        const workflows = await workflowsResponse.json();
                        setWorkflowField('workflows', workflows);
                      }
                    } catch (err) {}
                    onStepChange(3);
                  }
                } else if (step === 3) {
                  if (!workflowConfig.selectedId) {
                    setError('Please select a workflow');
                    return;
                  }
                  const selectedWorkflow = workflowConfig.workflows.find(w => w.id === workflowConfig.selectedId);
                  if (selectedWorkflow) {
                    handleSelectWorkflow(selectedWorkflow);
                    try {
                      const token = storage.getApiToken();
                      const teamsRes = await fetch(`${getApiBaseUrl()}/api/teams`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      if (teamsRes.ok) setAllTeams(await teamsRes.json());
                    } catch (err) {}
                    onStepChange(4);
                  }
                } else if (step === 4) {
                  if (selectedTeamId) {
                    const selectedTeam = allTeams.find(t => t.id === selectedTeamId);
                    if (selectedTeam) {
                      storage.setTeamConfig({ id: selectedTeam.id, name: selectedTeam.name });
                    }
                  }
                  onStepChange(5);
                } else if (step === 5) {
                  storage.setIgnoredUsers(ignoredUsers);
                  onStepChange(6);
                } else if (step === 6) {
                  const saved = handleSaveEpicList();
                  if (saved) {
                    onClose();
                    searchEpics();
                  }
                }
              }}
              className="btn-primary"
            >
              {step < 6 ? 'Next' : 'Finish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
