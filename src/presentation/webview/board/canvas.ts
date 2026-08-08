import type { BoardCap, BoardElement, BoardEndpoint, BoardRoute, BoardShapeKind } from '@/core/types';
import { connectorGeometry } from './connectors';
import {
  boundingBox,
  boxContains,
  boxesOverlap,
  center,
  cloneElement,
  corners,
  createId,
  distanceToPath,
  fontSize,
  isLinear,
  movePoints,
  outerBox,
  pointInPolygon,
  rotatePoint,
  scalePoints,
  toLocal,
  unionBox,
  type Box,
  type Point
} from './geometry';
import { penPath, renderElement, svg, type Assets } from './render';
import { isShapeKind, SHAPE_DEFAULT_SIZE } from './shapes';

export type BoardTool = 'select' | 'lasso' | 'pen' | 'line' | 'arrow' | 'connector' | 'text' | BoardShapeKind;

export interface BoardStyle {
  color: string;
  width: number;
  filled: boolean;
  dash: boolean;
  route: BoardRoute;
  startCap: BoardCap;
  endCap: BoardCap;
}

/** Everything the overlay text editor needs to sit on top of the canvas. */
export interface TextRequest {
  id?: string;
  point?: Point;
  value: string;
  screen: ScreenPoint;
  fontSize: number;
  color: string;
  multiline: boolean;
}

export interface CanvasHandlers {
  /** A finished interaction: the caller records history and persists. */
  onCommit(elements: BoardElement[]): void;
  onSelectionChange(selected: BoardElement[]): void;
  onViewChange(scale: number): void;
  onTextRequest(request: TextRequest): void;
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

type Corner = 0 | 1 | 2 | 3;

type Draft =
  | { mode: 'draw'; element: BoardElement; origin: Point }
  | { mode: 'connect'; element: BoardElement; hover?: string }
  | { mode: 'move'; origin: Point; hit: string; moved: boolean; points: Map<string, number[]> }
  | { mode: 'pan'; origin: ScreenPoint; view: Viewport }
  | { mode: 'marquee'; origin: Point; current: Point }
  | { mode: 'lasso'; points: number[] }
  | { mode: 'rotate'; id: string; pivot: Point; offset: number; }
  | { mode: 'resize'; id: string; corner: Corner; box: Box; points: number[]; rotation: number; anchor: Point }
  | { mode: 'endpoint'; id: string; end: 'start' | 'end'; hover?: string };

const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const HIT_PADDING = 8;
const HANDLE_SIZE = 9;
const HANDLE_HIT = 11;
const ROTATE_DISTANCE = 26;
const MIN_SIZE = 4;
const CLICK_SIZE = 2;
const IMAGE_SIZE = { width: 320, height: 200 };
const IMAGE_STAGGER = 24;
const IMAGE_MAX = 640;

/**
 * Freeform drawing surface. Elements are plain SVG nodes so hit testing, theming,
 * and crisp zooming come from the browser instead of a redraw loop.
 */
export class BoardCanvas {
  readonly node = svg('svg', 'board-canvas');

  private readonly scene = svg('g');
  private readonly overlay = svg('g');
  private elements: BoardElement[] = [];
  private assets: Assets = {};
  private view: Viewport = { x: 0, y: 0, scale: 1 };
  private draft?: Draft;
  private selection = new Set<string>();
  private tool: BoardTool = 'pen';
  private spaceHeld = false;
  private shiftHeld = false;
  private style: BoardStyle = {
    color: '#7c6df2',
    width: 2,
    filled: false,
    dash: false,
    route: 'straight',
    startCap: 'none',
    endCap: 'arrow'
  };

  constructor(private readonly handlers: CanvasHandlers) {
    this.node.append(this.scene, this.overlay);
    this.node.setAttribute('tabindex', '0');
    this.applyView();

    this.node.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    this.node.addEventListener('pointermove', (event) => this.onPointerMove(event));
    this.node.addEventListener('pointerup', (event) => this.onPointerUp(event));
    this.node.addEventListener('pointercancel', () => this.cancelDraft());
    this.node.addEventListener('dblclick', (event) => this.onDoubleClick(event));
    this.node.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
  }

  get scale(): number {
    return this.view.scale;
  }

  get selectedElements(): BoardElement[] {
    return this.elements.filter((element) => this.selection.has(element.id));
  }

