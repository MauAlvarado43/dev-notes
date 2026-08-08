import { defaultLocale, isAppLocale } from '@/core/i18n/catalog';
import type {
  BoardSummary,
  EntryKind,
  NotebookSummary,
  NoteSummary,
  SidebarClientMessage,
  SidebarHostMessage
} from '@/core/types';
import { button, element } from '@/presentation/webview/components/dom';
import { icon, mountIconSprite } from '@/presentation/webview/components/icons';
import { setLocale, t } from '@/presentation/webview/i18n/messages';
import { onHostMessage, readState, send, writeState } from '@/presentation/webview/platform/vscode';
import '@/presentation/webview/styles/base.css';
import '@/presentation/webview/styles/components.css';
import '@/presentation/webview/styles/sidebar.css';
import { Composer, type ComposerKind, type ComposerTarget } from './composer';
import { ContextMenu } from './context-menu';
import { renderNotebooks } from './notebook-list';

const TOAST_DURATION_MS = 4000;

interface PersistedState {
  expanded: string[];
}

/** Commands ask for a composer by entry kind. */
const composerKinds: Record<EntryKind, ComposerKind> = {
  notebook: 'createNotebook',
  note: 'createNote',
  board: 'createBoard'
};

const root = document.getElementById('root') as HTMLElement;

// The shell renders before the first payload, so the locale comes from the document.
setLocale(isAppLocale(document.documentElement.lang) ? document.documentElement.lang : defaultLocale);

const state = {
  notebooks: [] as NotebookSummary[],
  expanded: new Set(readState<PersistedState>().expanded ?? []),
  query: ''
};

mountIconSprite(root);

const search = element('input', 'search');
search.type = 'search';
search.placeholder = t('sidebar.searchPlaceholder');
search.setAttribute('aria-label', t('sidebar.searchLabel'));

const clearSearch = button({ className: 'clear-search', icon: 'close', label: t('sidebar.clearSearch') }, () => {
  search.value = '';
  state.query = '';
  clearSearch.hidden = true;
  search.focus();
  render();
});
clearSearch.hidden = true;

const searchWrap = element('div', 'search-wrap');
const searchIcon = icon('search');
searchIcon.classList.add('search-icon');
searchWrap.append(searchIcon, search, clearSearch);

// Notes are created from the + of a notebook, so this button adds notebooks.
const newNotebook = button({ className: 'new-notebook', icon: 'plus', label: t('sidebar.newNotebook') }, () =>
  openComposer('createNotebook', {}));

const controls = element('div', 'controls');
controls.append(searchWrap, newNotebook);

const brandMark = element('div', 'brand-mark');
brandMark.append(icon('logo'));
const brandCopy = element('div', 'brand-copy');
brandCopy.append(
  element('h1', 'brand-title', t('sidebar.brandTitle')),
  element('p', 'brand-subtitle', t('sidebar.brandSubtitle'))
);
const brand = element('header', 'brand');
brand.append(brandMark, brandCopy);

const summary = element('div', 'summary');
const notebooks = element('div', 'notebooks');
const content = element('div', 'content');
content.append(summary, notebooks);

const openStorage = button({ className: 'storage', icon: 'external', text: t('sidebar.openStorage') }, () =>
  post({ type: 'openStorage' }));
const footer = element('div', 'footer');
footer.append(openStorage);

const app = element('div', 'app');
app.append(brand, controls, content, footer);

const menuRoot = element('div');
const toast = element('div', 'toast');
toast.hidden = true;
root.append(app, menuRoot, toast);

const menu = new ContextMenu(menuRoot);
const composer = new Composer(root, submitComposer);

search.addEventListener('input', () => {
  state.query = search.value;
  clearSearch.hidden = !state.query;
  render();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  menu.close();
  if (composer.isOpen) composer.close();
});

onHostMessage<SidebarHostMessage>((message) => {
  switch (message.type) {
    case 'data': {
      setLocale(message.locale);
      const wasEmpty = state.notebooks.length === 0;
      state.notebooks = message.notebooks;
      const first = state.notebooks[0];
      if (wasEmpty && state.expanded.size === 0 && first) state.expanded.add(first.name);
      render();
      break;
    }
    case 'showComposer':
      openComposer(composerKinds[message.kind], {});
      break;
    case 'focusSearch':
      search.focus();
      search.select();
      break;
    case 'operationDone':
      if (message.notebook) state.expanded.add(message.notebook);
      persist();
      composer.close();
      render();
      break;
    case 'formError':
      composer.showError(message.message);
      break;
    case 'toast':
      showToast(message.message);
      break;
  }
});

