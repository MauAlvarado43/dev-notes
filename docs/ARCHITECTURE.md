# Dev Notes architecture

## Data flow

Both webviews are plain TypeScript bundles. They send a client message to the VS Code host, the host asks `NotebookStore` to read or change the notes folder, and it publishes the result back to the webview.

```text
Sidebar webview -> SidebarClientMessage -> SidebarProvider -> NotebookStore -> notes folder
      ^                                                                            |
      +------------------------------ SidebarHostMessage --------------------------+
```

The note editor works on a `TextDocument`, so VS Code owns the file content and Dev Notes owns the surface that renders it.

```text
Editor webview -> EditorClientMessage -> NoteEditorProvider -> WorkspaceEdit -> TextDocument
      ^                                                                             |
      +------------------------------- EditorHostMessage ---------------------------+
```

A board works the same way over a `.board.json` document: the canvas sends the full element list after every finished interaction, and `DocumentWriter` writes it back.

```text
Board webview -> BoardClientMessage -> BoardEditorProvider -> DocumentWriter -> .board.json
      ^                                                                            |
      +------------------------------ BoardHostMessage ----------------------------+
```

Notes stay real `.md` files on disk and boards stay readable JSON. Nothing is duplicated into a database, so the same content remains usable without the extension.

## Source boundaries

| Area | Responsibility |
| --- | --- |
| `src/core/` | Message contracts, deterministic utilities, and the English and Spanish catalog. |
| `src/domain/` | Notebook, note, attachment, and board rules, Markdown rendering, and plain-text extraction. |
| `src/infrastructure/` | Settings access, path resolution, and every read and write of the notes folder. |
| `src/presentation/host/` | Sidebar view, the note and board editors, document writing, and the webview HTML shell. |
| `src/presentation/webview/` | Sidebar, note editor, and board bundles, split into components, i18n, platform, and styles. |
| `test/` | Node test runner suites over the VS Code-free modules. |

## Common changes

### Add a sidebar action

1. Add the message to `SidebarClientMessage` in `src/core/types.ts`.
2. Send it from the webview with `send`.
3. Handle it in `SidebarProvider.handle`.
4. Touch the file system only through `NotebookStore`.

### Change naming rules

Edit `src/domain/notes.ts`. Creation, renaming, and the file names sent back by a webview share the same validation, and every rejection throws a `LocalizedError` carrying a catalog key.

### Add a board tool

`BoardCanvas` in `src/presentation/webview/board/canvas.ts` owns pointer handling, the viewport, hit testing, and SVG rendering. A new tool needs its kind in `BoardElementKind`, a shape in `createShape`, a bounding box in `boundingBox` when the default is wrong, an entry in the toolbar list, and its labels in both catalogs. `src/domain/boards.ts` validates what is read back from disk, so a kind that it does not know is dropped when the file is parsed.

Boards claim `*.board.json` with `priority: "default"`, so VS Code opens them in the canvas without the fallback the notes need.

### Work with attachments

`AttachmentStore` owns `<notebook>/.attachments/<note title>/`. It copies selected files in, lists them for the editor payload, and moves or deletes the folder when `NotebookStore` renames or deletes the note. Names are made safe and deduplicated by `src/domain/attachments.ts`, which also builds the Markdown reference the editor inserts.

References written inside a note are resolved by `resolveInsideRoot` in `src/infrastructure/note-locations.ts`. Anything that escapes the notes folder resolves to `undefined`, so a note cannot render or open arbitrary files. Relative images are rewritten to webview URIs before the rendered HTML reaches the editor, which is why the note webview also lists the notes folder in `localResourceRoots`.

### Keep notes in the Dev Notes editor

VS Code opens a note in the plain text editor when it is reached from outside the sidebar, and after a rename it reopens the moved file the same way. `watchForPlainTextNotes` in `src/extension.ts` watches visible text editors and reopens notes stored in the notes folder with the custom editor, in the same editor group. `devNotes.reopenNotesInEditor` turns it off.

### Add translated text

Add the key to both catalogs in `src/core/i18n/catalog.ts`, then read it with `t` in the webview or `translate` in the host. Counted text uses a `…One` / `…Other` pair read through `count`. `test/catalog.test.ts` fails when the locales drift apart.

The selected locale lives in `devNotes.language`, reaches a webview through the `lang` attribute of its HTML shell for the first frame, and through every payload afterwards.

### Add a style

Stylesheets live in `src/presentation/webview/styles` and are imported by the bundle that needs them. `base.css` and `components.css` are shared; `sidebar.css`, `editor.css`, and `markdown.css` belong to their surface.

## Practical rules

- Domain rules must not import `vscode`, so they stay testable.
- The host renders Markdown with raw HTML disabled; webviews must not relax that.
- Only well-known link schemes are opened, and the Content Security Policy of each webview allows a single nonced script.
- Names coming from a webview are validated again in the host before they become a URI.
