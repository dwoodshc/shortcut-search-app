import React, { useState, useEffect, useCallback } from 'react';
import yaml from 'js-yaml';
import './App.css';

function App() {
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredPieSegment, setHoveredPieSegment] = useState(null);
  const [hoveredTypeSegment, setHoveredTypeSegment] = useState(null);
  const [workflowStates, setWorkflowStates] = useState({});
  const [workflowStateOrder, setWorkflowStateOrder] = useState([]);
  const [members, setMembers] = useState({});
  const [filteredEpicNames, setFilteredEpicNames] = useState([]);
  const [epicEmails, setEpicEmails] = useState({});
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const [showEpicListModal, setShowEpicListModal] = useState(false);
  const [epicListError, setEpicListError] = useState('');
  const [collapsedCharts, setCollapsedCharts] = useState({});
  const [epicsList, setEpicsList] = useState([]);

  // Toggle chart collapse state for a specific epic and chart type
  const toggleChart = (epicId, chartType) => {
    setCollapsedCharts(prev => ({
      ...prev,
      [`${epicId}-${chartType}`]: !prev[`${epicId}-${chartType}`]
    }));
  };

  // Toggle all charts and tables collapse state
  const toggleAllCharts = () => {
    const allChartKeys = [];
    const chartTypes = ['column', 'workflow-pie', 'type-pie', 'owners-table', 'team-tickets', 'stories'];

    epics.forEach(epic => {
      if (!epic.notFound) {
        chartTypes.forEach(type => {
          allChartKeys.push(`${epic.id}-${type}`);
        });
      }
    });

    // Check if all are currently collapsed
    const allCollapsed = allChartKeys.every(key => collapsedCharts[key]);

    // Set all to the opposite state
    const newState = {};
    allChartKeys.forEach(key => {
      newState[key] = !allCollapsed;
    });

    setCollapsedCharts(newState);
  };

  // Check if API token exists on mount
  useEffect(() => {
    const checkToken = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/check-token');
        if (response.ok) {
          const data = await response.json();
          setHasExistingToken(data.hasToken);
          if (!data.hasToken) {
            setShowTokenModal(true);
          }
        }
      } catch (err) {
        console.error('Error checking token:', err);
        setShowTokenModal(true);
        setHasExistingToken(false);
      }
    };

    checkToken();
  }, []);

  // Fetch teams, workflow states, and filtered epic names on mount
  useEffect(() => {
    const checkEpicsFile = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/epics-file');
        if (!response.ok) {
          // If epics.yml doesn't exist, open the modal with empty content
          setEpicsList([]);
          setShowEpicListModal(true);
        }
      } catch (err) {
        console.error('Error checking epics file:', err);
      }
    };

    const fetchWorkflows = async () => {
      try {
        const workflowsResponse = await fetch('http://localhost:3001/api/workflows');
        if (workflowsResponse.ok) {
          const workflows = await workflowsResponse.json();
          const statesMap = {};
          const stateOrder = [];

          // Only use the "RnD Workflow"
          workflows.forEach(workflow => {
            if (workflow.name === "RnD Workflow") {
              workflow.states.forEach(state => {
                statesMap[state.id] = state.name;
                if (!stateOrder.includes(state.id)) {
                  stateOrder.push(state.id);
                }
              });
            }
          });

          setWorkflowStates(statesMap);
          setWorkflowStateOrder(stateOrder);
        }
      } catch (err) {
        console.error('Error fetching workflows:', err);
      }
    };

    const fetchFilteredEpics = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/filtered-epics');
        if (response.ok) {
          const epicNames = await response.json();
          setFilteredEpicNames(epicNames);
        }
      } catch (err) {
        console.error('Error fetching filtered epics:', err);
      }
    };

    const fetchEpicEmails = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/epic-emails');
        if (response.ok) {
          const emailsData = await response.json();
          setEpicEmails(emailsData);
        }
      } catch (err) {
        console.error('Error fetching epic emails:', err);
      }
    };

    checkEpicsFile();
    fetchWorkflows();
    fetchFilteredEpics();
    fetchEpicEmails();
  }, []);

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSettingsMenu && !event.target.closest('.settings-container')) {
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showSettingsMenu]);

  // Fetch user name by ID
  // Convert text to title case (initial capitals)
  const toTitleCase = (str) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get story state CSS class based on state name
  const getStateClass = (stateName) => {
    const lowerStateName = stateName.toLowerCase();
    if (lowerStateName === 'in development') {
      return 'story-state-in-development';
    } else if (lowerStateName === 'complete' || lowerStateName === 'completed') {
      return 'story-state-complete';
    } else if (lowerStateName === 'ready for release') {
      return 'story-state-ready-for-release';
    } else if (lowerStateName === 'ready for development') {
      return 'story-state-ready-for-development';
    } else if (lowerStateName === 'in review') {
      return 'story-state-in-review';
    }
    return 'story-state-default';
  };

  // Get epic state CSS class based on state name
  const getEpicStateClass = (stateName) => {
    const lowerStateName = stateName.toLowerCase();
    if (lowerStateName === 'in progress') {
      return 'epic-state-in-progress';
    } else if (lowerStateName === 'done') {
      return 'epic-state-done';
    }
    return 'epic-state-default';
  };

  // Load epic list content
  const handleOpenEpicList = async () => {
    setEpicListError('');
    try {
      const response = await fetch('http://localhost:3001/api/epics-file');
      if (response.ok) {
        const data = await response.json();

        // Parse YAML into structured data
        try {
          const parsedData = yaml.load(data.content);
          if (parsedData && parsedData.epics) {
            setEpicsList(parsedData.epics);
          } else {
            setEpicsList([]);
          }
        } catch (yamlErr) {
          console.error('Error parsing YAML:', yamlErr);
          setEpicsList([]);
        }

        setShowEpicListModal(true);
      } else {
        setEpicListError('Failed to load epics.yml file');
      }
    } catch (err) {
      console.error('Error loading epics file:', err);
      setEpicListError('Failed to load epics.yml file');
    }
  };

  // Save epic list content
  const handleSaveEpicList = async () => {
    setEpicListError('');

    try {
      // Convert structured data back to YAML
      const yamlContent = yaml.dump({ epics: epicsList });

      const response = await fetch('http://localhost:3001/api/epics-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: yamlContent })
      });

      if (response.ok) {
        setShowEpicListModal(false);
        // Reload the epic emails and filtered epic names
        const emailsResponse = await fetch('http://localhost:3001/api/epic-emails');
        if (emailsResponse.ok) {
          const emailsData = await emailsResponse.json();
          setEpicEmails(emailsData);
        }
        const filteredResponse = await fetch('http://localhost:3001/api/filtered-epics');
        if (filteredResponse.ok) {
          const epicNames = await filteredResponse.json();
          setFilteredEpicNames(epicNames);
        }
      } else {
        const data = await response.json();
        setEpicListError(data.error || 'Failed to save epics.yml file');
      }
    } catch (err) {
      console.error('Error saving epics file:', err);
      setEpicListError('Failed to save epics.yml file. Please try again.');
    }
  };

  // Save API token
  const handleSaveToken = async () => {
    setTokenError('');

    if (!apiToken.trim()) {
      setTokenError('Please enter an API token');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/save-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: apiToken.trim() })
      });

      if (response.ok) {
        setShowTokenModal(false);
        setApiToken('');
        setHasExistingToken(true);
        // Reload the page to reinitialize with the new token
        window.location.reload();
      } else {
        const data = await response.json();
        setTokenError(data.error || 'Failed to save token');
      }
    } catch (err) {
      console.error('Error saving token:', err);
      setTokenError('Failed to save token. Please try again.');
    }
  };

  // Epic management helper functions
  const addEpic = () => {
    setEpicsList([...epicsList, { name: '', team: [] }]);
  };

  const removeEpic = (index) => {
    setEpicsList(epicsList.filter((_, i) => i !== index));
  };

  const updateEpicName = (index, name) => {
    const newEpicsList = [...epicsList];
    newEpicsList[index].name = name;
    setEpicsList(newEpicsList);
  };

  const addTeamMember = (epicIndex) => {
    const newEpicsList = [...epicsList];
    if (!newEpicsList[epicIndex].team) {
      newEpicsList[epicIndex].team = [];
    }
    newEpicsList[epicIndex].team.push('');
    setEpicsList(newEpicsList);
  };

  const removeTeamMember = (epicIndex, memberIndex) => {
    const newEpicsList = [...epicsList];
    newEpicsList[epicIndex].team = newEpicsList[epicIndex].team.filter((_, i) => i !== memberIndex);
    setEpicsList(newEpicsList);
  };

  const updateTeamMember = (epicIndex, memberIndex, name) => {
    const newEpicsList = [...epicsList];
    newEpicsList[epicIndex].team[memberIndex] = name;
    setEpicsList(newEpicsList);
  };

  const fetchUserName = useCallback(async (userId) => {
    if (members[userId]) {
      return members[userId];
    }

    try {
      const response = await fetch(`http://localhost:3001/api/users/${userId}`);
      if (response.ok) {
        const user = await response.json();
        const userName = user.profile.name;
        setMembers(prev => ({ ...prev, [userId]: userName }));
        return userName;
      }
    } catch (err) {
      console.error('Error fetching user:', err);
    }
    return userId;
  }, [members]);

  // Fetch owner names for epics and stories when they're loaded
  useEffect(() => {
    const fetchOwnerNames = async () => {
      const ownerIds = new Set();

      // Collect epic owner IDs
      epics.forEach(epic => {
        if (epic.owner_ids) {
          epic.owner_ids.forEach(id => ownerIds.add(id));
        }

        // Collect story owner IDs
        if (epic.stories) {
          epic.stories.forEach(story => {
            if (story.owner_ids) {
              story.owner_ids.forEach(id => ownerIds.add(id));
            }
          });
        }
      });

      // Fetch names for all unique owner IDs
      for (const ownerId of ownerIds) {
        if (!members[ownerId]) {
          await fetchUserName(ownerId);
        }
      }
    };

    if (epics.length > 0) {
      fetchOwnerNames();
    }
  }, [epics, members, fetchUserName]);

  const searchEpics = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setEpics([]);

    try {
      // Search for all epics that are not complete
      const response = await fetch(
        `http://localhost:3001/api/search/epics?query=!state:Complete`
      );

      if (!response.ok) {
        throw new Error('Failed to search epics');
      }

      const data = await response.json();
      const epicsList = data.data || [];

      // Filter to only include epics from epics.txt
      const filteredEpicsList = epicsList.filter(epic =>
        filteredEpicNames.includes(epic.name)
      );

      // Fetch stories for filtered epics to show the workflow status chart
      const epicsWithStories = await Promise.all(
        filteredEpicsList.map(async (epic) => {
          try {
            const storiesResponse = await fetch(`http://localhost:3001/api/epics/${epic.id}/stories`);
            if (storiesResponse.ok) {
              const stories = await storiesResponse.json();
              return { ...epic, stories };
            }
          } catch (err) {
            console.error('Error fetching stories for epic:', err);
          }
          return epic;
        })
      );

      // Sort epics based on the order in filteredEpicNames
      epicsWithStories.sort((a, b) => {
        const indexA = filteredEpicNames.indexOf(a.name);
        const indexB = filteredEpicNames.indexOf(b.name);
        return indexA - indexB;
      });

      // Add not found epics to the results (in order)
      const allEpics = [];
      filteredEpicNames.forEach(name => {
        const foundEpic = epicsWithStories.find(epic => epic.name === name);
        if (foundEpic) {
          allEpics.push(foundEpic);
        } else {
          allEpics.push({
            id: `not-found-${name}`,
            name: name,
            notFound: true
          });
        }
      });

      setEpics(allEpics);

      // Collapse stories by default for all epics
      const newCollapsedState = {};
      allEpics.forEach(epic => {
        if (!epic.notFound) {
          newCollapsedState[`${epic.id}-stories`] = true;
        }
      });
      setCollapsedCharts(prev => ({ ...prev, ...newCollapsedState }));

      if (!filteredEpicsList.length) {
        setError('No epics found from the list in epics.txt');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error searching epics:', err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="App">
      {showTokenModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{hasExistingToken ? 'Edit API Token' : 'Shortcut API Token Required'}</h2>
            <p>To use this application, you need to provide a Shortcut API token.</p>

            <p><strong>How to get your API token:</strong></p>
            <ol>
              <li>Go to <a href="https://app.shortcut.com/settings/account/api-tokens" target="_blank" rel="noopener noreferrer">Shortcut Settings → API Tokens</a></li>
              <li>Click "Generate Token"</li>
              <li>Give it a name (e.g., "Epic Viewer")</li>
              <li>Copy the generated token</li>
              <li>Paste it below</li>
            </ol>

            <div className="form-group">
              <label htmlFor="apiToken">API Token:</label>
              <input
                type="text"
                id="apiToken"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveToken()}
                className="input-field"
                placeholder="Enter your Shortcut API token"
                autoFocus
              />
              {tokenError && (
                <div style={{ color: '#c33', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  {tokenError}
                </div>
              )}
            </div>

            <div className="modal-buttons">
              {hasExistingToken && (
                <button
                  type="button"
                  onClick={() => {
                    setShowTokenModal(false);
                    setApiToken('');
                    setTokenError('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveToken}
                className="btn-primary"
              >
                Save Token
              </button>
            </div>
          </div>
        </div>
      )}

      {showAboutModal && (
        <div className="modal-overlay" onClick={() => setShowAboutModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>About Shortcut Epic & Story Viewer</h2>
            <p>
              This application helps you search and view Epics and Stories from Shortcut.com.
            </p>
            <p>
              <strong>Features:</strong>
            </p>
            <ul>
              <li>Search epics by team name</li>
              <li>View ticket status breakdown with interactive charts</li>
              <li>Track story ownership and assignments</li>
              <li>Monitor team open tickets</li>
              <li>Filter to show only epics from your configured list</li>
            </ul>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#718096' }}>
              Version 1.0.0
            </p>
            <div className="modal-buttons">
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showEpicListModal && (
        <div className="modal-overlay" onClick={() => setShowEpicListModal(false)}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Epic List</h2>
            <p>
              Add or remove epics and their team members:
            </p>

            <div className="form-group" style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: '1rem' }}>
              {epicsList.map((epic, epicIndex) => (
                <div key={epicIndex} style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  backgroundColor: '#f7fafc'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <label style={{ fontWeight: 'bold', minWidth: '80px' }}>Epic Name:</label>
                    <input
                      type="text"
                      value={epic.name || ''}
                      onChange={(e) => updateEpicName(epicIndex, e.target.value)}
                      className="input-field"
                      placeholder="Enter epic name"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => removeEpic(epicIndex)}
                      className="btn-secondary"
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#ef4444',
                        color: 'white'
                      }}
                    >
                      Remove Epic
                    </button>
                  </div>

                  <div style={{ marginLeft: '1rem', marginTop: '0.75rem' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>
                      Team Members:
                    </label>
                    {epic.team && epic.team.map((member, memberIndex) => (
                      <div key={memberIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input
                          type="text"
                          value={member || ''}
                          onChange={(e) => updateTeamMember(epicIndex, memberIndex, e.target.value)}
                          className="input-field"
                          placeholder="Enter team member name"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => removeTeamMember(epicIndex, memberIndex)}
                          className="btn-secondary"
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#f59e0b',
                            color: 'white'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addTeamMember(epicIndex)}
                      className="btn-secondary"
                      style={{ marginTop: '0.5rem' }}
                    >
                      + Add Team Member
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addEpic}
                className="btn-secondary"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                + Add New Epic
              </button>
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
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {epicListError}
              </div>
            )}

            <div className="modal-buttons">
              <button
                type="button"
                onClick={() => {
                  setShowEpicListModal(false);
                  setEpicListError('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEpicList}
                className="btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="App-header">
        <h1>Shortcut Epic & Story Viewer</h1>
        <div className="settings-container">
          <button
            className="settings-icon"
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            aria-label="Settings"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
          </button>
          {showSettingsMenu && (
            <div className="settings-menu">
              <button
                className="settings-menu-item"
                onClick={() => {
                  setShowSettingsMenu(false);
                  handleOpenEpicList();
                }}
              >
                Edit Epic List
              </button>
              <button
                className="settings-menu-item"
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowTokenModal(true);
                }}
              >
                Edit API Token
              </button>
              <button
                className="settings-menu-item"
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowAboutModal(true);
                }}
              >
                About
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="container">
        <form onSubmit={searchEpics} className="search-form">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Searching...' : 'Search Epics'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {epics.length > 0 && (
          <div className="epics-list">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>
                {epics.filter(e => !e.notFound).length === filteredEpicNames.length ? '✅ ' : '⚠️ '}
                Found {epics.filter(e => !e.notFound).length} of {filteredEpicNames.length} Epic{filteredEpicNames.length !== 1 ? 's' : ''}
              </h2>
              <button
                onClick={toggleAllCharts}
                className="btn-secondary"
                style={{ whiteSpace: 'nowrap' }}
              >
                {(() => {
                  const allChartKeys = [];
                  const chartTypes = ['column', 'workflow-pie', 'type-pie', 'owners-table', 'team-tickets', 'stories'];
                  epics.forEach(epic => {
                    if (!epic.notFound) {
                      chartTypes.forEach(type => {
                        allChartKeys.push(`${epic.id}-${type}`);
                      });
                    }
                  });
                  const allCollapsed = allChartKeys.every(key => collapsedCharts[key]);
                  return allCollapsed ? 'Expand All' : 'Collapse All';
                })()}
              </button>
            </div>
            {epics.map((epic) => (
              epic.notFound ? (
                <div key={epic.id} className="epic-not-found">
                  <h3>{epic.name}</h3>
                  <p>Epic not found in Shortcut</p>
                </div>
              ) : (
              <div key={epic.id} className="epic-card">
                <div
                  className="epic-header"
                >
                  <div className="epic-title">
                    <h3>
                      {epic.app_url ? (
                        <a
                          href={epic.app_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {epic.name}
                        </a>
                      ) : (
                        epic.name
                      )}
                    </h3>
                  </div>
                  <div className="epic-meta">
                    <span className="epic-owner">
                      {epic.owner_ids && epic.owner_ids.length > 1 ? 'Owners: ' : 'Owner: '}
                      {epic.owner_ids && epic.owner_ids.length > 0
                        ? epic.owner_ids.map(id => members[id] || id).join(', ')
                        : 'No Owner'}
                    </span>
                    {epic.stats && (
                      <span className="story-count">
                        {epic.stats.num_stories_total || 0} stories
                      </span>
                    )}
                    <span className={`epic-state ${getEpicStateClass(epic.state)}`}>
                      {toTitleCase(epic.state)}
                      {epic.state.toLowerCase() === 'done' && ' ✓'}
                    </span>
                  </div>
                </div>

                {epic.stories && workflowStateOrder.length > 0 && (
                  <div className="epic-stats-container">
                    <div className="workflow-status-chart-container">
                      <h4 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Ticket Status Breakdown</span>
                        <button
                          onClick={() => toggleChart(epic.id, 'column')}
                          className="chart-toggle-btn"
                          aria-label="Toggle column chart"
                        >
                          {collapsedCharts[`${epic.id}-column`] ? '▼' : '▲'}
                        </button>
                      </h4>
                      {!collapsedCharts[`${epic.id}-column`] && (
                      <div className="workflow-status-chart">
                      {(() => {
                        // Calculate workflow state counts
                        const stateCounts = {};
                        let total = epic.stories.length || 0;
                        epic.stories.forEach(story => {
                          const stateId = story.workflow_state_id;
                          stateCounts[stateId] = (stateCounts[stateId] || 0) + 1;
                        });

                        // Define the specific states to show (exact match, case-sensitive)
                        const targetStates = [
                          "Backlog",
                          "Ready for Development",
                          "In Development",
                          "In Review",
                          "Ready for Release",
                          "Complete"
                        ];

                        // Create a normalized map for comparison
                        const normalizedTargets = targetStates.map(s => s.toLowerCase().trim());

                        // Filter workflow states to only include target states
                        const filteredStateIds = workflowStateOrder.filter(stateId => {
                          const stateName = workflowStates[stateId];
                          if (!stateName) return false;
                          const normalized = stateName.toLowerCase().trim();
                          return normalizedTargets.includes(normalized);
                        });

                        return filteredStateIds.map((stateId) => {
                          const count = stateCounts[stateId] || 0;
                          const percentage = total > 0 ? (count / total) * 100 : 0;
                          const stateName = workflowStates[stateId] || stateId;

                          return (
                            <div key={stateId} className="status-bar-item">
                              <div className="column-3d-wrapper">
                                <div className="column-3d-container">
                                  <div
                                    className="column-3d-fill"
                                    style={{ height: `${percentage}%` }}
                                  >
                                    <div className="status-count-label">{count}</div>
                                    <div className="column-3d-top"></div>
                                    <div className="column-3d-front"></div>
                                    <div className="column-3d-side"></div>
                                  </div>
                                </div>
                              </div>
                              <div className="status-bar-label">
                                <span className="status-name">{stateName}</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                      </div>
                      )}

                      {/* Pie Chart */}
                      <div>
                      <h4 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                        <span>Workflow Status Pie Chart</span>
                        <button
                          onClick={() => toggleChart(epic.id, 'workflow-pie')}
                          className="chart-toggle-btn"
                          aria-label="Toggle workflow pie chart"
                        >
                          {collapsedCharts[`${epic.id}-workflow-pie`] ? '▼' : '▲'}
                        </button>
                      </h4>
                      {!collapsedCharts[`${epic.id}-workflow-pie`] && (
                      <div className="workflow-status-pie-chart">
                      {(() => {
                        // Calculate workflow state counts
                        const stateCounts = {};
                        let total = epic.stories.length || 0;
                        epic.stories.forEach(story => {
                          const stateId = story.workflow_state_id;
                          stateCounts[stateId] = (stateCounts[stateId] || 0) + 1;
                        });

                        // Define the specific states to show
                        const targetStates = [
                          "Backlog",
                          "Ready for Development",
                          "In Development",
                          "In Review",
                          "Ready for Release",
                          "Complete"
                        ];

                        // Create a normalized map for comparison
                        const normalizedTargets = targetStates.map(s => s.toLowerCase().trim());

                        // Filter workflow states to only include target states
                        const filteredStateIds = workflowStateOrder.filter(stateId => {
                          const stateName = workflowStates[stateId];
                          if (!stateName) return false;
                          const normalized = stateName.toLowerCase().trim();
                          return normalizedTargets.includes(normalized);
                        });

                        // Calculate percentages and create segments
                        const segments = filteredStateIds.map((stateId) => {
                          const count = stateCounts[stateId] || 0;
                          const percentage = total > 0 ? (count / total) * 100 : 0;
                          const stateName = workflowStates[stateId] || stateId;
                          return { stateId, stateName, count, percentage };
                        }).filter(seg => seg.count > 0);

                        // Define colors for each state
                        const stateColors = {
                          'backlog': '#94a3b8',
                          'ready for development': '#fef08a',
                          'in development': '#86efac',
                          'in review': '#e9d5ff',
                          'ready for release': '#2f855a',
                          'complete': '#2f855a'
                        };

                        // Calculate cumulative angles for pie segments
                        let cumulativeAngle = 0;
                        const segmentsWithAngles = segments.map(seg => {
                          const angle = (seg.percentage / 100) * 360;
                          const startAngle = cumulativeAngle;
                          cumulativeAngle += angle;
                          return { ...seg, startAngle, angle };
                        });

                        // Function to create SVG path for pie slice
                        const createPieSlice = (startAngle, angle, radius = 80) => {
                          const centerX = 100;
                          const centerY = 100;

                          // Special case: if angle is 360 degrees (or very close), draw two semi-circles
                          // because SVG arcs can't handle a full circle in a single path
                          if (angle >= 359.9) {
                            const startRad = (startAngle - 90) * Math.PI / 180;
                            const midRad = (startAngle + 180 - 90) * Math.PI / 180;
                            const endRad = (startAngle + 360 - 90) * Math.PI / 180;

                            const x1 = centerX + radius * Math.cos(startRad);
                            const y1 = centerY + radius * Math.sin(startRad);
                            const x2 = centerX + radius * Math.cos(midRad);
                            const y2 = centerY + radius * Math.sin(midRad);
                            const x3 = centerX + radius * Math.cos(endRad);
                            const y3 = centerY + radius * Math.sin(endRad);

                            // Draw full circle as two 180-degree arcs
                            return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} A ${radius} ${radius} 0 0 1 ${x3} ${y3} Z`;
                          }

                          const startRad = (startAngle - 90) * Math.PI / 180;
                          const endRad = (startAngle + angle - 90) * Math.PI / 180;

                          const x1 = centerX + radius * Math.cos(startRad);
                          const y1 = centerY + radius * Math.sin(startRad);
                          const x2 = centerX + radius * Math.cos(endRad);
                          const y2 = centerY + radius * Math.sin(endRad);

                          const largeArcFlag = angle > 180 ? 1 : 0;

                          return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                        };

                        return total > 0 ? (
                          <div className="pie-chart-wrapper">
                            <div style={{ position: 'relative' }}>
                              <svg viewBox="0 0 200 200" className="pie-chart-svg">
                                {segmentsWithAngles.map((seg) => {
                                  const color = stateColors[seg.stateName.toLowerCase()] || '#667eea';
                                  return (
                                    <g key={seg.stateId}>
                                      <path
                                        d={createPieSlice(seg.startAngle, seg.angle)}
                                        fill={color}
                                        stroke="#fff"
                                        strokeWidth="2"
                                        style={{ cursor: 'pointer' }}
                                        onMouseEnter={() => setHoveredPieSegment(seg)}
                                        onMouseLeave={() => setHoveredPieSegment(null)}
                                      />
                                    </g>
                                  );
                                })}
                              </svg>
                              {hoveredPieSegment && (
                                <div className="pie-chart-tooltip">
                                  <div className="tooltip-title">{hoveredPieSegment.stateName}</div>
                                  <div className="tooltip-details">
                                    <div>Count: {hoveredPieSegment.count}</div>
                                    <div>Percentage: {hoveredPieSegment.percentage.toFixed(1)}%</div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="pie-chart-legend">
                              {segments.map((seg) => {
                                const color = stateColors[seg.stateName.toLowerCase()] || '#667eea';
                                return (
                                  <div key={seg.stateId} className="legend-item">
                                    <span className="legend-color" style={{ backgroundColor: color }}></span>
                                    <span className="legend-label">{seg.stateName}</span>
                                    <span className="legend-value">{seg.count} ({seg.percentage.toFixed(1)}%)</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null;
                      })()}
                      </div>
                      )}
                      </div>

                      {/* Story Type Pie Chart */}
                      <div>
                      <h4 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                        <span>Story Type Breakdown</span>
                        <button
                          onClick={() => toggleChart(epic.id, 'type-pie')}
                          className="chart-toggle-btn"
                          aria-label="Toggle story type pie chart"
                        >
                          {collapsedCharts[`${epic.id}-type-pie`] ? '▼' : '▲'}
                        </button>
                      </h4>
                      {!collapsedCharts[`${epic.id}-type-pie`] && (
                      <div>
                      {(() => {
                        // Calculate story type counts
                        const typeCounts = {};
                        let total = epic.stories.length || 0;
                        epic.stories.forEach(story => {
                          const storyType = story.story_type || 'unknown';
                          typeCounts[storyType] = (typeCounts[storyType] || 0) + 1;
                        });

                        // Define the story types we want to show
                        const targetTypes = ['feature', 'chore', 'bug'];

                        // Calculate percentages and create segments
                        const segments = targetTypes
                          .map((type) => {
                            const count = typeCounts[type] || 0;
                            const percentage = total > 0 ? (count / total) * 100 : 0;
                            const typeName = type.charAt(0).toUpperCase() + type.slice(1);
                            return { type, typeName, count, percentage };
                          })
                          .filter(seg => seg.count > 0);

                        // Define colors for each story type
                        const typeColors = {
                          'feature': '#86efac',  // Light Green
                          'chore': '#fef08a',    // Light Yellow
                          'bug': '#ef4444'       // Red
                        };

                        // Calculate cumulative angles for pie segments
                        let cumulativeAngle = 0;
                        const segmentsWithAngles = segments.map(seg => {
                          const angle = (seg.percentage / 100) * 360;
                          const startAngle = cumulativeAngle;
                          cumulativeAngle += angle;
                          return { ...seg, startAngle, angle };
                        });

                        // Function to create SVG path for pie slice
                        const createPieSlice = (startAngle, angle, radius = 80) => {
                          const centerX = 100;
                          const centerY = 100;

                          // Special case: if angle is 360 degrees (or very close), draw two semi-circles
                          // because SVG arcs can't handle a full circle in a single path
                          if (angle >= 359.9) {
                            const startRad = (startAngle - 90) * Math.PI / 180;
                            const midRad = (startAngle + 180 - 90) * Math.PI / 180;
                            const endRad = (startAngle + 360 - 90) * Math.PI / 180;

                            const x1 = centerX + radius * Math.cos(startRad);
                            const y1 = centerY + radius * Math.sin(startRad);
                            const x2 = centerX + radius * Math.cos(midRad);
                            const y2 = centerY + radius * Math.sin(midRad);
                            const x3 = centerX + radius * Math.cos(endRad);
                            const y3 = centerY + radius * Math.sin(endRad);

                            // Draw full circle as two 180-degree arcs
                            return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} A ${radius} ${radius} 0 0 1 ${x3} ${y3} Z`;
                          }

                          const startRad = (startAngle - 90) * Math.PI / 180;
                          const endRad = (startAngle + angle - 90) * Math.PI / 180;

                          const x1 = centerX + radius * Math.cos(startRad);
                          const y1 = centerY + radius * Math.sin(startRad);
                          const x2 = centerX + radius * Math.cos(endRad);
                          const y2 = centerY + radius * Math.sin(endRad);

                          const largeArcFlag = angle > 180 ? 1 : 0;

                          return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                        };

                        return total > 0 ? (
                          <div>
                            <div className="workflow-status-pie-chart" style={{ marginTop: '0.5rem' }}>
                              <div className="pie-chart-wrapper">
                                <div style={{ position: 'relative' }}>
                                  <svg viewBox="0 0 200 200" className="pie-chart-svg">
                                    {segmentsWithAngles.map((seg) => {
                                      const color = typeColors[seg.type] || '#667eea';
                                      return (
                                        <g key={seg.type}>
                                          <path
                                            d={createPieSlice(seg.startAngle, seg.angle)}
                                            fill={color}
                                            stroke="#fff"
                                            strokeWidth="2"
                                            style={{ cursor: 'pointer' }}
                                            onMouseEnter={() => setHoveredTypeSegment(seg)}
                                            onMouseLeave={() => setHoveredTypeSegment(null)}
                                          />
                                        </g>
                                      );
                                    })}
                                  </svg>
                                  {hoveredTypeSegment && (
                                    <div className="pie-chart-tooltip">
                                      <div className="tooltip-title">{hoveredTypeSegment.typeName}</div>
                                      <div className="tooltip-details">
                                        <div>Count: {hoveredTypeSegment.count}</div>
                                        <div>Percentage: {hoveredTypeSegment.percentage.toFixed(1)}%</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="pie-chart-legend">
                                  {segments.map((seg) => {
                                    const color = typeColors[seg.type] || '#667eea';
                                    return (
                                      <div key={seg.type} className="legend-item">
                                        <span className="legend-color" style={{ backgroundColor: color }}></span>
                                        <span className="legend-label">{seg.typeName}</span>
                                        <span className="legend-value">{seg.count} ({seg.percentage.toFixed(1)}%)</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })()}
                      </div>
                      )}
                      </div>
                      </div>

                    <div className="story-owners-table">
                      {(() => {
                        // Calculate owner counts (excluding unassigned)
                        const ownerCounts = {};
                        let unassignedCount = 0;

                        epic.stories.forEach(story => {
                          if (story.owner_ids && story.owner_ids.length > 0) {
                            story.owner_ids.forEach(ownerId => {
                              const ownerName = members[ownerId] || ownerId;
                              ownerCounts[ownerName] = (ownerCounts[ownerName] || 0) + 1;
                            });
                          } else {
                            unassignedCount++;
                          }
                        });

                        // Sort by count descending
                        const sortedOwners = Object.entries(ownerCounts)
                          .sort((a, b) => b[1] - a[1]);

                        return sortedOwners.length > 0 || unassignedCount > 0 ? (
                          <>
                            <h4 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span>Story Owners</span>
                              <button
                                onClick={() => toggleChart(epic.id, 'owners-table')}
                                className="chart-toggle-btn"
                                aria-label="Toggle story owners table"
                              >
                                {collapsedCharts[`${epic.id}-owners-table`] ? '▼' : '▲'}
                              </button>
                            </h4>
                            {!collapsedCharts[`${epic.id}-owners-table`] && (
                            <>
                            <table>
                              <thead>
                                <tr>
                                  <th>Owner</th>
                                  <th>Count</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedOwners.map(([owner, count]) => (
                                  <tr key={owner}>
                                    <td>{owner}</td>
                                    <td>{count}</td>
                                  </tr>
                                ))}
                                <tr style={{ backgroundColor: '#f7fafc' }}>
                                  <td>Unassigned</td>
                                  <td>{unassignedCount}</td>
                                </tr>
                              </tbody>
                            </table>
                            <p style={{ color: '#718096', fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.5rem' }}>
                              NOTE: Counts may not add up if a story has more than one owner
                            </p>
                            </>
                            )}
                          </>
                        ) : (
                          <>
                            <h4>Story Owners</h4>
                            <p style={{ color: '#718096', fontSize: '0.875rem', fontStyle: 'italic' }}>
                              No assigned owners
                            </p>
                          </>
                        );
                      })()}
                    </div>

                    <div className="email-ticket-counts-table">
                      {(() => {
                        // Get name list for this epic
                        const nameList = epicEmails[epic.name] || [];

                        if (nameList.length === 0) {
                          return (
                            <>
                              <h4>Team Open Tickets</h4>
                              <p style={{ color: '#718096', fontSize: '0.875rem', fontStyle: 'italic' }}>
                                No team list configured
                              </p>
                            </>
                          );
                        }

                        // Initialize counts for all names in the list
                        const nameCounts = {};
                        nameList.forEach(name => {
                          nameCounts[name] = 0;
                        });

                        // Count open tickets for users in the name list (exclude Complete state)
                        epic.stories.forEach(story => {
                          // Get the state name for this story
                          const stateName = workflowStates[story.workflow_state_id] || '';
                          const isComplete = stateName.toLowerCase().trim() === 'complete';

                          // Only count if not complete
                          if (!isComplete && story.owner_ids && story.owner_ids.length > 0) {
                            story.owner_ids.forEach(ownerId => {
                              const ownerName = members[ownerId] || '';
                              // Match by full or partial name (case insensitive)
                              nameList.forEach(listName => {
                                const ownerNameLower = ownerName.toLowerCase();
                                const listNameLower = listName.toLowerCase();
                                // Check if the owner name contains the list name or vice versa
                                if (ownerNameLower.includes(listNameLower) || listNameLower.includes(ownerNameLower)) {
                                  nameCounts[listName] = (nameCounts[listName] || 0) + 1;
                                }
                              });
                            });
                          }
                        });

                        // Sort by count descending
                        const sortedNames = Object.entries(nameCounts)
                          .sort((a, b) => b[1] - a[1]);

                        return (
                          <>
                            <h4 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span>Team Open Tickets</span>
                              <button
                                onClick={() => toggleChart(epic.id, 'team-tickets')}
                                className="chart-toggle-btn"
                                aria-label="Toggle team open tickets table"
                              >
                                {collapsedCharts[`${epic.id}-team-tickets`] ? '▼' : '▲'}
                              </button>
                            </h4>
                            {!collapsedCharts[`${epic.id}-team-tickets`] && (
                            <>
                            <table>
                              <thead>
                                <tr>
                                  <th>Owner</th>
                                  <th>Count</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedNames.map(([name, count]) => (
                                  <tr key={name} className={count === 0 ? 'zero-count-row' : ''}>
                                    <td>{name}</td>
                                    <td>{count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <p style={{ color: '#718096', fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.5rem' }}>
                              NOTE: This table shows the count of open tickets only for the team
                            </p>
                            </>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {epic.stories && (
                  <div className="stories-section">
                    <h4 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Stories:</span>
                      <button
                        onClick={() => toggleChart(epic.id, 'stories')}
                        className="chart-toggle-btn"
                        aria-label="Toggle stories list"
                      >
                        {collapsedCharts[`${epic.id}-stories`] ? '▼' : '▲'}
                      </button>
                    </h4>
                    {!collapsedCharts[`${epic.id}-stories`] && (
                      <>
                        {epic.stories.length === 0 ? (
                          <p className="no-stories">No stories found for this epic</p>
                        ) : (
                          <div className="stories-columns">
                            {['Backlog', 'Ready for Development', 'In Development', 'In Review', 'Ready for Release', 'Complete'].map((columnState) => {
                              const storiesInColumn = epic.stories.filter(story => {
                                const storyState = (workflowStates[story.workflow_state_id] || '').toLowerCase().trim();
                                const targetState = columnState.toLowerCase().trim();
                                return storyState === targetState;
                              });

                              return (
                                <div key={columnState} className="story-column">
                                  <div className="story-column-header">
                                    <h5>{columnState}</h5>
                                    <span className="story-column-count">{storiesInColumn.length}</span>
                                  </div>
                                  <div className="story-column-content">
                                    {storiesInColumn.length === 0 ? (
                                      <p className="no-stories-in-column">No stories</p>
                                    ) : (
                                      storiesInColumn.map((story) => (
                                        <div key={story.id} className="story-card">
                                          <div className="story-card-name">
                                            {story.app_url ? (
                                              <a
                                                href={story.app_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                              >
                                                {story.name}
                                              </a>
                                            ) : (
                                              story.name
                                            )}
                                          </div>
                                          {story.description && (
                                            <p className="story-card-description">
                                              {story.description.substring(0, 80)}
                                              {story.description.length > 80 ? '...' : ''}
                                            </p>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              )
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;