  setTool(tool: BoardTool): void {
    this.tool = tool;
    if (tool !== 'select' && tool !== 'lasso') this.replaceSelection([]);
    this.node.dataset.tool = tool;
  }

  setStyle(patch: Partial<BoardStyle>): void {
    this.style = { ...this.style, ...patch };
  }

  /** Applies a style change to the selection, which is what the toolbar edits. */
  applyToSelection(patch: Partial<BoardElement>): void {
    if (!this.selection.size) return;
    this.elements = this.elements.map((element) =>
      this.selection.has(element.id) ? { ...element, ...patch } : element);
    this.render();
    this.commit();
    this.announceSelection();
  }

  setSpaceHeld(held: boolean): void {
    this.spaceHeld = held;
    this.node.classList.toggle('panning', held);
  }

  setShiftHeld(held: boolean): void {
    this.shiftHeld = held;
  }

  setElements(elements: BoardElement[]): void {
    this.elements = elements.map(cloneElement);
    const alive = new Set(this.elements.map((element) => element.id));
    for (const id of [...this.selection]) {
      if (!alive.has(id)) this.selection.delete(id);
    }
    this.render();
    this.announceSelection();
  }

  setAssets(assets: Assets): void {
    this.assets = { ...this.assets, ...assets };
    this.render();
  }

  getAssets(): Assets {
    return { ...this.assets };
  }

  /**
   * Places stored images at the middle of the view, one slightly below the next,
   * with a default box that the real proportions correct once each one loads.
   */
  addImages(assets: Assets): void {
    const names = Object.keys(assets);
    if (!names.length) return;

    this.assets = { ...this.assets, ...assets };
    const middle = this.viewportCenter();
    const created = names.map((name, index) => {
      const offset = index * IMAGE_STAGGER;
      const x = middle.x - IMAGE_SIZE.width / 2 + offset;
      const y = middle.y - IMAGE_SIZE.height / 2 + offset;

      return {
        id: createId(),
        kind: 'image' as const,
        color: this.style.color,
        width: 1,
        points: [x, y, x + IMAGE_SIZE.width, y + IMAGE_SIZE.height],
        src: name
      };
    });

    this.elements = [...this.elements, ...created];
    this.replaceSelection(created.map((element) => element.id));
    this.render();
    this.commit();
    for (const element of created) this.fitToNaturalSize(element.id, assets[element.src] as string);
  }

  getElements(): BoardElement[] {
    return this.elements.map(cloneElement);
  }

  selectAll(): void {
    this.replaceSelection(this.elements.map((element) => element.id));
  }

  clearSelection(): void {
    this.replaceSelection([]);
  }

  deleteSelection(): void {
    if (!this.selection.size) return;
    const removed = this.selection;
    this.elements = this.elements
      .filter((element) => !removed.has(element.id))
      .map((element) => this.detachConnector(element, removed));
    this.replaceSelection([]);
    this.render();
    this.commit();
  }

  /**
   * Copies keep the relations inside the selection and bake the ones that reach
   * outside it, so a duplicated diagram is complete and nothing points at a shape
   * the copy does not own.
   */
  duplicateSelection(): void {
    const picked = this.selectedElements;
    if (!picked.length) return;

    const ids = new Map(picked.map((element) => [element.id, createId()]));
    const copies = picked.map((element) => {
      const copy = { ...cloneElement(element), id: ids.get(element.id) as string };
      if (element.kind !== 'connector') return { ...copy, points: movePoints(element.points, 16, 16) };

      const geometry = connectorGeometry(element, (id) => this.byId(id));
      const points = movePoints([geometry.start.x, geometry.start.y, geometry.end.x, geometry.end.y], 16, 16);

      return { ...copy, points, from: this.rebind(element.from, ids), to: this.rebind(element.to, ids) };
    });

    this.elements = [...this.elements, ...copies];
    this.replaceSelection(copies.map((element) => element.id));
    this.render();
    this.commit();
  }

  /** Adds elements as a new selection, used when pasting. Ids are rewritten. */
  insertElements(elements: readonly BoardElement[], offset = 0): void {
    if (!elements.length) return;

    const ids = new Map(elements.map((element) => [element.id, createId()]));
    const copies = elements.map((element) => {
      const copy = {
        ...cloneElement(element),
        id: ids.get(element.id) as string,
        points: movePoints(element.points, offset, offset)
      };
      if (element.kind !== 'connector') return copy;

      return { ...copy, from: this.rebind(element.from, ids), to: this.rebind(element.to, ids) };
    });

    this.elements = [...this.elements, ...copies];
    this.replaceSelection(copies.map((element) => element.id));
    this.render();
    this.commit();
  }

