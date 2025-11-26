const express = require('express');
const cors = require('cors');
const axios = require('axios');
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

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});