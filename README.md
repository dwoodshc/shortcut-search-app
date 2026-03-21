# Shortcut Dashboard

**Project D.A.V.E. (Dashboards Are Very Effective)**

A React-based web application for visualizing and managing Shortcut.com epics and their associated stories. Provides a comprehensive at-a-glance summary table, interactive charts, kanban-style workflow visualization, team analytics, and direct integration with Shortcut.

## Features

### Summary Table
- At-a-glance progress overview for all tracked epics at the top of the page
- Three-section chevron progress bar per epic: **Complete** (green) → **In Progress** (yellow) → **Backlog** (white)
  - Complete = "Complete" + "Ready for Release"
  - In Progress = "Ready for Development" + "In Development" + "In Review"
  - Backlog = "Backlog"
- Percentage label shown inside the Complete segment
- Hover tooltip showing counts and percentages for each group, plus a legend explaining the groupings
- Two-column responsive layout (stacks to single column on narrow screens)
- Sortable columns: **Epic Name** (A→Z / Z→A) and **Epic Progress** (% complete)
- Restore icon to return epics to their configured list order
- Epic name links scroll to the epic's detail section on the page
- "↑ Summary Table" link at the bottom of each epic card returns to the summary

### Epic Management
- Epics loaded automatically on page load (no manual search required)
- Loading modal with animated progress bar and **Cancel** button during data fetch
- Epics not found in Shortcut are listed by name below the "Found X of Y Epics" count
- Configure tracked epics via built-in editor with localStorage persistence
- Track team members assigned to each epic
- Sidebar navigation for quick jumping between epics
- Drag-and-drop reordering of epics in the configuration editor
- Collapsible team member sections per epic card
- Export/Import configuration for backup and portability

### Interactive Visualizations

#### 3D Column Chart
- Workflow status breakdown showing story distribution across workflow states
- Visual bars for: Backlog, Ready for Development, In Development, In Review, Ready for Release, Complete
- 3D-styled columns with depth and shading effects
- Story counts displayed on each column

#### Workflow Status Pie Chart
- Visual representation of stories by state with gradient colour scale
- Colour progression: Gray (Backlog) → Light Green → Green → Dark Green (Complete)
- Interactive hover tooltips showing count and percentage
- **Clickable legend items** that link directly to filtered Shortcut epic views

#### Story Type Breakdown Pie Chart
- Distribution of stories by type (Feature, Bug, Chore)
- Colour-coded: Light Green (Feature), Light Yellow (Chore), Light Red (Bug)
- Interactive hover tooltips
- **Clickable legend items** that link to Shortcut backlog filtered by epic and story type

### Analytics Tables

#### Story Owners Table
- Lists all story owners with their ticket counts
- Sorted by count (descending)
- Shows unassigned tickets separately

#### Team Open Tickets Table
- Shows open ticket counts for configured team members
- Excludes completed tickets from the count
- Sorted by workload (descending)
- Highlights team members with zero open tickets
- Partial name matching for flexible configuration

### Kanban Board
- Six-column workflow display: Backlog → Ready for Development → In Development → In Review → Ready for Release → Complete
- Story cards with clickable links to Shortcut
- Story count badges on each column header
- Collapsible Stories section (hidden by default)
- Collapsible Story Type Breakdown chart (hidden by default)
- Expand/Collapse controls for Stories, Story Types, and Charts across all epics

### Header Actions
Three icon buttons in the top-right of the header (all with 0.5s hover tooltips):
- **Refresh** — Reload all epic and story data from Shortcut
- **Edit Epic List** — Open the epic list configuration editor directly
- **Settings** (gear) — Open the settings dropdown menu

### Settings Menu
- **Setup** — Re-run the setup wizard (API token, workspace URL, workflow)
- **Dark Mode / Light Mode** — Toggle dark colour scheme (persisted across sessions)
- **README.md** — View this documentation in-app
- **Export/Import** — Backup and restore configuration as JSON
- **Wipe Settings** — Clear all stored configuration data
- **About** — View application information

### Dark Mode
- Full dark colour scheme toggle via Settings menu
- Covers all UI areas: header, cards, charts, tables, modals, sidebar, inputs
- Preference persisted to localStorage

### Setup & Configuration

#### Initial Setup Wizard
- **4-Step Guided Setup**: Automatically launches on first use or when configuration is incomplete
  - Step 1: Enter Shortcut API token (verified against the API before proceeding)
  - Step 2: Set workspace URL for generating hyperlinks
  - Step 3: Select workflow from all available workflows in your workspace
  - Step 4: Configure epic list with team members
