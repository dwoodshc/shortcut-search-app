# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start everything: Express proxy (port 3001) + React frontend (port 3000)
npm run server     # Express proxy only
npm start          # React frontend only
npm run build      # Production build
npx tsc --noEmit   # Type check (no test suite exists)
```

There are no tests. TypeScript strict mode is on — `npx tsc --noEmit` after any change is the only automated correctness check.

## Architecture

### Two-process model

The browser never calls Shortcut directly. All API calls go through `server.js` (Express on port 3001), which proxies to `https://api.app.shortcut.com/api/v3`. The Shortcut API token is sent from the browser as a `Bearer` header on each request; the server extracts it with `getTokenFromHeader()` and forwards it. There is no server-side state — the server is purely a CORS proxy.

### State management: five hooks compose into one context

`App.tsx` calls five domain hooks and assembles their outputs into a single flat `useMemo` context object provided via `DashboardContext`. Every component reads state through `useDashboard()` — there are no prop chains.

| Hook | Owns |
|------|------|
| `useEpicsData` | Shortcut API calls, epics/stories/members state, loading/error, abort cancellation |
| `useWorkflowConfig` | Selected workflow, state→ID mappings, workspace URL, filtered epic names |
| `useFilters` | Team filter, sort state, chart collapse flags, `getDisplayStories` |
| `useModals` | All modal open/close state, ESC handler, README content |
| `useConfigIO` | Config export/import, feedback messages |

Cross-hook logic (things that need outputs from two or more hooks) lives in `App.tsx`: `epicTeamData`, `memberEpicMap`, `allDisplayStories`, `handleSaveShortcutUrl`, `toggleAllCharts`.

### Data flow on load

1. `loadEpics` (in `useEpicsData`) runs once on mount via `checkConfig` in `App.tsx`.
2. It fetches teams, epic-workflow states, then runs all epic searches in parallel via `Promise.all`.
3. Each epic search fetches `/api/search/epics`, then `/api/epics/:id`, then `/api/epics/:id/stories`.
4. `setEpics(allEpics)` triggers a `useEffect` that resolves owner display names by calling `/api/users/:id` sequentially for any uncached IDs.
5. Member names are cached in localStorage (`shortcut_members_cache`) via a `useRef` pattern — `membersRef` holds the current map for stale-closure-safe reads, while `members` state drives renders.
6. A separate `AbortController` ref allows `cancelSearch()` to abort all in-flight requests cleanly.

### Storage

All persistence is browser localStorage, accessed exclusively through the `storage` facade in `src/utils.ts`. Keys are defined in `STORAGE_KEYS` — never use raw string keys. All `JSON.parse` calls in getters are wrapped in try/catch, returning safe defaults on parse failure (corrupted data shows the setup wizard rather than crashing).

`COMPLETE_STATE_NAMES` (also in `utils.ts`) is the shared Set `{'complete', 'ready for release'}` used by `UnwatchedTickets`, `AssignmentTables`, and `EpicCard` to identify terminal states. Keeping these consistent is important — do not define local copies.

### Theming

The root `<div className="App">` carries `data-theme={theme}` (`normal` | `dark` | `star-trek` | `matrix`). All theme-specific CSS is driven by `[data-theme="..."]` selectors at the bottom of `App.css`. The Matrix and Dark themes add animated canvas overlays (`MatrixRain`, `OceanTide`) rendered conditionally in `App.tsx`.

### SetupWizard

The wizard is a 7-step modal. `step` state lives in `useModals` and is passed as a prop. Each step's Next action is handled by a named function (`handleStep1Next`, `handleStep2Next`, `handleStep3Next`) or a one-liner in `handleNext` for the simpler steps (4–7). Steps 1, 2, and 3 make live API calls to verify the token, fetch workflows, and fetch teams respectively before advancing.

### Workflow state normalization

`NORMALIZED_WORKFLOW_STATES` in `useWorkflowConfig.ts` defines the six canonical state names used for progress calculation. `filteredStateIds` is the subset of the selected workflow's state IDs whose names match this list — it is the source of truth for summary table counts and pie chart segments. `SummaryTable` uses `filteredStateIds` directly from context.

### marked

README rendering uses `marked.parse(content, { async: false })` to get a synchronous `string` return. The `{ async: false }` overload is required — without it TypeScript infers `string | Promise<string>`.
