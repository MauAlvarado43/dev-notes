# Changelog

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and semantic versioning while it remains on the `0.x` line.

Entries from `0.1.0` through `0.4.0` were reconstructed from the development history kept in `history.md`. They describe verified changes, but do not replace Git tags or original publication dates.

## [Unreleased]

## [0.9.1] - 2026-09-07

### Fixed

- Delayed note editor updates no longer overwrite newer typing or move the cursor during autosave. Updates are matched to the latest local edit, and snapshots arriving out of order are discarded.
- Delayed save notifications no longer mark newer, unsaved text as saved.

### Validation

- `npm run check`: 56 tests, TypeScript validation, and production bundles.
- Regression tests cover delayed typing echoes, out-of-order snapshots, initial loading during typing, and subsequent external updates. Interactive validation inside VS Code remains pending.

## [0.9.0] - 2026-08-26

### Added

- Added a visible backup management panel with Drive connection status, automatic scheduling, manual backup and restore actions, local snapshots, and optional encryption controls.

### Changed

- Rewrote the backup and recovery guide and the historical development record in English.

## [0.8.0] - 2026-08-26

### Added

- Manual and opt-in automatic backups, Google Drive Desktop OAuth, backup status, and restore commands.
- A private `local` data environment with portable snapshots of Markdown notebooks, boards, hidden attachments, empty notebooks, and preferences.

### Changed

- Custom `devNotes.storagePath` is deprecated and used only for migration into private extension storage. The original directory is preserved; conflicting nonempty destinations are not silently merged.
- The extension activates after startup so scheduled backups do not depend on opening the notes sidebar.

### Backup and recovery

- Backups have no additional encryption by default and can be restored on another computer without the original machine's credentials. Recovery-passphrase encryption is optional; keep the passphrase outside the computer if enabled.
- Local snapshots are retained when Drive is unavailable and pending uploads are retried. Device-specific, uniquely named snapshots do not overwrite other computers' backups or synchronize live data.
- Restore validates the extension, schema, paths, and checksums, then switches to a new data generation while retaining the original files.
- OAuth credentials and tokens are kept in VS Code SecretStorage and excluded from backups. Drive setup, recovery, limits, and exclusions are documented in `docs/BACKUPS.md`; Supabase remains deferred.

### Validation

- `npm run check`: 53 tests, TypeScript validation, and production bundles on Linux.
- Backup tests cover portable restore, optional encryption, damaged archives, attachments, concurrent writers, mocked OAuth/Drive requests, and offline upload retries. Live Google account authorization remains a manual setup check.

## [0.7.0] - 2026-08-08

### Added

- Board shape palette with basic shapes, flowchart symbols (decision, input and output, preparation, database, annotation), UML (class, package, actor), and entity relationship entities, on top of the rectangle, rounded rectangle, ellipse, and triangle.
- Connectors that join two shapes and follow them, drawn straight or with right angles, with the notation of the relation on their ends: arrow, dependency, inheritance, implementation, aggregation, composition, and the one and many marks of an entity relationship diagram.
- Labels on shapes and connectors, written with a double click on the element. Free text is also written by double clicking on empty canvas.
- Lasso selection, rubber band selection, and shift clicking, so several elements are picked and then moved, styled, duplicated, or deleted together.
- Rotation and resizing for the selected element, with corner handles, a rotate grip that snaps to 15° while shift is held, and endpoint handles on lines and connectors.
- Duplicate, bring to front, and send to back for the selection, a fit to content view button, arrow key nudging, `Ctrl+A`, and `Ctrl+D`.
- A keyboard layer over the whole board, on single letters wherever the system does not already own the combination: tools on `V`, `Q`, `P`, `L`, `A`, `C`, `T`, `S`, `I`, `R`, `O`, `D`, and `G`; style on `1`, `2`, `3`, `F`, `-`, and `K`; view on `Z`, `0`, and the wheel; `E` to export and `H` for the list. The selection keeps `Ctrl+A`, `Ctrl+C`, `Ctrl+X`, `Ctrl+V`, `Ctrl+D`, `Ctrl+Z`, and `Ctrl+Y`, with `Enter` to write on it, arrows to nudge it, `Ctrl+↑` and `Ctrl+↓` for the drawing order, and `Escape` to drop it.
- Images on a board: inserted from the toolbar, pasted from the clipboard, or dropped on the canvas. Each one is copied into `<notebook>/.attachments/<board>/`, so the board keeps working when the original file moves, and it is moved, resized, rotated, and deleted like any other element.
- Export a board as a PNG image or an SVG vector, from the toolbar or with `E`. The file is standalone: images are inlined, so it opens outside VS Code.
- A cheat sheet listing every shortcut, opened with `H` or from the keyboard button in the toolbar, and built from the same table the board dispatches from, so a binding cannot ship undocumented.
- Every toolbar button states its shortcut in its tooltip, read from that same table, so the keys are learned where the hand already is.

### Changed

- The board toolbar is split in two rows: the tools on top and the appearance of what is being drawn or is selected below. The fill option moved out of the stroke picker into that row, next to the new dashed line option, and both now apply to the selection.
- The type selector of the create form shows the note and board options as cards with an icon and a description, instead of two unlabeled buttons.
- Board style controls follow the selection, and fall back to the style of the next stroke when nothing is selected.
- Board shortcuts read the physical key rather than the character it produces, so bindings stay where they are drawn on keyboard layouts that move letters and digits.

### Fixed

- Undo and redo no longer stop working on a board while `devNotes.autoSave` is on. The editor treated the change event of its own write as an edit made elsewhere, reloaded the canvas, and cleared the history on every stroke.
- The text tool on a board did nothing. The editor was opened during the pointer event that also moved focus away from it, so the field was blurred and discarded before a character could be typed.

### Validation

- `npm run check` passed with 38 tests, TypeScript validation, and the extension, sidebar, editor, and board bundles.
- Images and export exercised against the bundle: an image placed from the host lands as an element and draws from the source the host resolved, a board with a missing image draws its frame instead, and the SVG export comes out standalone, framed around the content, with its labels and its images inlined. Exporting an empty board reports it.
- Tooltips checked against the bundle: each control names its key, including the shape palette, the stroke widths, and the color swatches.
- Every board shortcut exercised against the bundle: tools, styles, copy, cut, paste, history, order, nudging, zoom, the cheat sheet in both languages, and the check that typing on the canvas does not trigger them.
- The board webview exercised against a DOM: every shape in the palette drawn, connectors bound to shapes and rerouted when a shape moves, labels written by double click, lasso and rubber band selection, rotation and resizing of a rotated shape, duplicate, reorder, nudging, undo after autosaving, and the Spanish interface. The create form exercised for the note and board type selector.

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
