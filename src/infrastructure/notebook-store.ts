import * as vscode from 'vscode';
import { LocalizedError } from '../core/i18n/catalog';
import type { BoardSummary, NotebookSummary, NoteSummary } from '../core/types';
import { compareNames } from '../core/utils';
import {
  boardFileName,
  boardSearchText,
  boardTitle,
  emptyBoard,
  isBoardFile,
  parseBoard,
  serializeBoard
} from '../domain/boards';
import { noteSearchText, noteSnippet } from '../domain/markdown';
import {
  applyNoteTemplate,
  isNoteFile,
  noteFileName,
  noteTitle,
  requireNoteFileName,
  requireValidName,
  sameName
} from '../domain/notes';
import type { AttachmentStore } from './attachment-store';

interface NotebookLocation {
  name: string;
  uri: vscode.Uri;
}

interface EntryLocation {
  fileName: string;
  uri: vscode.Uri;
}

interface CreatedEntry {
  notebook: string;
  uri: vscode.Uri;
}

/**
 * Every read and write of the notes folder. Business rules live in `domain`, so
 * this layer only resolves locations and talks to the VS Code file system.
 */
export class NotebookStore {
  constructor(
    private readonly storageRoot: () => vscode.Uri,
    private readonly attachments: AttachmentStore
  ) {}

  async root(): Promise<vscode.Uri> {
    const root = this.storageRoot();
    await vscode.workspace.fs.createDirectory(root);

    return root;
  }

  async readAll(): Promise<NotebookSummary[]> {
    const root = await this.root();
    const names = (await childNames(root, vscode.FileType.Directory)).sort(compareNames);
    const notebooks: NotebookSummary[] = [];

    for (const name of names) {
      const notebookUri = vscode.Uri.joinPath(root, name);
      const fileNames = (await childNames(notebookUri, vscode.FileType.File)).sort(compareNames);
      const notes: NoteSummary[] = [];
      const boards: BoardSummary[] = [];

      for (const fileName of fileNames) {
        if (isNoteFile(fileName)) {
          const content = await readText(vscode.Uri.joinPath(notebookUri, fileName));
          notes.push({
            fileName,
            title: noteTitle(fileName),
            snippet: noteSnippet(content),
            searchText: noteSearchText(content)
          });
          continue;
        }
        if (isBoardFile(fileName)) {
          boards.push(await this.readBoardSummary(notebookUri, fileName));
        }
      }
      notebooks.push({ name, notes, boards });
    }

    return notebooks;
  }

  /** A broken board still appears in the sidebar, so it can be renamed or deleted. */
  private async readBoardSummary(notebookUri: vscode.Uri, fileName: string): Promise<BoardSummary> {
    const summary = { fileName, title: boardTitle(fileName), elements: 0, searchText: '' };
    try {
      const board = parseBoard(await readText(vscode.Uri.joinPath(notebookUri, fileName)));

      return { ...summary, elements: board.elements.length, searchText: boardSearchText(board) };
    } catch {
      return summary;
    }
  }

  async createNotebook(rawName: string): Promise<string> {
    const root = await this.root();
    const name = requireValidName(rawName, await childNames(root, vscode.FileType.Directory));
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(root, name));

