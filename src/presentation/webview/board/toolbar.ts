import type { BoardElement, BoardExportFormat, BoardRoute, BoardShapeKind } from '@/core/types';
import { button, element } from '@/presentation/webview/components/dom';
import { icon, type IconName } from '@/presentation/webview/components/icons';
import { t, type MessageKey } from '@/presentation/webview/i18n/messages';
import type { BoardTool } from './canvas';
import { presetOf, RELATION_PRESETS } from './connectors';
import { SHAPE_GROUP_LABELS, SHAPES, type ShapeGroup } from './shapes';
import { displayKeys, shortcutFor, type Shortcut } from './shortcuts';

export const BOARD_COLORS = ['#7c6df2', '#4bbca2', '#e39a4d', '#db6d8e', '#52a8df', '#8a8f98'];
export const STROKE_WIDTHS = [2, 4, 8];

type StatusKind = '' | 'saving' | 'dirty' | 'error';

export interface ToolbarHandlers {
  onTool(tool: BoardTool): void;
  onColor(color: string): void;
  onStroke(width: number): void;
  onFill(filled: boolean): void;
  onDash(dash: boolean): void;
  onRelation(preset: string): void;
  onRoute(route: BoardRoute): void;
  onUndo(): void;
  onRedo(): void;
  onDuplicate(): void;
  onReorder(direction: 'front' | 'back'): void;
  onDelete(): void;
  onZoom(factor: number): void;
  onFit(): void;
  onResetView(): void;
  onHelp(): void;
  onImage(): void;
  onExport(format: BoardExportFormat): void;
}

/** Tools that are always on the bar; every shape lives in the palette instead. */
const TOOLS: Array<[BoardTool, IconName, MessageKey]> = [
  ['select', 'cursor', 'board.select'],
  ['lasso', 'lasso', 'board.lasso'],
  ['pen', 'edit', 'board.pen'],
  ['line', 'line', 'board.line'],
  ['arrow', 'arrow', 'board.arrow'],
  ['connector', 'connector', 'board.connector'],
  ['text', 'text', 'board.text']
];

const GROUP_ORDER: ShapeGroup[] = ['basic', 'flowchart', 'uml', 'er'];

/**
 * Tooltip of a control: its name, and the key that reaches it when there is one,
 * so the shortcuts are learned from the toolbar instead of the cheat sheet.
 */
function hint(key: MessageKey, shortcutId?: string): string {
  const text = t(key);
  const shortcut = shortcutId ? shortcutFor(shortcutId) : undefined;

  return shortcut ? `${text} (${displayKeys(shortcut)})` : text;
}

/**
 * Two rows: the tools on top, and the appearance of what is being drawn or is
 * selected below, so shape options are no longer mixed into the stroke picker.
 */
export class BoardToolbar {
  readonly node = element('div', 'board-bars');

  private readonly tools = new Map<BoardTool, HTMLButtonElement>();
  private readonly shapeButtons = new Map<BoardShapeKind, HTMLButtonElement>();
  private readonly colors = new Map<string, HTMLButtonElement>();
  private readonly strokes = new Map<number, HTMLButtonElement>();
  private readonly shapeTrigger: HTMLButtonElement;
  private readonly shapeIcon = element('span', 'board-shape-icon');
  private readonly palette = element('div', 'board-popover');
  private readonly exportMenu = element('div', 'board-popover board-menu');
  private readonly exportTrigger: HTMLButtonElement;
  private readonly fill: HTMLButtonElement;
  private readonly dash: HTMLButtonElement;
  private readonly relation = element('select', 'board-select');
  private readonly routeGroup = element('div', 'board-group');
  private readonly routes = new Map<BoardRoute, HTMLButtonElement>();
  private readonly relationGroup = element('div', 'board-group');
  private readonly undo: HTMLButtonElement;
  private readonly redo: HTMLButtonElement;
  private readonly duplicate: HTMLButtonElement;
  private readonly front: HTMLButtonElement;
  private readonly back: HTMLButtonElement;
  private readonly remove: HTMLButtonElement;
  private readonly zoomLabel = element('span', 'board-zoom-label');
  private readonly statusDot = element('span', 'status-dot');
  private readonly statusText = element('span', undefined, t('editor.statusSaved'));
  private readonly status = element('div', 'status');
  private shape: BoardShapeKind = 'rectangle';
  private tool: BoardTool = 'pen';

