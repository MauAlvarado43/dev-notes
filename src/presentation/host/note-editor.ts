import * as path from 'node:path';
import * as vscode from 'vscode';
import { localizeError, translate } from '../../core/i18n/catalog';
import type { EditorClientMessage, EditorHostMessage } from '../../core/types';
import { renderMarkdown } from '../../domain/markdown';
import { isNoteFile, noteTitle } from '../../domain/notes';
import type { AttachmentStore } from '../../infrastructure/attachment-store';
import { resolveInsideRoot } from '../../infrastructure/note-locations';
import { autoSaveEnabled, resolveLocale } from '../../infrastructure/settings';
import { DocumentWriter } from './document-sync';
import { webviewHtml } from './webview-html';

const ALLOWED_LINK_SCHEMES = ['https', 'http', 'mailto'];

/**
 * Opens notes in a reading-first Markdown surface with live editing, instead of
 * the plain text editor plus a separate preview tab.
 */
export class NoteEditorProvider implements vscode.CustomTextEditorProvider {
  static readonly viewType = 'devNotes.editor';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly attachments: AttachmentStore,
    private readonly storageRoot: () => vscode.Uri
  ) {}

  async resolveCustomTextEditor(document: vscode.TextDocument, panel: vscode.WebviewPanel): Promise<void> {
    const note = document.uri;
    panel.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri, this.storageRoot()]
    };
    panel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'dev-notes-mark.svg');
    panel.webview.html = this.html(panel.webview);

    let disposed = false;
    let revision = 0;
    let updateId = 0;

    const post = async (message: EditorHostMessage): Promise<void> => {
      if (!disposed) await panel.webview.postMessage(message);
    };

    const postUpdate = async (): Promise<void> => {
      const text = document.getText();
      await post({
        type: 'update',
        revision,
        updateId: ++updateId,
        locale: resolveLocale(),
        notebook: path.basename(path.dirname(note.fsPath)),
        title: noteTitle(path.basename(note.fsPath)),
        text,
        rendered: this.renderNote(text, panel.webview, note),
        dirty: document.isDirty,
        attachments: await this.attachments.list(note)
      });
    };

    const writer = new DocumentWriter(document, {
      autoSave: autoSaveEnabled,
      onApplied: postUpdate,
      onError: () => post({ type: 'error' })
    });

    const changed = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() === document.uri.toString() && !writer.isEcho(event.document.getText())) void postUpdate();
    });

    const saved = vscode.workspace.onDidSaveTextDocument((savedDocument) => {
      if (savedDocument.uri.toString() === document.uri.toString()) void post({ type: 'saved', text: savedDocument.getText(), revision });
    });

    const messages = panel.webview.onDidReceiveMessage(async (message: EditorClientMessage) => {
      try {
        switch (message.type) {
          case 'ready':
            await postUpdate();
            break;
          case 'edit':
            revision = message.revision;
            void writer.write(message.text);
            break;
          case 'save':
            await writer.saveNow();
            break;
          case 'copy':
            await vscode.env.clipboard.writeText(message.text);
            break;
          case 'openLink':
            await this.openLink(message.href, note);
            break;
          case 'attachFiles':
            if (await this.attachFiles(note)) await postUpdate();
            break;
          case 'openAttachment':
            await vscode.env.openExternal(await this.attachments.resolve(note, message.name));
            break;
          case 'removeAttachment':
            if (await this.removeAttachment(note, message.name)) await postUpdate();
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

  /** Images stored next to the note are rewritten to URIs the webview may load. */
  private renderNote(text: string, webview: vscode.Webview, note: vscode.Uri): string {
    return renderMarkdown(text).replace(/<img([^>]*?)src="([^"]*)"/g, (match, attributes: string, source: string) => {
      const resolved = this.resolveLocalPath(source, note);

      return resolved ? `<img${attributes}src="${webview.asWebviewUri(resolved)}"` : match;
    });
  }

  private async attachFiles(note: vscode.Uri): Promise<boolean> {
    const locale = resolveLocale();
    const selected = await vscode.window.showOpenDialog({
      canSelectMany: true,
      openLabel: translate(locale, 'host.selectFilesAction'),
      title: translate(locale, 'host.selectFilesTitle')
    });
    if (!selected?.length) return false;

    await this.attachments.add(note, selected);

    return true;
  }

  private async removeAttachment(note: vscode.Uri, name: string): Promise<boolean> {
    const locale = resolveLocale();
    const confirm = translate(locale, 'host.confirmRemoveAction');
    const answer = await vscode.window.showWarningMessage(
      translate(locale, 'host.confirmRemoveAttachment', { name }),
      { modal: true },
      confirm
    );
    if (answer !== confirm) return false;

    await this.attachments.remove(note, name);

    return true;
  }

  /**
   * Notes are user content, so external links are limited to well-known schemes
   * and relative links may only reach files stored inside the notes folder.
   */
  private async openLink(href: string, note: vscode.Uri): Promise<void> {
    const locale = resolveLocale();
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href)?.[1]?.toLowerCase();

    if (scheme) {
      if (!ALLOWED_LINK_SCHEMES.includes(scheme)) {
        void vscode.window.showWarningMessage(translate(locale, 'host.blockedLink', { scheme }));

        return;
      }
      try {
        await vscode.env.openExternal(vscode.Uri.parse(href, true));
      } catch {
        void vscode.window.showWarningMessage(translate(locale, 'host.invalidLink'));
      }

      return;
    }

    const target = this.resolveLocalPath(href, note);
    if (!target) {
      void vscode.window.showWarningMessage(translate(locale, 'host.blockedPath'));

      return;
    }

    if (isNoteFile(target.path)) {
      await vscode.commands.executeCommand('vscode.openWith', target, NoteEditorProvider.viewType, { preview: false });

      return;
    }
    await vscode.env.openExternal(target);
  }

  private resolveLocalPath(reference: string, note: vscode.Uri): vscode.Uri | undefined {
    return resolveInsideRoot(this.storageRoot(), note, reference);
  }

  private html(webview: vscode.Webview): string {
    return webviewHtml({
      webview,
      extensionUri: this.context.extensionUri,
      locale: resolveLocale(),
      bundle: 'editor',
      title: 'Dev Notes',
      allowImages: true
    });
  }
}
