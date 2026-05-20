# Shortcut Dashboard

**Project D.A.V.E. (Dashboards Are Very Effective)**

A React-based web application for visualizing and managing Shortcut.com epics and their associated stories. Provides a comprehensive at-a-glance summary table, interactive charts, kanban-style workflow visualization, team analytics, unwatched ticket tracking, and direct integration with Shortcut.

## Features

### Summary Tables
Two tables appear at the top of the dashboard, above the epic cards.

#### Story Summary
- Overall story counts across **all tracked epics** broken down by workflow state (Backlog → Complete)
- Clickable state counts open a filtered story detail modal
- Total count and an overall progress bar in the final columns

#### Epic Status Table
- At-a-glance progress overview for all tracked epics
- Three-section chevron progress bar per epic: **Complete** (green) → **In Progress** (yellow) → **Backlog** (white)
  - Complete = "Complete"
  - In Progress = "Ready for Development" + "In Development" + "In Review"
  - Backlog = "Backlog"
- Percentage label shown inside the Complete segment
- Hover tooltip showing a per-state breakdown with count and percentage for each state
- Two-column responsive layout (stacks to single column on narrow screens)
- Sortable columns: **Epic Name** (A→Z / Z→A), **Epic Status**, **Last Changed**, and **Epic Progress** (% complete)
- **Last Changed** column — days since any story was last updated (respects the active team filter); clicking the value opens a popover listing the 5 most recently changed stories with columns: Ticket, Owner, Status, Changed
- Restore icon to return epics to their configured list order
- Epic name links scroll to the epic's detail section on the page
- Three peek toggles (**Filter Objectives**, **Show/Hide Blocked**, **Hide/Show Done**) and a **Filter Epics** input sit on the "Epic Status" heading row; the input is always visible and filters the table in real time; the peek toggles use a strikethrough label when the corresponding filter UI is hidden, and turn red/green when actively filtering
- **Objectives filter** — checkbox row above the table (prefixed with **OBJECTIVES:**); one checkbox per Shortcut Objective associated with the loaded epics; filters the table to matching epics; includes a **Filter objectives…** text input that narrows the displayed checkboxes and auto-deselects non-matching objectives; **Select All** / **Clear All** controls; active filter details shown in the result count row
- **Show Blocked toggle** — block-circle button on the heading row; when active, only epics in the **Blocked** state are shown; turns red when active. Mutually exclusive with **Hide Done** — enabling one disables the other
- **Done epics toggle** — check-circle button on the heading row; label toggles between **Hide Done** and **Show Done** depending on state; turns green when Done epics are currently hidden. Mutually exclusive with **Show Blocked**
- When any filter is active (search, objectives, Hide Done, or Show Blocked), the table collapses to a single-column view with a light-blue status row at the bottom summarising the active filters and the resulting count. The status row includes a **✕ Clear all filters** link that resets every filter at once
- All filters apply **globally** — when active, the same epics are hidden from the Epic Cards, Assignment Tables, and Unwatched Tickets, and the Story Summary counts are recalculated from the visible epics only

### Epic Management
- Epics loaded automatically on page load (no manual search required)
- Loading modal with rotating egg-timer animation, animated progress bar, **"Loading X of Y Epics"** progress counter, and **Cancel** button during data fetch
- Epics not found in Shortcut are listed by name in red below the "Found X of Y Epics" count
- Configure tracked epics via built-in editor with localStorage persistence
- Export/Import configuration for backup and portability

### Unwatched Tickets
When your Shortcut name is configured (Setup Wizard step 5), a table appears after the "Found X of Y Epics" line listing any **open tickets in your selected teams that you are not watching**:
- Covers both stories and epics from the currently loaded data
- Columns: **Ticket ID** (linked to Shortcut or the in-page epic section), **Type** (colour-coded pill: Epic / Feature / Bug / Chore), **Description**
- Footer shows the total unwatched count
- Returns nothing if you are watching all open tickets

