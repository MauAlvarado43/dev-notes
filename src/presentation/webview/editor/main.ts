import { defaultLocale, isAppLocale } from '@/core/i18n/catalog';
import type { EditorClientMessage, EditorHostMessage } from '@/core/types';
import { wordCount } from '@/core/utils';
import { button, element } from '@/presentation/webview/components/dom';
import { icon, mountIconSprite } from '@/presentation/webview/components/icons';
import { count, setLocale, t } from '@/presentation/webview/i18n/messages';
import { onHostMessage, readState, send, writeState } from '@/presentation/webview/platform/vscode';
import '@/presentation/webview/styles/base.css';
import '@/presentation/webview/styles/markdown.css';
import '@/presentation/webview/styles/editor.css';
import { renderAttachments } from './attachments';
import { EditorSync } from './sync';

const sync = new EditorSync();

const COPY_FEEDBACK_MS = 1200;
/** Sentinel that marks where a message places an inline element. */
const ACTION_TOKEN = String.fromCharCode(1);

type Mode = 'read' | 'edit';
type StatusKind = '' | 'saving' | 'dirty' | 'error';

interface PersistedState {
  mode: Mode;
}

const root = document.getElementById('root') as HTMLElement;

setLocale(isAppLocale(document.documentElement.lang) ? document.documentElement.lang : defaultLocale);
mountIconSprite(root);

const eyebrow = element('div', 'eyebrow');
const title = element('div', 'title');
const identityCopy = element('div', 'identity-copy');
identityCopy.append(eyebrow, title);
const mark = element('div', 'note-mark');
mark.setAttribute('aria-hidden', 'true');
mark.append(icon('note'));
const identity = element('div', 'identity');
identity.append(mark, identityCopy);

const readButton = button({ className: 'mode-button', text: t('editor.read') }, () => setMode('read'));
const editButton = button({ className: 'mode-button', text: t('editor.edit') }, () => setMode('edit', true));
readButton.setAttribute('role', 'tab');
editButton.setAttribute('role', 'tab');
const segmented = element('div', 'segmented');
segmented.setAttribute('role', 'tablist');
segmented.setAttribute('aria-label', t('editor.modeLabel'));
segmented.append(readButton, editButton);

const statusDot = element('span', 'status-dot');
const statusText = element('span', undefined, t('editor.statusSaved'));
const status = element('div', 'status');
status.append(statusDot, statusText);

const attachButton = button({ className: 'attach-button', icon: 'paperclip', label: t('attachments.attach') }, () =>
  post({ type: 'attachFiles' }));

const toolbar = element('div', 'toolbar');
toolbar.append(attachButton, segmented, status);
const topbar = element('header', 'topbar');
topbar.append(identity, toolbar);

const attachments = element('section', 'attachments');
attachments.hidden = true;

const readPreview = element('article', 'read-surface markdown-body');
const readLayout = element('main', 'read-layout');
readLayout.append(readPreview);

const wordCountLabel = element('span', 'word-count');
const editorLabel = element('div', 'pane-label');
editorLabel.append(element('span', undefined, t('editor.markdown')), wordCountLabel);
const editor = element('textarea');
editor.id = 'editor';
editor.spellcheck = true;
editor.setAttribute('aria-label', t('editor.editorLabel'));
const editorPane = element('section', 'pane');
editorPane.append(editorLabel, editor);

const previewLabel = element('div', 'pane-label');
previewLabel.append(element('span', undefined, t('editor.preview')), element('span', undefined, t('editor.live')));
const editPreview = element('article', 'markdown-body');
const livePreview = element('div', 'live-preview');
livePreview.append(editPreview);
const previewPane = element('section', 'pane');
previewPane.append(previewLabel, livePreview);

const editLayout = element('main', 'edit-layout');
editLayout.hidden = true;
editLayout.append(editorPane, previewPane);

root.append(topbar, attachments, readLayout, editLayout);

editor.addEventListener('input', () => {
  updateWordCount();
  setStatus('saving', t('editor.statusSaving'));
  post({ type: 'edit', text: editor.value, revision: sync.edit() });
});

editor.addEventListener('keydown', (event) => {
  if (event.key === 'Tab') {
    event.preventDefault();
    editor.setRangeText('  ', editor.selectionStart, editor.selectionEnd, 'end');
    editor.dispatchEvent(new Event('input'));
  }
  if (isShortcut(event, 's')) {
    event.preventDefault();
    post({ type: 'edit', text: editor.value, revision: sync.edit() });
    post({ type: 'save' });
  }
  if (isShortcut(event, 'e')) {
    event.preventDefault();
    setMode('read');
  }
  if (event.key === 'Escape') setMode('read');
});

