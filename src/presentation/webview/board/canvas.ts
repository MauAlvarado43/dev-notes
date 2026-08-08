import type { BoardElement, BoardElementKind } from '@/core/types';

export type BoardTool = 'select' | BoardElementKind;

const SVG_NS = 'http://www.w3.org/2000/svg';
const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const HIT_PADDING = 8;
const ARROW_HEAD = 14;
const TEXT_SIZE_STEP = 5;
const TEXT_BASE_SIZE = 10;
const FILL_OPACITY = 0.18;

export interface CanvasHandlers {
  /** A finished interaction: the caller records history and persists. */
  onCommit(elements: BoardElement[]): void;
  onSelectionChange(selected: boolean): void;
  onViewChange(scale: number): void;
  /** The text tool needs an editor at a screen position. */
  onTextRequest(point: BoardPoint, screen: ScreenPoint): void;
}

export interface BoardPoint {
  x: number;
  y: number;
}

export interface ScreenPoint {
  left: number;
  top: number;
}

interface Viewport {
  x: number;
  y: number;
  scale: number;
}

type Draft =
  | { mode: 'draw'; element: BoardElement }
  | { mode: 'move'; id: string; origin: BoardPoint; points: number[] }
  | { mode: 'pan'; origin: ScreenPoint; view: Viewport };

/**
 * Freeform drawing surface. Elements are plain SVG nodes so hit testing, theming,
 * and crisp zooming come from the browser instead of a redraw loop.
 */
export class BoardCanvas {
  readonly node = document.createElementNS(SVG_NS, 'svg');

  private readonly scene = document.createElementNS(SVG_NS, 'g');
  private readonly overlay = document.createElementNS(SVG_NS, 'g');
  private elements: BoardElement[] = [];
  private view: Viewport = { x: 0, y: 0, scale: 1 };
  private draft?: Draft;
  private selected?: string;
  private tool: BoardTool = 'pen';
  private color = '#7c6df2';
  private stroke = 2;
  private filled = false;
  private spaceHeld = false;

  constructor(private readonly handlers: CanvasHandlers) {
    this.node.classList.add('board-canvas');
    this.node.append(this.scene, this.overlay);
    this.applyView();

    this.node.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    this.node.addEventListener('pointermove', (event) => this.onPointerMove(event));
    this.node.addEventListener('pointerup', (event) => this.onPointerUp(event));
    this.node.addEventListener('pointercancel', () => this.cancelDraft());
    this.node.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
  }

  get scale(): number {
    return this.view.scale;
  }

  get hasSelection(): boolean {
    return this.selected !== undefined;
  }

  setTool(tool: BoardTool): void {
    this.tool = tool;
    if (tool !== 'select') this.select(undefined);
    this.node.dataset.tool = tool;
  }

  setColor(color: string): void {
    this.color = color;
  }

  setStroke(width: number): void {
    this.stroke = width;
  }

  setFill(filled: boolean): void {
    this.filled = filled;
  }

  setSpaceHeld(held: boolean): void {
    this.spaceHeld = held;
    this.node.classList.toggle('panning', held);
  }

  setElements(elements: BoardElement[]): void {
    this.elements = elements.map(cloneElement);
    if (this.selected && !this.elements.some((element) => element.id === this.selected)) this.select(undefined);
    this.render();
  }

  getElements(): BoardElement[] {
    return this.elements.map(cloneElement);
  }

  addElement(element: BoardElement): void {
    this.elements = [...this.elements, element];
    this.render();
    this.commit();
  }

  deleteSelection(): void {
    if (!this.selected) return;
    this.elements = this.elements.filter((element) => element.id !== this.selected);
    this.select(undefined);
    this.render();
    this.commit();
  }

  zoomBy(factor: number): void {
    this.zoomTo(this.view.scale * factor);
  }

  resetView(): void {
    this.view = { x: 0, y: 0, scale: 1 };
    this.applyView();
    this.handlers.onViewChange(this.view.scale);
  }

  /** Screen position of a board point, for overlays such as the text editor. */
  toScreen(point: BoardPoint): ScreenPoint {
    const rect = this.node.getBoundingClientRect();

    return {
      left: rect.left + (point.x - this.view.x) * this.view.scale,
      top: rect.top + (point.y - this.view.y) * this.view.scale
    };
  }