render();
post({ type: 'ready' });

function render(): void {
  renderNotebooks(notebooks, summary, state, {
    toggle: (notebook) => {
      if (state.expanded.has(notebook)) state.expanded.delete(notebook);
      else state.expanded.add(notebook);
      persist();
      render();
    },
    openNote: (notebook, note) => post({ type: 'openNote', notebook, fileName: note.fileName }),
    openBoard: (notebook, board) => post({ type: 'openBoard', notebook, fileName: board.fileName }),
    createNote: (notebook) => openComposer('createNote', { notebook }),
    createNotebook: () => openComposer('createNotebook', {}),
    openNotebookMenu: (notebook, anchor) => menu.open(anchor, [
      { icon: 'plus', label: t('sidebar.newNote'), action: () => openComposer('createNote', { notebook: notebook.name }) },
      { icon: 'board', label: t('sidebar.newBoard'), action: () => openComposer('createBoard', { notebook: notebook.name }) },
      {
        icon: 'edit',
        label: t('sidebar.renameEntry'),
        action: () => openComposer('renameNotebook', { notebook: notebook.name, name: notebook.name })
      },
      'separator',
      {
        icon: 'trash',
        label: t('sidebar.deleteNotebook'),
        danger: true,
        action: () => openComposer('deleteNotebook', { notebook: notebook.name })
      }
    ]),
    openNoteMenu: (notebook, note, anchor) => menu.open(anchor, [
      { icon: 'edit', label: t('sidebar.renameEntry'), action: () => openComposer('renameNote', target(notebook, note)) },
      'separator',
      {
        icon: 'trash',
        label: t('sidebar.deleteNote'),
        danger: true,
        action: () => openComposer('deleteNote', target(notebook, note))
      }
    ]),
    openBoardMenu: (notebook, board, anchor) => menu.open(anchor, [
      { icon: 'edit', label: t('sidebar.renameEntry'), action: () => openComposer('renameBoard', target(notebook, board)) },
      'separator',
      {
        icon: 'trash',
        label: t('sidebar.deleteBoard'),
        danger: true,
        action: () => openComposer('deleteBoard', target(notebook, board))
      }
    ])
  });
}

function target(notebook: NotebookSummary, entry: BoardSummary | NoteSummary): ComposerTarget {
  return { notebook: notebook.name, fileName: entry.fileName, name: entry.title };
}

function openComposer(kind: ComposerKind, payload: ComposerTarget): void {
  menu.close();
  composer.open(kind, payload, state.notebooks);
}

function submitComposer(kind: ComposerKind, payload: ComposerTarget, values: Record<string, string>): void {
  const notebook = payload.notebook ?? '';
  switch (kind) {
    case 'createNotebook':
      post({ type: 'createNotebook', name: values.name ?? '' });
      break;
    case 'createNote':
      post({ type: 'createNote', notebook: values.notebook ?? notebook, title: values.title ?? '' });
      break;
    case 'createBoard':
      post({ type: 'createBoard', notebook: values.notebook ?? notebook, title: values.title ?? '' });
      break;
    case 'renameNotebook':
      post({ type: 'rename', kind: 'notebook', notebook, name: values.name ?? '' });
      break;
    case 'renameNote':
      post({ type: 'rename', kind: 'note', notebook, fileName: payload.fileName, name: values.name ?? '' });
      break;
    case 'renameBoard':
      post({ type: 'rename', kind: 'board', notebook, fileName: payload.fileName, name: values.name ?? '' });
      break;
    case 'deleteNotebook':
      post({ type: 'delete', kind: 'notebook', notebook });
      break;
    case 'deleteNote':
      post({ type: 'delete', kind: 'note', notebook, fileName: payload.fileName });
      break;
    case 'deleteBoard':
      post({ type: 'delete', kind: 'board', notebook, fileName: payload.fileName });
      break;
  }
}

function showToast(message: string): void {
  toast.textContent = message;
  toast.hidden = false;
  setTimeout(() => { toast.hidden = true; }, TOAST_DURATION_MS);
}

function persist(): void {
  writeState<PersistedState>({ expanded: Array.from(state.expanded) });
}

function post(message: SidebarClientMessage): void {
  send(message);
}
