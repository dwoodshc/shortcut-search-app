const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let SHORTCUT_API_TOKEN = process.env.SHORTCUT_API_TOKEN;
const SHORTCUT_API_BASE = 'https://api.app.shortcut.com/api/v3';

// Check if API token is configured
app.get('/api/check-token', async (_req, res) => {
  res.json({ hasToken: !!SHORTCUT_API_TOKEN });
});

// Save API token to .env file
app.post('/api/save-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || !token.trim()) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const envPath = path.join(__dirname, '.env');
    const envContent = `SHORTCUT_API_TOKEN=${token.trim()}\n`;

    await fs.writeFile(envPath, envContent, 'utf-8');
    SHORTCUT_API_TOKEN = token.trim();

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving token:', error.message);
    res.status(500).json({ error: 'Failed to save token' });
  }
});

// Search epics endpoint
app.get('/api/search/epics', async (req, res) => {
  try {

    //req.query = `${req.query} !state:Complete`;

    const { query } = req.query;

    const params = {
      query: query || '',
      page_size: 240
    };

    

    
    const response = await axios.get(`${SHORTCUT_API_BASE}/search/epics`, {
      params: { query },
      headers: {
        'Shortcut-Token': SHORTCUT_API_TOKEN,
        'Content-Type': 'application/json'
      },
      params
    });
    res.json(response.data);

    console.log("Query");
    console.log(query);

    console.log("Req.Query");
    console.log(req.query);



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
    const { id } = req.params;
    const response = await axios.get(`${SHORTCUT_API_BASE}/epics/${id}`, {
      headers: {
        'Shortcut-Token': SHORTCUT_API_TOKEN,
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
    const response = await axios.get(`${SHORTCUT_API_BASE}/workflows`, {
      headers: {
        'Shortcut-Token': SHORTCUT_API_TOKEN,
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
    const { id } = req.params;
    const response = await axios.get(`${SHORTCUT_API_BASE}/members/${id}`, {
      headers: {
        'Shortcut-Token': SHORTCUT_API_TOKEN,
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
    const { id } = req.params;
    const response = await axios.get(`${SHORTCUT_API_BASE}/epics/${id}/stories`, {
      headers: {
        'Shortcut-Token': SHORTCUT_API_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching stories:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Failed to fetch stories'
    });
  }
});

// Get all groups/teams
app.get('/api/teams', async (req, res) => {
  try {
    const response = await axios.get(`${SHORTCUT_API_BASE}/groups`, {
      headers: {
        'Shortcut-Token': SHORTCUT_API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    // Map groups to team objects with name property
    const teams = response.data.map(group => ({ name: group.name }));
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Failed to fetch teams'
    });
  }
});

// Get filtered epic names from epics.txt
app.get('/api/filtered-epics', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'epics.txt');
    const fileContent = await fs.readFile(filePath, 'utf-8');

    // Parse epic names from file (extract first field before comma)
    const epicNames = fileContent
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';

        // Extract text before the first comma
        const commaIndex = trimmed.indexOf(',');
        if (commaIndex === -1) {
          // No comma, treat entire line as epic name
          return trimmed.replace(/^"|"$/g, '');
        }

        // Get text before comma and remove quotes
        return trimmed.substring(0, commaIndex).trim().replace(/^"|"$/g, '');
      })
      .filter(name => name.length > 0);

    res.json(epicNames);
  } catch (error) {
    console.error('Error reading filtered epics:', error.message);
    res.status(500).json({
      error: 'Failed to read filtered epics file'
    });
  }
});

// Get email lists from epics.txt
app.get('/api/epic-emails', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'epics.txt');
    const fileContent = await fs.readFile(filePath, 'utf-8');

    // Parse epic data including emails
    const epicData = {};
    fileContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Extract epic name and email list
      const commaIndex = trimmed.indexOf(',');
      if (commaIndex === -1) return;

      const epicName = trimmed.substring(0, commaIndex).trim().replace(/^"|"$/g, '');
      const emailsPart = trimmed.substring(commaIndex + 1).trim();

      // Extract names from the array format ["Name1; Name2; ..."]
      const match = emailsPart.match(/\["([^"]+)"\]/);
      if (match && match[1]) {
        const names = match[1].split(';').map(e => e.trim()).filter(e => e.length > 0);
        epicData[epicName] = names;
      }
    });

    res.json(epicData);
  } catch (error) {
    console.error('Error reading epic emails:', error.message);
    res.status(500).json({
      error: 'Failed to read epic emails file'
    });
  }
});

// Get raw epics.txt content
app.get('/api/epics-file', async (_req, res) => {
  try {
    const filePath = path.join(__dirname, 'epics.txt');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    res.json({ content: fileContent });
  } catch (error) {
    // If file doesn't exist, return 404
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: 'epics.txt file not found'
      });
    }
    console.error('Error reading epics.txt:', error.message);
    res.status(500).json({
      error: 'Failed to read epics.txt file'
    });
  }
});

// Save epics.txt content
app.post('/api/epics-file', async (req, res) => {
  try {
    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const filePath = path.join(__dirname, 'epics.txt');
    await fs.writeFile(filePath, content, 'utf-8');
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing epics.txt:', error.message);
    res.status(500).json({ error: 'Failed to save epics.txt file' });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});