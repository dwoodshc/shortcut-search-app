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
- Loading modal with animated progress bar, **"Loading X of Y Epics"** progress counter, and **Cancel** button during data fetch
- Epics not found in Shortcut are listed by name in red below the "Found X of Y Epics" count
- Configure tracked epics via built-in editor with localStorage persistence
- Export/Import configuration for backup and portability

### Assignment Tables
Two collapsible assignment tables appear above the epic cards, controlled by the **Expand/Collapse Assignments** button. Both start collapsed by default and are split into two side-by-side sub-tables for wide-screen readability.

#### Epic Owner Assignment
- Lists each tracked epic alongside its assigned team members (filtered to the selected team)
- Rows with no team members are highlighted in yellow
- Team members shown as a bulleted list per epic

#### Team Member Assignment
- Inverted view: lists each team member alongside the epics they are assigned to
- Shows epic count per member, e.g. `Alice (3)`
- Epics shown as a bulleted list per member

#### Ignored Users Display
- The **Show/Hide Ignored Users** button (beside "Expand Assignments") toggles visibility of users in the ignore list across both assignment tables and the Team Open Tickets table
- When shown, ignored users are rendered as a **gray pill** to distinguish them from active users
- Hidden by default (ignored users are filtered out)

### Interactive Visualizations

Per epic, three visualizations are available. Each has a **▶/▼ toggle** in its heading. The **Collapse/Expand Charts** button controls the Workflow Status Pie Chart and Story Type Breakdown across all epics simultaneously.

#### Ticket Status Breakdown (3D Column Chart)
- Workflow status breakdown showing story distribution across workflow states
- Visual bars for: Backlog, Ready for Development, In Development, In Review, Ready for Release, Complete
- 3D-styled columns with depth and shading effects
- Story counts displayed on each column
- Always visible (no collapse toggle)

#### Workflow Status Pie Chart
- Visual representation of stories by workflow state with gradient colour scale
- Colour progression: Gray (Backlog) → Light Green → Green → Dark Green (Complete)
- Interactive hover tooltips showing count and percentage
- **Clickable legend items** that link directly to filtered Shortcut epic views
- Starts **collapsed** by default

#### Story Type Breakdown Pie Chart
- Distribution of stories by type (Feature, Bug, Chore)
- Colour-coded: Light Green (Feature), Light Yellow (Chore), Light Red (Bug)
- Interactive hover tooltips
- **Clickable legend items** that link to Shortcut backlog filtered by epic and story type
- Starts **collapsed** by default

### Analytics Tables

#### Story Owners Table
- Lists all story owners with their ticket counts per epic
- Sorted by count (descending)
- Shows unassigned tickets separately

#### Team Open Tickets Table
- Shows open ticket counts for configured team members within the epic
- Excludes completed tickets from the count
- Sorted by workload (descending)
- Highlights team members with zero open tickets
- Ignored users are filtered out by default (toggle via **Show/Hide Ignored Users** button)

### User Story Board
- Six-column kanban display: Backlog → Ready for Development → In Development → In Review → Ready for Release → Complete
- Story cards with clickable links to Shortcut
- Story count badges on each column header
- **▶/▼ toggle** in the "User Story Board" heading — starts **collapsed** by default

### Header Actions
Three icon buttons in the top-right of the header (all with 0.5s hover tooltips):
- **Refresh** — Reload all epic and story data from Shortcut
- **Edit Epic List** — Open the epic list configuration editor directly (wizard step 6)
- **Settings** (gear) — Open the settings dropdown menu

### Toolbar Controls
Displayed below the "Found X of Y Epics" count:
- **Expand Assignments / Collapse Assignments** — Toggle both assignment tables
- **Show Ignored Users / Hide Ignored Users** — Toggle visibility of ignored users across assignment tables and Team Open Tickets
- **Expand Charts / Collapse Charts** — Toggle the Workflow Status Pie Chart and Story Type Breakdown across all epics

### Settings Menu
- **Setup** — Re-run the setup wizard
- **README.md** — View this documentation in-app
- **Export/Import** — Backup and restore configuration as JSON
- **Wipe Settings** — Clear all localStorage data to start fresh
- **About** — View application information

