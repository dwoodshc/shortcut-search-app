# Shortcut Viewer

**Project D.A.V.E. (Dashboards Are Very Effective)**

A React-based web application for visualizing and managing Shortcut.com epics and their associated stories. This tool provides comprehensive dashboards with interactive charts, kanban-style workflow visualization, team analytics, and direct integration with Shortcut.

## Features

### Epic Management
- Search and display multiple epics from your Shortcut workspace
- Configure tracked epics via built-in editor with localStorage persistence
- Track team members assigned to each epic
- Sidebar navigation for quick jumping between epics
- Drag-and-drop reordering of epics in the configuration editor
- Collapsible team member sections for cleaner interface
- Export/Import configuration for backup and portability

### Interactive Visualizations

#### 3D Column Chart
- Workflow status breakdown showing story distribution across workflow states
- Visual bars for: Backlog, Ready for Development, In Development, In Review, Ready for Release, Complete
- 3D-styled columns with depth and shading effects
- Story counts displayed on each column

#### Workflow Status Pie Chart
- Visual representation of stories by state with gradient color scale
- Color progression: Gray (Backlog) → Light Green → Green → Dark Green (Complete)
- Interactive hover tooltips showing count and percentage
- **Clickable legend items** that link directly to filtered Shortcut epic views
- Each status links to the epic filtered by that specific workflow state

#### Story Type Breakdown Pie Chart
- Distribution of stories by type (Feature, Bug, Chore)
- Color-coded: Light Green (Feature), Light Yellow (Chore), Light Red (Bug)
- Interactive hover tooltips
- **Clickable legend items** that link to Shortcut backlog filtered by epic and story type

### Analytics Tables

#### Story Owners Table
- Lists all story owners with their ticket counts
- Sorted by count (descending)
- Shows unassigned tickets separately
- Includes note about multiple ownership

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
- Collapsible sections (can hide/show all stories at once)
- Compact view showing story titles with truncated descriptions

### Setup & Configuration

#### Initial Setup Wizard
- **4-Step Guided Setup**: Automatically launches on first use or when configuration is incomplete
  - Step 1: Enter Shortcut API token
  - Step 2: Set workspace URL for generating hyperlinks
  - Step 3: Select workflow from all available workflows in your workspace
  - Step 4: Configure epic list with team members (collapsible by default)
- Visual workflow preview showing all states with color-coded badges
- Selected workflow highlighted with visual feedback
- Drag-and-drop epic reordering in Step 4
- Settings saved to browser localStorage for persistence

#### Settings Menu
- Access via gear icon in header
- **Edit Epic List**: Manage tracked epics and team members with drag-and-drop reordering
- **Edit API Token**: Update your Shortcut API token
- **Setup Shortcut**: Change workspace URL or workflow
- **Export/Import**: Backup and restore your configuration as JSON files
- **Wipe Settings**: Clear all stored configuration data
- **View README.md**: Access documentation
- **About**: View application information and features

### Navigation Features
- **Sidebar Navigation**: Quick jump to any epic with slide-out panel
- **"Top" Button**: Scroll to top of page
- **Expand/Collapse Controls**: Toggle all charts or all stories sections
- **Collapsible Sections**: Individual collapse controls for each chart type

### UI/UX Enhancements
- Responsive design with mobile support
- Smooth animations and transitions
- Interactive hover effects on clickable elements
- Visual feedback for loading states
- Error handling with user-friendly messages
- Settings persist across sessions

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

3. Configuration:
   - All configuration is stored in browser localStorage (client-side)
   - Settings are managed through the app's built-in interface
   - No manual file editing is required
   - Use Export/Import feature for backup and portability

## Running the Application

### Development Mode (Recommended)
Run both the backend server and React frontend concurrently:
```bash
npm run dev
```

