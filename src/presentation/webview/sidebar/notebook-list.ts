import type { BoardSummary, NotebookSummary, NoteSummary } from '@/core/types';
import { button, element, iconButton } from '@/presentation/webview/components/dom';
import { icon } from '@/presentation/webview/components/icons';
import { count, t } from '@/presentation/webview/i18n/messages';

export interface ListHandlers {
  toggle(notebook: string): void;
  openNote(notebook: string, note: NoteSummary): void;
  openBoard(notebook: string, board: BoardSummary): void;
  createNote(notebook: string): void;
  createNotebook(): void;
  openNotebookMenu(notebook: NotebookSummary, anchor: HTMLElement): void;
  openNoteMenu(notebook: NotebookSummary, note: NoteSummary, anchor: HTMLElement): void;
  openBoardMenu(notebook: NotebookSummary, board: BoardSummary, anchor: HTMLElement): void;
}

export interface ListView {
  notebooks: NotebookSummary[];
  query: string;
  expanded: Set<string>;
}

interface VisibleNotebook {
  notebook: NotebookSummary;
  notes: NoteSummary[];
  boards: BoardSummary[];
}

/** Renders the notebook cards and the summary line above them. */
export function renderNotebooks(
  container: HTMLElement,
  summary: HTMLElement,
  view: ListView,
  handlers: ListHandlers
): void {
  const query = view.query.trim().toLocaleLowerCase();
  const visible = filterNotebooks(view.notebooks, query);

  container.replaceChildren();
  for (const entry of visible) {
    container.append(notebookCard(entry, query, view.expanded, handlers));
  }

  renderSummary(summary, view.notebooks, visible, query);

  if (visible.length === 0) container.append(emptyState(query, handlers));
}

function filterNotebooks(notebooks: NotebookSummary[], query: string): VisibleNotebook[] {
  const visible: VisibleNotebook[] = [];
  const matches = (matchesNotebook: boolean, ...fields: string[]): boolean =>
    !query || matchesNotebook || fields.join(' ').toLocaleLowerCase().includes(query);

  for (const notebook of notebooks) {
    const matchesNotebook = notebook.name.toLocaleLowerCase().includes(query);
    const notes = notebook.notes.filter((note) => matches(matchesNotebook, note.title, note.searchText));
    const boards = notebook.boards.filter((board) => matches(matchesNotebook, board.title, board.searchText));
    if (query && !matchesNotebook && notes.length === 0 && boards.length === 0) continue;
    visible.push({ notebook, notes, boards });
  }

  return visible;
}

function notebookCard(
  { notebook, notes, boards }: VisibleNotebook,
  query: string,
  expanded: Set<string>,
  handlers: ListHandlers
): HTMLElement {
  const section = element('section', `notebook${expanded.has(notebook.name) || query ? ' open' : ''}`);

  const toggle = button({ className: 'notebook-toggle' }, () => handlers.toggle(notebook.name));
  const chevron = element('span', 'chevron');
  chevron.append(icon('chevron'));
  const badge = element('span', 'folder-badge');
  badge.append(icon('folder'));
  const copy = element('span', 'notebook-copy');
  copy.append(element('span', 'notebook-name', notebook.name), element('span', 'count', entryCount(notebook)));
  toggle.append(chevron, badge, copy);

  const actions = element('div', 'row-actions');
  actions.append(
    iconButton('plus', t('sidebar.newNoteIn', { notebook: notebook.name }), () => handlers.createNote(notebook.name)),
    iconButton('more', t('sidebar.moreActions'), (event) =>
      handlers.openNotebookMenu(notebook, event.currentTarget as HTMLElement))
  );

  const head = element('div', 'notebook-head');
  head.append(toggle, actions);

  const list = element('div', 'notes');
  if (notes.length === 0 && boards.length === 0) {
    list.append(element('div', 'empty-notes', query ? t('sidebar.noMatches') : t('sidebar.emptyNotebook')));
  }
  for (const note of notes) {
    list.append(noteRow(notebook, note, handlers));
  }
  for (const board of boards) {
    list.append(boardRow(notebook, board, handlers));
  }

  section.append(head, list);

  return section;
}

/** Notebooks report notes and boards separately, since they are different work. */
function entryCount(notebook: NotebookSummary): string {
  const notes = count('sidebar.noteCount', notebook.notes.length);
  if (notebook.boards.length === 0) return notes;

  return `${notes} · ${count('sidebar.boardCount', notebook.boards.length)}`;
}

function noteRow(notebook: NotebookSummary, note: NoteSummary, handlers: ListHandlers): HTMLElement {
  const row = element('div', 'note-row');
  const open = button({ className: 'note-open' }, () => handlers.openNote(notebook.name, note));
  const copy = element('div', 'note-copy');
  copy.append(element('div', 'note-title', note.title));
  if (note.snippet && note.snippet.toLocaleLowerCase() !== note.title.toLocaleLowerCase()) {
    copy.append(element('div', 'note-snippet', note.snippet));
  }
  open.append(icon('note'), copy);

  const actions = element('div', 'row-actions');
  actions.append(iconButton('more', t('sidebar.moreActions'), (event) =>
    handlers.openNoteMenu(notebook, note, event.currentTarget as HTMLElement)));

  row.append(open, actions);

  return row;
}

function boardRow(notebook: NotebookSummary, board: BoardSummary, handlers: ListHandlers): HTMLElement {
  const row = element('div', 'note-row board-row');
  const open = button({ className: 'note-open' }, () => handlers.openBoard(notebook.name, board));
  const copy = element('div', 'note-copy');
  copy.append(
    element('div', 'note-title', board.title),
    element('div', 'note-snippet', board.elements ? count('sidebar.elementCount', board.elements) : t('sidebar.emptyBoard'))
  );
  open.append(icon('board'), copy);

  const actions = element('div', 'row-actions');
  actions.append(iconButton('more', t('sidebar.moreActions'), (event) =>
    handlers.openBoardMenu(notebook, board, event.currentTarget as HTMLElement)));

  row.append(open, actions);

  return row;
}

function renderSummary(
  summary: HTMLElement,
  notebooks: NotebookSummary[],
  visible: VisibleNotebook[],
  query: string
): void {
  summary.replaceChildren();
  if (notebooks.length === 0) return;

  const totalNotes = notebooks.reduce((total, notebook) => total + notebook.notes.length, 0);
  const matchedNotes = visible.reduce((total, entry) => total + entry.notes.length + entry.boards.length, 0);
  const left = query ? count('sidebar.resultCount', matchedNotes) : count('sidebar.notebookCount', notebooks.length);
  const right = query ? count('sidebar.groupCount', visible.length) : count('sidebar.noteCount', totalNotes);

  summary.append(element('span', undefined, left), element('span', undefined, right));
}

function emptyState(query: string, handlers: ListHandlers): HTMLElement {
  const empty = element('div', 'empty');
  const visual = element('div', 'empty-visual');
  const glyph = element('div', 'empty-notebook-icon');
  glyph.append(icon(query ? 'search' : 'note'));
  visual.append(glyph);
  if (!query) visual.append(element('span', 'spark one'), element('span', 'spark two'));

  empty.append(
    visual,
    element('strong', undefined, query ? t('sidebar.searchEmptyTitle') : t('sidebar.emptyTitle')),
    element('p', undefined, query ? t('sidebar.searchEmptyText') : t('sidebar.emptyText'))
  );

  if (!query) {
    empty.append(button({ className: 'primary-action', text: t('sidebar.emptyAction') }, () => handlers.createNotebook()));
  }

  return empty;
}
