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

const SHORTCUT_API_TOKEN = process.env.SHORTCUT_API_TOKEN;
const SHORTCUT_API_BASE = 'https://api.app.shortcut.com/api/v3';

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

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});