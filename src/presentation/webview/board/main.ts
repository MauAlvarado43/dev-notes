import { defaultLocale, isAppLocale } from '@/core/i18n/catalog';
import type {
  BoardClientMessage,
  BoardElement,
  BoardExportFormat,
  BoardHostMessage,
  BoardRoute
} from '@/core/types';
import { element } from '@/presentation/webview/components/dom';
import { icon, mountIconSprite } from '@/presentation/webview/components/icons';
import { setLocale, t } from '@/presentation/webview/i18n/messages';
import { onHostMessage, send } from '@/presentation/webview/platform/vscode';
import '@/presentation/webview/styles/base.css';
import '@/presentation/webview/styles/board.css';
import { BoardCanvas, type BoardTool, type TextRequest } from './canvas';
import { RELATION_PRESETS } from './connectors';
import { boardPng, boardSvg, svgSize } from './export';
import { ShortcutHelp } from './shortcut-help';
import { findShortcut } from './shortcuts';
import { openTextEditor } from './text-editor';
import { BOARD_COLORS, BoardToolbar, STROKE_WIDTHS } from './toolbar';

const HISTORY_LIMIT = 100;
const NUDGE = 1;
const NUDGE_FAR = 10;
const PASTE_OFFSET = 16;

const root = document.getElementById('root') as HTMLElement;

setLocale(isAppLocale(document.documentElement.lang) ? document.documentElement.lang : defaultLocale);
mountIconSprite(root);

let history: BoardElement[][] = [[]];
let historyIndex = 0;
let loaded = false;
let color = BOARD_COLORS[0] as string;
let stroke = STROKE_WIDTHS[0] as number;
let filled = false;
let dashed = false;
/** Elements copied with the keyboard, pasted back into this board. */
let clipboard: BoardElement[] = [];

const toolbar = new BoardToolbar({
  onTool: (tool) => selectTool(tool),
  onColor: applyColor,
  onStroke: applyStroke,
  onFill: applyFill,
  onDash: applyDash,
  onRelation: (id) => {
    const preset = RELATION_PRESETS.find((candidate) => candidate.id === id);
    if (!preset) return;
    canvas.setStyle({ startCap: preset.startCap, endCap: preset.endCap, dash: preset.dash });
    canvas.applyToSelection({ startCap: preset.startCap, endCap: preset.endCap, dash: preset.dash || undefined });
    toolbar.setRelation(id);
  },
  onRoute: (route: BoardRoute) => {
    canvas.setStyle({ route });
    canvas.applyToSelection({ route });
    toolbar.setRoute(route);
  },
  onUndo: () => travel(-1),
  onRedo: () => travel(1),
  onDuplicate: () => canvas.duplicateSelection(),
  onReorder: (direction) => canvas.reorderSelection(direction),
  onDelete: () => canvas.deleteSelection(),
  onZoom: (factor) => canvas.zoomBy(factor),
  onFit: () => canvas.fitView(),
  onResetView: () => canvas.resetView(),
  onHelp: () => help.toggle(),
  onImage: () => post({ type: 'pickImages' }),
  onExport: (format) => post({ type: 'requestExport', format })
});

