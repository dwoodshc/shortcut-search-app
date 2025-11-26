import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [teamName, setTeamName] = useState('');
  const [teams, setTeams] = useState([]);
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedEpics, setExpandedEpics] = useState(new Set());
  const [workflowStates, setWorkflowStates] = useState({});
  const [workflowStateOrder, setWorkflowStateOrder] = useState([]);
  const [members, setMembers] = useState({});
  const [filteredEpicNames, setFilteredEpicNames] = useState([]);
  const [epicEmails, setEpicEmails] = useState({});

  // Fetch teams, workflow states, and filtered epic names on mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsResponse = await fetch('http://localhost:3001/api/teams');
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json();
          // Sort teams alphabetically by name
          const sortedTeams = teamsData.sort((a, b) =>
            a.name.toLowerCase().localeCompare(b.name.toLowerCase())
          );
          setTeams(sortedTeams);
          // Set default team to 'web' if it exists, otherwise use first team
          const webTeam = sortedTeams.find(t => t.name.toLowerCase() === 'web');
          if (webTeam) {
            setTeamName(webTeam.name);
          } else if (sortedTeams.length > 0) {
            setTeamName(sortedTeams[0].name);
          }
        }
      } catch (err) {
        console.error('Error fetching teams:', err);
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

    fetchTeams();
    fetchWorkflows();
    fetchFilteredEpics();
    fetchEpicEmails();
  }, []);

  // Fetch user name by ID
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

    if (!teamName.trim()) {
      setError('Please enter a team name');
      return;
    }

    setLoading(true);
    setError(null);
    setEpics([]);

    try {
      // Search for epics by team name
      const response = await fetch(
        `http://localhost:3001/api/search/epics?query=team:${encodeURIComponent(teamName)} !state:Complete`
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

      setEpics(epicsWithStories);

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

  const toggleEpic = async (epicId) => {
    const newExpanded = new Set(expandedEpics);
    
    if (newExpanded.has(epicId)) {
      newExpanded.delete(epicId);
      setExpandedEpics(newExpanded);
    } else {
      newExpanded.add(epicId);
      setExpandedEpics(newExpanded);
      
      // Fetch stories for this epic if not already loaded
      const epic = epics.find(e => e.id === epicId);
      if (epic && !epic.stories) {
        await fetchStoriesForEpic(epicId);
      }
    }
  };

  const fetchStoriesForEpic = async (epicId) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/epics/${epicId}/stories`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stories');
      }

      const stories = await response.json();
      
      // Update the epic with its stories
      setEpics(prevEpics =>
        prevEpics.map(epic =>
          epic.id === epicId
            ? { ...epic, stories: stories }
            : epic
        )
      );
    } catch (err) {
      console.error('Error fetching stories:', err);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Shortcut Epic & Story Viewer</h1>
      </header>

      <main className="container">
        <form onSubmit={searchEpics} className="search-form">
          <div className="form-group">
            <label htmlFor="teamName">Team Name:</label>
            <select
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="input-field"
            >
              {teams.length === 0 ? (
                <option value="">Loading teams...</option>
              ) : (
                teams.map((team) => (
                  <option key={team.name} value={team.name}>
                    {team.name}
                  </option>
                ))
              )}
            </select>
          </div>
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
            <h2>Found {epics.length} Epic{epics.length !== 1 ? 's' : ''}</h2>
            {epics.map((epic) => (
              <div key={epic.id} className="epic-card">
                <div 
                  className="epic-header"
                  onClick={() => toggleEpic(epic.id)}
                >
                  <div className="epic-title">
                    <span className="expand-icon">
                      {expandedEpics.has(epic.id) ? '▼' : '▶'}
                    </span>
                    <h3>
                      {epic.app_url ? (
                        <a
                          href={epic.app_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {epic.name}
                        </a>
                      ) : (
                        epic.name
                      )}
                    </h3>
                  </div>
                  <div className="epic-meta">
                    <span className="epic-state">{epic.state}</span>
                    {epic.stats && (
                      <span className="story-count">
                        {epic.stats.num_stories_total || 0} stories
                      </span>
                    )}
                    {epic.owner_ids && epic.owner_ids.length > 0 && (
                      <span className="epic-owner">
                        Owner: {epic.owner_ids.map(id => members[id] || id).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {epic.stories && workflowStateOrder.length > 0 && (
                  <div className="epic-stats-container">
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
                                  <div className="status-count-label">{count}</div>
                                  <div
                                    className="column-3d-fill"
                                    style={{ height: `${percentage}%` }}
                                  >
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

                    <div className="story-owners-table">
                      {(() => {
                        // Calculate owner counts (excluding unassigned)
                        const ownerCounts = {};
                        epic.stories.forEach(story => {
                          if (story.owner_ids && story.owner_ids.length > 0) {
                            story.owner_ids.forEach(ownerId => {
                              const ownerName = members[ownerId] || ownerId;
                              ownerCounts[ownerName] = (ownerCounts[ownerName] || 0) + 1;
                            });
                          }
                        });

                        // Sort by count descending
                        const sortedOwners = Object.entries(ownerCounts)
                          .sort((a, b) => b[1] - a[1]);

                        return sortedOwners.length > 0 ? (
                          <>
                            <h4>Story Owners</h4>
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
                              </tbody>
                            </table>
                            <p style={{ color: '#718096', fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.5rem' }}>
                              NOTE: Counts may not add up if a story has more than one owner
                            </p>
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
                            <h4>Team Open Tickets</h4>
                            <table>
                              <thead>
                                <tr>
                                  <th>Name</th>
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
                        );
                      })()}
                    </div>
                  </div>
                )}

                {expandedEpics.has(epic.id) && (
                  <div className="stories-section">
                    <h4>Stories:</h4>
                    {!epic.stories ? (
                      <p className="loading-text">Loading stories...</p>
                    ) : epic.stories.length === 0 ? (
                      <p className="no-stories">No stories found for this epic</p>
                    ) : (
                      <ul className="stories-list">
                        {epic.stories.map((story) => (
                          <li key={story.id} className="story-item">
                            <div className="story-header">
                              <span className="story-name">
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
                              </span>
                              <span className={`story-state state-${story.workflow_state_id}`}>
                                {workflowStates[story.workflow_state_id] || story.workflow_state_id}
                              </span>
                            </div>
                            {story.description && (
                              <p className="story-description">
                                {story.description.substring(0, 100)}
                                {story.description.length > 100 ? '...' : ''}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;