This will start:
- Express server on [http://localhost:3001](http://localhost:3001)
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
│   ├── App.js          # Main React component with localStorage integration
│   ├── App.css         # Application styles
│   └── index.js        # React entry point
├── server.js           # Express proxy server (handles Shortcut API calls)
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

## Configuration Storage

All configuration is stored in **browser localStorage** (client-side) for security and portability:

- **API Token**: Stored in localStorage key `shortcut_api_token`
- **Workflow Configuration**: Stored in localStorage key `shortcut_workflow_config` (includes workflow ID, name, URL, and states)
- **Epics Configuration**: Stored in localStorage key `shortcut_epics_config` (includes epic names and team members)

**Backup & Portability:**
- Use the Export/Import feature in the Settings menu to backup your configuration
- Exported files are in JSON format with date stamps
- Import previously exported files to restore settings or transfer between browsers

## API Endpoints

The Express server provides these proxy endpoints (all Shortcut API calls require `Authorization: Bearer <token>` header):

### Utility Endpoints
- `GET /api/readme` - Get README.md content (no auth required)

### Shortcut API Proxies (Require Authorization Header)
- `GET /api/search/epics?query=` - Search for epics
- `GET /api/epics/:id` - Get full epic details
- `GET /api/epics/:id/stories` - Get stories for an epic (excluding archived)
- `GET /api/workflows` - Get all workflows with states
- `GET /api/users/:id` - Get user/member details

**Note:** All configuration is now managed through browser localStorage. The app no longer uses server-side file storage.

## Technologies Used

- **Frontend**: React 19.2.0 with Hooks (useState, useEffect, useCallback)
- **Backend**: Express 5.1.0
- **API**: Shortcut API v3
- **Storage**: Browser localStorage for configuration persistence
- **HTTP Client**: Axios for API requests
- **Markdown**: marked for rendering README in-app
- **Styling**: Custom CSS with modern design patterns
- **Development**: concurrently for running multiple processes

## Color Scheme

### Primary Colors
- **Primary Purple**: #494BCB (Shortcut brand, buttons, links)
- **Dark Navy**: #03045E (headers, dark elements)
- **Accent Yellow**: #FFDE87 (highlights, Slice logo)

### Workflow Status Colors (Gradient)
- **Backlog**: #d1d5db (Light Gray)
- **Ready for Development**: #a7f3d0 (Very Light Green)
- **In Development**: #6ee7b7 (Light Green)
- **In Review**: #4ade80 (Medium Green)
- **Ready for Release**: #22c55e (Green)
- **Complete**: #16a34a (Dark Green)

### Story Type Colors
- **Feature**: #86efac (Light Green)
- **Chore**: #fef08a (Light Yellow)
- **Bug**: #fca5a5 (Light Red)

### UI Colors
- **Background**: #f8fafc (Light Gray)
- **Borders**: #e2e8f0 (Neutral Gray)
- **Text**: Various shades (#1e293b, #64748b, #94a3b8)
- **Success**: #d1fae5 (Light Green background)
- **Error**: #fef2f2 (Light Red background)

## Usage

### First-Time Setup
1. Launch the application using `npm run dev`
2. The Setup Wizard will automatically appear on first launch
3. Follow the 4-step guided setup:
   - Step 1: Enter your Shortcut API token
   - Step 2: Set your Shortcut workspace URL
   - Step 3: Select a workflow from your workspace
   - Step 4: Configure epics to track with team members
4. All settings are saved to browser localStorage automatically

### Daily Use
1. Click "Search Epics" to load data for configured epics
2. View comprehensive analytics and workflow visualizations
3. Click legend items in pie charts to filter views in Shortcut
4. Use sidebar navigation to jump between epics
5. Expand/collapse sections as needed
6. Click "Refresh Epics" to reload latest data

### Managing Configuration
- **Edit Epic List**: Add/remove epics, manage team members, reorder via drag-and-drop
- **Setup Shortcut**: Change workspace URL or select a different workflow
- **Edit API Token**: Update if your token expires or changes
- **Export/Import**: Backup your configuration to a JSON file or restore from a previous backup
  - Export: Downloads current configuration as `shortcut-viewer-config-YYYY-MM-DD.json`
  - Import: Upload a previously exported JSON file to restore settings
  - Useful for moving between browsers, backing up settings, or sharing configurations
- **Wipe Settings**: Clear all localStorage data to start fresh

## Interactive Features

### Clickable Chart Legends
- **Workflow Status Pie Chart**: Click any status to open Shortcut filtered by that epic and workflow state
  - Example: Click "In Review" to see all stories in that state for the epic
- **Story Type Pie Chart**: Click any type to open Shortcut backlog filtered by that epic and story type
  - Example: Click "Bug" to see all bugs for the epic

### Hyperlinks
- Epic titles link to their Shortcut pages
- Story cards link to individual story pages
- All external links open in new tabs

## Development Notes

- Built with Create React App
- Uses React Hooks for state management (no Redux)
- SVG-based chart rendering with custom path generation
- Interactive tooltips with position-relative containers
- Responsive design with flexbox and grid layouts
- Case-insensitive workflow state matching
- Filters out archived stories automatically
- Epic data fetched includes full details (id, name, states, stories, etc.)
- Direct links to epic pages with grouping parameters
- Modal overlays with click-outside-to-close behavior
- Drag-and-drop with visual feedback
- Collapsible sections with expand/collapse all controls

## Troubleshooting

### API Token Issues
- Ensure your token is valid and has proper permissions
- Use "Edit API Token" in Settings menu to update your token
- Check browser console for authentication errors

### Epic Not Found
- Verify epic name matches exactly (case-insensitive)
- Check that the epic exists in your Shortcut workspace
- Epic may be archived or deleted

### Workflow States Not Showing
- Ensure you've selected a workflow via "Setup Shortcut" in Settings menu
- Verify the workflow has states configured in Shortcut
- Try re-running the Setup Wizard to reconfigure workflow

### Stories Not Loading
- Check that the epic has stories
- Archived stories are automatically excluded
- Verify API token has permission to access stories

### Configuration Not Persisting
- Check that browser localStorage is enabled
- Try using Export/Import to backup and restore your configuration
- Clear browser cache and re-enter configuration if localStorage issues persist

## Version Information

**Version**: 1.0.0
**Project Name**: D.A.V.E. (Dashboards Are Very Effective)
**Author**: Dave Woods

## License

Private project for internal use.