    return name;
  }

  /** Creates the note, creating its notebook first when the name is new. */
  async createNote(rawNotebook: string, rawTitle: string, template: string): Promise<CreatedEntry> {
    const notebook = await this.requireOrCreateNotebook(rawNotebook);
    const titles = (await childNames(notebook.uri, vscode.FileType.File)).filter(isNoteFile).map(noteTitle);
    const title = requireValidName(rawTitle, titles);
    const uri = vscode.Uri.joinPath(notebook.uri, noteFileName(title));
    await vscode.workspace.fs.writeFile(uri, Buffer.from(applyNoteTemplate(template, title), 'utf8'));

    return { notebook: notebook.name, uri };
  }

  /** Creates an empty board next to the notes of its notebook. */
  async createBoard(rawNotebook: string, rawTitle: string): Promise<CreatedEntry> {
    const notebook = await this.requireOrCreateNotebook(rawNotebook);
    const titles = (await childNames(notebook.uri, vscode.FileType.File)).filter(isBoardFile).map(boardTitle);
    const title = requireValidName(rawTitle, titles);
    const uri = vscode.Uri.joinPath(notebook.uri, boardFileName(title));
    await vscode.workspace.fs.writeFile(uri, Buffer.from(serializeBoard(emptyBoard()), 'utf8'));

    return { notebook: notebook.name, uri };
  }

  private async requireOrCreateNotebook(rawNotebook: string): Promise<NotebookLocation> {
    const root = await this.root();
    const notebooks = await childNames(root, vscode.FileType.Directory);
    const requested = rawNotebook.trim();
    const existing = notebooks.find((name) => sameName(name, requested));
    const name = existing ?? requireValidName(requested, notebooks);
    const uri = vscode.Uri.joinPath(root, name);
    if (!existing) await vscode.workspace.fs.createDirectory(uri);

    return { name, uri };
  }

  async renameNotebook(currentName: string, rawName: string): Promise<string> {
    const root = await this.root();
    const notebook = await this.requireNotebook(currentName);
    const siblings = (await childNames(root, vscode.FileType.Directory)).filter((name) => !sameName(name, notebook.name));
    const name = requireValidName(rawName, siblings);
    await rename(notebook.uri, vscode.Uri.joinPath(root, name));

    return name;
  }

  async renameNote(notebookName: string, fileName: string, rawTitle: string): Promise<string> {
    const notebook = await this.requireNotebook(notebookName);
    const note = await this.requireNote(notebook, fileName);
    const siblings = (await childNames(notebook.uri, vscode.FileType.File))
      .filter((name) => isNoteFile(name) && !sameName(name, note.fileName))
      .map(noteTitle);
    const title = requireValidName(rawTitle, siblings);
    const renamedUri = vscode.Uri.joinPath(notebook.uri, noteFileName(title));
    await rename(note.uri, renamedUri);
    await this.attachments.renameNote(note.uri, renamedUri);

    return notebook.name;
  }

  async renameBoard(notebookName: string, fileName: string, rawTitle: string): Promise<string> {
    const notebook = await this.requireNotebook(notebookName);
    const board = await this.requireBoard(notebook, fileName);
    const siblings = (await childNames(notebook.uri, vscode.FileType.File))
      .filter((name) => isBoardFile(name) && !sameName(name, board.fileName))
      .map(boardTitle);
    const title = requireValidName(rawTitle, siblings);
    await rename(board.uri, vscode.Uri.joinPath(notebook.uri, boardFileName(title)));

    return notebook.name;
  }

  async deleteNotebook(notebookName: string): Promise<void> {
    const notebook = await this.requireNotebook(notebookName);
    await vscode.workspace.fs.delete(notebook.uri, { recursive: true, useTrash: true });
  }

  async deleteNote(notebookName: string, fileName: string): Promise<string> {
    const notebook = await this.requireNotebook(notebookName);
    const note = await this.requireNote(notebook, fileName);
    await this.attachments.deleteNote(note.uri);
    await vscode.workspace.fs.delete(note.uri, { recursive: false, useTrash: true });

    return notebook.name;
  }

  async deleteBoard(notebookName: string, fileName: string): Promise<string> {
    const notebook = await this.requireNotebook(notebookName);
    const board = await this.requireBoard(notebook, fileName);
    await vscode.workspace.fs.delete(board.uri, { recursive: false, useTrash: true });

    return notebook.name;
  }

  async noteUri(notebookName: string, fileName: string): Promise<vscode.Uri> {
    const notebook = await this.requireNotebook(notebookName);

    return (await this.requireNote(notebook, fileName)).uri;
  }

  async boardUri(notebookName: string, fileName: string): Promise<vscode.Uri> {
    const notebook = await this.requireNotebook(notebookName);

    return (await this.requireBoard(notebook, fileName)).uri;
  }

  private async requireNotebook(rawName: string): Promise<NotebookLocation> {
    const root = await this.root();
    const requested = requireValidName(rawName, []);
    const name = (await childNames(root, vscode.FileType.Directory)).find((candidate) => sameName(candidate, requested));
    if (!name) throw new LocalizedError('errors.notebookMissing');

    return { name, uri: vscode.Uri.joinPath(root, name) };
  }

  private async requireNote(notebook: NotebookLocation, rawFileName: string): Promise<EntryLocation> {
    const requested = requireNoteFileName(rawFileName);

    return this.requireEntry(notebook, requested);
  }

  private async requireBoard(notebook: NotebookLocation, rawFileName: string): Promise<EntryLocation> {
    const requested = requireValidName(rawFileName, []);
    if (!isBoardFile(requested)) throw new LocalizedError('errors.invalidBoardFile');

    return this.requireEntry(notebook, requested);
  }

  private async requireEntry(notebook: NotebookLocation, requested: string): Promise<EntryLocation> {
    const fileName = (await childNames(notebook.uri, vscode.FileType.File)).find((candidate) => sameName(candidate, requested));
    if (!fileName) throw new LocalizedError('errors.noteMissing');

    return { fileName, uri: vscode.Uri.joinPath(notebook.uri, fileName) };
  }
}

async function childNames(uri: vscode.Uri, type: vscode.FileType): Promise<string[]> {
  const entries = await vscode.workspace.fs.readDirectory(uri);

  return entries.filter(([, childType]) => childType === type).map(([name]) => name);
}

async function readText(uri: vscode.Uri): Promise<string> {
  return Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
}

/** Renames through a workspace edit so open editors follow the file. */
async function rename(source: vscode.Uri, target: vscode.Uri): Promise<void> {
  const edit = new vscode.WorkspaceEdit();
  edit.renameFile(source, target, { overwrite: false });
  if (!await vscode.workspace.applyEdit(edit)) throw new LocalizedError('errors.renameFailed');
}
