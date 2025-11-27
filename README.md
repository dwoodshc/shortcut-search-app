# Dave's Shortcut Viewer

A React-based web application for visualizing and managing Shortcut.com epics and their associated stories. This tool provides comprehensive dashboards with interactive charts, kanban-style workflow visualization, and team analytics.

## Features

### Epic Management
- Search and display multiple epics from your Shortcut workspace
- Configure tracked epics via YAML file
- Track team members assigned to each epic
- Visual indicators for found/not found epics

### Visualizations
- **3D Column Chart**: Workflow status breakdown showing story distribution across workflow states
- **Workflow Status Pie Chart**: Visual representation of stories by state with gradient color scale from gray (Backlog) to dark green (Complete)
- **Story Type Breakdown Pie Chart**: Distribution of stories by type (Feature, Bug, Chore)

### Kanban Board
- Six-column workflow display: Backlog → Ready for Development → In Development → In Review → Ready for Release → Complete
- Story cards showing: Title, Type, Owner, Story Points
- Color-coded by story type
- Responsive grid layout

### Analytics Tables
- **Story Owners**: Alphabetical list of owners with ticket counts
- **Team Ticket Count**: Sorted view of team members by workload

### Configuration Management
- Built-in editor for `epics.yml` configuration
- Real-time validation of YAML format
- API token setup and management

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Shortcut.com API token ([Get your token here](https://app.shortcut.com/settings/account/api-tokens))

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
   - Create a `.env` file in the root directory
   - Add your token:
     ```
     SHORTCUT_API_TOKEN=your-token-here
     ```
   - Or use the built-in token setup interface when you first run the app

4. Create an `epics.yml` file in the root directory with your epic configuration:
   ```yaml
   epics:
     - name: Your Epic Name
       team:
         - Team Member 1
         - Team Member 2
         - Team Member 3
     - name: Another Epic
       team:
         - Team Member 4
         - Team Member 5
   ```

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
├── .env                # API token (create this)
├── package.json        # Dependencies and scripts
└── README.md           # This file
```

## Configuration

### epics.yml Format
```yaml
epics:
  - name: Epic Name (must match Shortcut exactly)
    team:
      - Full Name 1
      - Full Name 2
```

### API Endpoints
The Express server provides these proxy endpoints:
- `/api/check-token` - Verify API token exists
- `/api/save-token` - Save API token to .env
- `/api/search/epics` - Search for epics
- `/api/epics/:id` - Get epic details
- `/api/epics/:id/stories` - Get stories for an epic (excluding archived)
- `/api/workflows` - Get workflow states
- `/api/filtered-epics` - Get epic names from epics.yml
- `/api/epic-emails` - Get team members by epic
- `/api/epics-file` - Get/update epics.yml content

## Technologies Used

- **Frontend**: React 19.2.0 with Hooks
- **Backend**: Express 5.1.0
- **API**: Shortcut API v3
- **Configuration**: js-yaml for YAML parsing
- **HTTP Client**: Axios
- **Styling**: Custom CSS with Shortcut brand colors
- **Development**: concurrently for running multiple processes

## Color Scheme

- **Primary Purple**: #494BCB (Shortcut brand)
- **Dark Navy**: #03045E (headers, dark elements)
- **Accent Yellow**: #FFDE87 (highlights)
- **Workflow Gradient**: Light gray → Dark green (representing progress)
- **Story Types**: Light green (Feature), Light yellow (Chore), Light red (Bug)

## Usage

1. Launch the application using `npm run dev`
2. If first time, enter your Shortcut API token when prompted
3. The app will load epics configured in `epics.yml`
4. View comprehensive analytics and workflow visualizations
5. Click "Edit Configuration" to modify tracked epics and team members
6. Stories automatically exclude archived items
7. All visualizations update in real-time as data changes

## Development Notes

- Built with Create React App
- Uses React Hooks for state management
- SVG-based chart rendering with custom tooltips
- Responsive design with mobile support
- Case-insensitive workflow state matching
- Filters out archived stories automatically
