import { button, element } from '@/presentation/webview/components/dom';
import type { IconName } from '@/presentation/webview/components/icons';
import { t } from '@/presentation/webview/i18n/messages';
import type { BoardTool } from './canvas';

export const BOARD_COLORS = ['#7c6df2', '#4bbca2', '#e39a4d', '#db6d8e', '#52a8df', '#8a8f98'];
export const STROKE_WIDTHS = [2, 4, 8];

type StatusKind = '' | 'saving' | 'dirty' | 'error';

export interface ToolbarHandlers {
  onTool(tool: BoardTool): void;
  onColor(color: string): void;
  onStroke(width: number): void;
  onFill(filled: boolean): void;
  onUndo(): void;
  onRedo(): void;
  onDelete(): void;
  onZoom(factor: number): void;
  onResetView(): void;
}

const TOOLS: Array<[BoardTool, IconName, string]> = [
  ['select', 'cursor', 'board.select'],
  ['pen', 'edit', 'board.pen'],
  ['rectangle', 'square', 'board.rectangle'],
  ['ellipse', 'circle', 'board.ellipse'],
  ['arrow', 'arrow', 'board.arrow'],
  ['line', 'line', 'board.line'],
  ['text', 'text', 'board.text']
];

/** Tools, colors, stroke widths, history, and view controls for the board. */
export class BoardToolbar {
  readonly node = element('header', 'board-toolbar');

  private readonly tools = new Map<BoardTool, HTMLButtonElement>();
  private readonly colors = new Map<string, HTMLButtonElement>();
  private readonly strokes = new Map<number, HTMLButtonElement>();
  private readonly fill: HTMLButtonElement;
  private readonly undo: HTMLButtonElement;
  private readonly redo: HTMLButtonElement;
  private readonly remove: HTMLButtonElement;
  private readonly zoomLabel = element('span', 'board-zoom-label');
  private readonly statusDot = element('span', 'status-dot');
  private readonly statusText = element('span', undefined, t('editor.statusSaved'));
  private readonly status = element('div', 'status');

  constructor(private readonly handlers: ToolbarHandlers) {
    const toolGroup = element('div', 'board-group');
    toolGroup.setAttribute('role', 'toolbar');
    toolGroup.setAttribute('aria-label', t('board.tools'));
    for (const [tool, iconName, key] of TOOLS) {
      const node = button({ className: 'board-tool', icon: iconName, label: t(key as 'board.select') }, () =>
        this.handlers.onTool(tool));
      this.tools.set(tool, node);
      toolGroup.append(node);
    }

    const colorGroup = element('div', 'board-group');
    colorGroup.setAttribute('aria-label', t('board.color'));
    for (const color of BOARD_COLORS) {
      const swatch = button({ className: 'board-swatch', label: color }, () => this.handlers.onColor(color));
      swatch.style.setProperty('--swatch', color);
      this.colors.set(color, swatch);
      colorGroup.append(swatch);
    }

    const strokeGroup = element('div', 'board-group');
    strokeGroup.setAttribute('aria-label', t('board.stroke'));
    const strokeLabels = ['board.strokeThin', 'board.strokeMedium', 'board.strokeThick'] as const;
    STROKE_WIDTHS.forEach((width, index) => {
      const node = button({ className: 'board-stroke', label: t(strokeLabels[index] ?? 'board.stroke') }, () =>
        this.handlers.onStroke(width));
      const bar = element('span', 'board-stroke-bar');
      bar.style.height = `${width}px`;
      node.append(bar);
      this.strokes.set(width, node);
      strokeGroup.append(node);
    });
    this.fill = button({ className: 'board-toggle', text: t('board.fill') }, () => {
      const active = !this.fill.classList.contains('active');
      this.fill.classList.toggle('active', active);
      this.handlers.onFill(active);
    });
    strokeGroup.append(this.fill);

    const historyGroup = element('div', 'board-group');
    this.undo = button({ className: 'board-action', icon: 'undo', label: t('board.undo') }, () => this.handlers.onUndo());
    this.redo = button({ className: 'board-action', icon: 'redo', label: t('board.redo') }, () => this.handlers.onRedo());
    this.remove = button({ className: 'board-action', icon: 'trash', label: t('board.deleteSelected') }, () =>
      this.handlers.onDelete());
    historyGroup.append(this.undo, this.redo, this.remove);

    const viewGroup = element('div', 'board-group');
    viewGroup.append(
      button({ className: 'board-action', icon: 'zoomOut', label: t('board.zoomOut') }, () => this.handlers.onZoom(1 / 1.2)),
      this.zoomLabel,
      button({ className: 'board-action', icon: 'zoomIn', label: t('board.zoomIn') }, () => this.handlers.onZoom(1.2)),
      button({ className: 'board-action', icon: 'frame', label: t('board.resetView') }, () => this.handlers.onResetView())
    );

    this.status.append(this.statusDot, this.statusText);
    this.node.append(toolGroup, colorGroup, strokeGroup, historyGroup, viewGroup, this.status);

    this.setZoom(1);
    this.setSelection(false);
    this.setHistory(false, false);
  }

  setTool(tool: BoardTool): void {
    for (const [candidate, node] of this.tools) node.classList.toggle('active', candidate === tool);
  }

  setColor(color: string): void {
    for (const [candidate, node] of this.colors) node.classList.toggle('active', candidate === color);
  }

  setStroke(width: number): void {
    for (const [candidate, node] of this.strokes) node.classList.toggle('active', candidate === width);
  }

  setSelection(hasSelection: boolean): void {
    this.remove.disabled = !hasSelection;
  }

  setHistory(canUndo: boolean, canRedo: boolean): void {
    this.undo.disabled = !canUndo;
    this.redo.disabled = !canRedo;
  }

  setZoom(scale: number): void {
    this.zoomLabel.textContent = t('board.zoomLevel', { percent: Math.round(scale * 100) });
  }

  setStatus(kind: StatusKind, text: string): void {
    this.status.className = `status${kind ? ` ${kind}` : ''}`;
    this.statusText.textContent = text;
  }
}
