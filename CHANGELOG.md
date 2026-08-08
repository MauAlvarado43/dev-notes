# Changelog

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and semantic versioning while it remains on the `0.x` line.

Entries from `0.1.0` through `0.4.0` were reconstructed from the development history kept in `history.md`. They describe verified changes, but do not replace Git tags or original publication dates.

## [Unreleased]

## [0.6.0] - 2026-08-08

### Added

- Boards: a freeform drawing canvas with pen, rectangle, ellipse, arrow, line, and text tools, six colors, three stroke widths, optional fills, selection with move and delete, undo and redo, and zoom and pan on an infinite canvas.
- Boards are notebook entries next to notes. Each one is a `<name>.board.json` file created, renamed, and deleted like a note, and the `Dev Notes: Create board` command and the type selector of the create form both reach them.
- The sidebar lists boards with their element count, and the search reaches the text drawn on a board.
- File attachments. Selected files are copied into `<notebook>/.attachments/<note>/`, so the note keeps working when the original file moves or is deleted.
- The note editor lists the attachments of the open note with their size, and each one can be opened, removed, or inserted into the note as a relative Markdown reference. Images are inserted as embedded images.
- Attachments follow their note: renaming a note moves its files, and deleting a note sends them to the trash with it.
- Images and links pointing at files inside the notes folder now resolve. Relative image references render in the editor, a relative link to another note opens in the Dev Notes editor, and any other file opens with the default application of the system.
- `devNotes.reopenNotesInEditor` reopens a note in the Dev Notes editor when VS Code shows it in the plain text editor.

### Changed

- Note and board editors share one document writer, so both apply the newest state, debounce saving, and follow `devNotes.autoSave` the same way.
- The button next to the search creates notebooks. Notes are created from the `+` of a notebook, from `Ctrl+Alt+N`, or from the notebook context menu, which removes the duplicate notebook button that used to sit in the footer.

### Fixed

- Notes stopped falling back to the plain text editor of VS Code. Renaming a note, or reaching one from outside the sidebar, left the file open as raw Markdown; those notes are now sent back to the Dev Notes editor in the same editor group.

### Validation

- `npm run check` passed with 32 tests, TypeScript validation, and the extension, sidebar, editor, and board bundles.
- The three webviews exercised against a DOM: drawing, tool, color, stroke, selection, undo, redo, and zoom on a board; attachment list, insert, open, and remove actions; the new notebook button; and English and Spanish rendering.

## [0.5.0] - 2026-08-07

### Added

- English and Spanish interface languages, selected with the `devNotes.language` setting. English is the default.
- A single shared catalog under `src/core/i18n` serves the sidebar, the note editor, and the extension host, so the same text cannot drift between them.
- `package.nls.json` and `package.nls.es.json` localize the manifest: the extension description, command titles, the view name, and every setting description.
- Domain errors carry a catalog key (`LocalizedError`) instead of pre-rendered text, so a validation failure reads in the selected language wherever it surfaces.
- Automated tests for name validation, Markdown extraction, catalog parity, and shared utilities, run with `node --test`.
- Public architecture, contribution, security, and release documentation, plus Windows shortcuts in `bin/` and a validation workflow in `.github/workflows`.

### Changed

- Source boundaries are organized into core, domain, infrastructure, and presentation layers. Non-component modules use kebab-case file names.
- Both webviews are built as their own bundles from `src/presentation/webview` instead of living as inline HTML, CSS, and JavaScript strings inside the extension host. Styles are separated into base, component, sidebar, editor, and Markdown stylesheets.
- Every read and write of the notes folder goes through `NotebookStore`; name rules, Markdown rendering, and template expansion live in `src/domain` and no longer depend on VS Code.
- The build uses `esbuild.mjs` for the three bundles, and `npm run check` validates types, tests, and build in one command.
- The activity bar icon is `media/dev-notes-mark.svg`, named after the extension.

### Fixed

- The sidebar and editor render their first frame already translated, instead of showing default text until the first message from the host arrives.
- Editor save failures no longer surface an untranslated internal message; the status bar reports the failure in the selected language.

### Validation

- `npm run check` passed with 19 tests, TypeScript validation, and the extension, sidebar, and editor bundles.

## [0.4.0]

### Changed

- Visual system aligned with DevFolder, DevCommands, and DevTracker: consistent violet accent, product header, and compact controls.
- Notebooks are presented as cards with color accents and three-dot context menus.
- Consistent SVG iconography replaced loose text symbols, and the empty state became an illustrated one.
- Centered modals with clearer hierarchy, better focus handling, and subtle animations.
- The note editor adopted the same visual identity as the sidebar.

## [0.3.0]

### Added

- A dedicated sidebar webview with notebooks, notes, search, and content snippets.
- In-extension forms for creating and renaming, and delete confirmations inside the panel.
- Notebook selection integrated into the note creation form.

### Changed

- Note management no longer uses the VS Code input box or quick pick.

## [0.2.0]

### Added

- A custom editor that opens notes as rendered Markdown by default.
- Editing with live preview on the same screen, automatic saving, a word counter, and a save state indicator.
- Quick copy for code blocks and guarded opening of external links.

## [0.1.0]

### Added

- Notebooks holding Markdown notes, created, renamed, and deleted from the sidebar.
- Full-text search across every note.
- Markdown preview and a configurable storage folder.