  /** Opens the text editor on the selected element, the keyboard path to a label. */
  editSelection(): void {
    const [element] = this.selectedElements;
    if (!element || this.selection.size !== 1) return;

    this.requestText({ id: element.id });
  }

  /** Moves the selection to the front or the back of the drawing order. */
  reorderSelection(direction: 'front' | 'back'): void {
    if (!this.selection.size) return;
    const picked = this.elements.filter((element) => this.selection.has(element.id));
    const rest = this.elements.filter((element) => !this.selection.has(element.id));
    this.elements = direction === 'front' ? [...rest, ...picked] : [...picked, ...rest];
    this.render();
    this.commit();
  }

  nudgeSelection(dx: number, dy: number): void {
    if (!this.selection.size) return;
    this.elements = this.elements.map((element) =>
      this.selection.has(element.id) ? { ...element, points: movePoints(element.points, dx, dy) } : element);
    this.render();
    this.commit();
  }

  /** Writes the text of a new or an existing element, from the overlay editor. */
  applyText(target: { id?: string; point?: Point }, value: string): void {
    const text = value.trim();
    if (target.id) {
      const element = this.elements.find((candidate) => candidate.id === target.id);
      if (!element) return;
      if (!text && element.kind === 'text') {
        this.elements = this.elements.filter((candidate) => candidate.id !== target.id);
      } else {
        this.elements = this.elements.map((candidate) =>
          candidate.id === target.id ? { ...candidate, text: text || undefined } : candidate);
      }
    } else if (target.point && text) {
      this.elements = [
        ...this.elements,
        {
          id: createId(),
          kind: 'text',
          color: this.style.color,
          width: this.style.width,
          points: [target.point.x, target.point.y],
          text
        }
      ];
    } else {
      return;
    }

    this.render();
    this.commit();
    this.announceSelection();
  }

  zoomBy(factor: number): void {
    this.zoomTo(this.view.scale * factor);
  }

  resetView(): void {
    this.view = { x: 0, y: 0, scale: 1 };
    this.applyView();
    this.handlers.onViewChange(this.view.scale);
  }