  constructor(private readonly handlers: ToolbarHandlers) {
    this.exportTrigger = button({ className: 'board-action', icon: 'export', label: hint('board.exportBoard', 'exportBoard') }, () =>
      this.toggleExport());
    const tools = element('header', 'board-toolbar');
    const style = element('div', 'board-style-bar');

    const toolGroup = element('div', 'board-group');
    toolGroup.setAttribute('role', 'toolbar');
    toolGroup.setAttribute('aria-label', t('board.tools'));
    for (const [tool, iconName, key] of TOOLS) {
      const node = button({ className: 'board-tool', icon: iconName, label: hint(key, `tool.${tool}`) }, () =>
        this.handlers.onTool(tool));
      this.tools.set(tool, node);
      toolGroup.append(node);
    }

    this.shapeTrigger = button({ className: 'board-tool board-shape-trigger', label: hint('board.shapes', 'shapes') }, () =>
      this.togglePalette());
    this.shapeTrigger.append(this.shapeIcon, icon('chevron'));
    this.shapeTrigger.setAttribute('aria-haspopup', 'true');
    this.shapeTrigger.setAttribute('aria-expanded', 'false');
    this.buildPalette();
    const shapeWrap = element('div', 'board-shape-wrap');
    shapeWrap.append(this.shapeTrigger, this.palette);
    toolGroup.append(shapeWrap);

    toolGroup.append(
      button({ className: 'board-tool', icon: 'image', label: hint('board.image', 'insertImage') }, () =>
        this.handlers.onImage())
    );

    const historyGroup = element('div', 'board-group');
    this.undo = button({ className: 'board-action', icon: 'undo', label: hint('board.undo', 'undo') }, () => this.handlers.onUndo());
    this.redo = button({ className: 'board-action', icon: 'redo', label: hint('board.redo', 'redo') }, () => this.handlers.onRedo());
    historyGroup.append(this.undo, this.redo);

    const viewGroup = element('div', 'board-group');
    viewGroup.append(
      button({ className: 'board-action', icon: 'zoomOut', label: hint('board.zoomOut', 'zoomOut') }, () =>
        this.handlers.onZoom(1 / 1.2)),
      this.zoomLabel,
      button({ className: 'board-action', icon: 'zoomIn', label: hint('board.zoomIn', 'zoomIn') }, () =>
        this.handlers.onZoom(1.2)),
      button({ className: 'board-action', icon: 'fit', label: hint('board.fitView', 'fitView') }, () => this.handlers.onFit()),
      button({ className: 'board-action', icon: 'frame', label: hint('board.resetView', 'resetView') }, () =>
        this.handlers.onResetView()),
      button({ className: 'board-action', icon: 'keyboard', label: hint('shortcuts.title', 'help') }, () =>
        this.handlers.onHelp()),
      this.exportWrap()
    );

    this.status.append(this.statusDot, this.statusText);
    tools.append(toolGroup, historyGroup, viewGroup, this.status);

    const colorGroup = element('div', 'board-group');
    colorGroup.setAttribute('aria-label', t('board.color'));
    for (const color of BOARD_COLORS) {
      const swatch = button({ className: 'board-swatch', label: `${color} (${displayKeys(shortcutFor('nextColor') as Shortcut)})` }, () =>
        this.handlers.onColor(color));
      swatch.style.setProperty('--swatch', color);
      this.colors.set(color, swatch);
      colorGroup.append(swatch);
    }

    const strokeGroup = element('div', 'board-group');
    strokeGroup.setAttribute('aria-label', t('board.stroke'));
    const strokeLabels: MessageKey[] = ['board.strokeThin', 'board.strokeMedium', 'board.strokeThick'];
    const strokeIds = ['strokeThin', 'strokeMedium', 'strokeThick'];
    STROKE_WIDTHS.forEach((width, index) => {
      const node = button({ className: 'board-stroke', label: hint(strokeLabels[index] ?? 'board.stroke', strokeIds[index]) }, () =>
        this.handlers.onStroke(width));
      const bar = element('span', 'board-stroke-bar');
      bar.style.height = `${width}px`;
      node.append(bar);
      this.strokes.set(width, node);
      strokeGroup.append(node);
    });

    const appearance = element('div', 'board-group');
    this.fill = button({ className: 'board-action', icon: 'fill', label: hint('board.fill', 'fill') }, () =>
      this.handlers.onFill(!this.fill.classList.contains('active')));
    this.dash = button({ className: 'board-action', icon: 'dash', label: hint('board.dashed', 'dash') }, () =>
      this.handlers.onDash(!this.dash.classList.contains('active')));
    appearance.append(this.fill, this.dash);

    this.relation.setAttribute('aria-label', t('board.relation'));
    for (const preset of RELATION_PRESETS) {
      const option = element('option', undefined, t(preset.label));
      option.value = preset.id;
      this.relation.append(option);
    }
    this.relation.addEventListener('change', () => this.handlers.onRelation(this.relation.value));
    const routeOptions: Array<[BoardRoute, IconName, MessageKey]> = [
      ['straight', 'line', 'board.routeStraight'],
      ['elbow', 'elbow', 'board.routeElbow']
    ];
    for (const [route, iconName, key] of routeOptions) {
      const node = button({ className: 'board-action', icon: iconName, label: t(key) }, () => this.handlers.onRoute(route));
      this.routes.set(route, node);
      this.routeGroup.append(node);
    }
    this.relationGroup.append(this.relation);

    const arrange = element('div', 'board-group');
    this.duplicate = button({ className: 'board-action', icon: 'copy', label: hint('board.duplicate', 'duplicate') }, () =>
      this.handlers.onDuplicate());
    this.front = button({ className: 'board-action', icon: 'front', label: hint('board.bringToFront', 'bringToFront') }, () =>
      this.handlers.onReorder('front'));
    this.back = button({ className: 'board-action', icon: 'back', label: hint('board.sendToBack', 'sendToBack') }, () =>
      this.handlers.onReorder('back'));
    this.remove = button({ className: 'board-action danger', icon: 'trash', label: hint('board.deleteSelected', 'delete') }, () =>
      this.handlers.onDelete());
    arrange.append(this.duplicate, this.front, this.back, this.remove);

    style.append(colorGroup, strokeGroup, appearance, this.relationGroup, this.routeGroup, arrange);
    this.node.append(tools, style);

    document.addEventListener('pointerdown', (event) => {
      if (!shapeWrap.contains(event.target as Node)) this.closePalette();
    });

    this.setShape(this.shape);
    this.setZoom(1);
    this.setSelection([]);
    this.setHistory(false, false);
    this.setRoute('straight');
  }

