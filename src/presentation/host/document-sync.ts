import * as vscode from 'vscode';
import { LocalizedError } from '../../core/i18n/catalog';

const DEFAULT_SAVE_DELAY_MS = 650;

interface WriterOptions {
  autoSave: () => boolean;
  /** Runs after the document caught up with the webview. */
  onApplied?: () => void | Promise<void>;
  onError: (error: unknown) => void | Promise<void>;
  saveDelayMs?: number;
}

/**
 * Writes webview state into the `TextDocument` behind a custom editor. Both the
 * note and the board editor drive a document this way: the newest text wins,
 * intermediate keystrokes and strokes are superseded, and saving is debounced.
 */
export class DocumentWriter {
  private pending?: string;
  private applying = false;
  private queue = Promise.resolve();
  private saveTimer?: NodeJS.Timeout;
  private disposed = false;

  constructor(private readonly document: vscode.TextDocument, private readonly options: WriterOptions) {}

  /** True while an edit of ours is being applied, so echoes can be ignored. */
  get isApplying(): boolean {
    return this.applying;
  }

  write(text: string): Promise<void> {
    this.pending = text;

    return this.flush();
  }

  flush(): Promise<void> {
    this.queue = this.queue.then(() => this.apply(), () => this.apply());

    return this.queue;
  }

  async saveNow(): Promise<void> {
    this.clearTimer();
    await this.flush();
    await this.document.save();
  }

  dispose(): void {
    this.disposed = true;
    this.clearTimer();
    if (!this.options.autoSave()) return;

    void this.queue.then(async () => {
      if (this.document.isDirty) await this.document.save();
    });
  }

  private async apply(): Promise<void> {
    if (this.applying) return;
    this.applying = true;
    try {
      while (this.pending !== undefined) {
        const next = this.pending;
        this.pending = undefined;
        if (next === this.document.getText()) continue;

        const lastLine = this.document.lineAt(this.document.lineCount - 1);
        const wholeDocument = new vscode.Range(0, 0, lastLine.lineNumber, lastLine.range.end.character);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(this.document.uri, wholeDocument, next);
        if (!await vscode.workspace.applyEdit(edit)) throw new LocalizedError('errors.updateFailed');
      }
      this.scheduleSave();
      await this.options.onApplied?.();
    } catch (error) {
      await this.options.onError(error);
    } finally {
      this.applying = false;
    }
  }

  private scheduleSave(): void {
    if (!this.options.autoSave()) return;
    this.clearTimer();
    this.saveTimer = setTimeout(async () => {
      this.saveTimer = undefined;
      if (!this.disposed && this.document.isDirty) await this.document.save();
    }, this.options.saveDelayMs ?? DEFAULT_SAVE_DELAY_MS);
  }

  private clearTimer(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = undefined;
  }
}
