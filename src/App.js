import React, { useState } from 'react';
import './App.css';

function App() {
  const [teamName, setTeamName] = useState('');
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedEpics, setExpandedEpics] = useState(new Set());

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
      setEpics(data.data || []);
      
      if (!data.data || data.data.length === 0) {
        setError('No epics found for this team name');
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
            <input
              id="teamName"
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name to search epics"
              className="input-field"
            />
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
                    <h3>{epic.name}</h3>
                  </div>
                  <div className="epic-meta">
                    <span className="epic-state">{epic.state}</span>
                    {epic.stats && (
                      <span className="story-count">
                        {epic.stats.num_stories_total || 0} stories
                      </span>
                    )}
                  </div>
                </div>

                {epic.description && (
                  <p className="epic-description">{epic.description}</p>
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
                              <span className="story-name">{story.name}</span>
                              <span className={`story-state state-${story.workflow_state_id}`}>
                                {story.workflow_state_id}
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