  setTool(tool: BoardTool): void {
    this.tool = tool;
    for (const [candidate, node] of this.tools) node.classList.toggle('active', candidate === tool);
    const isShape = this.shapeButtons.has(tool as BoardShapeKind);
    this.shapeTrigger.classList.toggle('active', isShape);
    if (isShape) this.setShape(tool as BoardShapeKind);
    for (const [kind, node] of this.shapeButtons) node.classList.toggle('active', kind === tool);
    this.showRelationOptions(tool === 'connector');
  }

  setColor(color: string): void {
    for (const [candidate, node] of this.colors) node.classList.toggle('active', candidate === color);
  }

  setStroke(width: number): void {
    for (const [candidate, node] of this.strokes) node.classList.toggle('active', candidate === width);
  }

  setFill(filled: boolean): void {
    this.fill.classList.toggle('active', filled);
  }

  setDash(dash: boolean): void {
    this.dash.classList.toggle('active', dash);
  }

  setRelation(preset: string): void {
    this.relation.value = preset;
  }

  setRoute(route: BoardRoute): void {
    for (const [candidate, node] of this.routes) node.classList.toggle('active', candidate === route);
  }

  dismiss(): void {
    this.closePalette();
    this.closeExport();
  }

  /** Opens the shape palette from the keyboard. */
  openShapes(): void {
    if (this.palette.hidden) this.togglePalette();
  }

