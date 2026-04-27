const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const SHORTCUT_API_BASE = 'https://api.app.shortcut.com/api/v3';

// Middleware to extract token from Authorization header
function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Search epics endpoint
app.get('/api/search/epics', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const { query } = req.query;
    const params = {
      query: query || '',
      page_size: 25
    };

    const response = await axios.get(`${SHORTCUT_API_BASE}/search/epics`, {
      params,
      headers: {
        'Shortcut-Token': token,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);

  } catch (error) {
    console.error('Error searching epics:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Failed to search epics'
    });
  }
});

// Get epic by ID
app.get('/api/epics/:id', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const { id } = req.params;
    const response = await axios.get(`${SHORTCUT_API_BASE}/epics/${id}`, {
      headers: {
        'Shortcut-Token': token,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching epic:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Failed to fetch epic'
    });
  }
});

// Get workflows with states
app.get('/api/workflows', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const response = await axios.get(`${SHORTCUT_API_BASE}/workflows`, {
      headers: {
        'Shortcut-Token': token,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching workflows:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Failed to fetch workflows'
    });
  }
});

// Get all teams (groups)
app.get('/api/teams', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    const response = await axios.get(`${SHORTCUT_API_BASE}/groups`, {
      headers: { 'Shortcut-Token': token, 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching teams:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: error.response?.data || 'Failed to fetch teams' });
  }
});

// Get all workspace members
app.get('/api/members', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    const response = await axios.get(`${SHORTCUT_API_BASE}/members`, {
      headers: { 'Shortcut-Token': token, 'Content-Type': 'application/json' }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching members:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: error.response?.data || 'Failed to fetch members' });
  }
});

// Get user/member by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const { id } = req.params;
    const response = await axios.get(`${SHORTCUT_API_BASE}/members/${id}`, {
      headers: {
        'Shortcut-Token': token,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching user:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Failed to fetch user'
    });
  }
});

// Get epic workflow (custom epic states)
app.get('/api/epic-workflow', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }
    const response = await axios.get(`${SHORTCUT_API_BASE}/epic-workflow`, {
      headers: {
        'Shortcut-Token': token,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching epic workflow:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Failed to fetch epic workflow'
    });
  }
});

// Get stories for an epic
app.get('/api/epics/:id/stories', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const { id } = req.params;
    const response = await axios.get(`${SHORTCUT_API_BASE}/epics/${id}/stories`, {
      headers: {
        'Shortcut-Token': token,
        'Content-Type': 'application/json'
      }
    });

    // Filter out archived stories
    const nonArchivedStories = response.data.filter(story => !story.archived);

    res.json(nonArchivedStories);
  } catch (error) {
    console.error('Error fetching stories:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Failed to fetch stories'
    });
  }
});

// Migration endpoint - read legacy files for one-time migration to localStorage
app.get('/api/migrate-data', async (_req, res) => {
  try {
    const migrationData = {};

    // Read .env file for API token
    try {
      const envPath = path.join(__dirname, '.env');
      const envContent = await fs.readFile(envPath, 'utf-8');
      const tokenMatch = envContent.match(/SHORTCUT_API_TOKEN=(.+)/);
      if (tokenMatch) {
        migrationData.apiToken = tokenMatch[1].trim();
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error reading .env:', error.message);
      }
    }

    // Read shortcut.yml for workflow config
    try {
      const shortcutPath = path.join(__dirname, 'shortcut.yml');
      const shortcutContent = await fs.readFile(shortcutPath, 'utf-8');
      migrationData.workflowConfig = yaml.load(shortcutContent);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error reading shortcut.yml:', error.message);
      }
    }

    // Read epics.yml for epics config
    try {
      const epicsPath = path.join(__dirname, 'epics.yml');
      const epicsContent = await fs.readFile(epicsPath, 'utf-8');
      migrationData.epicsConfig = yaml.load(epicsContent);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error reading epics.yml:', error.message);
      }
    }

    res.json(migrationData);
  } catch (error) {
    console.error('Error during migration:', error.message);
    res.status(500).json({
      error: 'Failed to read legacy files for migration'
    });
  }
});

// Get README.md content
app.get('/api/readme', async (_req, res) => {
  try {
    const filePath = path.join(__dirname, 'README.md');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    res.json({ content: fileContent });
  } catch (error) {
    // If file doesn't exist, return 404
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: 'README.md file not found'
      });
    }
    console.error('Error reading README.md:', error.message);
    res.status(500).json({
      error: 'Failed to read README.md file'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});