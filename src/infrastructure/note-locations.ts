import * as path from 'node:path';
import * as vscode from 'vscode';

/** True when `target` lives inside the notes folder. */
export function isInsideRoot(root: vscode.Uri, target: vscode.Uri): boolean {
  const relative = path.relative(path.resolve(root.fsPath), path.resolve(target.fsPath));

  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * Resolves a reference written inside a note, and only when it stays in the notes
 * folder. Absolute references, other schemes, and paths that climb out return
 * `undefined`, so a note cannot reach arbitrary files on the machine.
 */
export function resolveInsideRoot(root: vscode.Uri, note: vscode.Uri, reference: string): vscode.Uri | undefined {
  if (!reference || reference.startsWith('#') || reference.startsWith('//')) return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(reference)) return undefined;

  let decoded: string;
  try {
    decoded = decodeURI(reference.split(/[?#]/)[0] ?? '');
  } catch {
    return undefined;
  }

  const target = vscode.Uri.file(path.resolve(path.dirname(note.fsPath), decoded));

  return isInsideRoot(root, target) ? target : undefined;
}