  /** Offers the export formats from the keyboard, at the toolbar button. */
  openExport(): void {
    if (this.exportMenu.hidden) this.toggleExport();
  }

  /** A board is exported as a picture or as a vector, chosen in a small menu. */
  private exportWrap(): HTMLElement {
    this.exportMenu.hidden = true;
    this.exportMenu.setAttribute('role', 'menu');
    const formats: Array<[BoardExportFormat, MessageKey]> = [
      ['png', 'board.exportPng'],
      ['svg', 'board.exportSvg']
    ];
    for (const [format, label] of formats) {
      this.exportMenu.append(button({ className: 'board-menu-item', text: t(label) }, () => {
        this.closeExport();
        this.handlers.onExport(format);
      }));
    }

    this.exportTrigger.setAttribute('aria-haspopup', 'true');
    this.exportTrigger.setAttribute('aria-expanded', 'false');
    const wrap = element('div', 'board-shape-wrap');
    wrap.append(this.exportTrigger, this.exportMenu);
    document.addEventListener('pointerdown', (event) => {
      if (!wrap.contains(event.target as Node)) this.closeExport();
    });

    return wrap;
  }

  private toggleExport(): void {
    const open = this.exportMenu.hidden;
    this.exportMenu.hidden = !open;
    this.exportTrigger.setAttribute('aria-expanded', String(open));
  }

  private closeExport(): void {
    this.exportMenu.hidden = true;
    this.exportTrigger.setAttribute('aria-expanded', 'false');
  }

  /** The style row follows the selection, so editing what exists feels the same. */
  setSelection(elements: BoardElement[]): void {
    const has = elements.length > 0;
    for (const node of [this.duplicate, this.front, this.back, this.remove]) node.disabled = !has;

    const connector = elements.find((element) => element.kind === 'connector');
    this.showRelationOptions(Boolean(connector) || this.tool === 'connector');
    if (connector) {
      this.setRelation(presetOf(connector));
      this.setRoute(connector.route ?? 'straight');
    }
    if (!has) return;

    const first = elements[0] as BoardElement;
    this.setColor(first.color);
    this.setStroke(first.width);
    this.setFill(Boolean(first.filled));
    this.setDash(Boolean(first.dash));
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

  private showRelationOptions(visible: boolean): void {
    this.relationGroup.hidden = !visible;
    this.routeGroup.hidden = !visible;
  }

  private buildPalette(): void {
    this.palette.hidden = true;
    this.palette.setAttribute('role', 'menu');
    for (const group of GROUP_ORDER) {
      const shapes = SHAPES.filter((shape) => shape.group === group);
      if (!shapes.length) continue;

      const section = element('div', 'board-popover-section');
      section.append(element('div', 'board-popover-title', t(SHAPE_GROUP_LABELS[group])));
      const grid = element('div', 'board-popover-grid');
      for (const shape of shapes) {
        const node = button({ className: 'board-tool', icon: shape.icon, label: hint(shape.label, `tool.${shape.kind}`) }, () => {
          this.closePalette();
          this.handlers.onTool(shape.kind);
        });
        this.shapeButtons.set(shape.kind, node);
        grid.append(node);
      }
      section.append(grid);
      this.palette.append(section);
    }
  }

  private setShape(kind: BoardShapeKind): void {
    this.shape = kind;
    const definition = SHAPES.find((shape) => shape.kind === kind) ?? SHAPES[0];
    this.shapeIcon.replaceChildren(icon(definition?.icon ?? 'square'));
  }

  /** Opening the palette also picks the last shape, so one click is enough to draw. */
  private togglePalette(): void {
    if (!this.palette.hidden) {
      this.closePalette();

      return;
    }

    this.palette.hidden = false;
    this.shapeTrigger.setAttribute('aria-expanded', 'true');
    this.handlers.onTool(this.shape);
  }

  private closePalette(): void {
    this.palette.hidden = true;
    this.shapeTrigger.setAttribute('aria-expanded', 'false');
  }
}
