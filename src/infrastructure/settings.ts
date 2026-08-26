import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import * as fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { defaultLocale, isAppLocale } from '../core/i18n/catalog';
import type { AppLocale } from '../core/types';

export const CONFIGURATION_SECTION = 'devNotes';
const DEFAULT_NOTE_TEMPLATE = '# ${title}\\n\\n';

function configuration(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(CONFIGURATION_SECTION);
}

/** Interface language. Unknown values fall back to English instead of failing. */
export function resolveLocale(): AppLocale {
  const configured = configuration().get<string>('language', defaultLocale);

  return isAppLocale(configured) ? configured : defaultLocale;
}

export function noteTemplate(): string {
  return configuration().get<string>('noteTemplate', DEFAULT_NOTE_TEMPLATE);
}

export function autoSaveEnabled(): boolean {
  return configuration().get<boolean>('autoSave', true);
}

/**
 * Whether a note opened as plain text should be reopened in the Dev Notes editor.
 * VS Code falls back to the text editor after a rename or when a note is opened
 * from outside the sidebar, which otherwise breaks the reading experience.
 */
export function reopenNotesEnabled(): boolean {
  return configuration().get<boolean>('reopenNotesInEditor', true);
}

/**
 * Notebook location in the active private generation. Legacy storagePath is
 * handled once by migrateNotebookStorage, never used as the live data directory.
 */
export function resolveStorageRoot(context: vscode.ExtensionContext, root = context.globalStorageUri): vscode.Uri {
  return vscode.Uri.joinPath(root, 'notebooks');
}

/** Copy legacy custom storage once, leaving its source untouched. Never merge silently. */
export async function migrateNotebookStorage(root: vscode.Uri): Promise<void> {
  const marker = path.join(root.fsPath, 'notes-migration.json');
  try { await fs.access(marker); return; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const configured = configuration().get<string>('storagePath', '').trim();
  const target = path.join(root.fsPath, 'notebooks');
  if (configured) {
    const expanded = configured === '~' ? os.homedir() : configured.startsWith('~/') || configured.startsWith('~\\') ? path.join(os.homedir(), configured.slice(2)) : configured;
    const source = path.resolve(expanded);
    if (source !== target) {
      let contents: string[] = [];
      try { contents = await fs.readdir(target); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      if (contents.length) throw new Error('Both private and custom notebooks exist. Back up both and clear devNotes.storagePath to use private notes; no files were overwritten.');
      const staging = path.join(root.fsPath, 'notebooks-migration-' + randomUUID());
      try {
        await fs.cp(source, staging, { recursive: true, errorOnExist: true, force: false });
        await fs.rename(staging, target);
      } finally { await fs.rm(staging, { recursive: true, force: true }); }
    }
  }
  await fs.mkdir(target, { recursive: true, mode: 0o700 });
  await fs.writeFile(marker, JSON.stringify({ complete: true }), { mode: 0o600 });
}