- Visual workflow preview showing all states with colour-coded badges
- Drag-and-drop epic reordering in Step 4
- Settings saved to browser localStorage automatically

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Shortcut.com API token ([Get your token here](https://app.shortcut.com/settings/account/api-tokens))
- Access to a Shortcut workspace

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd shortcut-search-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the app — all configuration is handled through the built-in Setup Wizard on first run.

## Running the Application

### Development Mode (Recommended)
Run both the backend server and React frontend concurrently:
```bash
npm run dev
```

This starts:
- Express proxy server on [http://localhost:3001](http://localhost:3001)
- React app on [http://localhost:3000](http://localhost:3000)

### Individual Components
Backend server only:
```bash
npm run server
```

Frontend only:
```bash
npm start
```

## Project Structure

```
shortcut-search-app/
├── src/
│   ├── App.js          # Main React component
│   ├── App.css         # Application styles (includes dark mode)
│   └── index.js        # React entry point
├── server.js           # Express proxy server (Shortcut API calls)
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

## Configuration Storage

All configuration is stored in **browser localStorage**:

| Key | Contents |
|-----|----------|
| `shortcut_api_token` | Shortcut API token |
| `shortcut_workflow_config` | Workflow ID, name, URL, and states |
| `shortcut_epics_config` | Epic names and team members |
| `shortcut_members_cache` | Owner ID → display name cache (reduces API calls on refresh) |
| `dark_mode` | Dark mode preference (`true`/`false`) |

**Backup & Portability:**
- Use Export/Import in the Settings menu to save your configuration as a JSON file
- Import to restore settings or transfer between browsers

## API Calls

The app makes the following calls to the Express proxy on page load:

| Call | Frequency | Notes |
|------|-----------|-------|
| `GET /api/migrate-data` | Once ever | One-time migration from legacy files |
| `GET /api/search/epics?query=` | 1 per tracked epic | Run in parallel via `Promise.all` |
| `GET /api/epics/:id` | 1 per epic found | Full epic details |
| `GET /api/epics/:id/stories` | 1 per epic found | All non-archived stories |
| `GET /api/users/:id` | 1 per unique owner **not in cache** | Cached to localStorage after first fetch |

For 22 tracked epics: ~66 calls per refresh, with member lookups cached after the first session.

## API Endpoints (Express Proxy)

- `GET /api/readme` — README.md content
- `GET /api/search/epics?query=` — Search epics by name
- `GET /api/epics/:id` — Full epic details
- `GET /api/epics/:id/stories` — Stories for an epic (archived excluded)
- `GET /api/workflows` — All workflows with states
- `GET /api/users/:id` — Member display name

## Technologies Used

- **Frontend**: React 19.2.0 with Hooks (useState, useEffect, useCallback, useRef)
- **Backend**: Express 5.1.0
- **API**: Shortcut API v3
- **Storage**: Browser localStorage
- **HTTP Client**: Axios (server) / fetch (client)
- **Markdown**: marked
- **Styling**: Custom CSS with dark mode support
- **Development**: concurrently

## Usage

### First-Time Setup
1. Run `npm run dev`
2. The Setup Wizard launches automatically
3. Complete the 4 steps: API token → workspace URL → workflow → epic list
4. The dashboard loads automatically once setup is complete

### Daily Use
1. Epics load automatically on page open
2. Review the Summary Table for an at-a-glance progress view
3. Scroll down to individual epic cards for charts, tables, and stories
4. Use the **Refresh** icon (top-right) to reload latest data
5. Use the sidebar to jump between epics
6. Click legend items in pie charts to open filtered views in Shortcut

### Managing Configuration
- **Edit Epic List** header icon — add/remove epics, manage team members, reorder via drag-and-drop
- **Settings → Setup** — change workspace URL or workflow
- **Settings → Export/Import** — backup configuration to JSON or restore from a previous backup
- **Settings → Wipe Settings** — clear all localStorage data to start fresh

## Troubleshooting

### Epic Not Found
- Verify the epic name matches exactly (case-insensitive)
- Names of missing epics are shown in red below the "Found X of Y Epics" count
- Check the epic is not archived or deleted in Shortcut

### API Token Issues
- Re-run Setup (Settings → Setup) to update your token
- Token is verified against the Shortcut API during setup

### Workflow States Not Showing
- Re-run the Setup Wizard to reselect your workflow
- Verify the workflow has states configured in Shortcut

### Stories Not Loading
- Archived stories are automatically excluded
- Verify your API token has permission to access stories

### Configuration Not Persisting
- Ensure browser localStorage is enabled
- Use Export/Import to backup and restore if needed

## Version Information

**Version**: 2.0.0
**Project Name**: D.A.V.E. (Dashboards Are Very Effective)
**Author**: Dave Woods

## License

Private project for internal use.
