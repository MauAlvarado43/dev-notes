# Dev Notes

Dev Notes is a local-first VS Code extension that keeps commands, snippets, and development notes as real Markdown files, organized in notebooks, with its own reading and editing surface.

Notes never leave the machine. By default they live in the private VS Code storage for the extension, and the folder can be moved to a synced or backed-up location.

## Project status

The current version is `0.7.0`. Planned changes are tracked in `CHANGELOG.md`.

- Architecture: `docs/ARCHITECTURE.md`
- Release process: `RELEASE.md`
- Contributing: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`

## Highlights

- Notebooks holding Markdown notes, with create, rename, and delete flows inside the extension instead of the VS Code input box.
- Instant search over note titles, notebook names, and note content.
- A reading-first note editor with live Markdown preview, automatic saving, a save state indicator, and a word counter.
- Boards: a drawing canvas for sketches, flowcharts, and UML or entity relationship diagrams, with images and PNG or SVG export, stored next to the notes of a notebook.
- File attachments copied into the notes folder, listed on the note, and insertable as Markdown references.
- Copy buttons on code blocks and guarded opening of external links.
- English and Spanish interface, selected with `devNotes.language`.
- A configurable storage folder, so notes can live wherever they should be backed up.

## Boards

A board is a drawing canvas that lives in a notebook next to its notes, as a `<name>.board.json` file. Create one from the type selector of the create form, from the notebook menu, or with `Dev Notes: Create board`; it is renamed and deleted like a note, and the sidebar shows how many elements it holds.

The canvas has pen, line, arrow, connector, and text tools, plus a shape palette grouped into basic shapes, flowchart symbols, UML, and entity relationship. Every element takes one of six colors, three stroke widths, an optional fill, and a dashed outline, and shapes and connectors carry a label written with a double click.

Selection works with a click, a rubber band, or the lasso tool for an irregular group. A single selected element gets corner handles to resize it and a grip to rotate it, and linear elements get a handle on each end. The selection can be moved, nudged with the arrow keys, duplicated, sent to the front or the back, and deleted.

Connectors join two shapes and follow them: moving a box reroutes every relation touching it. A connector is drawn as a straight line or with right angles, and its ends carry the notation of the relation, from a plain arrow to inheritance, composition, aggregation, dependency, and the one and many marks of an entity relationship diagram.

The board is meant to be driven from the keyboard, and almost everything is a single letter. Tools: `V` select, `Q` lasso, `P` pen, `L` line, `A` arrow, `C` connector, `T` text, `S` the shape palette, `I` an image, and `R`, `O`, `D`, `G` for the usual shapes. Style: `1` `2` `3` for the stroke, `F` fill, `-` dashed, `K` the next color. View: `Z` fits the drawing, `0` resets it, and the wheel or `Ctrl +` and `Ctrl −` zoom. `E` exports and `H` opens the list of shortcuts.

The selection keeps the combinations the system already owns: `Ctrl+A`, `Ctrl+C`, `Ctrl+X`, `Ctrl+V`, `Ctrl+D`, `Ctrl+Z`, `Ctrl+Y`, plus `Enter` to write on it, the arrow keys to nudge it, `Ctrl+↑` and `Ctrl+↓` for the drawing order, and `Escape` to drop it. Holding space or the middle button pans.

Every button in the toolbar states its shortcut on hover, and `H` opens the full list. Both come from the same table the board dispatches from, so neither drifts from what the keys actually do.

Images go on a board from the toolbar, by pasting from the clipboard, or by dropping a file on the canvas. Each one is copied into `<notebook>/.attachments/<board>/`, next to the board that draws it, and behaves like any other element: move it, resize it, rotate it, put it behind a shape, or delete it.

The export button, or `E`, writes the whole board as a PNG image or an SVG vector, framed around the drawing with a white background. Images are inlined in the file, so it opens anywhere without the notes folder.

Boards are saved as readable JSON, so they diff, sync, and back up like the notes around them.

## Attachments

The paperclip in the note toolbar copies the selected files into `<notebook>/.attachments/<note>/`, next to the note that owns them. Each attachment can be opened with the default application of the system, removed, or inserted into the note as a relative Markdown reference; images are inserted as embedded images and render in the editor.

Because attachments are stored inside the notes folder, they travel with a backup or a synced folder, they follow a note when it is renamed, and they are deleted with it. Relative links to other notes open in the Dev Notes editor, and references that point outside the notes folder are not followed.

## Commands and shortcuts

- `Dev Notes: Create notebook` — also the button next to the search.
- `Dev Notes: Create note` — `Ctrl+Alt+N`, also the `+` of a notebook.
- `Dev Notes: Create board` — also the type selector of the create form.
- `Dev Notes: Search notes` — `Ctrl+Alt+F`
- `Dev Notes: Open notes folder`
- `Ctrl+E` toggles reading and editing, `Ctrl+S` saves.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `devNotes.language` | `en` | Interface language: English or Spanish. |
| `devNotes.storagePath` | *(empty)* | Folder holding the notebooks. Empty uses private extension storage; a leading `~` is expanded. |
| `devNotes.noteTemplate` | `# ${title}\n\n` | Initial content of a new note. |
| `devNotes.autoSave` | `true` | Save automatically after editing in the Dev Notes editor. |
| `devNotes.reopenNotesInEditor` | `true` | Reopen a note in the Dev Notes editor when VS Code shows it in the plain text editor. |

> Notes are plain text. Do not store passwords, tokens, or secrets without a proper encryption solution.

## Development

The `bin/` directory contains Windows shortcuts for the usual workflow:

- `install.bat` installs locked dependencies.
- `build.bat` builds the extension and both webviews into `dist/`.
- `check.bat` runs type checks, tests, and builds.
- `dev.bat` starts watch mode.
- `package.bat` validates and creates `dist/dev-notes-{version}.vsix`.

For manual development:

1. Install dependencies with `npm install`.
2. Run `npm run check`.
3. Open this folder in VS Code.
4. Press `F5` and choose **Run Dev Notes**.
5. In the extension host, open Dev Notes from the activity bar.

## Source layout

```text
src/
  core/             Shared contracts, deterministic utilities, and the message catalog
  domain/           Note, attachment, and board rules, plus Markdown transformations
  infrastructure/   Settings and every read and write of the notes folder
  presentation/     VS Code host and the sidebar, note editor, and board webviews
  extension.ts      Extension activation entry point
```

## License

Dev Notes is licensed under the `MIT License` in `LICENSE`.
