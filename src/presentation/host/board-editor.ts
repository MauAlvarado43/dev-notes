import * as path from 'node:path';
import * as vscode from 'vscode';
import { localizeError, translate } from '../../core/i18n/catalog';
import type { BoardClientMessage, BoardExportFormat, BoardHostMessage } from '../../core/types';
import { isImageAttachment } from '../../domain/attachments';
import { boardTitle, parseBoard, serializeBoard } from '../../domain/boards';
import type { AttachmentStore } from '../../infrastructure/attachment-store';
import { autoSaveEnabled, resolveLocale } from '../../infrastructure/settings';
import { DocumentWriter } from './document-sync';
import { webviewHtml } from './webview-html';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'];
const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  avif: 'image/avif'
};

/**
 * Drawing canvas backed by a `.board.json` file. The webview owns the drawing
 * interactions and sends back the full element list, which keeps the document
 * the single source of truth and leaves file history readable.
 */
export class BoardEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'devNotes.board';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly attachments: AttachmentStore,
    private readonly storageRoot: () => vscode.Uri
  ) {}

  async resolveCustomTextEditor(document: vscode.TextDocument, panel: vscode.WebviewPanel): Promise<void> {
    const board = document.uri;
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri, this.storageRoot()]
    };
    panel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'dev-notes-mark.svg');
    panel.webview.html = this.html(panel.webview);

    let disposed = false;

    const post = async (message: BoardHostMessage): Promise<void> => {
      if (!disposed) await panel.webview.postMessage(message);
    };

    const postDocument = async (): Promise<void> => {
      const locale = resolveLocale();
      try {
        const elements = parseBoard(document.getText()).elements;
        await post({
          type: 'document',
          locale,
          notebook: path.basename(path.dirname(board.fsPath)),
          title: boardTitle(path.basename(board.fsPath)),
          elements,
          dirty: document.isDirty,
          assets: await this.imageUris(panel.webview, board, elements.map((element) => element.src))
        });
      } catch (error) {
        await post({ type: 'error', message: localizeError(error, locale) });
      }
    };

    const writer = new DocumentWriter(document, {
      autoSave: autoSaveEnabled,
      onError: (error) => post({ type: 'error', message: localizeError(error, resolveLocale()) })
    });

    // Changes from outside the canvas, such as an undo in VS Code, redraw it. Our
    // own writes are skipped, so autosaving never resends what the canvas drew.
    const changed = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() !== document.uri.toString()) return;
      if (writer.isEcho(event.document.getText())) return;
      void postDocument();
    });

    const saved = vscode.workspace.onDidSaveTextDocument((savedDocument) => {
      if (savedDocument.uri.toString() === document.uri.toString()) void post({ type: 'saved' });
    });

    const messages = panel.webview.onDidReceiveMessage(async (message: BoardClientMessage) => {
      try {
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
          case 'pickImages': {
            const names = await this.pickImages(board);
            if (names.length) await post({ type: 'images', assets: await this.imageUris(panel.webview, board, names) });
            break;
          }
          case 'addImage': {
            const names = await this.attachments.write(board, [{ name: message.name, data: message.data }]);
            if (names.length) await post({ type: 'images', assets: await this.imageUris(panel.webview, board, names) });
            break;
          }
          case 'requestExport':
            await post({
              type: 'exportAssets',
              format: message.format,
              assets: await this.imageData(board, parseBoard(document.getText()).elements.map((item) => item.src))
            });
            break;
          case 'export':
            await this.saveExport(board, message.format, message.data);
            break;
        }
      } catch (error) {
        const locale = resolveLocale();
        void vscode.window.showErrorMessage(
          translate(locale, 'host.errorPrefix', { message: localizeError(error, locale) })
        );
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

  private async pickImages(board: vscode.Uri): Promise<string[]> {
    const locale = resolveLocale();
    const selected = await vscode.window.showOpenDialog({
      canSelectMany: true,
      openLabel: translate(locale, 'host.selectImagesAction'),
      title: translate(locale, 'host.selectImagesTitle'),
      filters: { [translate(locale, 'host.imageFilter')]: IMAGE_EXTENSIONS }
    });
    if (!selected?.length) return [];

    return this.attachments.add(board, selected);
  }

  /** Webview URIs for the images a board draws, so the canvas can show them. */
  private async imageUris(
    webview: vscode.Webview,
    board: vscode.Uri,
    names: Array<string | undefined>
  ): Promise<Record<string, string>> {
    const assets: Record<string, string> = {};
    for (const name of unique(names)) {
      const uri = await this.resolveImage(board, name);
      if (uri) assets[name] = webview.asWebviewUri(uri).toString();
    }

    return assets;
  }

  /** The same images as data URIs, which is what a standalone export needs. */
  private async imageData(board: vscode.Uri, names: Array<string | undefined>): Promise<Record<string, string>> {
    const assets: Record<string, string> = {};
    for (const name of unique(names)) {
      const uri = await this.resolveImage(board, name);
      if (!uri) continue;
      const bytes = await vscode.workspace.fs.readFile(uri);
      assets[name] = `data:${mimeType(name)};base64,${Buffer.from(bytes).toString('base64')}`;
    }

    return assets;
  }

  private async resolveImage(board: vscode.Uri, name: string): Promise<vscode.Uri | undefined> {
    if (!isImageAttachment(name)) return undefined;
    try {
      return await this.attachments.resolve(board, name);
    } catch {
      return undefined;
    }
  }

  /** Writes the rendered board wherever the person chooses. */
  private async saveExport(board: vscode.Uri, format: BoardExportFormat, data: string): Promise<void> {
    const locale = resolveLocale();
    const suggested = `${boardTitle(path.basename(board.fsPath))}.${format}`;
    const target = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.joinPath(board, '..', suggested),
      filters: { [translate(locale, 'host.imageFilter')]: [format] }
    });
    if (!target) return;

    const bytes = format === 'svg'
      ? Buffer.from(data, 'utf8')
      : Buffer.from(data.replace(/^data:[^,]+,/, ''), 'base64');
    await vscode.workspace.fs.writeFile(target, bytes);
    void vscode.window.showInformationMessage(
      translate(locale, 'host.exportDone', { name: path.basename(target.fsPath) })
    );
  }

  private html(webview: vscode.Webview): string {
    return webviewHtml({
      webview,
      extensionUri: this.context.extensionUri,
      locale: resolveLocale(),
      bundle: 'board',
      title: 'Dev Notes',
      allowImages: true
    });
  }
}

function unique(names: Array<string | undefined>): string[] {
  return [...new Set(names.filter((name): name is string => Boolean(name)))];
}

function mimeType(name: string): string {
  const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase();

  return MIME_TYPES[extension] ?? 'application/octet-stream';
}
