# Contributing to Dev Notes

## Set up the environment

1. Install Node.js 22 or later.
2. Run `npm ci`.
3. Run `npm run check` before opening a pull request.

## Change guidelines

- Keep shared contracts in `src/core/types.ts`.
- Keep naming and Markdown rules in `src/domain`, free of `vscode` imports.
- Reach the notes folder only through `NotebookStore`.
- Add every user-facing string to both catalogs in `src/core/i18n/catalog.ts`.
- Add tests when a change modifies a rule or a persisted contract.
- Update the `Unreleased` section in `CHANGELOG.md` for user-visible changes.

## Pull requests

Include a change summary, validation steps, and screenshots for visual changes. Do not combine broad refactors with unrelated behavior changes.
