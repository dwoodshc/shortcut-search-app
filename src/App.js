import React, { useState, useEffect, useCallback, useRef } from 'react';
import { marked } from 'marked';
import './App.css';

// LocalStorage utility functions
const STORAGE_KEYS = {
  API_TOKEN: 'shortcut_api_token',
  WORKFLOW_CONFIG: 'shortcut_workflow_config',
  EPICS_CONFIG: 'shortcut_epics_config',
  MEMBERS_CACHE: 'shortcut_members_cache',
  TEAM_CONFIG: 'shortcut_team_config',
  TEAM_MEMBERS_CACHE: 'shortcut_team_members_cache',
  EPIC_WORKFLOW_CACHE: 'shortcut_epic_workflow_cache',
  IGNORED_USERS: 'shortcut_ignored_users'
};

const storage = {
  getApiToken: () => localStorage.getItem(STORAGE_KEYS.API_TOKEN),
  setApiToken: (token) => localStorage.setItem(STORAGE_KEYS.API_TOKEN, token),

  getWorkflowConfig: () => {
    const data = localStorage.getItem(STORAGE_KEYS.WORKFLOW_CONFIG);
    return data ? JSON.parse(data) : null;
  },
  setWorkflowConfig: (config) => localStorage.setItem(STORAGE_KEYS.WORKFLOW_CONFIG, JSON.stringify(config)),

  getEpicsConfig: () => {
    const data = localStorage.getItem(STORAGE_KEYS.EPICS_CONFIG);
    return data ? JSON.parse(data) : null;
  },
  setEpicsConfig: (config) => localStorage.setItem(STORAGE_KEYS.EPICS_CONFIG, JSON.stringify(config)),

  getMembersCache: () => {
    const data = localStorage.getItem(STORAGE_KEYS.MEMBERS_CACHE);
    return data ? JSON.parse(data) : {};
  },
  setMembersCache: (cache) => localStorage.setItem(STORAGE_KEYS.MEMBERS_CACHE, JSON.stringify(cache)),

  getTeamConfig: () => {
    const data = localStorage.getItem(STORAGE_KEYS.TEAM_CONFIG);
    return data ? JSON.parse(data) : null;
  },
  setTeamConfig: (config) => localStorage.setItem(STORAGE_KEYS.TEAM_CONFIG, JSON.stringify(config)),

  // Cached team member IDs — stored as { teamId, memberIds: [] } so it auto-invalidates on team change
  getTeamMembersCache: (teamId) => {
    const data = localStorage.getItem(STORAGE_KEYS.TEAM_MEMBERS_CACHE);
    if (!data) return null;
    const parsed = JSON.parse(data);
    return parsed.teamId === teamId ? parsed.memberIds : null;
  },
  setTeamMembersCache: (teamId, memberIds) =>
    localStorage.setItem(STORAGE_KEYS.TEAM_MEMBERS_CACHE, JSON.stringify({ teamId, memberIds })),

  // Cached epic workflow states map
  getEpicWorkflowCache: () => {
    const data = localStorage.getItem(STORAGE_KEYS.EPIC_WORKFLOW_CACHE);
    return data ? JSON.parse(data) : null;
  },
  setEpicWorkflowCache: (stateMap) =>
    localStorage.setItem(STORAGE_KEYS.EPIC_WORKFLOW_CACHE, JSON.stringify(stateMap)),

  getIgnoredUsers: () => {
    const data = localStorage.getItem(STORAGE_KEYS.IGNORED_USERS);
    return data ? JSON.parse(data) : [];
  },
  setIgnoredUsers: (users) => localStorage.setItem(STORAGE_KEYS.IGNORED_USERS, JSON.stringify(users))
};

// API Base URL - dynamically uses the current hostname
// This allows the app to work on both desktop (localhost) and mobile devices (IP address)
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  return `http://${hostname}:3001`;
};

