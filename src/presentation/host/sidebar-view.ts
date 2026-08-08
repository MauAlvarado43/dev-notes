import * as vscode from 'vscode';
import { LocalizedError, localizeError } from '../../core/i18n/catalog';
import type { EntryKind, SidebarClientMessage, SidebarHostMessage } from '../../core/types';
import type { NotebookStore } from '../../infrastructure/notebook-store';
import { noteTemplate, resolveLocale } from '../../infrastructure/settings';
import { webviewHtml } from './webview-html';

/** Messages whose failures belong inside the open form instead of a toast. */
const FORM_MESSAGES = new Set<SidebarClientMessage['type']>(['createNotebook', 'createNote', 'rename', 'delete']);

export class SidebarProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'devNotes.notebooks';

  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly store: NotebookStore,
    private readonly openEntry: (uri: vscode.Uri) => Promise<void>
  ) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [this.extensionUri] };
    view.webview.html = this.html(view.webview);
    view.webview.onDidReceiveMessage((message: SidebarClientMessage) => void this.handle(message));
    view.onDidChangeVisibility(() => {
      if (view.visible) void this.refresh();
    });
  }

  async showComposer(kind: EntryKind): Promise<void> {
    await this.reveal();
    await this.refresh();
    await this.post({ type: 'showComposer', kind });
  }

  async focusSearch(): Promise<void> {
    await this.reveal();
    await this.post({ type: 'focusSearch' });
  }

  async refresh(): Promise<void> {
    if (!this.view) return;
    try {
      await this.post({ type: 'data', locale: resolveLocale(), notebooks: await this.store.readAll() });
    } catch (error) {
      await this.postError(error);
    }
  }

  /** Rebuilds the shell so a language change also updates the document language. */
  async reload(): Promise<void> {
    if (!this.view) return;
    this.view.webview.html = this.html(this.view.webview);
    await this.refresh();
  }

  async openStorage(): Promise<void> {
    const root = await this.store.root();
    await vscode.commands.executeCommand('revealFileInOS', root);
  }

  private async handle(message: SidebarClientMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'ready':
        case 'refresh':
          await this.refresh();
          break;
        case 'openStorage':
          await this.openStorage();
          break;
        case 'createNotebook': {
          const notebook = await this.store.createNotebook(message.name);
          await this.completed(notebook);
          break;
        }
        case 'createNote': {
          const created = await this.store.createNote(message.notebook, message.title, noteTemplate());
          await this.completed(created.notebook);
          await this.openEntry(created.uri);
          break;
        }
        case 'createBoard': {
          const created = await this.store.createBoard(message.notebook, message.title);
          await this.completed(created.notebook);
          await this.openEntry(created.uri);
          break;
        }
        case 'rename': {
          await this.completed(await this.renameEntry(message));
          break;
        }
        case 'delete': {
          await this.completed(await this.deleteEntry(message));
          break;
        }
        case 'openNote':
          await this.openEntry(await this.store.noteUri(message.notebook, message.fileName));
          break;
        case 'openBoard':
          await this.openEntry(await this.store.boardUri(message.notebook, message.fileName));
          break;
      }
    } catch (error) {
      await this.postError(error, FORM_MESSAGES.has(message.type));
    }
  }

  private async renameEntry(message: Extract<SidebarClientMessage, { type: 'rename' }>): Promise<string> {
    if (message.kind === 'notebook') return this.store.renameNotebook(message.notebook, message.name);
    const fileName = requireFileName(message.fileName);
    if (message.kind === 'board') return this.store.renameBoard(message.notebook, fileName, message.name);

    return this.store.renameNote(message.notebook, fileName, message.name);
  }

  private async deleteEntry(message: Extract<SidebarClientMessage, { type: 'delete' }>): Promise<string | undefined> {
    if (message.kind === 'notebook') {
      await this.store.deleteNotebook(message.notebook);

      return undefined;
    }
    const fileName = requireFileName(message.fileName);
    if (message.kind === 'board') return this.store.deleteBoard(message.notebook, fileName);

    return this.store.deleteNote(message.notebook, fileName);
  }

  private async completed(notebook: string | undefined): Promise<void> {
    await this.refresh();
    await this.post({ type: 'operationDone', notebook });
  }

  private async reveal(): Promise<void> {
    await vscode.commands.executeCommand(`${SidebarProvider.viewType}.focus`);
    this.view?.show?.(true);
  }

  private async post(message: SidebarHostMessage): Promise<void> {
    await this.view?.webview.postMessage(message);
  }

  private async postError(error: unknown, inForm = false): Promise<void> {
    const message = localizeError(error, resolveLocale());
    await this.post(inForm ? { type: 'formError', message } : { type: 'toast', message });
  }

  private html(webview: vscode.Webview): string {
    return webviewHtml({
      webview,
      extensionUri: this.extensionUri,
      locale: resolveLocale(),
      bundle: 'sidebar',
      title: 'Dev Notes'
    });
  }
}

/** Note actions must name the file they target; the webview always sends it. */
function requireFileName(fileName: string | undefined): string {
  if (!fileName) throw new LocalizedError('errors.unknownEntry');

  return fileName;
}