### Assignment Tables
Three assignment tables appear above the epic cards, each split into two side-by-side sub-tables for wide-screen readability. Visibility is controlled by an **"Assignments Views:"** peek-icon row at the top of the section — one peek icon per table (Epic Owner / Team Member Epic / Team Member Ticket Assignments). All three tables are **hidden by default**; click a peek icon to reveal a table (the change applies globally to the dashboard).

#### Epic Owner Assignments
- Lists each tracked epic alongside its assigned team members (filtered to the selected team)
- Rows with no team members are highlighted in yellow
- Team members shown as a bulleted list per epic
- Sortable by epic name or team member count; restore icon returns original order

#### Team Member Epic Assignments
- Inverted view: lists each team member alongside the epics they are assigned to
- Dedicated **Count** column (sortable) showing the number of epics per member
- Epics shown as a list per member

#### Team Member Ticket Assignments
- Lists all open (non-complete) tickets assigned to each team member
- Dedicated **Count** column (sortable) showing the number of open tickets per member
- Tickets grouped under their epic heading (linked to Shortcut), with a ticket count per epic
- Each ticket name is a direct link to Shortcut, followed by a coloured workflow-state pill

### Epic Card

Each tracked epic renders as a card with a collapsible body.

- **Collapse/Expand** — Click the **▶/▼** chevron beside the epic name to toggle the card body. Epics in the "Done" state start collapsed by default.
- **Meta area** — Shows the epic's Objective(s), Owner(s), story count, and status as styled pills below the title.
- **Objectives** — Displayed before Owners when one or more Shortcut Objectives are linked to the epic.
- **Meta field peek icons** — When Objective, Owners, or Story Count are hidden, a small icon (target / person / hash) appears in their place; click to reveal the field globally, or click the field itself to hide it again.
- **"Additional Views:" peek row** — Sits just under the epic title; a labelled row of peek icons toggles the per-card sections (Ticket Status Breakdown, Story Owners, Team Open Tickets, Workflow Status Pie Chart, Story Type Breakdown, Pull Requests, User Story Board). Toggles apply globally to every epic card. Strikethrough label = currently hidden.

### Interactive Visualizations

Per epic, three visualizations are available. Visibility is controlled by the "Additional Views:" peek row at the top of each card (toggles apply globally to every card).

#### Ticket Status Breakdown (Column Chart)
- Workflow status breakdown showing story distribution across workflow states
- Visual bars for: Backlog, Ready for Development, In Development, In Review, Complete
- Story counts displayed above each column
- Clicking any bar (including **Complete**) opens a scrollable popover listing all tickets in that state (name link, owner, age); click the same bar or outside to dismiss
- Visible by default; toggle via the BarChart peek icon

#### Workflow Status Pie Chart
- Visual representation of stories by workflow state with gradient colour scale
- Colour progression: Gray (Backlog) → Light Green → Green → Dark Green (Complete)
- Interactive hover tooltips showing count and percentage
- **Clickable legend items** that link directly to filtered Shortcut epic views
- Visible by default; toggle via the Pie peek icon

#### Story Type Breakdown Pie Chart
- Distribution of stories by type (Feature, Bug, Chore)
- Colour-coded: Light Green (Feature), Light Yellow (Chore), Light Red (Bug)
- Interactive hover tooltips
- **Clickable legend items** that link to Shortcut backlog filtered by epic and story type
- Visible by default; toggle via the Chart peek icon

### Analytics Tables

#### Story Owners Table
- Lists all story owners with their ticket counts per epic
- Sortable headers: **Owner** (A→Z / Z→A) and **Count** (low→high / high→low); defaults to Count desc
- Shows unassigned tickets separately

#### Team Open Tickets Table
- Shows open ticket counts for configured team members within the epic
- Header label reflects the active filter state — matches the header subtitle (e.g. **Team Open Tickets — Engineering & Design** or **Team Open Tickets — All Teams**)
- Sortable headers: **Owner** (A→Z / Z→A) and **Count** (low→high / high→low); defaults to Count desc
- Excludes completed tickets from the count
- Highlights team members with zero open tickets

