# Shortcut Viewer

**Project D.A.V.E. (Dashboards Are Very Effective)**

A React-based web application for visualizing and managing Shortcut.com epics and their associated stories. This tool provides comprehensive dashboards with interactive charts, kanban-style workflow visualization, team analytics, and direct integration with Shortcut.

## Features

### Epic Management
- Search and display multiple epics from your Shortcut workspace
- Configure tracked epics via YAML file with built-in editor
- Track team members assigned to each epic
- Sidebar navigation for quick jumping between epics
- Drag-and-drop reordering of epics in the configuration editor

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

#### Initial Setup Modal
- Automatically appears on first launch if no token or workflow is configured
- **Workspace URL Configuration**: Set your Shortcut workspace URL for generating hyperlinks
- **Workflow Selection**: Choose from all available workflows in your workspace
- Visual workflow preview showing all states with color-coded badges
- Selected workflow highlighted with visual feedback
- Settings saved to `shortcut.yml` for persistence

#### Settings Menu
- Access via gear icon in header
- **Edit Epic List**: Manage tracked epics and team members
- **Edit API Token**: Update your Shortcut API token
- **Setup Shortcut**: Change workspace URL or workflow
- **View README.md**: Access documentation
- **About**: View application information

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

3. Configure your Shortcut API token:
   - Option A: Use the built-in setup interface on first launch
   - Option B: Create a `.env` file manually:
     ```
     SHORTCUT_API_TOKEN=your-token-here
     ```

4. Create an `epics.yml` file (or use the built-in editor):
   ```yaml
   epics:
     - name: Your Epic Name
       team:
         - Team Member 1
         - Team Member 2
     - name: Another Epic
       team:
         - Team Member 3
   ```

5. The app will guide you through workflow setup on first launch

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
│   ├── App.js          # Main React component
│   ├── App.css         # Application styles
│   └── index.js        # React entry point
├── server.js           # Express proxy server
├── epics.yml           # Epic and team configuration
├── shortcut.yml        # Workflow and URL configuration (auto-generated)
├── .env                # API token (auto-generated or manual)
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

## Configuration Files

### epics.yml Format
```yaml
epics:
  - name: Epic Name (must match Shortcut exactly)
    team:
      - Full Name 1
      - Full Name 2
```

### shortcut.yml Format (Auto-Generated)
```yaml
workflow_name: RnD Workflow
workflow_id: 500376257
shortcut_web_url: https://app.shortcut.com/your-workspace
states:
  - id: 500376258
    name: Backlog
  - id: 500376259
    name: Ready for Development
  # ... additional states
```

## API Endpoints

The Express server provides these proxy endpoints:

### Configuration
- `GET /api/check-token` - Verify API token exists
- `POST /api/save-token` - Save API token to .env
- `GET /api/state-ids-file` - Get workflow configuration from shortcut.yml
- `POST /api/state-ids-file` - Save workflow configuration
- `GET /api/epics-file` - Get epics.yml content
- `POST /api/epics-file` - Update epics.yml content
- `GET /api/readme` - Get README.md content

### Shortcut API Proxies
- `GET /api/search/epics?query=` - Search for epics
- `GET /api/epics/:id` - Get full epic details
- `GET /api/epics/:id/stories` - Get stories for an epic (excluding archived)
- `GET /api/workflows` - Get all workflows with states
- `GET /api/users/:id` - Get user/member details
- `GET /api/filtered-epics` - Get epic names from epics.yml
- `GET /api/epic-emails` - Get team members by epic

## Technologies Used

- **Frontend**: React 19.2.0 with Hooks (useState, useEffect, useCallback)
- **Backend**: Express 5.1.0
- **API**: Shortcut API v3
- **Configuration**: js-yaml for YAML parsing
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
2. Enter your Shortcut API token when prompted (or configure manually in .env)
3. Set your Shortcut workspace URL
4. Select a workflow from your workspace
5. Configure epics to track using the "Edit Epic List" option

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
- Check that the token is correctly saved in `.env`
- Use "Edit API Token" in settings to update

### Epic Not Found
- Verify epic name matches exactly (case-insensitive)
- Check that the epic exists in your Shortcut workspace
- Epic may be archived or deleted

### Workflow States Not Showing
- Ensure you've selected a workflow via "Setup Shortcut"
- Verify the workflow has states configured
- Check that `shortcut.yml` exists and is valid

### Stories Not Loading
- Check that the epic has stories
- Archived stories are automatically excluded
- Verify API token has permission to access stories

## Version Information

**Version**: 1.0.0
**Project Name**: D.A.V.E. (Dashboards Are Very Effective)
**Author**: Dave Woods

## License

Private project for internal use.
