import * as path from 'node:path';
import * as vscode from 'vscode';
import { localizeError } from '../../core/i18n/catalog';
import type { BoardClientMessage, BoardHostMessage } from '../../core/types';
import { boardTitle, parseBoard, serializeBoard } from '../../domain/boards';
import { autoSaveEnabled, resolveLocale } from '../../infrastructure/settings';
import { DocumentWriter } from './document-sync';
import { webviewHtml } from './webview-html';

/**
 * Drawing canvas backed by a `.board.json` file. The webview owns the drawing
 * interactions and sends back the full element list, which keeps the document
 * the single source of truth and leaves file history readable.
 */
export class BoardEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'devNotes.board';

  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveCustomTextEditor(document: vscode.TextDocument, panel: vscode.WebviewPanel): Promise<void> {
    panel.webview.options = { enableScripts: true, localResourceRoots: [this.context.extensionUri] };
    panel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'dev-notes-mark.svg');
    panel.webview.html = this.html(panel.webview);

    let disposed = false;

    const post = async (message: BoardHostMessage): Promise<void> => {
      if (!disposed) await panel.webview.postMessage(message);
    };

    const postDocument = async (): Promise<void> => {
      const locale = resolveLocale();
      try {
        await post({
          type: 'document',
          locale,
          notebook: path.basename(path.dirname(document.uri.fsPath)),
          title: boardTitle(path.basename(document.uri.fsPath)),
          elements: parseBoard(document.getText()).elements,
          dirty: document.isDirty
        });
      } catch (error) {
        await post({ type: 'error', message: localizeError(error, locale) });
      }
    };

    const writer = new DocumentWriter(document, {
      autoSave: autoSaveEnabled,
      onError: (error) => post({ type: 'error', message: localizeError(error, resolveLocale()) })
    });

    // Changes from outside the canvas, such as an undo in VS Code, redraw it.
    const changed = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() === document.uri.toString() && !writer.isApplying) void postDocument();
    });

    const saved = vscode.workspace.onDidSaveTextDocument((savedDocument) => {
      if (savedDocument.uri.toString() === document.uri.toString()) void post({ type: 'saved' });
    });

    const messages = panel.webview.onDidReceiveMessage(async (message: BoardClientMessage) => {
      switch (message.type) {
        case 'ready':
          await postDocument();
          break;
        case 'update':
          void writer.write(serializeBoard({ version: 1, elements: message.elements }));
          break;
        case 'save':
          await writer.saveNow();
          break;
      }
    });

    panel.onDidDispose(() => {
      disposed = true;
      writer.dispose();
      changed.dispose();
      saved.dispose();
      messages.dispose();
    });
  }

  private html(webview: vscode.Webview): string {
    return webviewHtml({
      webview,
      extensionUri: this.context.extensionUri,
      locale: resolveLocale(),
      bundle: 'board',
      title: 'Dev Notes'
    });
  }
}