function App() {
  const [epics, setEpics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
  const searchAbortControllerRef = useRef(null);
  const [error, setError] = useState(null);
  const [hoveredPieSegment, setHoveredPieSegment] = useState(null);
  const [hoveredTypeSegment, setHoveredTypeSegment] = useState(null);
  const [workflowStates, setWorkflowStates] = useState({});
  const [workflowStateOrder, setWorkflowStateOrder] = useState([]);
  const [members, setMembers] = useState(() => storage.getMembersCache());
  const [filteredEpicNames, setFilteredEpicNames] = useState([]);
  const [apiToken, setApiToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const [epicListError, setEpicListError] = useState('');
  const [collapsedCharts, setCollapsedCharts] = useState({});
  const [epicsList, setEpicsList] = useState([]);
  const [showReadmeModal, setShowReadmeModal] = useState(false);
  const [readmeContent, setReadmeContent] = useState('');
  const [allTeams, setAllTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(() => storage.getTeamConfig()?.id || null);
  const [teamMemberIds, setTeamMemberIds] = useState(new Set());
  const [ignoredUsers, setIgnoredUsers] = useState(() => storage.getIgnoredUsers());
  const [filterIgnoredInTickets, setFilterIgnoredInTickets] = useState(true);
  const [filterByTeam, setFilterByTeam] = useState(false);
  const [summarySort, setSummarySort] = useState({ col: null, dir: 'asc' });
  const [epicTeamSort, setEpicTeamSort] = useState({ col: null, dir: 'asc' });
  const [memberEpicSort, setMemberEpicSort] = useState({ col: 'member', dir: 'asc' });
  const [showExportImportModal, setShowExportImportModal] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [apiTokenIssue, setApiTokenIssue] = useState(false);
  const [allWorkflows, setAllWorkflows] = useState([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [workflowStateIds, setWorkflowStateIds] = useState({});
  const [shortcutWebUrl, setShortcutWebUrl] = useState('https://app.shortcut.com/<workspace>');
  const [savedWorkflowId, setSavedWorkflowId] = useState(null);
  const [showWipeConfirmModal, setShowWipeConfirmModal] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [setupWizardStep, setSetupWizardStep] = useState(1);
  const [epicStates, setEpicStates] = useState({});
  const [loadStats, setLoadStats] = useState(null);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);

  // Helper function to generate Shortcut URLs for epics
  const generateShortcutUrl = useCallback((epicId, stateName) => {
    if (!epicId) return '#';

    // Get workflow_state_id from state mapping
    const stateKey = stateName?.toLowerCase().trim();
    const workflowStateId = stateKey ? workflowStateIds[stateKey] : null;

    // Build base URL
    let url = `${shortcutWebUrl}/epic/${epicId}`;

    // Add query parameters if available
    const params = [];
    if (savedWorkflowId) {
      params.push(`workflow_id=${savedWorkflowId}`);
    }
    if (workflowStateId) {
      params.push(`workflow_state_ids=${workflowStateId}`);
    }

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return url;
  }, [shortcutWebUrl, savedWorkflowId, workflowStateIds]);

  // Helper function to handle API errors and check for token issues
  const handleApiError = useCallback(async (response) => {
    if (response.status === 429) {
      searchAbortControllerRef.current?.abort();
      setLoading(false);
      setShowRateLimitModal(true);
      return true;
    }

    if (response.status === 401 || response.status === 403) {
      // Unauthorized or Forbidden - likely token issue
      setApiTokenIssue(true);
      setError(`API Token Error: Unable to authenticate with Shortcut API. Please check your API token.`);
      setLoading(false);
      return true;
    }

    // Try to parse error message from response
    try {
      const data = await response.json();
      if (data.error && (
        data.error.toLowerCase().includes('token') ||
        data.error.toLowerCase().includes('unauthorized') ||
        data.error.toLowerCase().includes('authentication')
      )) {
        setApiTokenIssue(true);
        setError(`API Token Error: ${data.error}`);
        setLoading(false);
        return true;
      }
    } catch (e) {
      // Response wasn't JSON, continue with generic error
    }

    return false;
  }, []);

  // Toggle chart collapse state for a specific epic and chart type
  const toggleChart = (epicId, chartType) => {
    setCollapsedCharts(prev => ({
      ...prev,
      [`${epicId}-${chartType}`]: !prev[`${epicId}-${chartType}`]
    }));
  };


  // Scroll to epic by ID
  const scrollToEpic = (epicId) => {
    const element = document.getElementById(`epic-${epicId}`);
    if (element) {
      const headerHeight = document.querySelector('.App-header')?.offsetHeight || 90;
      const yOffset = -(headerHeight + 16); // Offset to clear sticky header plus a small gap
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setShowSidebar(false);
    }
  };

  // Shared list of workflow states shown in charts
  const TARGET_WORKFLOW_STATES = ["Backlog", "Ready for Development", "In Development", "In Review", "Ready for Release", "Complete"];
  const NORMALIZED_WORKFLOW_STATES = TARGET_WORKFLOW_STATES.map(s => s.toLowerCase().trim());

  // Returns filtered workflow state IDs matching TARGET_WORKFLOW_STATES
  const getFilteredStateIds = () => workflowStateOrder.filter(stateId => {
    const stateName = workflowStates[stateId];
    return stateName && NORMALIZED_WORKFLOW_STATES.includes(stateName.toLowerCase().trim());
  });

  // Returns stories for an epic, filtered to the selected team when filterByTeam is on
  const getDisplayStories = (epic) => {
    if (!filterByTeam || !selectedTeamId) {
      return epic.stories || [];
    }
    return (epic.stories || []).filter(story =>
      // Include stories assigned to the selected team, or with no team assigned
      !story.group_id || story.group_id === selectedTeamId
    );
  };

  // Creates an SVG path string for a pie slice
  const createPieSlice = (startAngle, angle, radius = 80) => {
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

  // Toggle all charts and tables collapse state (excluding stories)
  const toggleAllCharts = () => {
    const allChartKeys = [];
    const chartTypes = ['workflow-pie', 'type-pie'];
    epics.forEach(epic => {
      if (!epic.notFound) {
        chartTypes.forEach(type => { allChartKeys.push(`${epic.id}-${type}`); });
      }
    });
    const allCollapsed = allChartKeys.every(key => collapsedCharts[key]);
    const newState = { ...collapsedCharts };
    allChartKeys.forEach(key => { newState[key] = !allCollapsed; });
    setCollapsedCharts(newState);
  };

  // Shared function to load workflow configuration from localStorage
  const loadSelectedWorkflow = useCallback(() => {
    try {
      const data = storage.getWorkflowConfig();
      if (data && data.workflow_id) {
        setSelectedWorkflowId(data.workflow_id);
        setSavedWorkflowId(data.workflow_id);

        // Load Shortcut Web URL if present
        if (data.shortcut_web_url) {
          setShortcutWebUrl(data.shortcut_web_url);
        }

        // Create a mapping of state names to IDs for hyperlinks
        if (data.states && Array.isArray(data.states)) {
          const stateMapping = {};
          const stateOrder = [];
          const stateIdToName = {};
          data.states.forEach(state => {
            // Create lowercase key for case-insensitive lookup
            const key = state.name.toLowerCase().trim();
            stateMapping[key] = state.id;
            stateOrder.push(state.id);
            // Map state ID to state name for chart rendering
            stateIdToName[state.id] = state.name;
          });
          setWorkflowStateIds(stateMapping);
          setWorkflowStateOrder(stateOrder);
          setWorkflowStates(stateIdToName);
        }
      }
    } catch (err) {
    }
  }, []);

  // Check if API token and config exist on mount
  useEffect(() => {
    const checkConfig = async () => {
      try {
        // Check if migration has been done before
        const migrationDone = localStorage.getItem('migration_completed');

        // If no migration flag and no data in localStorage, attempt migration
        if (!migrationDone) {
          try {
            const migrationResponse = await fetch(`${getApiBaseUrl()}/api/migrate-data`);
            if (migrationResponse.ok) {
              const migrationData = await migrationResponse.json();

              // Migrate API token if available
              if (migrationData.apiToken && !storage.getApiToken()) {
                storage.setApiToken(migrationData.apiToken);
              }

              // Migrate workflow config if available
              if (migrationData.workflowConfig && !storage.getWorkflowConfig()) {
                storage.setWorkflowConfig(migrationData.workflowConfig);
              }

              // Migrate epics config if available
              if (migrationData.epicsConfig && !storage.getEpicsConfig()) {
                storage.setEpicsConfig(migrationData.epicsConfig);
              }

              // Mark migration as complete
              localStorage.setItem('migration_completed', 'true');
            }
          } catch (migrationErr) {
            // Mark migration as complete even if it failed to avoid retrying every load
            localStorage.setItem('migration_completed', 'true');
          }
        }

        // Check for API token in localStorage
        const token = storage.getApiToken();
        setHasExistingToken(!!token);

        // Check for workflow configuration
        const workflowConfig = storage.getWorkflowConfig();

        // Check for epics configuration
        const epicsConfig = storage.getEpicsConfig();

        // If any required configuration is missing, show setup wizard
        if (!token || !workflowConfig || !workflowConfig.workflow_id || !epicsConfig || !epicsConfig.epics || epicsConfig.epics.length === 0) {

          setShowSetupWizard(true);

          // Load existing epics config if available, or start with empty list
          if (epicsConfig && epicsConfig.epics) {
            setEpicsList(epicsConfig.epics);
          } else {
            setEpicsList([]);
          }

          // Determine which step to start on based on what's missing
          if (!token) {
            setSetupWizardStep(1);
          } else if (!workflowConfig || !workflowConfig.workflow_id) {
            setSetupWizardStep(2);
          } else if (!epicsConfig || !epicsConfig.epics || epicsConfig.epics.length === 0) {
            setSetupWizardStep(6);
          }
          return;
        }

        // All config present — auto-search on load
        searchEpics();
      } catch (err) {
        setShowSetupWizard(true);
        setSetupWizardStep(1);
        setHasExistingToken(false);
      }
    };

    checkConfig();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch teams, workflow states, and filtered epic names on mount
  useEffect(() => {
    // Skip individual modal triggers if setup wizard is active
    if (showSetupWizard) {
      return;
    }

    const checkEpicsConfig = () => {
      try {
        const epicsConfig = storage.getEpicsConfig();
        if (epicsConfig && epicsConfig.epics) {
          // Load epic names and team data from config
          setFilteredEpicNames(epicsConfig.epics.map(e => e.name));
        }
      } catch (err) {
      }
    };

    checkEpicsConfig();
    loadSelectedWorkflow();
  }, [showSetupWizard, handleApiError, loadSelectedWorkflow]);

  // Persist members cache to localStorage whenever it updates
  useEffect(() => {
    if (Object.keys(members).length > 0) {
      storage.setMembersCache(members);
    }
  }, [members]);

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

  // Close modals when ESC key is pressed
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        // Close modals in priority order (close the most recently opened)
        if (showSetupWizard) {
          setShowSetupWizard(false);
        } else if (showAboutModal) {
          setShowAboutModal(false);
        } else if (showReadmeModal) {
          setShowReadmeModal(false);
        } else if (showExportImportModal) {
          setShowExportImportModal(false);
        } else if (showSettingsMenu) {
          setShowSettingsMenu(false);
        } else if (showSidebar) {
          setShowSidebar(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showSetupWizard, showAboutModal, showReadmeModal, showExportImportModal, showSettingsMenu, showSidebar]);

  // Fetch user name by ID
  // Convert text to title case (initial capitals)
  const toTitleCase = (str) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get epic state CSS class based on state type (unstarted/started/done) or legacy name
  const getEpicStateClass = (stateType, stateName) => {
    const lowerName = (stateName || '').toLowerCase().trim();
    if (lowerName === 'blocked') return 'epic-state-blocked';
    if (lowerName === 'ready for release') return 'epic-state-ready-for-release';
    const lower = (stateType || '').toLowerCase();
    if (lower === 'started' || lower === 'in progress') return 'epic-state-in-progress';
    if (lower === 'done') return 'epic-state-done';
    return 'epic-state-default';
  };

  // Resolve display name and type for an epic's state using custom epic workflow if available
  const getEpicStateInfo = (epic) => {
    if (epic.epic_state_id && epicStates[epic.epic_state_id]) {
      return epicStates[epic.epic_state_id];
    }
    return { name: toTitleCase(epic.state || ''), type: epic.state || '' };
  };

  // Load epic list content from localStorage
  // Save epic list content
  const handleSaveEpicList = () => {
    setEpicListError('');

    try {
      // Save to localStorage
      storage.setEpicsConfig({ epics: epicsList });

      // Update local state with new data
      setFilteredEpicNames(epicsList.map(e => e.name));
      return true; // Success
    } catch (err) {
      setEpicListError('Failed to save epics configuration. Please try again.');
      return false; // Failure
    }
  };

  // Load README content
  const handleOpenReadme = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/readme`);
      if (response.ok) {
        const data = await response.json();
        setReadmeContent(data.content);
        setShowReadmeModal(true);
      } else {
        setReadmeContent('Failed to load README.md file');
        setShowReadmeModal(true);
      }
    } catch (err) {
      setReadmeContent('Failed to load README.md file');
      setShowReadmeModal(true);
    }
  };

  // Save Shortcut Web URL to localStorage
  const handleSaveShortcutUrl = () => {
    // Validate URL format
    const urlPattern = /^https?:\/\/.+/;
    if (!shortcutWebUrl || !urlPattern.test(shortcutWebUrl)) {
      setError('Please enter a valid URL starting with http:// or https://');
      return false;
    }

    // Remove trailing slash if present
    const cleanUrl = shortcutWebUrl.replace(/\/$/, '');
    setShortcutWebUrl(cleanUrl);

    // If we have a selected workflow, save the URL
    if (selectedWorkflowId) {
      try {
        // Read current workflow config
        const data = storage.getWorkflowConfig();
        if (data && data.workflow_id) {
          // Update the URL and save back
          storage.setWorkflowConfig({
            workflow_name: data.workflow_name,
            workflow_id: data.workflow_id,
            shortcut_web_url: cleanUrl,
            states: data.states
          });

          setError(null); // Clear any existing error messages
          // Note: Success message display is handled within the setup wizard UI
        }
      } catch (err) {
        setError('Failed to save Shortcut Web URL');
        return false;
      }
    }
    return true;
  };

  // Save selected workflow state IDs to localStorage
  const handleSelectWorkflow = (workflow) => {
    try {
      // Create state mapping
      const states = workflow.states.map(state => ({
        id: state.id,
        name: state.name
      }));

      // Save to localStorage
      storage.setWorkflowConfig({
        workflow_name: workflow.name,
        workflow_id: workflow.id,
        shortcut_web_url: shortcutWebUrl,
        states: states
      });

      setSelectedWorkflowId(workflow.id);
      setSavedWorkflowId(workflow.id);

      // Populate workflow state mappings immediately
      const stateMapping = {};
      const stateOrder = [];
      const stateIdToName = {};
      workflow.states.forEach(state => {
        const key = state.name.toLowerCase().trim();
        stateMapping[key] = state.id;
        stateOrder.push(state.id);
        stateIdToName[state.id] = state.name;
      });
      setWorkflowStateIds(stateMapping);
      setWorkflowStateOrder(stateOrder);
      setWorkflowStates(stateIdToName);

      // Note: Success message display is handled within the setup wizard UI
    } catch (err) {
      // Note: Error display is handled within the setup wizard UI
    }
  };

  // Handle wiping all settings
  const handleWipeSettings = () => {
    // Clear all localStorage data
    localStorage.clear();

    // Reset all state to defaults
    setEpics([]);
    setFilteredEpicNames([]);

    setEpicsList([]);
    setWorkflowStates({});
    setWorkflowStateOrder([]);
    setWorkflowStateIds({});
    setMembers({});
    setApiToken('');
    setHasExistingToken(false);
    setShortcutWebUrl('');
    setAllWorkflows([]);
    setSelectedWorkflowId(null);
    setSavedWorkflowId(null);
    setSelectedTeamId(null);
    setTeamMemberIds(new Set());
    setIgnoredUsers([]);
    setError(null);
    setSuccessMessage(null);

    // Close the modal
    setShowWipeConfirmModal(false);

    // Show success message
    setSuccessMessage('All settings have been wiped successfully!');
    setTimeout(() => {
      setSuccessMessage(null);
      // Reload the page to ensure clean state
      window.location.reload();
    }, 2000);
  };

  // Export localStorage data to a JSON file
  const handleExportData = () => {
    try {
      // Collect all localStorage data
      const rawEpicsConfig = storage.getEpicsConfig();
      const epicsConfig = rawEpicsConfig?.epics
        ? { ...rawEpicsConfig, epics: rawEpicsConfig.epics.map(({ team: _team, ...epic }) => epic) }
        : rawEpicsConfig;

      const exportData = {
        apiToken: storage.getApiToken(),
        workflowConfig: storage.getWorkflowConfig(),
        epicsConfig,
        teamConfig: storage.getTeamConfig(),
        ignoredUsers: storage.getIgnoredUsers(),
        migrationCompleted: localStorage.getItem('migration_completed'),
        exportDate: new Date().toISOString(),
        version: '1.0'
      };

      // Convert to JSON string with pretty printing
      const jsonString = JSON.stringify(exportData, null, 2);

      // Create a blob and download link
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shortcut-viewer-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setImportSuccess('Configuration exported successfully!');
      setTimeout(() => setImportSuccess(''), 3000);
    } catch (err) {
      setImportError('Failed to export configuration. Please try again.');
      setTimeout(() => setImportError(''), 3000);
    }
  };

  // Import localStorage data from a JSON file
  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);

        // Validate the import data structure
        if (!importData.version) {
          setImportError('Invalid configuration file format.');
          setTimeout(() => setImportError(''), 3000);
          return;
        }

        // Import data to localStorage
        if (importData.apiToken) {
          storage.setApiToken(importData.apiToken);
        }
        if (importData.workflowConfig) {
          storage.setWorkflowConfig(importData.workflowConfig);
        }
        if (importData.epicsConfig) {
          const epicsConfig = importData.epicsConfig?.epics
            ? { ...importData.epicsConfig, epics: importData.epicsConfig.epics.map(({ team: _team, ...epic }) => epic) }
            : importData.epicsConfig;
          storage.setEpicsConfig(epicsConfig);
        }
        if (importData.teamConfig) {
          storage.setTeamConfig(importData.teamConfig);
        }
        if (importData.ignoredUsers) {
          storage.setIgnoredUsers(importData.ignoredUsers);
        }
        if (importData.migrationCompleted) {
          localStorage.setItem('migration_completed', importData.migrationCompleted);
        }

        setImportSuccess('Configuration imported successfully! Reloading page...');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (err) {
        setImportError('Failed to import configuration. Please ensure the file is valid.');
        setTimeout(() => setImportError(''), 3000);
      }
    };

    reader.onerror = () => {
      setImportError('Failed to read file. Please try again.');
      setTimeout(() => setImportError(''), 3000);
    };

    reader.readAsText(file);
    // Reset the file input
    event.target.value = '';
  };

  const fetchUserName = useCallback(async (userId) => {
    if (members[userId]) {
      return members[userId];
    }

    try {
      const token = storage.getApiToken();
      if (!token) {
        // No token available, return userId as fallback
        return userId;
      }

      const response = await fetch(`${getApiBaseUrl()}/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const user = await response.json();
        const userName = user.profile.name;
        setMembers(prev => ({ ...prev, [userId]: userName }));
        return userName;
      } else {
        // Check if this is a token issue
        await handleApiError(response);
      }
    } catch (err) {
    }
    return userId;
  }, [members, handleApiError]);

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

  const cancelSearch = () => {
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
  };

  const searchEpics = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const controller = new AbortController();
    searchAbortControllerRef.current = controller;
    const searchStartTime = Date.now();

    setLoading(true);
    setLoadProgress({ loaded: 0, total: 0 });
    setError(null);
    setApiTokenIssue(false);
    setEpics([]);
    setLoadStats(null);

    try {
      // Reload workflow configuration from localStorage
      loadSelectedWorkflow();

      // Reload epic names from localStorage
      let epicNamesToSearch = filteredEpicNames;
      const epicsConfig = storage.getEpicsConfig();
      if (epicsConfig && epicsConfig.epics) {
        epicNamesToSearch = epicsConfig.epics.map(e => e.name);
        setFilteredEpicNames(epicNamesToSearch);

      }

      // Get token from localStorage for API calls
      const token = storage.getApiToken();

      // Fetch team member IDs for the selected team (use cache if available)
      const teamConfig = storage.getTeamConfig();
      let teamApiCall = false;
      if (teamConfig?.id) {
        const cachedMemberIds = storage.getTeamMembersCache(teamConfig.id);
        if (cachedMemberIds) {
          setTeamMemberIds(new Set(cachedMemberIds));
        } else {
          teamApiCall = true;
          try {
            const teamsRes = await fetch(`${getApiBaseUrl()}/api/teams`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (teamsRes.ok) {
              const teams = await teamsRes.json();
              const team = teams.find(t => t.id === teamConfig.id);
              if (team?.member_ids) {
                setTeamMemberIds(new Set(team.member_ids));
                storage.setTeamMembersCache(teamConfig.id, team.member_ids);
              }
            }
          } catch (err) {}
        }
      }

      // Fetch custom epic workflow states (use cache if available)
      let workflowApiCall = false;
      const cachedEpicWorkflow = storage.getEpicWorkflowCache();
      if (cachedEpicWorkflow) {
        setEpicStates(cachedEpicWorkflow);
      } else {
        workflowApiCall = true;
        try {
          const ewResponse = await fetch(`${getApiBaseUrl()}/api/epic-workflow`, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: controller.signal
          });
          if (ewResponse.ok) {
            const ewData = await ewResponse.json();
            const stateMap = {};
            (ewData.epic_states || []).forEach(s => { stateMap[s.id] = { name: s.name, type: s.type }; });
            setEpicStates(stateMap);
            storage.setEpicWorkflowCache(stateMap);
          }
        } catch (err) {
          if (err.name !== 'AbortError') console.warn('Could not fetch epic workflow:', err.message);
        }
      }

      // Search for each epic individually by name
      setLoadProgress({ loaded: 0, total: epicNamesToSearch.length });
      const epicsWithStories = await Promise.all(
        epicNamesToSearch.map(async (name) => {
          try {
            // Search for this specific epic by name
            const searchResponse = await fetch(
              `${getApiBaseUrl()}/api/search/epics?query=${encodeURIComponent(name)}`,
              {
                headers: { 'Authorization': `Bearer ${token}` },
                signal: controller.signal
              }
            );

            if (!searchResponse.ok) {
              // Check if this is a token issue
              const isTokenIssue = await handleApiError(searchResponse);
              if (isTokenIssue) {
                return null;
              }
              return null;
            }

            const searchData = await searchResponse.json();
            const epicsList = searchData.data || [];

            // Find exact match (case-insensitive)
            const searchEpic = epicsList.find(e => e.name.toLowerCase() === name.toLowerCase());

            if (!searchEpic) {
              return null;
            }

            // Fetch full epic details to get all fields including internal IDs
            try {
              const epicResponse = await fetch(`${getApiBaseUrl()}/api/epics/${searchEpic.id}`, {
                headers: { 'Authorization': `Bearer ${token}` },
                signal: controller.signal
              });
              if (epicResponse.ok) {
                const epic = await epicResponse.json();

                // Fetch stories for this epic
                try {
                  const storiesResponse = await fetch(`${getApiBaseUrl()}/api/epics/${epic.id}/stories`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    signal: controller.signal
                  });
                  if (storiesResponse.ok) {
                    const stories = await storiesResponse.json();
                    return { ...epic, stories };
                  } else {
                    // Check if this is a token issue
                    await handleApiError(storiesResponse);
                  }
                } catch (err) {
                }

                return epic;
              } else {
                await handleApiError(epicResponse);
              }
            } catch (err) {
            }

            return searchEpic;
          } catch (err) {
            return null;
          } finally {
            setLoadProgress(prev => ({ ...prev, loaded: prev.loaded + 1 }));
          }
        })
      );

      // Add not found epics to the results (in order)
      const allEpics = [];
      epicNamesToSearch.forEach((name, index) => {
        const foundEpic = epicsWithStories[index];
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

      // Compute load stats
      const foundCount = allEpics.filter(e => !e.notFound).length;
      const allOwnerIds = new Set(allEpics.flatMap(e => (e.stories || []).flatMap(s => s.owner_ids || [])));
      const cachedMemberIds = Object.keys(storage.getMembersCache());
      const uncachedMemberCalls = [...allOwnerIds].filter(id => !cachedMemberIds.includes(id)).length;
      const totalApiCalls = (teamApiCall ? 1 : 0) + (workflowApiCall ? 1 : 0) + epicNamesToSearch.length + (foundCount * 2) + uncachedMemberCalls;
      setLoadStats({ loadTime: Date.now() - searchStartTime, apiCallCount: totalApiCalls, loadedAt: new Date() });

      // Collapse stories, workflow-pie, type-pie and assignments by default
      const newCollapsedState = {
        'assignment-epic': true,
        'assignment-member': true,
      };
      allEpics.forEach(epic => {
        if (!epic.notFound) {
          newCollapsedState[`${epic.id}-stories`] = true;
          newCollapsedState[`${epic.id}-workflow-pie`] = true;
          newCollapsedState[`${epic.id}-type-pie`] = true;
        }
      });
      setCollapsedCharts(prev => ({ ...prev, ...newCollapsedState }));

    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      searchAbortControllerRef.current = null;
    }
  };


  return (
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

      {showRateLimitModal && (
        <div className="modal-overlay" onClick={() => setShowRateLimitModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', padding: '2.5rem 3rem', maxWidth: '420px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🚦</div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.3rem', color: '#b91c1c' }}>Too Many Requests</h2>
            <p style={{ color: '#4a5568', marginBottom: '0.5rem' }}>
              The Shortcut API has rate-limited this session <strong>(HTTP 429)</strong>.
            </p>
            <p style={{ color: '#718096', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
              This happens when too many API calls are made in a short period. Please wait a few minutes before trying again.
            </p>
            <button className="btn-primary" onClick={() => setShowRateLimitModal(false)} style={{ minWidth: '100px' }}>
              OK
            </button>
          </div>
        </div>
      )}
      {showSetupWizard && (
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
                  onClick={() => setSetupWizardStep(stepNum)}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: setupWizardStep === stepNum ? '#494BCB' : setupWizardStep > stepNum ? '#22c55e' : '#e2e8f0',
                    color: setupWizardStep >= stepNum ? 'white' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    zIndex: 1,
                    border: setupWizardStep === stepNum ? '2px solid #494BCB' : '2px solid transparent'
                  }}>
                    {setupWizardStep > stepNum ? '✓' : stepNum}
                  </div>
                  <div style={{
                    marginTop: '0.5rem',
                    fontSize: '0.75rem',
                    color: setupWizardStep === stepNum ? '#494BCB' : '#64748b',
                    fontWeight: setupWizardStep === stepNum ? '600' : 'normal',
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
                      backgroundColor: setupWizardStep > stepNum ? '#22c55e' : '#e2e8f0',
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
              {setupWizardStep === 1 && (
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
                        // Clear the asterisk display once user starts typing
                        if (hasExistingToken && !apiToken) {
                          setHasExistingToken(false);
                        }
                        setApiToken(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          // Save token silently without verification messages
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
              {setupWizardStep === 2 && (
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
              {setupWizardStep === 3 && (
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
                    {allWorkflows.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                          {loading ? 'Loading workflows...' : 'No workflows found'}
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {allWorkflows.map((workflow) => (
                          <div
                            key={workflow.id}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.75rem',
                              padding: '1rem',
                              backgroundColor: selectedWorkflowId === workflow.id ? '#eff6ff' : '#ffffff',
                              border: selectedWorkflowId === workflow.id ? '2px solid #494BCB' : '1px solid #e2e8f0',
                              borderRadius: '8px',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer'
                            }}
                            onClick={() => setSelectedWorkflowId(workflow.id)}
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
                                {selectedWorkflowId === workflow.id && (
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
              {setupWizardStep === 4 && (
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

              {/* Step 5: Epic List */}
              {setupWizardStep === 5 && (
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

              {setupWizardStep === 6 && (
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
                onClick={() => {
                  setShowSetupWizard(false);
                  setSetupWizardStep(1);
                  setApiToken('');
                  setTokenError('');
                  setEpicListError('');
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {setupWizardStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setSetupWizardStep(setupWizardStep - 1)}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    if (setupWizardStep === 1) {
                      // Save token and verify it before moving to step 2
                      const existingToken = storage.getApiToken();
                      if (!apiToken.trim() && !existingToken) {
                        setTokenError('Please enter an API token');
                        return;
                      }

                      // Determine which token to verify
                      const tokenToVerify = apiToken.trim() || existingToken;

                      // Only save if a new token was entered
                      if (apiToken.trim()) {
                        storage.setApiToken(apiToken);
                      }

                      // Verify the token by making a test API call
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

                        // Token is valid, proceed to step 2
                        setTokenError('');
                        setSetupWizardStep(2);
                      } catch (err) {
                        setTokenError('Exception - Failed to verify token. Please check your connection and try again.');
                        return;
                      }
                    } else if (setupWizardStep === 2) {
                      // Save URL and move to step 3
                      const savedUrl = handleSaveShortcutUrl();
                      if (savedUrl !== false) {
                        // Load workflows for step 3
                        try {
                          const token = storage.getApiToken();
                          const workflowsResponse = await fetch(`${getApiBaseUrl()}/api/workflows`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          if (workflowsResponse.ok) {
                            const workflows = await workflowsResponse.json();
                            setAllWorkflows(workflows);
                          }
                        } catch (err) {
                        }
                        setSetupWizardStep(3);
                      }
                    } else if (setupWizardStep === 3) {
                      // Save workflow and move to step 4 (Select Team)
                      if (!selectedWorkflowId) {
                        setError('Please select a workflow');
                        return;
                      }
                      const selectedWorkflow = allWorkflows.find(w => w.id === selectedWorkflowId);
                      if (selectedWorkflow) {
                        handleSelectWorkflow(selectedWorkflow);
                        // Fetch teams for step 4
                        try {
                          const token = storage.getApiToken();
                          const teamsRes = await fetch(`${getApiBaseUrl()}/api/teams`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                          });
                          if (teamsRes.ok) setAllTeams(await teamsRes.json());
                        } catch (err) {}
                        setSetupWizardStep(4);
                      }
                    } else if (setupWizardStep === 4) {
                      // Save selected team and move to step 5 (Ignore Users)
                      if (selectedTeamId) {
                        const selectedTeam = allTeams.find(t => t.id === selectedTeamId);
                        if (selectedTeam) {
                          storage.setTeamConfig({ id: selectedTeam.id, name: selectedTeam.name });
                        }
                      }
                      setSetupWizardStep(5);
                    } else if (setupWizardStep === 5) {
                      // Save ignored users and move to step 6 (Epic List)
                      storage.setIgnoredUsers(ignoredUsers);
                      setSetupWizardStep(6);
                    } else if (setupWizardStep === 6) {
                      // Save epic list and close wizard
                      const saved = handleSaveEpicList();
                      if (saved) {
                        setShowSetupWizard(false);
                        setSetupWizardStep(1);
                        searchEpics();
                      }
                    }
                  }}
                  className="btn-primary"
                >
                  {setupWizardStep < 6 ? 'Next' : 'Finish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAboutModal && (
        <div className="modal-overlay" onClick={() => setShowAboutModal(false)}>
          <div className="modal-content modal-content-about" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <img src="/dave.png" alt="D.A.V.E." style={{ width: '72px', height: '72px', flexShrink: 0 }} />
              <h2 style={{ margin: 0 }}>About Shortcut Dashboard</h2>
            </div>
            <p>
              A React-based dashboard for tracking Shortcut.com epics, visualising progress, and monitoring team workload.
            </p>
            <ul>
              <li><strong>Summary Table:</strong> At-a-glance chevron progress bars for all tracked epics</li>
              <li><strong>Epic Owner Assignment:</strong> Maps each epic to its assigned team members</li>
              <li><strong>Team Member Assignment:</strong> Inverted view — each team member and their assigned epics</li>
              <li><strong>Ticket Status Breakdown:</strong> 3D column chart of story workflow states per epic</li>
              <li><strong>Workflow Status Pie Chart:</strong> Stories by workflow state with clickable Shortcut links</li>
              <li><strong>Story Type Breakdown:</strong> Pie chart showing Feature / Bug / Chore distribution</li>
              <li><strong>Story Owners Table:</strong> Per-epic story owner counts including unassigned</li>
              <li><strong>Team Open Tickets:</strong> Open ticket counts per team member, excluding completed stories</li>
              <li><strong>User Story Board:</strong> Kanban view (Backlog → Complete) with collapsible story cards</li>
              <li><strong>Sidebar Navigation:</strong> Slide-out panel for quick jumping between epics</li>
              <li><strong>Ignored Users:</strong> Wizard-configured list of users excluded from assignment and ticket tables</li>
              <li><strong>Setup Wizard:</strong> 6-step guided setup — token, URL, workflow, team, ignored users, epic list</li>
              <li><strong>Configuration Management:</strong> Export / Import of all settings as JSON</li>
            </ul>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#718096' }}>
              Version 3.0.0 | Project D.A.V.E. (Dashboards Are Very Effective)
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

      {showExportImportModal && (
        <div className="modal-overlay" onClick={() => setShowExportImportModal(false)}>
          <div className="modal-content modal-content-export-import" onClick={(e) => e.stopPropagation()}>
            <h2>Export/Import Configuration</h2>

            {/* Success/Error Messages */}
            {importSuccess && (
              <div style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                backgroundColor: '#d1fae5',
                border: '1px solid #6ee7b7',
                borderRadius: '0.375rem',
                color: '#065f46'
              }}>
                {importSuccess}
              </div>
            )}

            {importError && (
              <div style={{
                padding: '0.75rem',
                marginBottom: '1rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '0.375rem',
                color: '#dc2626'
              }}>
                {importError}
              </div>
            )}

            {/* Export Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Export Configuration</h3>
              <p style={{ marginBottom: '1rem', color: '#64748b' }}>
                Download your current configuration as a JSON file for backup.
              </p>
              <button
                type="button"
                onClick={handleExportData}
                className="btn-primary"
              >
                Export Configuration
              </button>
            </div>

            {/* Import Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Import Configuration</h3>
              <p style={{ marginBottom: '1rem', color: '#64748b' }}>
                Upload a previously exported configuration file to restore your settings.
              </p>
              <input
                type="file"
                id="import-file-input"
                accept=".json"
                onChange={handleImportData}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="import-file-input"
                className="btn-secondary"
                style={{
                  display: 'inline-block',
                  textAlign: 'center'
                }}
              >
                Choose File
              </label>
            </div>

            <div className="modal-buttons">
              <button
                type="button"
                onClick={() => setShowExportImportModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showWipeConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowWipeConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: '#dc2626' }}>Wipe All Settings?</h2>
            <p style={{ marginBottom: '1.5rem' }}>
              This action will permanently delete all stored data including:
            </p>
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
              <button
                type="button"
                onClick={() => setShowWipeConfirmModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWipeSettings}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Yes, Wipe All Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {showReadmeModal && (
        <div className="modal-overlay" onClick={() => setShowReadmeModal(false)}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <h2>README.md</h2>
            <div
              className="markdown-content"
              style={{
                maxHeight: '60vh',
                overflowY: 'auto',
                marginBottom: '1rem',
                backgroundColor: '#ffffff',
                padding: '1.5rem',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}
              dangerouslySetInnerHTML={{ __html: marked(readmeContent || '') }}
            />
            <div className="modal-buttons">
              <button
                type="button"
                onClick={() => setShowReadmeModal(false)}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Epic list modal removed - now using setup wizard step 6 */}

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
        <div style={{ textAlign: 'center' }}>
          <h1>Shortcut Dashboard</h1>
          {storage.getTeamConfig()?.name && (
            <div style={{ fontSize: '1.4rem', fontWeight: 400, opacity: 0.85, marginTop: '0.15rem', letterSpacing: '0.03em' }}>
              {filterByTeam ? `${storage.getTeamConfig().name} Team Only` : 'All Teams'}
            </div>
          )}
        </div>
        <div className="settings-container">
          <div className="settings-icon-row">
          <button
            className="settings-icon"
            aria-label="Refresh Epics"
            data-tooltip="Refresh Epics"
            onClick={(e) => searchEpics(e)}
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
              const epicsConfig = storage.getEpicsConfig();
              if (epicsConfig && epicsConfig.epics) {
                setEpicsList(epicsConfig.epics);
              } else {
                setEpicsList([]);
              }
              setShowSetupWizard(true);
              setSetupWizardStep(6);
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 5h2v2H3V5zm4 0h14v2H7V5zM3 11h2v2H3v-2zm4 0h14v2H7v-2zM3 17h2v2H3v-2zm4 0h14v2H7v-2z"/>
            </svg>
          </button>
          <button
            className="settings-icon"
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            aria-label="Settings"
            data-tooltip="Settings"
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
                  // Load existing token to show masked placeholder
                  const existingToken = storage.getApiToken();
                  if (existingToken) {
                    setApiToken(''); // Don't populate with real token for security
                    setHasExistingToken(true);
                  }
                  setShowSetupWizard(true);
                  setSetupWizardStep(1);
                }}
              >
                Setup Wizard
              </button>
              <button
                className="settings-menu-item"
                onClick={() => {
                  setShowSettingsMenu(false);
                  handleOpenReadme();
                }}
              >
                README.md
              </button>
              <button
                className="settings-menu-item"
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowExportImportModal(true);
                }}
              >
                Export/Import
              </button>
              <button
                className="settings-menu-item"
                onClick={() => {
                  setShowSettingsMenu(false);
                  setShowWipeConfirmModal(true);
                }}
                style={{ color: '#dc2626' }}
              >
                Wipe Settings
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
          {epics.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
              {selectedTeamId && (
                <button
                  onClick={() => setFilterByTeam(prev => !prev)}
                  className={`header-action-btn${filterByTeam ? ' active' : ''}`}
                  title={filterByTeam
                    ? `Currently showing only ${storage.getTeamConfig()?.name || 'team'} tickets — click to show all tickets`
                    : `Currently showing all tickets — click to show only tickets assigned to ${storage.getTeamConfig()?.name || 'team'}`}
                >
                  {filterByTeam ? 'Show All Teams' : `Show ${storage.getTeamConfig()?.name || 'Team'} Team Only`}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Epic Navigation Sidebar */}
      {epics.length > 0 && (
        <>
          {/* Sidebar Toggle Button */}
          <button
            className={`sidebar-toggle ${showSidebar ? 'active' : ''}`}
            onClick={() => setShowSidebar(!showSidebar)}
            aria-label="Toggle epic navigation"
          >
            {showSidebar ? '◀' : '▶'}
          </button>

          {/* Sidebar */}
          <div className={`epic-sidebar ${showSidebar ? 'show' : ''}`}>
            <div className="sidebar-header">
              <h3>Epics</h3>
              <button
                className="sidebar-close"
                onClick={() => setShowSidebar(false)}
                aria-label="Close sidebar"
              >
                ✕
              </button>
            </div>
            <nav className="sidebar-nav">
              {/* Top navigation item */}
              <button
                className="sidebar-nav-item sidebar-nav-top"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setShowSidebar(false);
                }}
                title="Scroll to top"
              >
                <span className="sidebar-nav-number">↑</span>
                <span className="sidebar-nav-text">Top</span>
              </button>

              {epics.map((epic, index) => (
                !epic.notFound && (
                  <button
                    key={epic.id}
                    className="sidebar-nav-item"
                    onClick={() => scrollToEpic(epic.id)}
                    title={epic.name}
                  >
                    <span className="sidebar-nav-number">{index + 1}</span>
                    <span className="sidebar-nav-text">{epic.name}</span>
                  </button>
                )
              ))}

              {/* Refresh Button */}
              <button
                className="sidebar-nav-item sidebar-nav-top"
                onClick={(e) => {
                  setShowSidebar(false);
                  searchEpics(e);
                }}
                title="Refresh epics data"
                style={{ marginTop: '1rem', paddingTop: '1rem', borderBottom: 'none', borderTop: '2px solid #F0F0F7' }}
              >
                <span className="sidebar-nav-number">↻</span>
                <span className="sidebar-nav-text">Refresh Epics</span>
              </button>
            </nav>
          </div>

          {/* Overlay */}
          {showSidebar && (
            <div
              className="sidebar-overlay"
              onClick={() => setShowSidebar(false)}
            />
          )}
        </>
      )}

      <main className="container">

        {successMessage && (
          <div style={{
            backgroundColor: '#d1fae5',
            border: '1px solid #6ee7b7',
            color: '#065f46',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '1rem'
          }}>
            <p style={{ margin: 0 }}>{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>{error}</p>
            {apiTokenIssue && (
              <p style={{ marginTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    // Load existing token to show masked placeholder
                    const existingToken = storage.getApiToken();
                    if (existingToken) {
                      setApiToken(''); // Don't populate with real token for security
                      setHasExistingToken(true);
                    }
                    setShowSetupWizard(true);
                    setSetupWizardStep(1);
                  }}
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
            {/* Summary Table */}
            {(() => {
              const backlogStates = ['backlog'];
              const completeStates = ['complete', 'ready for release'];
              const inProgressStates = ['ready for development', 'in development', 'in review'];

              const getGroup = name => {
                const n = (name || '').toLowerCase().trim();
                if (backlogStates.includes(n)) return 'backlog';
                if (completeStates.includes(n)) return 'complete';
                if (inProgressStates.includes(n)) return 'inprogress';
                return null;
              };

              const allTargetStates = [...backlogStates, ...inProgressStates, ...completeStates];
              const summaryStateIds = workflowStateOrder.filter(stateId => {
                const name = workflowStates[stateId];
                return name && allTargetStates.includes(name.toLowerCase().trim());
              });
              const foundEpics = epics.filter(e => !e.notFound);
              if (foundEpics.length === 0 || summaryStateIds.length === 0) return null;

              const renderRow = (epic, idx) => {
                const stateCounts = {};
                const epicDisplayStories = getDisplayStories(epic);
                epicDisplayStories.forEach(story => {
                  stateCounts[story.workflow_state_id] = (stateCounts[story.workflow_state_id] || 0) + 1;
                });
                const total = epicDisplayStories.length;
                let backlogCount = 0, inProgressCount = 0, completeCount = 0;
                summaryStateIds.forEach(stateId => {
                  const group = getGroup(workflowStates[stateId]);
                  const count = stateCounts[stateId] || 0;
                  if (group === 'backlog') backlogCount += count;
                  else if (group === 'inprogress') inProgressCount += count;
                  else if (group === 'complete') completeCount += count;
                });
                const backlogPct = total > 0 ? (backlogCount / total) * 100 : 0;
                const inProgressPct = total > 0 ? (inProgressCount / total) * 100 : 0;
                const completePct = total > 0 ? (completeCount / total) * 100 : 0;
                return (
                  <tr key={epic.id} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', borderBottom: '1px solid #F0F0F7' }}>
                      <a href={`#epic-${epic.id}`} style={{ color: '#494BCB', textDecoration: 'none' }}>
                        {epic.name}
                      </a>
                    </td>
                    <td style={{ padding: '0.4rem 0.75rem', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid #F0F0F7' }}>
                      {(() => { const si = getEpicStateInfo(epic); return si.name ? (
                        <span className={`epic-state ${getEpicStateClass(si.type, si.name)}`} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                          {si.type.toLowerCase() === 'done' ? 'Done ✓' : si.name}
                        </span>
                      ) : null; })()}
                    </td>
                    <td style={{ padding: '0.4rem 0.75rem', width: '100%', borderBottom: '1px solid #F0F0F7' }}>
                      <div className="summary-bar-wrapper">
                        <div style={{ display: 'flex', height: '22px', borderRadius: '999px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          {total === 0 ? (
                            <div style={{ width: '100%', background: '#f1f5f9' }} />
                          ) : (
                            <>
                              {completePct > 0 && <div style={{ ...(inProgressPct > 0 || backlogPct > 0 ? { width: `${completePct}%`, clipPath: 'polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)', marginRight: '-7px' } : { flex: 1 }), background: '#059669', height: '100%', minWidth: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 3 }}>{completePct >= 8 && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', paddingRight: inProgressPct > 0 || backlogPct > 0 ? '7px' : '0' }}>{Math.round(completePct)}%</span>}</div>}
                              {inProgressPct > 0 && <div style={{ ...(backlogPct > 0 ? { width: `${inProgressPct}%`, clipPath: 'polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)', marginRight: '-7px' } : { flex: 1 }), background: '#fde68a', height: '100%', minWidth: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2 }} />}
                              {backlogPct > 0 && <div style={{ flex: 1, background: '#f1f5f9', height: '100%', minWidth: '2px', position: 'relative', zIndex: 1 }} />}
                            </>
                          )}
                        </div>
                        <div className="summary-bar-tooltip">
                          {[
                            { label: 'Complete', count: completeCount, pct: completePct, color: '#059669' },
                            { label: 'In Progress', count: inProgressCount, pct: inProgressPct, color: '#fde68a' },
                            { label: 'Backlog', count: backlogCount, pct: backlogPct, color: '#f1f5f9' },
                          ].filter(({ count }) => count > 0).map(({ label, count, pct, color }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0' }}>
                              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, flexShrink: 0, border: '1px solid rgba(255,255,255,0.3)', display: 'inline-block' }} />
                              <span style={{ flex: 1 }}>{label}</span>
                              <span style={{ fontWeight: 700, marginLeft: '0.75rem' }}>{count} ({Math.round(pct)}%)</span>
                            </div>
                          ))}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: '0.4rem', paddingTop: '0.4rem', fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>
                            <div><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Complete:</strong> Complete + Ready for Release</div>
                            <div><strong style={{ color: 'rgba(255,255,255,0.85)' }}>In Progress:</strong> Ready for Dev + In Dev + In Review</div>
                            <div><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Backlog:</strong> Backlog</div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              };

              const getCompletePct = (epic) => {
                const stateCounts = {};
                summaryStateIds.forEach(id => { stateCounts[id] = 0; });
                getDisplayStories(epic).forEach(story => {
                  if (stateCounts[story.workflow_state_id] !== undefined) stateCounts[story.workflow_state_id]++;
                });
                const total = Object.values(stateCounts).reduce((a, b) => a + b, 0);
                let completeCount = 0;
                summaryStateIds.forEach(id => {
                  if (getGroup(workflowStates[id]) === 'complete') completeCount += stateCounts[id];
                });
                return total > 0 ? (completeCount / total) * 100 : 0;
              };

              const sortedEpics = [...foundEpics].sort((a, b) => {
                if (!summarySort.col) return 0;
                const dir = summarySort.dir === 'asc' ? 1 : -1;
                if (summarySort.col === 'name') return dir * a.name.localeCompare(b.name);
                if (summarySort.col === 'status') return dir * getEpicStateInfo(a).name.localeCompare(getEpicStateInfo(b).name);
                if (summarySort.col === 'progress') return dir * (getCompletePct(a) - getCompletePct(b));
                return 0;
              });

              const toggleSort = (col) => {
                setSummarySort(prev => prev.col === col && prev.dir === 'asc' ? { col, dir: 'desc' } : { col, dir: 'asc' });
              };

              const sortIcon = (col, isNumeric = false) => {
                const unsorted = 'Click to sort';
                const ascLabel = isNumeric ? 'Sorted low→high, click to reverse' : 'Sorted A→Z, click to reverse';
                const descLabel = isNumeric ? 'Sorted high→low, click to reverse' : 'Sorted Z→A, click to reverse';
                const label = summarySort.col !== col ? unsorted : summarySort.dir === 'asc' ? ascLabel : descLabel;
                const icon = summarySort.col !== col ? ' ↕' : summarySort.dir === 'asc' ? ' ↑' : ' ↓';
                return <span className="summary-sort-icon" data-tooltip={label}>{icon}</span>;
              };

              const half = Math.ceil(sortedEpics.length / 2);
              const leftEpics = sortedEpics.slice(0, half);
              const rightEpics = sortedEpics.slice(half);

              const tableStyle = { width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', border: '1px solid #F0F0F7' };
              const thStyle = { cursor: 'pointer', userSelect: 'none' };
              const theadRow = (
                <tr style={{ background: '#494BCB', color: 'white' }}>
                  <th style={{ ...thStyle, padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', borderRadius: '8px 0 0 0' }}>
                    <span onClick={() => toggleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>Epic Name{sortIcon('name')}</span>
                    <span className="summary-sort-icon" data-tooltip="Restore original order" onClick={(e) => { e.stopPropagation(); setSummarySort({ col: null, dir: 'asc' }); }} style={{ marginLeft: '6px', cursor: 'pointer', opacity: summarySort.col ? 1 : 0.4 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px', verticalAlign: 'middle', display: 'inline-block' }}>
                        <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.95-2.05L6.64 18.36A8.955 8.955 0 0 0 13 21a9 9 0 0 0 0-18z"/>
                      </svg>
                    </span>
                  </th>
                  <th onClick={() => toggleSort('status')} style={{ ...thStyle, padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>Epic Status{sortIcon('status')}</th>
                  <th onClick={() => toggleSort('progress')} style={{ ...thStyle, padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', borderRadius: '0 8px 0 0' }}>Epic Progress{sortIcon('progress', true)}</th>
                </tr>
              );

              return (
                <div id="summary-table" style={{ marginBottom: '1rem' }}>
                  <div className="summary-table-grid">
                    <div style={{ flex: 1 }}>
                      <table style={tableStyle}>
                        <thead>{theadRow}</thead>
                        <tbody>{leftEpics.map((epic, idx) => renderRow(epic, idx))}</tbody>
                      </table>
                    </div>
                    <div style={{ flex: 1 }}>
                      <table style={tableStyle}>
                        <thead>{theadRow}</thead>
                        <tbody>{rightEpics.map((epic, idx) => renderRow(epic, idx))}</tbody>
                      </table>
                    </div>
                  </div>
                  <hr style={{ border: 'none', borderTop: '2px solid #e2e8f0', marginTop: '1rem' }} />
                </div>
              );
            })()}

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

            {/* Epic–Team and Member–Epic tables */}
            {(() => {
              const foundEpics = epics.filter(e => !e.notFound);
              if (foundEpics.length === 0) return null;

              // Epic → team members
              const epicTeamData = foundEpics.map(epic => ({
                id: epic.id,
                name: epic.name,
                isDone: getEpicStateInfo(epic).type === 'done',
                isReadyForRelease: getEpicStateInfo(epic).name.toLowerCase().trim() === 'ready for release',
                team: (epic.owner_ids || [])
                  .filter(id => !selectedTeamId || teamMemberIds.has(id))
                  .map(id => members[id] || id)
                  .filter(name => !filterIgnoredInTickets || !ignoredUsers.includes(name)),
              }));

              // Member → epics (inverted)
              const memberEpicMap = {};
              epicTeamData.forEach(({ id, name, isDone, isReadyForRelease, team }) => {
                team.forEach(member => {
                  if (!memberEpicMap[member]) memberEpicMap[member] = [];
                  memberEpicMap[member].push({ id, name, isDone, isReadyForRelease });
                });
              });
              const memberEpicData = Object.entries(memberEpicMap).map(([member, epicsForMember]) => ({ member, epics: epicsForMember }));

              if (memberEpicData.length === 0) return null;

              const tableStyle = { width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', border: '1px solid #F0F0F7' };
              const thBase = { padding: '0.5rem 0.75rem', fontWeight: 600, fontSize: '0.875rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', color: 'white' };
              const tdStyle = { padding: '0.4rem 0.75rem', fontSize: '0.875rem', borderBottom: '1px solid #F0F0F7', wordBreak: 'break-word', overflow: 'hidden' };

              const makeSortIcon = (sortState, col, isNumeric = false) => {
                const unsorted = 'Click to sort';
                const ascLabel = isNumeric ? 'Sorted low→high, click to reverse' : 'Sorted A→Z, click to reverse';
                const descLabel = isNumeric ? 'Sorted high→low, click to reverse' : 'Sorted Z→A, click to reverse';
                const label = sortState.col !== col ? unsorted : sortState.dir === 'asc' ? ascLabel : descLabel;
                const icon = sortState.col !== col ? ' ↕' : sortState.dir === 'asc' ? ' ↑' : ' ↓';
                return <span className="summary-sort-icon" data-tooltip={label}>{icon}</span>;
              };

              const doToggleSort = (setSortFn, col) => {
                setSortFn(prev => prev.col === col && prev.dir === 'asc' ? { col, dir: 'desc' } : { col, dir: 'asc' });
              };

              const sortedEpicTeam = [...epicTeamData].sort((a, b) => {
                if (!epicTeamSort.col) return 0;
                const dir = epicTeamSort.dir === 'asc' ? 1 : -1;
                if (epicTeamSort.col === 'epic') return dir * a.name.localeCompare(b.name);
                if (epicTeamSort.col === 'count') return dir * (a.team.length - b.team.length);
                return 0;
              });

              const sortedMemberEpic = [...memberEpicData].sort((a, b) => {
                if (!memberEpicSort.col) return 0;
                const dir = memberEpicSort.dir === 'asc' ? 1 : -1;
                if (memberEpicSort.col === 'member') return dir * a.member.localeCompare(b.member);
                if (memberEpicSort.col === 'count') return dir * (a.epics.length - b.epics.length);
                return 0;
              });

              const epicTeamHead = (
                <tr style={{ background: '#494BCB' }}>
                  <th style={{ ...thBase, borderRadius: '8px 0 0 0' }} onClick={() => doToggleSort(setEpicTeamSort, 'epic')}>
                    Epic{makeSortIcon(epicTeamSort, 'epic')}
                    <span className="summary-sort-icon" data-tooltip="Restore original order" onClick={(e) => { e.stopPropagation(); setEpicTeamSort({ col: null, dir: 'asc' }); }} style={{ marginLeft: '6px', cursor: 'pointer', opacity: epicTeamSort.col ? 1 : 0.4 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px', verticalAlign: 'middle', display: 'inline-block' }}>
                        <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.95-2.05L6.64 18.36A8.955 8.955 0 0 0 13 21a9 9 0 0 0 0-18z"/>
                      </svg>
                    </span>
                  </th>
                  <th style={{ ...thBase, borderRadius: '0 8px 0 0', cursor: 'default' }}>Team Members</th>
                </tr>
              );

              const memberEpicHead = (
                <tr style={{ background: '#494BCB' }}>
                  <th style={{ ...thBase, borderRadius: '8px 0 0 0' }} onClick={() => doToggleSort(setMemberEpicSort, 'member')}>
                    Team Member{makeSortIcon(memberEpicSort, 'member')}
                  </th>
                  <th style={{ ...thBase, borderRadius: '0 8px 0 0', cursor: 'default' }}>Epics</th>
                </tr>
              );

              const donePill = <span style={{ marginLeft: '0.4rem', backgroundColor: '#86efac', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 500, display: 'inline-block', verticalAlign: 'middle' }}>Done</span>;
              const readyForReleasePill = <span style={{ marginLeft: '0.4rem', backgroundColor: '#bbf7d0', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 500, display: 'inline-block', verticalAlign: 'middle' }}>Ready for Release</span>;

              const renderEpicTeamRow = (row, idx) => (
                <tr key={row.id} style={{ background: row.team.length === 0 ? '#fff9c4' : idx % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    <a href={`#epic-${row.id}`} style={{ color: '#494BCB', textDecoration: 'none' }}>{row.name}</a>
                    {row.isDone && donePill}
                    {row.isReadyForRelease && readyForReleasePill}
                  </td>
                  <td style={tdStyle}>
                    {row.team.length === 0
                      ? <span style={{ color: '#a0aec0', fontStyle: 'italic' }}>None</span>
                      : <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>{[...row.team].sort((a, b) => a.localeCompare(b)).map((m, i) => <li key={i}>{!filterIgnoredInTickets && ignoredUsers.includes(m) ? <span style={{ backgroundColor: '#e5e7eb', borderRadius: '999px', padding: '0.1rem 0.5rem', display: 'inline-block' }}>{m}</span> : m}</li>)}</ul>}
                  </td>
                </tr>
              );

              const renderMemberEpicRow = (row, idx) => (
                <tr key={row.member} style={{ background: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    {!filterIgnoredInTickets && ignoredUsers.includes(row.member)
                      ? <span style={{ backgroundColor: '#e5e7eb', borderRadius: '999px', padding: '0.1rem 0.5rem', display: 'inline-block' }}>{row.member}</span>
                      : row.member}{' '}
                    <span style={{ fontWeight: 400, color: '#718096', fontSize: '0.8rem' }}>({row.epics.length})</span>
                  </td>
                  <td style={tdStyle}>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                      {[...row.epics].sort((a, b) => a.name.localeCompare(b.name)).map((e) => (
                        <li key={e.id}><a href={`#epic-${e.id}`} style={{ color: '#494BCB', textDecoration: 'none' }}>{e.name}</a>{e.isDone && donePill}{e.isReadyForRelease && readyForReleasePill}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              );

              const epicTeamHalf = Math.ceil(sortedEpicTeam.length / 2);
              const memberEpicHalf = Math.ceil(sortedMemberEpic.length / 2);

              const colgroup = <colgroup><col style={{ width: '50%' }} /><col style={{ width: '50%' }} /></colgroup>;

              return (
                <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                  {/* Epic Owner Assignment — split into left/right halves */}
                  <div>
                    <h3
                      onClick={() => setCollapsedCharts(prev => ({ ...prev, 'assignment-epic': !prev['assignment-epic'] }))}
                      style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      title="Show or hide the Epic Owner Assignment table"
                    >
                      <span>{collapsedCharts['assignment-epic'] ? '▶' : '▼'}</span> Epic Owner Assignment
                    </h3>
                    {!collapsedCharts['assignment-epic'] && (
                      <div className="summary-table-grid">
                        <div>
                          <table style={tableStyle}>
                            {colgroup}
                            <thead>{epicTeamHead}</thead>
                            <tbody>{sortedEpicTeam.slice(0, epicTeamHalf).map((row, idx) => renderEpicTeamRow(row, idx))}</tbody>
                          </table>
                        </div>
                        <div>
                          <table style={tableStyle}>
                            {colgroup}
                            <thead>{epicTeamHead}</thead>
                            <tbody>{sortedEpicTeam.slice(epicTeamHalf).map((row, idx) => renderEpicTeamRow(row, idx))}</tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Team Member Assignment — split into left/right halves */}
                  <div>
                    <h3
                      onClick={() => setCollapsedCharts(prev => ({ ...prev, 'assignment-member': !prev['assignment-member'] }))}
                      style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      title="Show or hide the Team Member Assignment table"
                    >
                      <span>{collapsedCharts['assignment-member'] ? '▶' : '▼'}</span> Team Member Assignment
                    </h3>
                    {!collapsedCharts['assignment-member'] && (
                      <div className="summary-table-grid">
                        <div>
                          <table style={tableStyle}>
                            {colgroup}
                            <thead>{memberEpicHead}</thead>
                            <tbody>{sortedMemberEpic.slice(0, memberEpicHalf).map((row, idx) => renderMemberEpicRow(row, idx))}</tbody>
                          </table>
                        </div>
                        <div>
                          <table style={tableStyle}>
                            {colgroup}
                            <thead>{memberEpicHead}</thead>
                            <tbody>{sortedMemberEpic.slice(memberEpicHalf).map((row, idx) => renderMemberEpicRow(row, idx))}</tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <hr style={{ border: 'none', borderTop: '2px solid #e2e8f0', margin: '0 0 1rem' }} />
                </>
              );
            })()}

            {epics.map((epic) => {
              const displayStories = getDisplayStories(epic);
              return epic.notFound ? (
                <div key={epic.id} className="epic-not-found">
                  <h3>{epic.name}</h3>
                  <p>Epic not found in Shortcut</p>
                </div>
              ) : (
              <div key={epic.id} id={`epic-${epic.id}`} className="epic-card">
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
                    {(() => { const si = getEpicStateInfo(epic); return (
                      <span className={`epic-state ${getEpicStateClass(si.type, si.name)}`}>
                        {si.type.toLowerCase() === 'done' ? 'Done ✓' : si.name}
                      </span>
                    ); })()}
                  </div>
                </div>

                {epic.stories && workflowStateOrder.length > 0 && (
                  <div className="epic-stats-container">
                    <div className="workflow-status-chart-container">
                      <h4>Ticket Status Breakdown</h4>
                      <div className="workflow-status-chart" style={{ marginTop: '0.5rem' }}>
                      {(() => {
                        // Calculate workflow state counts
                        const stateCounts = {};
                        let total = displayStories.length;
                        displayStories.forEach(story => {
                          const stateId = story.workflow_state_id;
                          stateCounts[stateId] = (stateCounts[stateId] || 0) + 1;
                        });

                        const filteredStateIds = getFilteredStateIds();

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
                                <span className="status-name">{stateName.replace(/Development/g, 'Dev')}</span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                      </div>

                      {/* Pie Chart */}
                      <div>
                      <h4 style={{ marginTop: '0.5rem', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => toggleChart(epic.id, 'workflow-pie')} title="Show or hide the Workflow Status Pie Chart for this epic">
                        <span>{collapsedCharts[`${epic.id}-workflow-pie`] ? '▶' : '▼'}</span> Workflow Status Pie Chart
                      </h4>
                      {!collapsedCharts[`${epic.id}-workflow-pie`] && (
                      <div style={{ marginTop: '0.5rem' }} className="workflow-status-pie-chart">
                      {(() => {
                        // Calculate workflow state counts
                        const stateCounts = {};
                        let total = displayStories.length;
                        displayStories.forEach(story => {
                          const stateId = story.workflow_state_id;
                          stateCounts[stateId] = (stateCounts[stateId] || 0) + 1;
                        });

                        const filteredStateIds = getFilteredStateIds();

                        // Calculate percentages and create segments
                        const segments = filteredStateIds.map((stateId) => {
                          const count = stateCounts[stateId] || 0;
                          const percentage = total > 0 ? (count / total) * 100 : 0;
                          const stateName = workflowStates[stateId] || stateId;
                          return { stateId, stateName, count, percentage };
                        }).filter(seg => seg.count > 0);

                        // Define colors for each state
                        const stateColors = {
                          'backlog': '#d1d5db',
                          'ready for development': '#a7f3d0',
                          'in development': '#6ee7b7',
                          'in review': '#4ade80',
                          'ready for release': '#22c55e',
                          'complete': '#16a34a'
                        };

                        // Calculate cumulative angles for pie segments
                        let cumulativeAngle = 0;
                        const segmentsWithAngles = segments.map(seg => {
                          const angle = (seg.percentage / 100) * 360;
                          const startAngle = cumulativeAngle;
                          cumulativeAngle += angle;
                          return { ...seg, startAngle, angle };
                        });

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
                                const epicUrl = generateShortcutUrl(epic.id, seg.stateName);

                                return (
                                  <a
                                    key={seg.stateId}
                                    href={epicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="legend-item"
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                    title={`View ${epic.name} filtered by ${seg.stateName} in Shortcut`}
                                  >
                                    <span className="legend-color" style={{ backgroundColor: color }}></span>
                                    <span className="legend-label">{seg.stateName}</span>
                                    <span className="legend-value">{seg.count} ({seg.percentage.toFixed(1)}%)</span>
                                  </a>
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
                      <h4 style={{ marginTop: '0.5rem', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => toggleChart(epic.id, 'type-pie')} title="Show or hide the Story Type Breakdown chart for this epic">
                        <span>{collapsedCharts[`${epic.id}-type-pie`] ? '▶' : '▼'}</span> Story Type Breakdown
                      </h4>
                      {!collapsedCharts[`${epic.id}-type-pie`] && (
                      <div>
                      {(() => {
                        // Calculate story type counts
                        const typeCounts = {};
                        displayStories.forEach(story => {
                          const storyType = story.story_type || 'unknown';
                          typeCounts[storyType] = (typeCounts[storyType] || 0) + 1;
                        });

                        // Define the story types we want to show
                        const targetTypes = ['feature', 'chore', 'bug'];

                        // Calculate percentages and create segments
                        const segments = targetTypes
                          .map((type) => {
                            const count = typeCounts[type] || 0;
                            const typeName = type.charAt(0).toUpperCase() + type.slice(1);
                            return { type, typeName, count };
                          })
                          .filter(seg => seg.count > 0);

                        // Calculate total only from displayed story types
                        const total = segments.reduce((sum, seg) => sum + seg.count, 0);

                        // Add percentages based on the filtered total
                        segments.forEach(seg => {
                          seg.percentage = total > 0 ? (seg.count / total) * 100 : 0;
                        });

                        // Define colors for each story type
                        const typeColors = {
                          'feature': '#86efac',  // Light Green
                          'chore': '#fef08a',    // Light Yellow
                          'bug': '#fca5a5'       // Light Red
                        };

                        // Calculate cumulative angles for pie segments
                        let cumulativeAngle = 0;
                        const segmentsWithAngles = segments.map(seg => {
                          const angle = (seg.percentage / 100) * 360;
                          const startAngle = cumulativeAngle;
                          cumulativeAngle += angle;
                          return { ...seg, startAngle, angle };
                        });


                        return total > 0 ? (
                          <div>
                            <div className="workflow-status-pie-chart" >
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
                                    const storyTypeUrl = `${shortcutWebUrl}/epic/${epic.id}?group_by=story_type`;
                                    return (
                                      <a
                                        key={seg.type}
                                        href={storyTypeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="legend-item"
                                        style={{ textDecoration: 'none', color: 'inherit' }}
                                        title={`View ${epic.name} grouped by story type in Shortcut`}
                                      >
                                        <span className="legend-color" style={{ backgroundColor: color }}></span>
                                        <span className="legend-label">{seg.typeName}</span>
                                        <span className="legend-value">{seg.count} ({seg.percentage.toFixed(1)}%)</span>
                                      </a>
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

                    <div className="tables-container">
                    <div className="story-owners-table">
                      {(() => {
                        // Calculate owner counts (excluding unassigned)
                        const ownerCounts = {};
                        let unassignedCount = 0;

                        displayStories.forEach(story => {
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
                            <h4>Story Owners</h4>
                            <table style={{ marginTop: '0.5rem' }}>
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
                        // Get name list from epic's owner_ids, filtered to selected team members
                        const nameList = (epic.owner_ids || [])
                          .filter(id => !selectedTeamId || teamMemberIds.has(id))
                          .map(id => members[id] || id)
                          .filter(name => !filterIgnoredInTickets || !ignoredUsers.includes(name));

                        if (nameList.length === 0) {
                          return (
                            <>
                              <h4>Team Open Tickets{storage.getTeamConfig()?.name ? ` — ${storage.getTeamConfig().name}` : ''}</h4>
                              <p style={{ color: '#718096', fontSize: '0.875rem', fontStyle: 'italic' }}>
                                No epic owners assigned
                              </p>
                            </>
                          );
                        }

                        // Initialize counts for all names in the list
                        const nameCounts = {};
                        nameList.forEach(name => {
                          nameCounts[name] = 0;
                        });

                        // Count open tickets for owners (exclude Complete state)
                        displayStories.forEach(story => {
                          const stateName = workflowStates[story.workflow_state_id] || '';
                          const isComplete = stateName.toLowerCase().trim() === 'complete';

                          if (!isComplete && story.owner_ids && story.owner_ids.length > 0) {
                            story.owner_ids.forEach(ownerId => {
                              const ownerName = members[ownerId] || '';
                              if (nameCounts.hasOwnProperty(ownerName)) {
                                nameCounts[ownerName]++;
                              }
                            });
                          }
                        });

                        // Sort by count descending
                        const sortedNames = Object.entries(nameCounts)
                          .sort((a, b) => b[1] - a[1]);

                        return (
                          <>
                            <h4>Team Open Tickets{storage.getTeamConfig()?.name ? ` — ${storage.getTeamConfig().name}` : ''}</h4>
                            <table style={{ marginTop: '0.5rem' }}>
                              <thead>
                                <tr>
                                  <th>Owner</th>
                                  <th>Count</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedNames.map(([name, count]) => (
                                  <tr key={name} className={count === 0 ? 'zero-count-row' : ''}>
                                    <td>{!filterIgnoredInTickets && ignoredUsers.includes(name)
                                      ? <span style={{ backgroundColor: '#e5e7eb', borderRadius: '999px', padding: '0.1rem 0.5rem', display: 'inline-block' }}>{name}</span>
                                      : name}</td>
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
                  </div>
                )}

                {epic.stories && (
                  <div className="stories-section">
                    <h4 style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => toggleChart(epic.id, 'stories')} title="Show or hide the User Story Board for this epic">
                      <span>{collapsedCharts[`${epic.id}-stories`] ? '▶' : '▼'}</span> User Story Board
                    </h4>
                    {!collapsedCharts[`${epic.id}-stories`] && (
                    <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '0.75rem' }}>
                        {displayStories.length === 0 ? (
                          <p className="no-stories">No stories found for this epic</p>
                        ) : (
                          <div className="stories-columns">
                            {['Backlog', 'Ready for Development', 'In Development', 'In Review', 'Ready for Release', 'Complete'].map((columnState) => {
                              const storiesInColumn = displayStories.filter(story => {
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
                      </div>
                    )}
                  </div>
                )}
                <div style={{ textAlign: 'left', marginTop: '0.5rem' }}>
                  <a href="#top" style={{ color: '#494BCB', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500 }}>
                    ↑ Top of Page
                  </a>
                </div>
              </div>
              );
            })}
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
        const statStyle = { display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#718096', fontSize: '0.78rem' };
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
      <footer className="App-footer">
        <p>© 2026 | Project D.A.V.E. (Dashboards Are Very Effective) | v3.0.0</p>
      </footer>
    </div>
  );
}

export default App;