### Setup & Configuration

#### Initial Setup Wizard
Automatically launches on first use or when configuration is incomplete. **6 steps:**

| Step | Description |
|------|-------------|
| 1 | Enter Shortcut API token (verified against the API before proceeding) |
| 2 | Set workspace URL for generating Shortcut hyperlinks |
| 3 | Select workflow from all available workflows in your workspace |
| 4 | Select a Shortcut team to filter assignment and ticket tables |
| 5 | Enter usernames to **ignore** in assignment and ticket tables (one per line) |
| 6 | Enter the list of epic names to track (one per line) |

- Visual workflow preview showing all states with colour-coded badges
- Settings saved to browser localStorage automatically
- On completion, epics are loaded automatically

---

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
│   ├── App.css         # Application styles
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
| `shortcut_epics_config` | Tracked epic names |
| `shortcut_team_config` | Selected Shortcut team ID and name |
| `shortcut_ignored_users` | List of usernames to exclude from tables |
| `shortcut_members_cache` | Owner ID → display name cache |
| `shortcut_team_members_cache` | Team member IDs (keyed by team ID, auto-invalidates on team change) |
| `shortcut_epic_workflow_cache` | Epic workflow states cache |

**Backup & Portability:**
- Use Export/Import in the Settings menu to save your configuration as a JSON file
- Import to restore settings or transfer between browsers
- Exported data includes: API token, workflow config, epic list, team config, and ignored users

## API Calls

The app makes the following calls to the Express proxy on page load:

| Call | Frequency | Notes |
|------|-----------|-------|
| `GET /api/teams` | Once (cached) | Fetch team member IDs for selected team |
| `GET /api/epic-workflow` | Once (cached) | Fetch epic workflow states |
| `GET /api/search/epics?query=` | 1 per tracked epic | Run in parallel via `Promise.all` |
| `GET /api/epics/:id` | 1 per epic found | Full epic details |
| `GET /api/epics/:id/stories` | 1 per epic found | All non-archived stories |
| `GET /api/users/:id` | 1 per unique owner **not in cache** | Cached to localStorage after first fetch |

Phase 1 calls (team members and epic workflow) are cached to localStorage and skipped on subsequent loads unless the selected team changes.

## API Endpoints (Express Proxy)

- `GET /api/readme` — README.md content
- `GET /api/search/epics?query=` — Search epics by name
- `GET /api/epics/:id` — Full epic details
- `GET /api/epics/:id/stories` — Stories for an epic (archived excluded)
- `GET /api/workflows` — All workflows with states
- `GET /api/epic-workflow` — Epic workflow states
- `GET /api/teams` — All Shortcut teams (groups)
- `GET /api/users/:id` — Member display name

## Technologies Used

- **Frontend**: React 19.2.0 with Hooks (useState, useEffect, useCallback, useRef)
- **Backend**: Express 5.1.0
- **API**: Shortcut API v3
- **Storage**: Browser localStorage
- **HTTP Client**: Axios (server) / fetch (client)
- **Markdown**: marked
- **Styling**: Custom CSS
- **Development**: concurrently

## Usage

### First-Time Setup
1. Run `npm run dev`
2. The Setup Wizard launches automatically
3. Complete all 6 steps: API token → workspace URL → workflow → select team → ignore users → epic list
4. The dashboard loads automatically once setup is complete

### Daily Use
1. Epics load automatically on page open
2. Review the Summary Table for an at-a-glance progress view
3. Scroll down to individual epic cards for charts, tables, and stories
4. Use the **Refresh** icon (top-right) to reload latest data
5. Use the sidebar to jump between epics
6. Click legend items in pie charts to open filtered views in Shortcut

### Managing Configuration
- **Edit Epic List** header icon — open the epic list editor (wizard step 6)
- **Settings → Setup** — re-run the full setup wizard to change token, URL, workflow, team, or ignored users
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

---

## Version Information

**Version**: 3.0.0
**Project Name**: D.A.V.E. (Dashboards Are Very Effective)
**Author**: Dave Woods

## License

Private project for internal use.