  /** Frames every element, which is the fastest way back to a drawing off screen. */
  fitView(): void {
    if (!this.elements.length) {
      this.resetView();

      return;
    }

    const rect = this.node.getBoundingClientRect();
    const bounds = unionBox(this.elements.map(outerBox));
    const padding = 60;
    const scale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, Math.min(rect.width / (bounds.width + padding), rect.height / (bounds.height + padding)))
    );
    this.view = {
      scale,
      x: bounds.x + bounds.width / 2 - rect.width / (2 * scale),
      y: bounds.y + bounds.height / 2 - rect.height / (2 * scale)
    };
    this.applyView();
    this.handlers.onViewChange(scale);
  }

  /** Screen position of a board point, for overlays such as the text editor. */
  toScreen(point: Point): ScreenPoint {
    const rect = this.node.getBoundingClientRect();

    return {
      left: rect.left + (point.x - this.view.x) * this.view.scale,
      top: rect.top + (point.y - this.view.y) * this.view.scale
    };
  }

  private onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 && event.button !== 1) return;
    this.node.focus({ preventScroll: true });
    const point = this.toBoard(event);

    if (event.button === 1 || this.spaceHeld) {
      this.startDraft(event, { mode: 'pan', origin: { left: event.clientX, top: event.clientY }, view: { ...this.view } });

      return;
    }

    if (this.tool === 'text') {
      event.preventDefault();
      this.requestText({ point });

      return;
    }

    if (this.tool === 'select' && this.startHandleDraft(event, point)) return;

    if (this.tool === 'select') {
      this.startSelectDraft(event, point);

      return;
    }

    if (this.tool === 'lasso') {
      this.startDraft(event, { mode: 'lasso', points: [point.x, point.y] });

      return;
    }

    if (this.tool === 'connector') {
      this.startDraft(event, { mode: 'connect', element: this.startConnector(point) });
      this.render();

      return;
    }

    this.startDraft(event, { mode: 'draw', element: this.startElement(point), origin: point });
    this.render();
  }

  private onPointerMove(event: PointerEvent): void {
    const draft = this.draft;
    if (!draft) return;
    const point = this.toBoard(event);

    switch (draft.mode) {
      case 'pan':
        this.view = {
          ...draft.view,
          x: draft.view.x - (event.clientX - draft.origin.left) / draft.view.scale,
          y: draft.view.y - (event.clientY - draft.origin.top) / draft.view.scale
        };
        this.applyView();

        return;
      case 'draw':
        this.extendDraw(draft.element, draft.origin, point);
        this.render();

        return;
      case 'connect': {
        const target = this.shapeAt(point);
        draft.element.points.splice(2, 2, point.x, point.y);
        draft.element.to = target ? { element: target.id, anchor: 'auto' } : undefined;
        draft.hover = target?.id;
        this.render();

        return;
      }
      case 'move': {
        const dx = point.x - draft.origin.x;
        const dy = point.y - draft.origin.y;
        if (!dx && !dy) return;
        draft.moved = true;
        this.elements = this.elements.map((element) => {
          const original = draft.points.get(element.id);

          return original ? { ...element, points: movePoints(original, dx, dy) } : element;
        });
        this.render();

        return;
      }
      case 'marquee':
        draft.current = point;
        this.selectWithin(marqueeBox(draft.origin, draft.current));
        this.render();

        return;
      case 'lasso':
        draft.points.push(point.x, point.y);
        this.selectInsideLasso(draft.points);
        this.render();

        return;
      case 'rotate':
        this.rotateTo(draft, point);

        return;
      case 'resize':
        this.resizeTo(draft, point);

        return;
      case 'endpoint':
        this.moveEndpoint(draft, point);
    }
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

    if (draft.mode === 'marquee' || draft.mode === 'lasso') {
      this.render();
      this.announceSelection();

      return;
    }

    if (draft.mode === 'draw') {
      const finished = this.finishDraw(draft.element, draft.origin);
      if (!finished) {
        this.render();

        return;
      }
      this.elements = [...this.elements, finished];
      this.replaceSelection([finished.id]);
    }

    if (draft.mode === 'connect') {
      if (!this.isUsableConnector(draft.element)) {
        this.render();

        return;
      }
      this.elements = [...this.elements, draft.element];
      this.replaceSelection([draft.element.id]);
    }

    // A click inside a group picks the single element under the pointer.
    if (draft.mode === 'move' && !draft.moved) {
      if (this.selection.size > 1) this.replaceSelection([draft.hit]);
      this.renderOverlay();

      return;
    }

    this.render();
    this.commit();
    if (draft.mode === 'move' || draft.mode === 'endpoint') this.announceSelection();
  }

  private cancelDraft(): void {
    this.draft = undefined;
    this.render();
  }

  private onDoubleClick(event: MouseEvent): void {
    if (this.tool !== 'select') return;
    event.preventDefault();
    const point = this.toBoard(event);
    const hit = this.hitTest(point);
    if (hit) {
      this.replaceSelection([hit.id]);
      this.requestText({ id: hit.id });

      return;
    }
    this.requestText({ point });
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    const anchor = this.toBoard(event);
    this.zoomTo(this.view.scale * (event.deltaY < 0 ? 1.1 : 1 / 1.1), anchor);
  }

  private startDraft(event: PointerEvent, draft: Draft): void {
    event.preventDefault();
    this.node.setPointerCapture?.(event.pointerId);
    this.draft = draft;
  }

  /** Handles win over elements, so a rotate grip beats the shape underneath it. */
  private startHandleDraft(event: PointerEvent, point: Point): boolean {
    const selected = this.selectedElements;
    if (selected.length !== 1) return false;
    const element = selected[0] as BoardElement;
    const reach = HANDLE_HIT / this.view.scale;

    if (isLinear(element)) {
      const ends = this.endpointHandles(element);
      for (const [index, handle] of ends.entries()) {
        if (Math.hypot(handle.x - point.x, handle.y - point.y) > reach) continue;
        this.startDraft(event, { mode: 'endpoint', id: element.id, end: index === 0 ? 'start' : 'end' });

        return true;
      }

      return false;
    }

    const box = boundingBox(element);
    const pivot = center(box);
    const rotation = element.rotation ?? 0;
    const grip = rotatePoint({ x: pivot.x, y: box.y - ROTATE_DISTANCE / this.view.scale }, pivot, rotation);
    if (Math.hypot(grip.x - point.x, grip.y - point.y) <= reach) {
      const start = Math.atan2(point.y - pivot.y, point.x - pivot.x) * (180 / Math.PI);
      this.startDraft(event, { mode: 'rotate', id: element.id, pivot, offset: start - rotation });

      return true;
    }

    const points = corners(element);
    for (const [index, corner] of points.entries()) {
      if (Math.hypot(corner.x - point.x, corner.y - point.y) > reach) continue;
      this.startDraft(event, {
        mode: 'resize',
        id: element.id,
        corner: index as Corner,
        box,
        points: [...element.points],
        rotation,
        anchor: points[(index + 2) % 4] as Point
      });

      return true;
    }

    return false;
  }

  private startSelectDraft(event: PointerEvent, point: Point): void {
    const hit = this.hitTest(point);
    if (!hit) {
      if (!event.shiftKey) this.replaceSelection([]);
      this.startDraft(event, { mode: 'marquee', origin: point, current: point });
      this.render();

      return;
    }

    if (event.shiftKey) {
      const next = new Set(this.selection);
      if (next.has(hit.id)) next.delete(hit.id);
      else next.add(hit.id);
      this.replaceSelection([...next]);
    } else if (!this.selection.has(hit.id)) {
      this.replaceSelection([hit.id]);
    }

    if (!this.selection.has(hit.id)) return;
    const points = new Map<string, number[]>();
    for (const element of this.selectedElements) points.set(element.id, [...element.points]);
    this.startDraft(event, { mode: 'move', origin: point, hit: hit.id, moved: false, points });
  }

  private startElement(point: Point): BoardElement {
    const kind = this.tool === 'select' || this.tool === 'lasso' || this.tool === 'text' ? 'pen' : this.tool;
    const element: BoardElement = {
      id: createId(),
      kind,
      color: this.style.color,
      width: this.style.width,
      points: kind === 'pen' ? [point.x, point.y] : [point.x, point.y, point.x, point.y]
    };
    if (this.style.filled && isShapeKind(kind)) element.filled = true;
    if (this.style.dash) element.dash = true;

    return element;
  }

  private startConnector(point: Point): BoardElement {
    const source = this.shapeAt(point);

    return {
      id: createId(),
      kind: 'connector',
      color: this.style.color,
      width: this.style.width,
      points: [point.x, point.y, point.x, point.y],
      route: this.style.route,
      startCap: this.style.startCap,
      endCap: this.style.endCap,
      ...(this.style.dash ? { dash: true } : {}),
      ...(source ? { from: { element: source.id, anchor: 'auto' as const } } : {})
    };
  }

  /** Shift keeps lines on 45° steps and shapes square, as in every drawing app. */
  private extendDraw(element: BoardElement, origin: Point, point: Point): void {
    if (element.kind === 'pen') {
      element.points.push(point.x, point.y);

      return;
    }

    let { x, y } = point;
    if (this.shiftHeld && isLinear(element)) {
      const dx = x - origin.x;
      const dy = y - origin.y;
      const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
      const length = Math.hypot(dx, dy);
      x = origin.x + Math.cos(angle) * length;
      y = origin.y + Math.sin(angle) * length;
    } else if (this.shiftHeld) {
      const size = Math.max(Math.abs(x - origin.x), Math.abs(y - origin.y));
      x = origin.x + Math.sign(x - origin.x) * size;
      y = origin.y + Math.sign(y - origin.y) * size;
    }
    element.points.splice(2, 2, x, y);
  }

  /** A click without a drag drops a shape at its default size instead of nothing. */
  private finishDraw(element: BoardElement, origin: Point): BoardElement | undefined {
    if (element.kind === 'pen') return element.points.length >= 4 ? element : undefined;

    const box = boundingBox(element);
    if (box.width >= CLICK_SIZE || box.height >= CLICK_SIZE) return element;
    if (!isShapeKind(element.kind)) return undefined;

    const size = SHAPE_DEFAULT_SIZE[element.kind] ?? { width: 140, height: 90 };

    return {
      ...element,
      points: [origin.x - size.width / 2, origin.y - size.height / 2, origin.x + size.width / 2, origin.y + size.height / 2]
    };
  }

  private isUsableConnector(element: BoardElement): boolean {
    const box = boundingBox(element);

    return Boolean(element.to?.element) || box.width >= CLICK_SIZE || box.height >= CLICK_SIZE;
  }

  private rotateTo(draft: { id: string; pivot: Point; offset: number }, point: Point): void {
    const angle = Math.atan2(point.y - draft.pivot.y, point.x - draft.pivot.x) * (180 / Math.PI) - draft.offset;
    const snapped = this.shiftHeld ? Math.round(angle / 15) * 15 : Math.round(angle);
    this.elements = this.elements.map((element) =>
      element.id === draft.id ? { ...element, rotation: ((snapped % 360) + 360) % 360 } : element);
    this.render();
  }

  /**
   * Resizes in the rotated frame of the element, keeping the opposite corner
   * pinned, so a rotated shape does not drift while it is being resized.
   */
  private resizeTo(
    draft: { id: string; corner: Corner; box: Box; points: number[]; rotation: number; anchor: Point },
    point: Point
  ): void {
    const radians = (draft.rotation * Math.PI) / 180;
    const ux = Math.cos(radians);
    const uy = Math.sin(radians);
    const dx = point.x - draft.anchor.x;
    const dy = point.y - draft.anchor.y;
    const signX = draft.corner === 1 || draft.corner === 2 ? 1 : -1;
    const signY = draft.corner === 2 || draft.corner === 3 ? 1 : -1;
    const width = Math.max(MIN_SIZE, (dx * ux + dy * uy) * signX);
    const height = Math.max(MIN_SIZE, (dx * -uy + dy * ux) * signY);
    const middle = {
      x: draft.anchor.x + ux * (signX * width / 2) + -uy * (signY * height / 2),
      y: draft.anchor.y + uy * (signX * width / 2) + ux * (signY * height / 2)
    };
    const box: Box = { x: middle.x - width / 2, y: middle.y - height / 2, width, height };

    this.elements = this.elements.map((element) =>
      element.id === draft.id ? { ...element, points: scalePoints(draft.points, draft.box, box) } : element);
    this.render();
  }

  private moveEndpoint(draft: { id: string; end: 'start' | 'end'; hover?: string }, point: Point): void {
    const target = this.shapeAt(point);
    draft.hover = target?.id;
    this.elements = this.elements.map((element) => {
      if (element.id !== draft.id) return element;
      const points = [...element.points];
      points.splice(draft.end === 'start' ? 0 : 2, 2, point.x, point.y);
      if (element.kind !== 'connector') return { ...element, points };
      const binding = target ? { element: target.id, anchor: 'auto' as const } : undefined;

      return draft.end === 'start' ? { ...element, points, from: binding } : { ...element, points, to: binding };
    });
    this.render();
  }

  /** Zooming keeps the anchor point, so the canvas grows around the cursor. */
  private zoomTo(scale: number, anchor?: Point): void {
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

  private requestText(target: { id?: string; point?: Point }): void {
    const element = target.id ? this.elements.find((candidate) => candidate.id === target.id) : undefined;
    if (element) {
      const box = element.kind === 'connector'
        ? connectorLabelBox(connectorGeometry(element, (id) => this.byId(id)))
        : boundingBox(element);
      const anchor = element.kind === 'text' ? { x: box.x, y: box.y } : { x: box.x, y: center(box).y - 12 };
      this.handlers.onTextRequest({
        id: element.id,
        value: element.text ?? '',
        screen: this.toScreen(anchor),
        fontSize: (element.kind === 'text' ? fontSize(element) : 13) * this.view.scale,
        color: element.color,
        multiline: element.kind !== 'connector'
      });

      return;
    }

    if (!target.point) return;
    this.handlers.onTextRequest({
      point: target.point,
      value: '',
      screen: this.toScreen(target.point),
      fontSize: (10 + this.style.width * 5) * this.view.scale,
      color: this.style.color,
      multiline: true
    });
  }

  /** Middle of what is on screen, in board coordinates. */
  private viewportCenter(): Point {
    const rect = this.node.getBoundingClientRect();

    return {
      x: this.view.x + (rect.width || IMAGE_MAX) / (2 * this.view.scale),
      y: this.view.y + (rect.height || IMAGE_MAX) / (2 * this.view.scale)
    };
  }

  /**
   * Corrects the box of a placed image once the browser knows its real size.
   * Until then the default box is what the board stores, so an image that never
   * loads still has a sane shape.
   */
  private fitToNaturalSize(id: string, source: string): void {
    const probe = new Image();
    probe.addEventListener('load', () => {
      const element = this.byId(id);
      if (!element || !probe.naturalWidth || !probe.naturalHeight) return;

      const scale = Math.min(1, IMAGE_MAX / Math.max(probe.naturalWidth, probe.naturalHeight));
      const width = Math.round(probe.naturalWidth * scale);
      const height = Math.round(probe.naturalHeight * scale);
      const [x = 0, y = 0] = element.points;
      this.elements = this.elements.map((candidate) =>
        candidate.id === id ? { ...candidate, points: [x, y, x + width, y + height] } : candidate);
      this.render();
      this.commit();
    });
    probe.src = source;
  }

  private replaceSelection(ids: string[]): void {
    const next = new Set(ids);
    if (next.size === this.selection.size && [...next].every((id) => this.selection.has(id))) return;
    this.selection = next;
    this.renderOverlay();
    this.announceSelection();
  }

  private announceSelection(): void {
    this.handlers.onSelectionChange(this.selectedElements.map(cloneElement));
  }

  private selectWithin(box: Box): void {
    this.replaceSelection(
      this.elements.filter((element) => boxesOverlap(outerBox(element), box)).map((element) => element.id)
    );
  }

  private selectInsideLasso(polygon: number[]): void {
    this.replaceSelection(
      this.elements
        .filter((element) => {
          const box = outerBox(element);
          if (pointInPolygon(center(box), polygon)) return true;

          return corners(element).some((corner) => pointInPolygon(corner, polygon));
        })
        .map((element) => element.id)
    );
  }

  private commit(): void {
    this.handlers.onCommit(this.getElements());
  }

  private byId(id: string): BoardElement | undefined {
    return this.elements.find((element) => element.id === id);
  }

  private rebind(endpoint: BoardEndpoint | undefined, ids: Map<string, string>): BoardEndpoint | undefined {
    const copy = endpoint?.element ? ids.get(endpoint.element) : undefined;

    return copy ? { ...endpoint, element: copy } : undefined;
  }

  /** Keeps a connector usable after the shape it pointed at is deleted. */
  private detachConnector(element: BoardElement, removed: Set<string>): BoardElement {
    if (element.kind !== 'connector') return element;
    const fromGone = element.from?.element && removed.has(element.from.element);
    const toGone = element.to?.element && removed.has(element.to.element);
    if (!fromGone && !toGone) return element;

    const geometry = connectorGeometry(element, (id) => this.byId(id));

    return {
      ...element,
      points: [geometry.start.x, geometry.start.y, geometry.end.x, geometry.end.y],
      from: fromGone ? undefined : element.from,
      to: toGone ? undefined : element.to
    };
  }

  private hitTest(point: Point): BoardElement | undefined {
    const padding = HIT_PADDING / this.view.scale;

    return [...this.elements].reverse().find((element) => this.hits(element, point, padding));
  }

  /** Only shapes accept connectors, which keeps a relation anchored to a box. */
  private shapeAt(point: Point): BoardElement | undefined {
    return [...this.elements]
      .reverse()
      .find((element) => isShapeKind(element.kind) && this.hits(element, point, 0));
  }

  private hits(element: BoardElement, point: Point, padding: number): boolean {
    if (element.kind === 'connector') {
      const geometry = connectorGeometry(element, (id) => this.byId(id));

      return distanceToPath(point, geometry.points) <= padding + element.width;
    }
    if (element.kind === 'pen' || isLinear(element)) {
      return distanceToPath(point, element.points) <= padding + element.width;
    }

    return boxContains(boundingBox(element), toLocal(element, point), padding);
  }

  private toBoard(event: { clientX: number; clientY: number }): Point {
    const rect = this.node.getBoundingClientRect();

    return {
      x: this.view.x + (event.clientX - rect.left) / this.view.scale,
      y: this.view.y + (event.clientY - rect.top) / this.view.scale
    };
  }

  private applyView(): void {
    const { x, y, scale } = this.view;
    const transform = `scale(${scale}) translate(${-x} ${-y})`;
    this.scene.setAttribute('transform', transform);
    this.overlay.setAttribute('transform', transform);
  }

  private render(): void {
    const drafted = this.draft?.mode === 'draw' || this.draft?.mode === 'connect' ? [this.draft.element] : [];
    const lookup = (id: string): BoardElement | undefined => this.byId(id) ?? drafted.find((item) => item.id === id);
    this.scene.replaceChildren(
      ...[...this.elements, ...drafted].map((element) => renderElement(element, lookup, this.assets))
    );
    this.renderOverlay();
  }

  private renderOverlay(): void {
    const nodes: SVGElement[] = [];
    const draft = this.draft;

    if (draft?.mode === 'marquee') nodes.push(marqueeNode(marqueeBox(draft.origin, draft.current)));
    if (draft?.mode === 'lasso') nodes.push(lassoNode(draft.points));

    const hovered = draft?.mode === 'connect' || draft?.mode === 'endpoint' ? draft.hover : undefined;
    const hoveredElement = hovered ? this.byId(hovered) : undefined;
    if (hoveredElement) nodes.push(outlineNode(outerBox(hoveredElement), 'board-dock'));

    const selected = this.selectedElements;
    for (const element of selected) nodes.push(this.selectionOutline(element));
    if (selected.length === 1 && !this.draft) nodes.push(...this.handleNodes(selected[0] as BoardElement));

    this.overlay.replaceChildren(...nodes);
  }

  private selectionOutline(element: BoardElement): SVGElement {
    const padding = 6 / this.view.scale;
    if (isLinear(element) || element.kind === 'pen') {
      return outlineNode(grow(outerBox(element), padding), 'board-selection');
    }

    const box = grow(boundingBox(element), padding);
    const node = outlineNode(box, 'board-selection');
    const rotation = element.rotation ?? 0;
    if (rotation) {
      const pivot = center(boundingBox(element));
      node.setAttribute('transform', `rotate(${rotation} ${pivot.x} ${pivot.y})`);
    }

    return node;
  }

  private handleNodes(element: BoardElement): SVGElement[] {
    const size = HANDLE_SIZE / this.view.scale;
    if (isLinear(element)) {
      return this.endpointHandles(element).map((point) => handleNode(point, size, 'board-handle round'));
    }

    const box = boundingBox(element);
    const pivot = center(box);
    const rotation = element.rotation ?? 0;
    const grip = rotatePoint({ x: pivot.x, y: box.y - ROTATE_DISTANCE / this.view.scale }, pivot, rotation);
    const stem = svg('line', 'board-rotate-stem');
    const top = rotatePoint({ x: pivot.x, y: box.y }, pivot, rotation);
    stem.setAttribute('x1', String(top.x));
    stem.setAttribute('y1', String(top.y));
    stem.setAttribute('x2', String(grip.x));
    stem.setAttribute('y2', String(grip.y));

    return [
      stem,
      ...corners(element).map((corner) => handleNode(corner, size, 'board-handle')),
      handleNode(grip, size, 'board-handle rotate round')
    ];
  }

  private endpointHandles(element: BoardElement): Point[] {
    if (element.kind !== 'connector') {
      const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = element.points;

      return [{ x: x0, y: y0 }, { x: x1, y: y1 }];
    }

    const geometry = connectorGeometry(element, (id) => this.byId(id));

    return [geometry.start, geometry.end];
  }
}