### Pull Requests
- Per-epic table linking each story to its associated GitHub Pull Requests
- Columns: **Ticket** (story name → Shortcut) and **Pull Requests** (`#<number>` links with merged ✓ / closed ✕ / draft markers)
- Sortable headers: **Ticket** (A→Z / Z→A) and **Pull Requests** (numeric, by PR count)
- Footer row in light blue showing **Ticket Count** and **Pull Request Count** for the epic
- Visible by default; toggle via the Pull Request peek icon
- PR data is fetched lazily on first display via `GET /api/stories/:id` (one call per story); results are cached on the card and the load is reflected in the **API calls** footer counter

### User Story Board
- Five-column kanban display: Backlog → Ready for Development → In Development → In Review → Complete
- Story cards with clickable links to Shortcut
- Story count badges on each column header
- Visible by default; toggle via the Kanban peek icon

### Header Actions
Three icon buttons in the top-right of the header (all with hover tooltips):
- **Refresh** — Reload all epic and story data from Shortcut
- **Edit Epic List** — Open the epic list configuration editor directly (wizard step 6)
- **Settings** (gear) — Open the settings dropdown menu

### Toolbar Controls
Displayed in the header when epics are loaded:
- **Show [Team Names] Only / Show All Teams** — Toggle filtering tickets to only the selected teams (shown when one or more teams are configured). The button label and header subtitle both reflect the currently selected team names (e.g. **Show Engineering & Design Only**)

### Load Stats Bar
Appears below all content after a successful data load. Shows five stats in a light-gray bar:
- **Load time** — total time from search start to data ready
- **API calls** — total count; **clicking the number** opens a modal showing each endpoint called and its call count, sorted by most-called first, with a total row
- **Generated** — timestamp of when the load completed
- **Page size** — current DOM size in KB
- **Download page** — saves the current rendered page as a standalone HTML file

### Settings Menu
- **Setup Wizard** — Re-run the setup wizard
- **README.md** — View this documentation in-app
- **View Settings** — Toggle visibility of the per-card "↑ Top of Page" link; preferences saved to localStorage. (Most other visibility toggles are now exposed directly as peek icons on the Epic Status header, the per-card "Additional Views:" row, and the "Assignments Views:" row.)
- **Theme** — Open the Theme Selector to choose a display theme (see below); preference is saved to localStorage
- **Export/Import** — Backup and restore configuration as JSON
- **Wipe Settings** — Clear all localStorage data to start fresh
- **About** — View application information

### Theme Selector
Four themes are available, each with a live mini-preview in the selector modal:

| Theme | Description |
|-------|-------------|
| **Normal** | Default light theme — white background, blue/purple accents |
| **Dark Mode** | Dark theme with an animated silver ocean-tide particle canvas overlay |
| **Star Trek** | LCARS-inspired — black background, orange (`#FF9900`) accents, Antonio font, uppercase labels, left-spine table frames with inner concave elbows |
| **Matrix** | Digital rain — black background, bright green (`#00FF41`) palette, Courier New font, animated falling-character canvas overlay |

The selected theme is stored in `shortcut_display_mode` and restored on next load.

### Setup & Configuration

#### Initial Setup Wizard
Automatically launches on first use or when configuration is incomplete. **6 steps:**

