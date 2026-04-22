Update README.md and the About dialog in src/App.tsx to accurately reflect the current state of the app.

## How to do this

1. Read the current README.md and the About dialog (the `modals.about` block in src/App.tsx).
2. Explore the codebase to identify the current feature set — check all components in src/components/, the Setup Wizard step count and labels in SetupWizard.tsx, the localStorage keys in src/utils.ts, and the backend endpoints in server.js.
3. Compare what you find against what is currently documented, and identify anything that is missing, out of date, or incorrect.
4. Update README.md so that every section accurately reflects the current code.
5. Update the About dialog bullet list in src/App.tsx. Each bullet must fit on a single line — keep descriptions concise.

## Rules

- Do not change the README structure or headings unless a section genuinely no longer applies.
- Do not add padding or filler prose — only change what is actually wrong or missing.
- The About dialog bullets must each fit on a single line. The description text after the bold label must be 60 characters or fewer. Count the characters. Trim any that exceed 60 — do not skip this check.
- Run `npx tsc --noEmit` after editing src/App.tsx and fix any TypeScript errors before finishing.
