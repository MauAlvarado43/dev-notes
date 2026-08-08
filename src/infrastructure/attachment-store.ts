import * as vscode from 'vscode';
import { LocalizedError } from '../core/i18n/catalog';
import type { NoteAttachment } from '../core/types';
import { compareNames } from '../core/utils';
import { ATTACHMENTS_DIRECTORY, attachmentFolder, isImageAttachment, uniqueAttachmentName } from '../domain/attachments';

/**
 * Files attached to a note. Every attachment is copied into the notes folder, so
 * the note keeps working when the original file is moved or deleted.
 */
export class AttachmentStore {
  /** `<notebook>/.attachments/<note title>/` for the given note. */
  folder(noteUri: vscode.Uri): vscode.Uri {
    const notebook = uriDirectory(noteUri);
    const fileName = basename(noteUri);

    return vscode.Uri.joinPath(notebook, ATTACHMENTS_DIRECTORY, attachmentFolder(fileName));
  }

  async list(noteUri: vscode.Uri): Promise<NoteAttachment[]> {
    const folder = this.folder(noteUri);
    const entries = await readDirectory(folder);
    const attachments: NoteAttachment[] = [];

    for (const [name, type] of entries) {
      if (type !== vscode.FileType.File) continue;
      const stat = await vscode.workspace.fs.stat(vscode.Uri.joinPath(folder, name));
      attachments.push({ name, size: stat.size, image: isImageAttachment(name) });
    }

    return attachments.sort((a, b) => compareNames(a.name, b.name));
  }

  /** Copies each source into the note folder and returns the stored names. */
  async add(noteUri: vscode.Uri, sources: readonly vscode.Uri[]): Promise<string[]> {
    const folder = this.folder(noteUri);
    await vscode.workspace.fs.createDirectory(folder);
    const taken = (await readDirectory(folder)).map(([name]) => name);
    const stored: string[] = [];

    for (const source of sources) {
      const name = uniqueAttachmentName(basename(source), [...taken, ...stored]);
      await vscode.workspace.fs.copy(source, vscode.Uri.joinPath(folder, name), { overwrite: false });
      stored.push(name);
    }

    return stored;
  }

  /** Stores bytes that never were a file, such as an image pasted on a board. */
  async write(noteUri: vscode.Uri, files: ReadonlyArray<{ name: string; data: string }>): Promise<string[]> {
    const folder = this.folder(noteUri);
    await vscode.workspace.fs.createDirectory(folder);
    const taken = (await readDirectory(folder)).map(([entry]) => entry);
    const stored: string[] = [];

    for (const file of files) {
      const name = uniqueAttachmentName(file.name, [...taken, ...stored]);
      await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder, name), Buffer.from(file.data, 'base64'));
      stored.push(name);
    }

    return stored;
  }

  async remove(noteUri: vscode.Uri, name: string): Promise<void> {
    await vscode.workspace.fs.delete(await this.resolve(noteUri, name), { recursive: false, useTrash: true });
  }

  /** Resolves an attachment by name, rejecting anything that is not stored here. */
  async resolve(noteUri: vscode.Uri, name: string): Promise<vscode.Uri> {
    const folder = this.folder(noteUri);
    const stored = (await readDirectory(folder)).find(([entry, type]) =>
      type === vscode.FileType.File && entry.toLowerCase() === name.toLowerCase());
    if (!stored) throw new LocalizedError('errors.attachmentMissing');

    return vscode.Uri.joinPath(folder, stored[0]);
  }

  /** Keeps attachments with their note when it is renamed. */
  async renameNote(noteUri: vscode.Uri, renamedUri: vscode.Uri): Promise<void> {
    const source = this.folder(noteUri);
    if (!await exists(source)) return;

    await vscode.workspace.fs.rename(source, this.folder(renamedUri), { overwrite: false });
  }

  async deleteNote(noteUri: vscode.Uri): Promise<void> {
    const folder = this.folder(noteUri);
    if (!await exists(folder)) return;

    await vscode.workspace.fs.delete(folder, { recursive: true, useTrash: true });
  }
}

function basename(uri: vscode.Uri): string {
  return uri.path.slice(uri.path.lastIndexOf('/') + 1);
}

function uriDirectory(uri: vscode.Uri): vscode.Uri {
  return vscode.Uri.joinPath(uri, '..');
}

/** Missing folders are normal: a note only gets one once something is attached. */
async function readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
  try {
    return await vscode.workspace.fs.readDirectory(uri);
  } catch {
    return [];
  }
}

async function exists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);

    return true;
  } catch {
    return false;
  }
}
