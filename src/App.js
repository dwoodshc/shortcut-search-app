import React, { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import './App.css';

// LocalStorage utility functions
const STORAGE_KEYS = {
  API_TOKEN: 'shortcut_api_token',
  WORKFLOW_CONFIG: 'shortcut_workflow_config',
  EPICS_CONFIG: 'shortcut_epics_config'
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
  setEpicsConfig: (config) => localStorage.setItem(STORAGE_KEYS.EPICS_CONFIG, JSON.stringify(config))
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
  const [error, setError] = useState(null);
  const [hoveredPieSegment, setHoveredPieSegment] = useState(null);
  const [hoveredTypeSegment, setHoveredTypeSegment] = useState(null);
  const [workflowStates, setWorkflowStates] = useState({});
  const [workflowStateOrder, setWorkflowStateOrder] = useState([]);
  const [members, setMembers] = useState({});
  const [filteredEpicNames, setFilteredEpicNames] = useState([]);
  const [epicEmails, setEpicEmails] = useState({});
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
  const [collapsedTeamMembers, setCollapsedTeamMembers] = useState({});
  const [showExportImportModal, setShowExportImportModal] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [draggedEpicIndex, setDraggedEpicIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
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

  // Toggle team members collapse state for a specific epic in the edit modal
  const toggleTeamMembers = (epicIndex) => {
    setCollapsedTeamMembers(prev => ({
      ...prev,
      [epicIndex]: !prev[epicIndex]
    }));
  };

  // Scroll to epic by ID
  const scrollToEpic = (epicId) => {
    const element = document.getElementById(`epic-${epicId}`);
    if (element) {
      const yOffset = -20; // Offset to account for any spacing
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setShowSidebar(false);
    }
  };

  // Toggle all charts and tables collapse state (excluding stories)
  const toggleAllCharts = () => {
    const allChartKeys = [];
    const chartTypes = ['column', 'workflow-pie', 'type-pie', 'owners-table', 'team-tickets'];

    epics.forEach(epic => {
      if (!epic.notFound) {
        chartTypes.forEach(type => {
          allChartKeys.push(`${epic.id}-${type}`);
        });
      }
    });

    // Check if all are currently collapsed
    const allCollapsed = allChartKeys.every(key => collapsedCharts[key]);

    // Set all charts/tables to the opposite state, but preserve stories state
    const newState = { ...collapsedCharts };
    allChartKeys.forEach(key => {
      newState[key] = !allCollapsed;
    });

    setCollapsedCharts(newState);
  };

  // Toggle only stories sections
  const toggleAllStories = () => {
    const allStoriesKeys = [];

    epics.forEach(epic => {
      if (!epic.notFound) {
        allStoriesKeys.push(`${epic.id}-stories`);
      }
    });

    // Check if all stories are currently collapsed
    const allCollapsed = allStoriesKeys.every(key => collapsedCharts[key]);

    // Set all stories to the opposite state
    const newState = { ...collapsedCharts };
    allStoriesKeys.forEach(key => {
      newState[key] = !allCollapsed;
    });

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
            // Collapse all team members by default
            const collapsed = {};
            epicsConfig.epics.forEach((_, index) => {
              collapsed[index] = true;
            });
            setCollapsedTeamMembers(collapsed);
          } else {
            setEpicsList([]);
          }

          // Determine which step to start on based on what's missing
          if (!token) {
            setSetupWizardStep(1);
          } else if (!workflowConfig || !workflowConfig.workflow_id) {
            setSetupWizardStep(2);
          } else if (!epicsConfig || !epicsConfig.epics || epicsConfig.epics.length === 0) {
            setSetupWizardStep(4);
          }
          return;
        }
      } catch (err) {
        setShowSetupWizard(true);
        setSetupWizardStep(1);
        setHasExistingToken(false);
      }
    };

    checkConfig();
  }, []);

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
          const emailsData = {};
          epicsConfig.epics.forEach(epic => {
            emailsData[epic.name] = epic.team || [];
          });
          setEpicEmails(emailsData);
        }
      } catch (err) {
      }
    };

    checkEpicsConfig();
    loadSelectedWorkflow();
  }, [showSetupWizard, handleApiError, loadSelectedWorkflow]);

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

  // Load epic list content from localStorage
  // Save epic list content
  const handleSaveEpicList = () => {
    setEpicListError('');

    try {
      // Save to localStorage
      storage.setEpicsConfig({ epics: epicsList });

      // Update local state with new data
      setFilteredEpicNames(epicsList.map(e => e.name));
      const emailsData = {};
      epicsList.forEach(epic => {
        emailsData[epic.name] = epic.team || [];
      });
      setEpicEmails(emailsData);
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
      return;
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
      }
    }
    // Note: Validation for "workflow must be selected first" is handled within the wizard
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
    setEpicEmails({});
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
      const exportData = {
        apiToken: storage.getApiToken(),
        workflowConfig: storage.getWorkflowConfig(),
        epicsConfig: storage.getEpicsConfig(),
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
          storage.setEpicsConfig(importData.epicsConfig);
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

  // Epic management helper functions
  const addEpic = () => {
    const newIndex = epicsList.length;
    setEpicsList([...epicsList, { name: '', team: [] }]);
    setCollapsedTeamMembers({ ...collapsedTeamMembers, [newIndex]: true });
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

  // Drag and drop handlers for epic reordering
  const handleDragStart = (e, index) => {
    setDraggedEpicIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    // Only clear if we're leaving the drop target entirely (not moving to a child element)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();

    if (draggedEpicIndex === null) return;

    const newEpicsList = [...epicsList];

    // Calculate the actual insertion position
    // dropIndex represents the "drop zone" position:
    // - dropIndex 0 = insert at position 0 (before all items)
    // - dropIndex 1 = insert at position 1 (after item 0)
    // - etc.

    let insertIndex = dropIndex;

    // If we're dragging to a position after the dragged item's current position,
    // we need to adjust because removing the item shifts everything down
    if (dropIndex > draggedEpicIndex) {
      insertIndex = dropIndex - 1;
    }

    // Remove the item from its current position
    const [draggedItem] = newEpicsList.splice(draggedEpicIndex, 1);

    // Insert it at the new position
    newEpicsList.splice(insertIndex, 0, draggedItem);

    setEpicsList(newEpicsList);
    setDraggedEpicIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedEpicIndex(null);
    setDragOverIndex(null);
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

  const searchEpics = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setApiTokenIssue(false);
    setEpics([]);

    try {
      // Reload workflow configuration from localStorage
      loadSelectedWorkflow();

      // Reload epic names from localStorage
      let epicNamesToSearch = filteredEpicNames;
      const epicsConfig = storage.getEpicsConfig();
      if (epicsConfig && epicsConfig.epics) {
        epicNamesToSearch = epicsConfig.epics.map(e => e.name);
        setFilteredEpicNames(epicNamesToSearch);

        const emailsData = {};
        epicsConfig.epics.forEach(epic => {
          emailsData[epic.name] = epic.team || [];
        });
        setEpicEmails(emailsData);
      }

      // Get token from localStorage for API calls
      const token = storage.getApiToken();

      // Search for each epic individually by name
      const epicsWithStories = await Promise.all(
        epicNamesToSearch.map(async (name) => {
          try {
            // Search for this specific epic by name
            const searchResponse = await fetch(
              `${getApiBaseUrl()}/api/search/epics?query=${encodeURIComponent(name)}`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
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
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              if (epicResponse.ok) {
                const epic = await epicResponse.json();

                // Fetch stories for this epic
                try {
                  const storiesResponse = await fetch(`${getApiBaseUrl()}/api/epics/${epic.id}/stories`, {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
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
          }
        })
      );

      // Add not found epics to the results (in order)
      const allEpics = [];
      filteredEpicNames.forEach((name, index) => {
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

      // Collapse stories by default for all epics
      const newCollapsedState = {};
      allEpics.forEach(epic => {
        if (!epic.notFound) {
          newCollapsedState[`${epic.id}-stories`] = true;
        }
      });
      setCollapsedCharts(prev => ({ ...prev, ...newCollapsedState }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="App">
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
              {[1, 2, 3, 4].map((stepNum) => (
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
                    {stepNum === 3 && 'Select Workflow'}
                    {stepNum === 4 && 'Epic List'}
                  </div>
                  {stepNum < 4 && (
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
            <div style={{ height: '450px', overflowY: 'auto' }}>
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

              {/* Step 4: Epic List */}
              {setupWizardStep === 4 && (
                <div>
                  <h3 style={{ color: '#1e293b', marginBottom: '1rem' }}>Step 4: Epic List</h3>
                  <p style={{ marginBottom: '1rem' }}>Add the epics you want to track and their team members.</p>

                  <div style={{ marginBottom: '1rem' }}>
                    {/* Drop zone at the top for first position */}
                    <div
                      onDragOver={(e) => handleDragOver(e, 0)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, 0)}
                      style={{
                        minHeight: dragOverIndex === 0 ? '40px' : '20px',
                        transition: 'min-height 0.2s ease',
                        position: 'relative',
                        marginBottom: '0.5rem'
                      }}
                    >
                      {dragOverIndex === 0 && (
                        <div style={{
                          height: '3px',
                          backgroundColor: '#494BCB',
                          borderRadius: '2px',
                          margin: '8px 0',
                          boxShadow: '0 0 4px rgba(73, 75, 203, 0.5)'
                        }} />
                      )}
                    </div>

                    {epicsList.map((epic, epicIndex) => (
                      <React.Fragment key={epicIndex}>
                        <div
                          onDragOver={(e) => handleDragOver(e, epicIndex + 1)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, epicIndex + 1)}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '1rem',
                            backgroundColor: draggedEpicIndex === epicIndex ? '#f0f0f0' : '#f7fafc',
                            opacity: draggedEpicIndex === epicIndex ? 0.5 : 1,
                            position: 'relative'
                          }}
                        >
                          {dragOverIndex === epicIndex + 1 && draggedEpicIndex !== epicIndex && (
                            <div style={{
                              position: 'absolute',
                              bottom: '-8px',
                              left: 0,
                              right: 0,
                              height: '3px',
                              backgroundColor: '#494BCB',
                              borderRadius: '2px',
                              zIndex: 10,
                              boxShadow: '0 0 4px rgba(73, 75, 203, 0.5)'
                            }} />
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, epicIndex)}
                              onDragEnd={handleDragEnd}
                              style={{
                                cursor: 'grab',
                                padding: '0.25rem',
                                color: '#666',
                                fontSize: '1.2rem',
                                lineHeight: 1,
                                userSelect: 'none'
                              }}
                              title="Drag to reorder"
                            >
                              ⋮⋮
                            </div>

                            <div style={{
                              backgroundColor: '#494BCB',
                              color: 'white',
                              borderRadius: '50%',
                              width: '28px',
                              height: '28px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: '0.875rem'
                            }}>
                              {epicIndex + 1}
                            </div>

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
                              Remove
                            </button>
                          </div>

                          <div style={{ marginLeft: '1rem', marginTop: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <button
                                type="button"
                                onClick={() => toggleTeamMembers(epicIndex)}
                                className="chart-toggle-btn"
                                aria-label="Toggle team members"
                                style={{ marginRight: '0.5rem' }}
                              >
                                {collapsedTeamMembers[epicIndex] ? '▼' : '▲'}
                              </button>
                              <label style={{ fontWeight: 'bold', display: 'block', margin: 0 }}>
                                Team Members {epic.team && epic.team.length > 0 && `(${epic.team.length})`}
                              </label>
                            </div>
                            {!collapsedTeamMembers[epicIndex] && (
                              <>
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
                              </>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
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
                        setTokenError('Failed to verify token. Please check your connection and try again.');
                        return;
                      }
                    } else if (setupWizardStep === 2) {
                      // Save URL and move to step 3
                      const savedUrl = await handleSaveShortcutUrl();
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
                      // Save workflow and move to step 4
                      if (!selectedWorkflowId) {
                        setError('Please select a workflow');
                        return;
                      }
                      const selectedWorkflow = allWorkflows.find(w => w.id === selectedWorkflowId);
                      if (selectedWorkflow) {
                        await handleSelectWorkflow(selectedWorkflow);
                        setSetupWizardStep(4);
                      }
                    } else if (setupWizardStep === 4) {
                      // Save epic list and close wizard
                      const saved = handleSaveEpicList();
                      if (saved) {
                        setShowSetupWizard(false);
                        setSetupWizardStep(1);
                      }
                    }
                  }}
                  className="btn-primary"
                >
                  {setupWizardStep < 4 ? 'Next' : 'Finish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAboutModal && (
        <div className="modal-overlay" onClick={() => setShowAboutModal(false)}>
          <div className="modal-content modal-content-about" onClick={(e) => e.stopPropagation()}>
            <h2>About Shortcut Viewer</h2>
            <p>
              A comprehensive React-based dashboard for visualizing and managing Shortcut.com epics and their associated stories.
            </p>
            <p>
              <strong>Features:</strong>
            </p>
            <ul>
              <li><strong>Epic Management:</strong> Track multiple Shortcut epics with team member assignments</li>
              <li><strong>Interactive Visualizations:</strong>
                <ul style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  <li>3D Column Chart showing workflow status breakdown</li>
                  <li>Workflow Status Pie Chart with clickable legend items that link to filtered Shortcut views</li>
                  <li>Story Type Breakdown Pie Chart with clickable legend items</li>
                </ul>
              </li>
              <li><strong>Kanban Board:</strong> Six-column workflow view with collapsible stories sections</li>
              <li><strong>Analytics Tables:</strong> Story owners and team ticket counts with sorting</li>
              <li><strong>Setup Wizard:</strong> Guided 4-step setup for first-time configuration</li>
              <li><strong>Configuration Management:</strong> Uses localStorage with Export/Import functionality</li>
              <li><strong>Sidebar Navigation:</strong> Quick jump to any epic with slide-out panel</li>
            </ul>
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#718096' }}>
              Version 1.0.0 | Project D.A.V.E. (Dashboards Are Very Effective)
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

      {/* Epic list modal removed - now using setup wizard step 4 */}

      <header className="App-header">
        <div className="header-logo">
          <img
            src="https://images.squarespace-cdn.com/content/v1/608324e4b63c5e7e1b49aedf/4b87281c-8610-48e1-8f67-b3b3f20b2567/Slice-Logo-Screen_Yellow-BlackType.png?format=1500w"
            alt="Slice Logo"
            className="logo-image"
          />
        </div>
        <h1>Shortcut Viewer</h1>
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
                Setup
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
        <form onSubmit={searchEpics} className="search-form">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Searching...' : (epics.length > 0 ? 'Refresh Epics' : 'Search Epics')}
            </button>
            <button
              type="button"
              onClick={() => {
                // Load existing epics config
                const epicsConfig = storage.getEpicsConfig();
                if (epicsConfig && epicsConfig.epics) {
                  setEpicsList(epicsConfig.epics);
                  // Collapse all team members by default
                  const collapsed = {};
                  epicsConfig.epics.forEach((_, index) => {
                    collapsed[index] = true;
                  });
                  setCollapsedTeamMembers(collapsed);
                } else {
                  setEpicsList([]);
                }
                setShowSetupWizard(true);
                setSetupWizardStep(4);
              }}
              className="btn-primary"
            >
              Edit Epic List
            </button>
          </div>
        </form>

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.0rem' }}>
                {epics.filter(e => !e.notFound).length === filteredEpicNames.length ? '✅ ' : '⚠️ '}
                Found {epics.filter(e => !e.notFound).length} of {filteredEpicNames.length} Epic{filteredEpicNames.length !== 1 ? 's' : ''}
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={toggleAllStories}
                  className="btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {(() => {
                    const allStoriesKeys = [];
                    epics.forEach(epic => {
                      if (!epic.notFound) {
                        allStoriesKeys.push(`${epic.id}-stories`);
                      }
                    });
                    const allCollapsed = allStoriesKeys.every(key => collapsedCharts[key]);
                    return allCollapsed ? 'Expand Stories' : 'Collapse Stories';
                  })()}
                </button>
                <button
                  onClick={toggleAllCharts}
                  className="btn-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {(() => {
                    const allChartKeys = [];
                    const chartTypes = ['column', 'workflow-pie', 'type-pie', 'owners-table', 'team-tickets'];
                    epics.forEach(epic => {
                      if (!epic.notFound) {
                        chartTypes.forEach(type => {
                          allChartKeys.push(`${epic.id}-${type}`);
                        });
                      }
                    });
                    const allCollapsed = allChartKeys.every(key => collapsedCharts[key]);
                    return allCollapsed ? 'Expand Charts' : 'Collapse Charts';
                  })()}
                </button>
              </div>
            </div>
            {epics.map((epic) => (
              epic.notFound ? (
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
                    <span className={`epic-state ${getEpicStateClass(epic.state)}`}>
                      {toTitleCase(epic.state)}
                      {epic.state.toLowerCase() === 'done' && ' ✓'}
                    </span>
                  </div>
                </div>

                {epic.stories && workflowStateOrder.length > 0 && (
                  <div className="epic-stats-container">
                    <div className="workflow-status-chart-container">
                      <h4>
                        <button
                          onClick={() => toggleChart(epic.id, 'column')}
                          className="chart-toggle-btn"
                          aria-label="Toggle column chart"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'flex-start' }}
                        >
                          <span>{collapsedCharts[`${epic.id}-column`] ? '▼' : '▲'}</span>
                          <span>Ticket Status Breakdown</span>
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
                      <h4 style={{ marginTop: '1rem' }}>
                        <button
                          onClick={() => toggleChart(epic.id, 'workflow-pie')}
                          className="chart-toggle-btn"
                          aria-label="Toggle workflow pie chart"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'flex-start' }}
                        >
                          <span>{collapsedCharts[`${epic.id}-workflow-pie`] ? '▼' : '▲'}</span>
                          <span>Workflow Status Pie Chart</span>
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
                      <h4 style={{ marginTop: '1rem' }}>
                        <button
                          onClick={() => toggleChart(epic.id, 'type-pie')}
                          className="chart-toggle-btn"
                          aria-label="Toggle story type pie chart"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'flex-start' }}
                        >
                          <span>{collapsedCharts[`${epic.id}-type-pie`] ? '▼' : '▲'}</span>
                          <span>Story Type Breakdown</span>
                        </button>
                      </h4>
                      {!collapsedCharts[`${epic.id}-type-pie`] && (
                      <div>
                      {(() => {
                        // Calculate story type counts
                        const typeCounts = {};
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
                            <h4>
                              <button
                                onClick={() => toggleChart(epic.id, 'owners-table')}
                                className="chart-toggle-btn"
                                aria-label="Toggle story owners table"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'flex-start' }}
                              >
                                <span>{collapsedCharts[`${epic.id}-owners-table`] ? '▼' : '▲'}</span>
                                <span>Story Owners</span>
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
                            <h4>
                              <button
                                onClick={() => toggleChart(epic.id, 'team-tickets')}
                                className="chart-toggle-btn"
                                aria-label="Toggle team open tickets table"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'flex-start' }}
                              >
                                <span>{collapsedCharts[`${epic.id}-team-tickets`] ? '▼' : '▲'}</span>
                                <span>Team Open Tickets</span>
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
                    <h4>
                      <button
                        onClick={() => toggleChart(epic.id, 'stories')}
                        className="chart-toggle-btn"
                        aria-label="Toggle stories list"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'flex-start' }}
                      >
                        <span>{collapsedCharts[`${epic.id}-stories`] ? '▼' : '▲'}</span>
                        <span>Stories:</span>
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
      <footer className="App-footer">
        <p>© 2025 | Project D.A.V.E. (Dashboards Are Very Effective) </p>
      </footer>
    </div>
  );
}

export default App;