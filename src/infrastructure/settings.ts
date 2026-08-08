import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
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
 * Folder holding every notebook. An empty setting keeps notes inside the private
 * extension storage; a configured path may start with `~` for the home folder.
 */
export function resolveStorageRoot(context: vscode.ExtensionContext): vscode.Uri {
  const configured = configuration().get<string>('storagePath', '').trim();
  if (!configured) return vscode.Uri.joinPath(context.globalStorageUri, 'notebooks');

  const expanded = configured === '~'
    ? os.homedir()
    : configured.startsWith(`~${path.sep}`) || configured.startsWith('~/')
      ? path.join(os.homedir(), configured.slice(2))
      : configured;

  return vscode.Uri.file(path.resolve(expanded));
}
