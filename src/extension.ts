import * as vscode from 'vscode';
import { localizeError, translate } from './core/i18n/catalog';
import { isBoardFile } from './domain/boards';
import { isNoteFile } from './domain/notes';
import { AttachmentStore } from './infrastructure/attachment-store';
import { isInsideRoot } from './infrastructure/note-locations';
import { NotebookStore } from './infrastructure/notebook-store';
import {
  CONFIGURATION_SECTION,
  reopenNotesEnabled,
  resolveLocale,
  resolveStorageRoot
} from './infrastructure/settings';
import { BoardEditorProvider } from './presentation/host/board-editor';
import { NoteEditorProvider } from './presentation/host/note-editor';
import { SidebarProvider } from './presentation/host/sidebar-view';

/** How long a note is skipped by the watcher after it was reopened. */
const REOPEN_GUARD_MS = 1500;

export function activate(context: vscode.ExtensionContext): void {
  const storageRoot = (): vscode.Uri => resolveStorageRoot(context);
  const attachments = new AttachmentStore();
  const store = new NotebookStore(storageRoot, attachments);
  const openNote = async (uri: vscode.Uri, viewColumn?: vscode.ViewColumn): Promise<void> => {
    await vscode.commands.executeCommand('vscode.openWith', uri, NoteEditorProvider.viewType, {
      preview: false,
      viewColumn
    });
  };
  /** Boards claim their own file pattern, so VS Code already picks their editor. */
  const openEntry = async (uri: vscode.Uri): Promise<void> => {
    if (isBoardFile(uri.path)) {
      await vscode.commands.executeCommand('vscode.open', uri, { preview: false });

      return;
    }
    await openNote(uri);
  };
  const sidebar = new SidebarProvider(context.extensionUri, store, openEntry);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebar, {
      webviewOptions: { retainContextWhenHidden: true }
    }),
    vscode.window.registerCustomEditorProvider(
      NoteEditorProvider.viewType,
      new NoteEditorProvider(context, attachments, storageRoot),
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: true
      }
    ),
    vscode.window.registerCustomEditorProvider(BoardEditorProvider.viewType, new BoardEditorProvider(context), {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: true
    })
  );

  registerCommand(context, 'devNotes.createNotebook', () => sidebar.showComposer('notebook'));
  registerCommand(context, 'devNotes.createNote', () => sidebar.showComposer('note'));
  registerCommand(context, 'devNotes.createBoard', () => sidebar.showComposer('board'));
  registerCommand(context, 'devNotes.search', () => sidebar.focusSearch());
  registerCommand(context, 'devNotes.refresh', () => sidebar.refresh());
  registerCommand(context, 'devNotes.openStorage', () => sidebar.openStorage());

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(`${CONFIGURATION_SECTION}.language`)) void sidebar.reload();
      else if (event.affectsConfiguration(`${CONFIGURATION_SECTION}.storagePath`)) void sidebar.refresh();
    }),
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (isNoteFile(document.uri.path)) void sidebar.refresh();
    }),
    watchForPlainTextNotes(storageRoot, openNote)
  );
}

export function deactivate(): void {}

/**
 * VS Code opens a note in the plain text editor when it is reached from outside
 * the sidebar, and after a rename it reopens the moved file the same way. Notes
 * stored by Dev Notes are sent back to the Dev Notes editor.
 */
function watchForPlainTextNotes(
  storageRoot: () => vscode.Uri,
  openNote: (uri: vscode.Uri, viewColumn?: vscode.ViewColumn) => Promise<void>
): vscode.Disposable {
  const reopening = new Set<string>();

  return vscode.window.onDidChangeVisibleTextEditors((editors) => {
    if (!reopenNotesEnabled()) return;

    for (const editor of editors) {
      const uri = editor.document.uri;
      const key = uri.toString();
      if (uri.scheme !== 'file' || !isNoteFile(uri.path) || reopening.has(key)) continue;
      if (!isInsideRoot(storageRoot(), uri)) continue;

      reopening.add(key);
      setTimeout(() => reopening.delete(key), REOPEN_GUARD_MS);
      void openNote(uri, editor.viewColumn);
    }
  });
}

/** Commands report failures as a notification in the configured language. */
function registerCommand(context: vscode.ExtensionContext, command: string, handler: () => Promise<unknown>): void {
  context.subscriptions.push(vscode.commands.registerCommand(command, async () => {
    try {
      return await handler();
    } catch (error) {
      const locale = resolveLocale();
      void vscode.window.showErrorMessage(translate(locale, 'host.errorPrefix', { message: localizeError(error, locale) }));

      return undefined;
    }
  }));
}
