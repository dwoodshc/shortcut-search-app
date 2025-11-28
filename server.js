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

// Get filtered epic names from epics.yml
app.get('/api/filtered-epics', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'epics.yml');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = yaml.load(fileContent);

    // Extract epic names from YAML
    const epicNames = data.epics.map(epic => epic.name);

    res.json(epicNames);
  } catch (error) {
    console.error('Error reading filtered epics:', error.message);
    res.status(500).json({
      error: 'Failed to read filtered epics file'
    });
  }
});

// Get team lists from epics.yml
app.get('/api/epic-emails', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'epics.yml');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = yaml.load(fileContent);

    // Create a map of epic names to team members
    const epicData = {};
    data.epics.forEach(epic => {
      epicData[epic.name] = epic.team;
    });

    res.json(epicData);
  } catch (error) {
    console.error('Error reading epic emails:', error.message);
    res.status(500).json({
      error: 'Failed to read epic emails file'
    });
  }
});

// Get raw epics.yml content
app.get('/api/epics-file', async (_req, res) => {
  try {
    const filePath = path.join(__dirname, 'epics.yml');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    res.json({ content: fileContent });
  } catch (error) {
    // If file doesn't exist, return 404
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: 'epics.yml file not found'
      });
    }
    console.error('Error reading epics.yml:', error.message);
    res.status(500).json({
      error: 'Failed to read epics.yml file'
    });
  }
});

// Save epics.yml content
app.post('/api/epics-file', async (req, res) => {
  try {
    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Validate YAML format
    try {
      yaml.load(content);
    } catch (yamlError) {
      return res.status(400).json({ error: `Invalid YAML format: ${yamlError.message}` });
    }

    const filePath = path.join(__dirname, 'epics.yml');
    await fs.writeFile(filePath, content, 'utf-8');
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing epics.yml:', error.message);
    res.status(500).json({ error: 'Failed to save epics.yml file' });
  }
});

// Get shortcut.yml content
app.get('/api/state-ids-file', async (_req, res) => {
  try {
    const filePath = path.join(__dirname, 'shortcut.yml');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = yaml.load(fileContent);
    res.json(data);
  } catch (error) {
    // If file doesn't exist, return null
    if (error.code === 'ENOENT') {
      return res.json(null);
    }
    console.error('Error reading shortcut.yml:', error.message);
    res.status(500).json({
      error: 'Failed to read shortcut.yml file'
    });
  }
});

// Save shortcut.yml content
app.post('/api/state-ids-file', async (req, res) => {
  try {
    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Validate YAML format
    try {
      yaml.load(content);
    } catch (yamlError) {
      return res.status(400).json({ error: `Invalid YAML format: ${yamlError.message}` });
    }

    const filePath = path.join(__dirname, 'shortcut.yml');
    await fs.writeFile(filePath, content, 'utf-8');
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing shortcut.yml:', error.message);
    res.status(500).json({ error: 'Failed to save shortcut.yml file' });
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