| Step | Description |
|------|-------------|
| 1 | Enter Shortcut API token (verified against the API before proceeding) |
| 2 | Set workspace URL for generating Shortcut hyperlinks |
| 3 | Select workflow from all available workflows in your workspace |
| 4 | Select one or more Shortcut teams to filter assignment and ticket tables (click to toggle each team; multiple selections supported) |
| 5 | Enter your name **exactly as it appears in Shortcut** (optional — enables the Unwatched Tickets table) |
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
│   ├── App.tsx                       # Root component — orchestration, context assembly, render
│   ├── App.css                       # Application styles; theme-specific sections at the bottom
│   ├── index.tsx                     # React entry point
│   ├── types.ts                      # Shared TypeScript interfaces (Epic, Story, WorkflowConfig, …)
│   ├── utils.ts                      # Storage abstraction, API base URL, SVG utilities
│   ├── components/
│   │   ├── AppHeader.tsx             # Sticky header: logo, icon buttons, action toolbar
│   │   ├── AppFooter.tsx             # Static footer with version (sourced from package.json)
│   │   ├── EpicCard.tsx              # Per-epic card: charts, tables, story board
│   │   ├── SummaryTable.tsx          # Story totals summary + epic status table
│   │   ├── AssignmentTables.tsx      # Epic owner and team member assignment tables
│   │   ├── UnwatchedTickets.tsx      # Open tickets in selected teams the user is not watching
│   │   ├── StoryDetailModal.tsx      # Modal listing stories filtered by workflow state
│   │   ├── SetupWizard.tsx           # 6-step guided setup wizard
│   │   ├── ThemeSelector.tsx         # Theme picker modal with live mini-previews
│   │   ├── MatrixRain.tsx            # Animated canvas digital-rain overlay (Matrix theme)
│   │   ├── OceanTide.tsx             # Animated canvas silver-particle overlay (Dark theme)
│   │   └── ErrorBoundary.tsx         # Top-level render error fallback
│   ├── hooks/
│   │   ├── useEpicsData.ts           # Shortcut API calls, caching, member resolution
│   │   ├── useWorkflowConfig.ts      # Workflow state, URL, epic names, state ID derivation
│   │   ├── useModals.ts              # Modal state, ESC/click-outside handlers, README
│   │   ├── useFilters.ts             # Filters, sort, chart collapse, display stories
│   │   └── useConfigIO.ts            # Configuration export and import logic
│   └── context/
│       └── DashboardContext.tsx      # Shared dashboard state + useDashboard() hook
├── tsconfig.json                     # TypeScript config (strict, es2015, react-jsx)
├── server.js                         # Express proxy server (Shortcut API calls)
├── package.json                      # Dependencies, scripts, and app version
├── CLAUDE.md                         # Architecture reference for Claude Code
└── README.md                         # This file
```

## Configuration Storage

All configuration is stored in **browser localStorage**:

| Key | Contents |
|-----|---------|
| `shortcut_api_token` | Shortcut API token |
| `shortcut_workflow_config` | Workflow ID, name, URL, and states |
| `shortcut_epics_config` | Tracked epic names |
| `shortcut_team_config` | Array of selected Shortcut teams (each with ID and name) |
| `shortcut_my_name` | Your Shortcut display name (optional; used by Unwatched Tickets) |
| `shortcut_members_cache` | Owner ID → display name cache |
| `shortcut_team_members_cache` | Team member IDs keyed by team ID; cached per team, populated on demand |
| `shortcut_epic_workflow_cache` | Epic workflow states cache |
| `shortcut_display_mode` | Display theme preference (`normal`, `dark`, `star-trek`, or `matrix`) |
| `shortcut_view_settings` | View Settings preferences (which card fields and table filters to display) |
| `migration_completed` | One-time migration flag (legacy server-side config → localStorage) |

**Backup & Portability:**
- Use Export/Import in the Settings menu to save your configuration as a JSON file
- Import to restore settings or transfer between browsers
- Exported data includes: API token, workflow config, epic list, and team config

## API Calls

The app makes the following calls to the Express proxy on page load:

| Call | Frequency | Notes |
|------|-----------|-------|
| `GET /api/teams` | Every load | Build complete team name map; member IDs cached per team ID |
| `GET /api/objectives` | Every load | Fetch all Shortcut Objectives for the epic Objectives filter |
| `GET /api/epic-workflow` | Once (cached) | Fetch epic workflow states |
| `GET /api/search/epics?query=` | 1 per tracked epic | Run in parallel via `Promise.all` |
| `GET /api/epics/:id` | 1 per epic found | Full epic details |
| `GET /api/epics/:id/stories` | 1 per epic found | All non-archived stories |
| `GET /api/stories/:id` | 1 per story per epic, on demand | Triggered on first expand of an epic's **Pull Requests** section; supplies `pull_requests` field |
| `GET /api/users/:id` | 1 per unique owner **not in cache** | Cached to localStorage after first fetch |
| `GET /api/members` | Once (on demand) | Fetched only if your name is configured and not already in the members cache; used to resolve your member UUID for unwatched ticket detection |

Epic workflow states are cached to localStorage and skipped on subsequent loads. The `/api/teams` call runs on every load to keep team names current; team member IDs are still cached per team ID, so no extra work is done for previously fetched teams.

## API Endpoints (Express Proxy)

- `GET /api/readme` — README.md content
- `GET /api/search/epics?query=` — Search epics by name
- `GET /api/epics/:id` — Full epic details
- `GET /api/epics/:id/stories` — Stories for an epic (archived excluded)
- `GET /api/stories/:id` — Full story (includes top-level `pull_requests` array)
- `GET /api/workflows` — All workflows with states
- `GET /api/epic-workflow` — Epic workflow states
- `GET /api/teams` — All Shortcut teams (groups)
- `GET /api/objectives` — All Shortcut Objectives
- `GET /api/members` — All workspace members
- `GET /api/users/:id` — Member display name
- `GET /api/migrate-data` — One-time migration of legacy server-side config to localStorage

## Technologies Used

- **Frontend**: React 19.2.1 with Hooks (useState, useEffect, useCallback, useMemo, useRef, useContext)
- **Language**: TypeScript (strict mode) — all source files are `.ts` / `.tsx`
- **State management**: React Context API with a custom `useDashboard()` hook and five domain-specific custom hooks
- **Backend**: Express 5.2.1
- **API**: Shortcut API v3
- **Storage**: Browser localStorage
- **HTTP client**: fetch (client) / Axios (server)
- **Markdown rendering**: marked + DOMPurify
- **Styling**: Tailwind CSS 3 with custom brand colours; App.css for pseudo-elements, keyframes, and theme-specific rules
- **Development**: concurrently

## Usage

### First-Time Setup
1. Run `npm run dev`
2. The Setup Wizard launches automatically
3. Complete all 6 steps: API token → workspace URL → workflow → select teams → your name → epic list
4. The dashboard loads automatically once setup is complete

### Daily Use
1. Epics load automatically on page open
2. Check the **Unwatched Tickets** table (if your name is configured) for any open tickets you're not following
3. Review the Summary Tables for an at-a-glance progress view
4. Scroll down to individual epic cards for charts, tables, and stories
5. Use the **Refresh** icon (top-right) to reload latest data
6. Click legend items in pie charts to open filtered views in Shortcut

### Managing Configuration
- **Edit Epic List** header icon — open the epic list editor (wizard step 6)
- **Settings → Setup Wizard** — re-run the full setup wizard to change token, URL, workflow, teams, or your name
- **Settings → Export/Import** — backup configuration to JSON or restore from a previous backup
- **Settings → Wipe Settings** — clear all localStorage data to start fresh

## Troubleshooting

### Epic Not Found
- Verify the epic name matches exactly (case-insensitive)
- Names of missing epics are shown in red below the "Found X of Y Epics" count
- Check the epic is not archived or deleted in Shortcut

### API Token Issues
- Re-run Setup (Settings → Setup Wizard) to update your token
- Token is verified against the Shortcut API during setup

### Workflow States Not Showing
- Re-run the Setup Wizard to reselect your workflow
- Verify the workflow has states configured in Shortcut

### Stories Not Loading
- Archived stories are automatically excluded
- Verify your API token has permission to access stories

### Unwatched Tickets Not Appearing
- Ensure your name is set in wizard step 5 (Settings → Setup Wizard)
- Your name must match your Shortcut display name exactly (case-insensitive)
- The table only appears when there are open tickets in your selected teams that you are not watching

### Configuration Not Persisting
- Ensure browser localStorage is enabled
- Use Export/Import to backup and restore if needed

---

## Version Information

**Version**: 5.1.0
**Project Name**: D.A.V.E. (Dashboards Are Very Effective)
**Author**: Dave Woods

## License

Private project for internal use.
