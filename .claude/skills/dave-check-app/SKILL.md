Audit the current state of the app and produce a written report of issues found. Do not make code changes — this is a read-only review.

## How to do this

1. Explore the codebase (src/components/, src/hooks/, src/context/, src/utils.ts, src/types.ts, server.js) to understand the current shape of the app.
2. Work through each of the questions below. For each one, inspect the relevant code, gather evidence, and form a concrete answer.
3. Produce a single report grouped by question. For every finding include the file path and line number(s) so the user can navigate directly to the code.

## Questions to answer

- **Does the app still follow best practices for a React app?** Check hook usage (correct dependency arrays, no conditional hooks, stale closures), proper memoisation, key props on lists, avoidance of inline object/function recreation where it matters, and component composition.
- **Is there any redundant or duplicated code?** Look for repeated JSX blocks, copied utility logic, and constants/types defined in more than one place. Note candidates that could be lifted into shared helpers.
- **Are there any potential bugs?** Look for stale closures in effects, unhandled promise rejections, off-by-one errors, missing null checks on optional fields, race conditions in fetch chains, and incorrect dependency arrays.
- **Can any improvements be made?** Performance (unnecessary re-renders, large lists without virtualisation, repeated work that could be memoised), accessibility (keyboard navigation, ARIA on interactive non-button elements, contrast), and UX consistency.
- **Do all the tables follow the same look and feel?** Compare the table styling across SummaryTable, AssignmentTables, UnwatchedTickets, EpicCard's Story Owners / Team Open Tickets / Pull Requests tables. Check header background colour, header text colour, row separator colour, rounded corners, font sizes, padding, hover states, and sort-icon usage.
- **Is the same pill background colour being used for the Epic Status in all places?** Find every place an epic's state/status is rendered as a pill or badge (epic card meta area, summary table status column, anywhere else) and confirm the same colour mapping is applied. Flag any divergence.
- **Are all the Shortcut API calls being counted and added to the API count in the footer?** Cross-reference every `fetch` call to `${getApiBaseUrl()}/api/...` with what is recorded in `apiCallBreakdown` (initial set in useEpicsData.ts) and `incrementApiCalls(...)` calls (for on-demand fetches). Flag any endpoint that is called but not counted.

Add any other similar audit questions that seem worthwhile based on what you discover during the scan.

## Rules

- Do not modify any source files. This is read-only — only the final report is output to the user.
- Be specific. Every finding must reference a file path and line number(s); vague observations like "consider memoising this" without a target are not useful.
- Group findings by severity within each question: **High** (likely bug or correctness issue), **Medium** (worth addressing), **Low** (style/nit). If a question has no findings, say so explicitly rather than omitting it.
- Keep the report concise — bullet points, not prose. The goal is a punch list the user can act on.
