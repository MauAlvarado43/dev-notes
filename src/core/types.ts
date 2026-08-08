export type AppLocale = 'en' | 'es';

/** What a sidebar action targets. Notes and boards are both notebook entries. */
export type EntryKind = 'notebook' | 'note' | 'board';

export interface NoteSummary {
  fileName: string;
  title: string;
  snippet: string;
  searchText: string;
}

export interface BoardSummary {
  fileName: string;
  title: string;
  elements: number;
  searchText: string;
}

export interface NotebookSummary {
  name: string;
  notes: NoteSummary[];
  boards: BoardSummary[];
}

export type BoardElementKind = 'pen' | 'rectangle' | 'ellipse' | 'arrow' | 'line' | 'text';

export interface BoardElement {
  id: string;
  kind: BoardElementKind;
  color: string;
  width: number;
  /** Flat `[x0, y0, x1, y1, …]`. Shapes use two corners, text uses one anchor. */
  points: number[];
  filled?: boolean;
  text?: string;
}

export interface BoardDocument {
  version: number;
  elements: BoardElement[];
}

export interface NoteAttachment {
  name: string;
  size: number;
  image: boolean;
}

/** Messages the sidebar webview sends to the extension host. */
export type SidebarClientMessage =
  | { type: 'ready' }
  | { type: 'refresh' }
  | { type: 'openStorage' }
  | { type: 'createNotebook'; name: string }
  | { type: 'createNote'; notebook: string; title: string }
  | { type: 'createBoard'; notebook: string; title: string }
  | { type: 'rename'; kind: EntryKind; notebook: string; fileName?: string; name: string }
  | { type: 'delete'; kind: EntryKind; notebook: string; fileName?: string }
  | { type: 'openNote'; notebook: string; fileName: string }
  | { type: 'openBoard'; notebook: string; fileName: string };

/** Messages the extension host sends to the sidebar webview. */
export type SidebarHostMessage =
  | { type: 'data'; locale: AppLocale; notebooks: NotebookSummary[] }
  | { type: 'showComposer'; kind: EntryKind }
  | { type: 'focusSearch' }
  | { type: 'operationDone'; notebook?: string }
  | { type: 'formError'; message: string }
  | { type: 'toast'; message: string };

/** Messages the note editor webview sends to the extension host. */
export type EditorClientMessage =
  | { type: 'ready' }
  | { type: 'edit'; text: string }
  | { type: 'save' }
  | { type: 'copy'; text: string }
  | { type: 'openLink'; href: string }
  | { type: 'attachFiles' }
  | { type: 'openAttachment'; name: string }
  | { type: 'removeAttachment'; name: string };

/** Messages the extension host sends to the note editor webview. */
export type EditorHostMessage =
  | {
      type: 'update';
      locale: AppLocale;
      notebook: string;
      title: string;
      text: string;
      rendered: string;
      dirty: boolean;
      attachments: NoteAttachment[];
    }
  | { type: 'saved' }
  | { type: 'error' };

/** Messages the board webview sends to the extension host. */
export type BoardClientMessage =
  | { type: 'ready' }
  | { type: 'update'; elements: BoardElement[] }
  | { type: 'save' };

/** Messages the extension host sends to the board webview. */
export type BoardHostMessage =
  | {
      type: 'document';
      locale: AppLocale;
      notebook: string;
      title: string;
      elements: BoardElement[];
      dirty: boolean;
    }
  | { type: 'saved' }
  | { type: 'error'; message?: string };
