import { defaultLocale, isAppLocale } from '@/core/i18n/catalog';
import type { BoardClientMessage, BoardElement, BoardHostMessage } from '@/core/types';
import { element } from '@/presentation/webview/components/dom';
import { icon, mountIconSprite } from '@/presentation/webview/components/icons';
import { setLocale, t } from '@/presentation/webview/i18n/messages';
import { onHostMessage, send } from '@/presentation/webview/platform/vscode';
import '@/presentation/webview/styles/base.css';
import '@/presentation/webview/styles/board.css';
import { BoardCanvas, type BoardTool } from './canvas';
import { BOARD_COLORS, BoardToolbar, STROKE_WIDTHS } from './toolbar';

const HISTORY_LIMIT = 100;

/** Single-key shortcuts, in the order of the toolbar. */
const TOOL_KEYS: Record<string, BoardTool> = {
  v: 'select',
  p: 'pen',
  r: 'rectangle',
  o: 'ellipse',
  a: 'arrow',
  l: 'line',
  t: 'text'
};

const root = document.getElementById('root') as HTMLElement;

setLocale(isAppLocale(document.documentElement.lang) ? document.documentElement.lang : defaultLocale);
mountIconSprite(root);

let history: BoardElement[][] = [[]];
let historyIndex = 0;
let color = BOARD_COLORS[0] as string;
let stroke = STROKE_WIDTHS[0] as number;

const toolbar = new BoardToolbar({
  onTool: (tool) => selectTool(tool),
  onColor: (next) => {
    color = next;
    canvas.setColor(next);
    toolbar.setColor(next);
  },
  onStroke: (width) => {
    stroke = width;
    canvas.setStroke(width);
    toolbar.setStroke(width);
  },
  onFill: (filled) => canvas.setFill(filled),
  onUndo: () => travel(-1),
  onRedo: () => travel(1),
  onDelete: () => canvas.deleteSelection(),
  onZoom: (factor) => canvas.zoomBy(factor),
  onResetView: () => canvas.resetView()
});

const canvas = new BoardCanvas({
  onCommit: (elements) => {
    record(elements);
    persist(elements);
  },
  onSelectionChange: (hasSelection) => toolbar.setSelection(hasSelection),
  onViewChange: (scale) => toolbar.setZoom(scale),
  onTextRequest: (point, screen) => openTextEditor(point, screen)
});

const banner = element('div', 'board-banner');
banner.hidden = true;
const hint = element('div', 'board-hint');
hint.append(
  element('div', 'board-hint-title', t('board.emptyTitle')),
  element('p', undefined, t('board.emptyText'))
);
const surface = element('main', 'board-surface');
canvas.node.setAttribute('aria-label', t('board.canvasLabel'));
surface.append(canvas.node, hint);

const identityTitle = element('div', 'title');
const identityEyebrow = element('div', 'eyebrow');
const identityCopy = element('div', 'identity-copy');
identityCopy.append(identityEyebrow, identityTitle);
const mark = element('div', 'note-mark');
mark.setAttribute('aria-hidden', 'true');
mark.append(icon('board'));
const identity = element('header', 'board-identity');
identity.append(mark, identityCopy);

root.append(identity, toolbar.node, banner, surface);

selectTool('pen');
canvas.setColor(color);
canvas.setStroke(stroke);
toolbar.setColor(color);
toolbar.setStroke(stroke);

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !isTyping(event.target)) {
    canvas.setSpaceHeld(true);

    return;
  }
  if (isTyping(event.target)) return;

  const shortcut = TOOL_KEYS[event.key.toLowerCase()];
  if (shortcut && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    selectTool(shortcut);

    return;
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    canvas.deleteSelection();

    return;
  }
  if (!(event.ctrlKey || event.metaKey)) return;

  const key = event.key.toLowerCase();
  if (key === 'z') {
    event.preventDefault();
    travel(event.shiftKey ? 1 : -1);
  }
  if (key === 'y') {
    event.preventDefault();
    travel(1);
  }
  if (key === 's') {
    event.preventDefault();
    post({ type: 'save' });
  }
});

document.addEventListener('keyup', (event) => {
  if (event.code === 'Space') canvas.setSpaceHeld(false);
});

onHostMessage<BoardHostMessage>((message) => {
  switch (message.type) {
    case 'document':
      setLocale(message.locale);
      identityEyebrow.textContent = message.notebook;
      identityTitle.textContent = message.title;
      banner.hidden = true;
      canvas.setElements(message.elements);
      resetHistory(message.elements);
      updateHint();
      toolbar.setStatus(message.dirty ? 'dirty' : '', message.dirty ? t('editor.statusDirty') : t('editor.statusSaved'));
      break;
    case 'saved':
      toolbar.setStatus('', t('editor.statusSaved'));
      break;
    case 'error':
      banner.textContent = message.message ?? t('board.brokenBoard');
      banner.hidden = false;
      toolbar.setStatus('error', t('editor.statusError'));
      break;
  }
});

post({ type: 'ready' });

function selectTool(tool: BoardTool): void {
  canvas.setTool(tool);
  toolbar.setTool(tool);
}

/** Text is typed in an overlay input placed where the canvas was clicked. */
function openTextEditor(point: { x: number; y: number }, screen: { left: number; top: number }): void {
  const input = element('input', 'board-text-input');
  input.placeholder = t('board.textPlaceholder');
  input.style.left = `${screen.left}px`;
  input.style.top = `${screen.top}px`;
  input.style.color = color;

  const close = (): void => input.remove();
  const commit = (): void => {
    const text = input.value.trim();
    close();
    if (!text) return;
    canvas.addElement({ id: createId(), kind: 'text', color, width: stroke, points: [point.x, point.y], text });
    updateHint();
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') commit();
    if (event.key === 'Escape') close();
  });
  input.addEventListener('blur', commit);

  document.body.append(input);
  input.focus();
}

function record(elements: BoardElement[]): void {
  history = [...history.slice(0, historyIndex + 1), elements].slice(-HISTORY_LIMIT);
  historyIndex = history.length - 1;
  updateHistory();
  updateHint();
}

function resetHistory(elements: BoardElement[]): void {
  history = [elements];
  historyIndex = 0;
  updateHistory();
}

function travel(step: number): void {
  const next = historyIndex + step;
  const elements = history[next];
  if (!elements) return;

  historyIndex = next;
  canvas.setElements(elements);
  updateHistory();
  updateHint();
  persist(elements);
}

function updateHistory(): void {
  toolbar.setHistory(historyIndex > 0, historyIndex < history.length - 1);
}

function updateHint(): void {
  hint.hidden = canvas.getElements().length > 0;
}

function persist(elements: BoardElement[]): void {
  toolbar.setStatus('saving', t('editor.statusSaving'));
  post({ type: 'update', elements });
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === 'INPUT' || target.isContentEditable);
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function post(message: BoardClientMessage): void {
  send(message);
}