  private onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 && event.button !== 1) return;
    this.node.setPointerCapture?.(event.pointerId);
    const point = this.toBoard(event);

    if (event.button === 1 || this.spaceHeld) {
      this.draft = { mode: 'pan', origin: { left: event.clientX, top: event.clientY }, view: { ...this.view } };

      return;
    }

    if (this.tool === 'select') {
      const hit = this.hitTest(point);
      this.select(hit?.id);
      if (hit) this.draft = { mode: 'move', id: hit.id, origin: point, points: [...hit.points] };

      return;
    }

    if (this.tool === 'text') {
      this.handlers.onTextRequest(point, this.toScreen(point));

      return;
    }

    this.draft = { mode: 'draw', element: this.startElement(point) };
    this.render();
  }

  private onPointerMove(event: PointerEvent): void {
    const draft = this.draft;
    if (!draft) return;

    if (draft.mode === 'pan') {
      this.view = {
        ...draft.view,
        x: draft.view.x - (event.clientX - draft.origin.left) / draft.view.scale,
        y: draft.view.y - (event.clientY - draft.origin.top) / draft.view.scale
      };
      this.applyView();

      return;
    }

    const point = this.toBoard(event);
    if (draft.mode === 'draw') {
      if (draft.element.kind === 'pen') draft.element.points.push(point.x, point.y);
      else draft.element.points.splice(2, 2, point.x, point.y);
      this.render();

      return;
    }

    const moved = draft.points.map((value, index) =>
      index % 2 === 0 ? value + (point.x - draft.origin.x) : value + (point.y - draft.origin.y));
    this.elements = this.elements.map((element) =>
      element.id === draft.id ? { ...element, points: moved } : element);
    this.render();
  }

  private onPointerUp(event: PointerEvent): void {
    const draft = this.draft;
    this.node.releasePointerCapture?.(event.pointerId);
    this.draft = undefined;
    if (!draft) return;

    if (draft.mode === 'pan') {
      this.handlers.onViewChange(this.view.scale);

      return;
    }

    if (draft.mode === 'draw') {
      if (isDegenerate(draft.element)) {
        this.render();

        return;
      }
      this.elements = [...this.elements, draft.element];
    }

    this.render();
    this.commit();
  }

  private cancelDraft(): void {
    this.draft = undefined;
    this.render();
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const anchor = this.toBoard(event);
    this.zoomTo(this.view.scale * (event.deltaY < 0 ? 1.1 : 1 / 1.1), anchor);
  }

  /** Zooming keeps the anchor point, so the canvas grows around the cursor. */
  private zoomTo(scale: number, anchor?: BoardPoint): void {
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    if (anchor) {
      this.view = {
        scale: next,
        x: anchor.x - (anchor.x - this.view.x) * (this.view.scale / next),
        y: anchor.y - (anchor.y - this.view.y) * (this.view.scale / next)
      };
    } else {
      this.view = { ...this.view, scale: next };
    }
    this.applyView();
    this.handlers.onViewChange(this.view.scale);
  }

  private startElement(point: BoardPoint): BoardElement {
    const kind = this.tool === 'select' ? 'pen' : this.tool;
    const element: BoardElement = {
      id: createId(),
      kind,
      color: this.color,
      width: this.stroke,
      points: [point.x, point.y, point.x, point.y]
    };
    if (kind === 'pen') element.points = [point.x, point.y];
    if (this.filled && (kind === 'rectangle' || kind === 'ellipse')) element.filled = true;

    return element;
  }

  private select(id: string | undefined): void {
    if (this.selected === id) return;
    this.selected = id;
    this.handlers.onSelectionChange(id !== undefined);
    this.renderOverlay();
  }

  private commit(): void {
    this.handlers.onCommit(this.getElements());
  }

  private hitTest(point: BoardPoint): BoardElement | undefined {
    const padding = HIT_PADDING / this.view.scale;

    return [...this.elements].reverse().find((element) => {
      const box = boundingBox(element);

      return point.x >= box.x - padding
        && point.x <= box.x + box.width + padding
        && point.y >= box.y - padding
        && point.y <= box.y + box.height + padding;
    });
  }

  private toBoard(event: { clientX: number; clientY: number }): BoardPoint {
    const rect = this.node.getBoundingClientRect();

    return {
      x: this.view.x + (event.clientX - rect.left) / this.view.scale,
      y: this.view.y + (event.clientY - rect.top) / this.view.scale
    };
  }

  private applyView(): void {
    const { x, y, scale } = this.view;
    this.scene.setAttribute('transform', `scale(${scale}) translate(${-x} ${-y})`);
    this.overlay.setAttribute('transform', `scale(${scale}) translate(${-x} ${-y})`);
  }

  private render(): void {
    const drawing = this.draft?.mode === 'draw' ? [this.draft.element] : [];
    this.scene.replaceChildren(...[...this.elements, ...drawing].map(renderElement));
    this.renderOverlay();
  }

  private renderOverlay(): void {
    const element = this.elements.find((candidate) => candidate.id === this.selected);
    if (!element) {
      this.overlay.replaceChildren();

      return;
    }

    const box = boundingBox(element);
    const outline = document.createElementNS(SVG_NS, 'rect');
    outline.setAttribute('class', 'board-selection');
    outline.setAttribute('x', String(box.x - 6));
    outline.setAttribute('y', String(box.y - 6));
    outline.setAttribute('width', String(box.width + 12));
    outline.setAttribute('height', String(box.height + 12));
    this.overlay.replaceChildren(outline);
  }
}