const canvas = new BoardCanvas({
  onCommit: (elements) => {
    record(elements);
    persist(elements);
  },
  onSelectionChange: (selected) => {
    toolbar.setSelection(selected);
    if (!selected.length) showDrawingStyle();
  },
  onViewChange: (scale) => toolbar.setZoom(scale),
  onTextRequest: (request) => editText(request)
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

const help = new ShortcutHelp();

root.append(identity, toolbar.node, banner, surface, help.node);

selectTool('select');
canvas.setStyle({ color, width: stroke });
showDrawingStyle();

document.addEventListener('keydown', (event) => {
  if (event.key === 'Shift') canvas.setShiftHeld(true);
  if (event.code === 'Space' && !isTyping(event.target)) {
    event.preventDefault();
    canvas.setSpaceHeld(true);

    return;
  }
  if (isTyping(event.target)) return;

  const shortcut = findShortcut(event);
  if (shortcut) {
    event.preventDefault();
    run(shortcut.id);

    return;
  }

  // Arrows move the selection, and are not in the table because they are a group.
  const step = event.shiftKey ? NUDGE_FAR : NUDGE;
  if (event.key === 'ArrowLeft') nudge(-step, 0, event);
  if (event.key === 'ArrowRight') nudge(step, 0, event);
  if (event.key === 'ArrowUp') nudge(0, -step, event);
  if (event.key === 'ArrowDown') nudge(0, step, event);
});

document.addEventListener('paste', (event) => {
  const files = [...(event.clipboardData?.files ?? [])];
  if (!files.length || isTyping(event.target)) return;
  event.preventDefault();
  void sendImages(files);
});

surface.addEventListener('dragover', (event) => event.preventDefault());
surface.addEventListener('drop', (event) => {
  const files = [...(event.dataTransfer?.files ?? [])];
  if (!files.length) return;
  event.preventDefault();
  void sendImages(files);
});

document.addEventListener('keyup', (event) => {
  if (event.code === 'Space') canvas.setSpaceHeld(false);
  if (event.key === 'Shift') canvas.setShiftHeld(false);
});

onHostMessage<BoardHostMessage>((message) => {
  switch (message.type) {
    case 'document':
      setLocale(message.locale);
      identityEyebrow.textContent = message.notebook;
      identityTitle.textContent = message.title;
      banner.hidden = true;
      canvas.setAssets(message.assets);
      receive(message.elements);
      toolbar.setStatus(message.dirty ? 'dirty' : '', message.dirty ? t('editor.statusDirty') : t('editor.statusSaved'));
      break;
    case 'images':
      canvas.addImages(message.assets);
      break;
    case 'exportAssets':
      void exportBoard(message.format, message.assets);
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

/** Runs a shortcut by its id in the table. Tools share the `tool.` prefix. */
function run(id: string): void {
  if (id.startsWith('tool.')) {
    selectTool(id.slice('tool.'.length) as BoardTool);

    return;
  }

  const actions: Record<string, () => void> = {
    shapes: () => toolbar.openShapes(),
    selectAll: () => canvas.selectAll(),
    deselect: () => dismiss(),
    editText: () => canvas.editSelection(),
    duplicate: () => canvas.duplicateSelection(),
    copy: () => copySelection(),
    cut: () => {
      copySelection();
      canvas.deleteSelection();
    },
    paste: () => canvas.insertElements(clipboard, PASTE_OFFSET),
    delete: () => canvas.deleteSelection(),
    bringToFront: () => canvas.reorderSelection('front'),
    sendToBack: () => canvas.reorderSelection('back'),
    undo: () => travel(-1),
    redo: () => travel(1),
    fill: () => applyFill(!filled),
    dash: () => applyDash(!dashed),
    strokeThin: () => applyStroke(STROKE_WIDTHS[0] as number),
    strokeMedium: () => applyStroke(STROKE_WIDTHS[1] as number),
    strokeThick: () => applyStroke(STROKE_WIDTHS[2] as number),
    nextColor: () => stepColor(),
    zoomIn: () => canvas.zoomBy(1.2),
    zoomOut: () => canvas.zoomBy(1 / 1.2),
    resetView: () => canvas.resetView(),
    fitView: () => canvas.fitView(),
    insertImage: () => post({ type: 'pickImages' }),
    exportBoard: () => toolbar.openExport(),
    help: () => help.toggle(),
    save: () => post({ type: 'save' })
  };

  actions[id]?.();
}

/**
 * Builds the picture out of the elements, with the images the host inlined, and
 * hands the bytes back for saving. An empty board says so instead of writing a
 * blank file.
 */
async function exportBoard(format: BoardExportFormat, assets: Record<string, string>): Promise<void> {
  const elements = canvas.getElements();
  if (!elements.length) {
    showBanner(t('board.exportEmpty'));

    return;
  }

  try {
    const byId = (id: string): BoardElement | undefined => elements.find((element) => element.id === id);
    const source = boardSvg(elements, byId, assets);
    if (format === 'svg') {
      post({ type: 'export', format, data: source });

      return;
    }

    const { width, height } = svgSize(source);
    post({ type: 'export', format, data: await boardPng(source, width, height) });
  } catch {
    showBanner(t('board.exportFailed'));
  }
}

function showBanner(message: string): void {
  banner.textContent = message;
  banner.hidden = false;
}

/** Images arriving from the clipboard or a drop are stored by the host first. */
async function sendImages(files: readonly File[]): Promise<void> {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const data = await file.arrayBuffer();
    post({ type: 'addImage', name: file.name || imageName(file.type), data: toBase64(data) });
  }
}

function imageName(mime: string): string {
  const extension = mime.slice('image/'.length).split('+')[0] || 'png';

  return `pasted-${Date.now().toString(36)}.${extension}`;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary);
}

function dismiss(): void {
  if (help.isOpen) {
    help.close();

    return;
  }
  toolbar.dismiss();
  canvas.clearSelection();
}

function copySelection(): void {
  const picked = canvas.selectedElements;
  if (picked.length) clipboard = picked;
}

function stepColor(): void {
  const next = BOARD_COLORS[(BOARD_COLORS.indexOf(color) + 1) % BOARD_COLORS.length];
  if (next) applyColor(next);
}

function nudge(dx: number, dy: number, event: KeyboardEvent): void {
  event.preventDefault();
  canvas.nudgeSelection(dx, dy);
}

function selectTool(tool: BoardTool): void {
  canvas.setTool(tool);
  toolbar.setTool(tool);
}

/**
 * Style changes travel the same path from the toolbar and from the keyboard:
 * they set what the next element will look like, and repaint the selection.
 */
function applyColor(next: string): void {
  color = next;
  canvas.setStyle({ color: next });
  canvas.applyToSelection({ color: next });
  toolbar.setColor(next);
}

function applyStroke(width: number): void {
  stroke = width;
  canvas.setStyle({ width });
  canvas.applyToSelection({ width });
  toolbar.setStroke(width);
}

function applyFill(next: boolean): void {
  filled = next;
  canvas.setStyle({ filled: next });
  canvas.applyToSelection({ filled: next || undefined });
  toolbar.setFill(next);
}

function applyDash(next: boolean): void {
  dashed = next;
  canvas.setStyle({ dash: next });
  canvas.applyToSelection({ dash: next || undefined });
  toolbar.setDash(next);
}

/** With nothing selected the style row shows what the next stroke will look like. */
function showDrawingStyle(): void {
  toolbar.setColor(color);
  toolbar.setStroke(stroke);
  toolbar.setFill(filled);
  toolbar.setDash(dashed);
}

function editText(request: TextRequest): void {
  openTextEditor(request, (value) => canvas.applyText({ id: request.id, point: request.point }, value));
}

/**
 * A document from the host is either the first load, an echo of what was just
 * drawn, or an edit made elsewhere. Only the first load clears the history, so
 * autosaving a board no longer takes undo away from the person drawing it.
 */
function receive(elements: BoardElement[]): void {
  if (!loaded) {
    loaded = true;
    canvas.setElements(elements);
    history = [elements];
    historyIndex = 0;
    updateHistory();
    updateHint();

    return;
  }

  if (same(elements, canvas.getElements())) return;

  canvas.setElements(elements);
  record(elements);
}

function record(elements: BoardElement[]): void {
  if (same(elements, history[historyIndex] ?? [])) return;
  history = [...history.slice(0, historyIndex + 1), elements].slice(-HISTORY_LIMIT);
  historyIndex = history.length - 1;
  updateHistory();
  updateHint();
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

function same(left: BoardElement[], right: BoardElement[]): boolean {
  return left.length === right.length && JSON.stringify(left) === JSON.stringify(right);
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
}

function post(message: BoardClientMessage): void {
  send(message);
}