window.addEventListener('keydown', (event) => {
  if (isShortcut(event, 'e') && editLayout.hidden) {
    event.preventDefault();
    setMode('edit', true);
  }
});

onHostMessage<EditorHostMessage>((message) => {
  switch (message.type) {
    case 'update':
      if (!sync.accept(message.revision, message.updateId)) break;
      setLocale(message.locale);
      eyebrow.textContent = message.notebook;
      title.textContent = message.title;
      if (editor.value !== message.text) editor.value = message.text;
      setRendered(message.rendered);
      renderAttachments(attachments, message.title, message.attachments, {
        open: (name) => post({ type: 'openAttachment', name }),
        remove: (name) => post({ type: 'removeAttachment', name }),
        insert: insertInNote
      });
      updateWordCount();
      setStatus(message.dirty ? 'dirty' : '', message.dirty ? t('editor.statusDirty') : t('editor.statusSaved'));
      break;
    case 'saved':
      if (message.revision !== sync.revision || message.text !== editor.value) break;
      setStatus('', t('editor.statusSaved'));
      break;
    case 'error':
      setStatus('error', t('editor.statusError'));
      break;
  }
});

setMode(readState<PersistedState>().mode === 'edit' ? 'edit' : 'read');
updateWordCount();
post({ type: 'ready' });

function setMode(mode: Mode, focusEditor = false): void {
  const editing = mode === 'edit';
  readLayout.hidden = editing;
  editLayout.hidden = !editing;
  readButton.classList.toggle('active', !editing);
  editButton.classList.toggle('active', editing);
  readButton.setAttribute('aria-selected', String(!editing));
  editButton.setAttribute('aria-selected', String(editing));
  writeState<PersistedState>({ mode });
  if (editing && focusEditor) {
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
  }
}

/** The host renders Markdown with raw HTML disabled, so the output is inert. */
function setRendered(html: string): void {
  for (const surface of [readPreview, editPreview]) {
    if (html.trim()) {
      surface.innerHTML = html;
      enhance(surface);
    } else {
      surface.replaceChildren(emptyState());
    }
  }
}

/** The `{action}` placeholder becomes a `<kbd>`, so the sentence is split around it. */
function emptyState(): HTMLElement {
  const [before = '', after = ''] = t('editor.emptyText', { action: ACTION_TOKEN }).split(ACTION_TOKEN);
  const hint = element('div');
  hint.append(document.createTextNode(before), element('kbd', undefined, t('editor.edit')), document.createTextNode(after));
  const card = element('div', 'empty-card');
  card.append(element('div', 'empty-title', t('editor.emptyTitle')), hint);
  const empty = element('div', 'empty');
  empty.append(card);

  return empty;
}

/** Adds copy buttons to code blocks and routes links through the host. */
function enhance(surface: HTMLElement): void {
  for (const block of surface.querySelectorAll('pre')) {
    const code = block.querySelector('code');
    if (!code || block.querySelector('.copy-code')) continue;
    const copy = button({ className: 'copy-code', text: t('editor.copy'), label: t('editor.copyCodeLabel') }, () => {
      post({ type: 'copy', text: code.textContent ?? '' });
      copy.textContent = t('editor.copied');
      setTimeout(() => { copy.textContent = t('editor.copy'); }, COPY_FEEDBACK_MS);
    });
    block.append(copy);
  }
  for (const link of surface.querySelectorAll('a[href]')) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      post({ type: 'openLink', href: link.getAttribute('href') ?? '' });
    });
  }
}

/** Inserts an attachment reference at the cursor, or at the end while reading. */
function insertInNote(markdown: string): void {
  if (editLayout.hidden) {
    const separator = !editor.value || editor.value.endsWith('\n\n') ? '' : editor.value.endsWith('\n') ? '\n' : '\n\n';
    editor.value += `${separator}${markdown}\n`;
  } else {
    editor.setRangeText(markdown, editor.selectionStart, editor.selectionEnd, 'end');
    editor.focus();
  }
  editor.dispatchEvent(new Event('input'));
}

function updateWordCount(): void {
  wordCountLabel.textContent = count('editor.wordCount', wordCount(editor.value));
}

function setStatus(kind: StatusKind, text: string): void {
  status.className = `status${kind ? ` ${kind}` : ''}`;
  statusText.textContent = text;
}

function isShortcut(event: KeyboardEvent, key: string): boolean {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === key;
}

function post(message: EditorClientMessage): void {
  send(message);
}
