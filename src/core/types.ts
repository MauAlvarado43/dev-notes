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

/** Shapes drawn from two corners. Everything past `ellipse` is a diagram shape. */
export type BoardShapeKind =
  | 'rectangle'
  | 'roundRect'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'parallelogram'
  | 'hexagon'
  | 'cylinder'
  | 'note'
  | 'umlClass'
  | 'entity'
  | 'package'
  | 'actor';

export type BoardElementKind = 'pen' | 'line' | 'arrow' | 'connector' | 'text' | 'image' | BoardShapeKind;

export type BoardExportFormat = 'png' | 'svg';

/** Line ending, so one connector covers flowchart, UML, and ER notations. */
export type BoardCap = 'none' | 'arrow' | 'triangle' | 'diamond' | 'filledDiamond' | 'circle' | 'one' | 'many';

export type BoardRoute = 'straight' | 'elbow';

/** Side of an element a connector docks to. `auto` picks the side facing the peer. */
export type BoardAnchor = 'auto' | 'top' | 'right' | 'bottom' | 'left';

/**
 * End of a connector. A bound end follows its element, so moving a shape reroutes
 * every relation touching it; a free end keeps the coordinates in `points`.
 */
export interface BoardEndpoint {
  element?: string;
  anchor?: BoardAnchor;
}

export interface BoardElement {
  id: string;
  kind: BoardElementKind;
  color: string;
  width: number;
  /** Flat `[x0, y0, x1, y1, …]`. Shapes use two corners, text uses one anchor. */
  points: number[];
  filled?: boolean;
  /** Free text for a text element, and the label of a shape or a connector. */
  text?: string;
  /** Degrees clockwise around the center of the element. */
  rotation?: number;
  dash?: boolean;
  from?: BoardEndpoint;
  to?: BoardEndpoint;
  startCap?: BoardCap;
  endCap?: BoardCap;
  route?: BoardRoute;
  /** File name of an image element, stored in the folder of the board. */
  src?: string;
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
  | { type: 'edit'; text: string; revision: number }
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
      revision: number;
      updateId: number;
      locale: AppLocale;
      notebook: string;
      title: string;
      text: string;
      rendered: string;
      dirty: boolean;
      attachments: NoteAttachment[];
    }
  | { type: 'saved'; text: string; revision: number }
  | { type: 'error' };

/** Messages the board webview sends to the extension host. */
export type BoardClientMessage =
  | { type: 'ready' }
  | { type: 'update'; elements: BoardElement[] }
  | { type: 'save' }
  /** Opens the file picker and copies the chosen images next to the board. */
  | { type: 'pickImages' }
  /** An image pasted or dropped on the canvas, as base64 with its file name. */
  | { type: 'addImage'; name: string; data: string }
  | { type: 'requestExport'; format: BoardExportFormat }
  | { type: 'export'; format: BoardExportFormat; data: string };

/** Messages the extension host sends to the board webview. */
export type BoardHostMessage =
  | {
      type: 'document';
      locale: AppLocale;
      notebook: string;
      title: string;
      elements: BoardElement[];
      dirty: boolean;
      /** Webview URI of every image the board references, keyed by file name. */
      assets: Record<string, string>;
    }
  /** Images just stored, ready to be placed on the canvas, keyed by file name. */
  | { type: 'images'; assets: Record<string, string> }
  /** Images as data URIs, so the webview can build a standalone export. */
  | { type: 'exportAssets'; format: BoardExportFormat; assets: Record<string, string> }
  | { type: 'saved' }
  | { type: 'error'; message?: string };