function renderElement(element: BoardElement): SVGElement {
  const node = createShape(element);
  node.setAttribute('stroke', element.color);
  node.setAttribute('stroke-width', String(element.width));
  node.setAttribute('stroke-linecap', 'round');
  node.setAttribute('stroke-linejoin', 'round');
  node.setAttribute('data-id', element.id);
  if (element.kind === 'text') {
    node.setAttribute('fill', element.color);
    node.removeAttribute('stroke');
  } else if (element.filled) {
    node.setAttribute('fill', element.color);
    node.setAttribute('fill-opacity', String(FILL_OPACITY));
  } else {
    node.setAttribute('fill', 'none');
  }

  return node;
}

function createShape(element: BoardElement): SVGElement {
  const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = element.points;

  if (element.kind === 'pen' || element.kind === 'line') {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', element.kind === 'pen' ? penPath(element.points) : `M ${x0} ${y0} L ${x1} ${y1}`);

    return path;
  }

  if (element.kind === 'arrow') {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', `${`M ${x0} ${y0} L ${x1} ${y1}`} ${arrowHead(x0, y0, x1, y1)}`);

    return path;
  }

  if (element.kind === 'rectangle') {
    const rect = document.createElementNS(SVG_NS, 'rect');
    const box = normalize(x0, y0, x1, y1);
    rect.setAttribute('x', String(box.x));
    rect.setAttribute('y', String(box.y));
    rect.setAttribute('width', String(box.width));
    rect.setAttribute('height', String(box.height));
    rect.setAttribute('rx', '4');

    return rect;
  }

  if (element.kind === 'ellipse') {
    const ellipse = document.createElementNS(SVG_NS, 'ellipse');
    const box = normalize(x0, y0, x1, y1);
    ellipse.setAttribute('cx', String(box.x + box.width / 2));
    ellipse.setAttribute('cy', String(box.y + box.height / 2));
    ellipse.setAttribute('rx', String(box.width / 2));
    ellipse.setAttribute('ry', String(box.height / 2));

    return ellipse;
  }

  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', String(x0));
  text.setAttribute('y', String(y0));
  text.setAttribute('font-size', String(TEXT_BASE_SIZE + element.width * TEXT_SIZE_STEP));
  text.textContent = element.text ?? '';

  return text;
}

function penPath(points: number[]): string {
  const commands: string[] = [];
  for (let index = 0; index + 1 < points.length; index += 2) {
    commands.push(`${index === 0 ? 'M' : 'L'} ${points[index]} ${points[index + 1]}`);
  }

  return commands.join(' ');
}

function arrowHead(x0: number, y0: number, x1: number, y1: number): string {
  const angle = Math.atan2(y1 - y0, x1 - x0);
  const left = angle + Math.PI * 0.82;
  const right = angle - Math.PI * 0.82;

  return [
    `M ${x1} ${y1} L ${x1 + Math.cos(left) * ARROW_HEAD} ${y1 + Math.sin(left) * ARROW_HEAD}`,
    `M ${x1} ${y1} L ${x1 + Math.cos(right) * ARROW_HEAD} ${y1 + Math.sin(right) * ARROW_HEAD}`
  ].join(' ');
}

function normalize(x0: number, y0: number, x1: number, y1: number): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    width: Math.abs(x1 - x0),
    height: Math.abs(y1 - y0)
  };
}

export function boundingBox(element: BoardElement): { x: number; y: number; width: number; height: number } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let index = 0; index + 1 < element.points.length; index += 2) {
    xs.push(element.points[index] as number);
    ys.push(element.points[index + 1] as number);
  }

  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const box = { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  if (element.kind !== 'text') return box;

  // Text grows right and up from its anchor; approximate it from the font size.
  const size = TEXT_BASE_SIZE + element.width * TEXT_SIZE_STEP;

  return { x, y: y - size, width: Math.max(size * 0.6 * (element.text?.length ?? 1), size), height: size * 1.3 };
}

/** A click that never moved leaves a shape with no area, which is dropped. */
function isDegenerate(element: BoardElement): boolean {
  if (element.kind === 'pen') return element.points.length < 4;
  const box = boundingBox(element);

  return box.width < 2 && box.height < 2;
}

function cloneElement(element: BoardElement): BoardElement {
  return { ...element, points: [...element.points] };
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