function connectorLabelBox(geometry: { middle: Point }): Box {
  return { x: geometry.middle.x - 60, y: geometry.middle.y - 10, width: 120, height: 20 };
}

function marqueeBox(origin: Point, current: Point): Box {
  return {
    x: Math.min(origin.x, current.x),
    y: Math.min(origin.y, current.y),
    width: Math.abs(current.x - origin.x),
    height: Math.abs(current.y - origin.y)
  };
}

function grow(box: Box, padding: number): Box {
  return { x: box.x - padding, y: box.y - padding, width: box.width + padding * 2, height: box.height + padding * 2 };
}

function outlineNode(box: Box, className: string): SVGRectElement {
  const node = svg('rect', className);
  node.setAttribute('x', String(box.x));
  node.setAttribute('y', String(box.y));
  node.setAttribute('width', String(box.width));
  node.setAttribute('height', String(box.height));
  node.setAttribute('rx', '3');

  return node;
}

function marqueeNode(box: Box): SVGRectElement {
  return outlineNode(box, 'board-marquee');
}

function lassoNode(points: number[]): SVGPathElement {
  const node = svg('path', 'board-lasso');
  node.setAttribute('d', `${penPath(points)} Z`);

  return node;
}

function handleNode(point: Point, size: number, className: string): SVGRectElement {
  const node = svg('rect', className);
  node.setAttribute('x', String(point.x - size / 2));
  node.setAttribute('y', String(point.y - size / 2));
  node.setAttribute('width', String(size));
  node.setAttribute('height', String(size));
  node.setAttribute('rx', String(className.includes('round') ? size / 2 : size / 4));

  return node;
}
