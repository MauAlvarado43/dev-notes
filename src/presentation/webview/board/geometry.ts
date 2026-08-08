import type { BoardAnchor, BoardElement } from '@/core/types';

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const TEXT_BASE_SIZE = 10;
export const TEXT_SIZE_STEP = 5;

/** Linear elements are defined by two ends instead of a box. */
export function isLinear(element: BoardElement): boolean {
  return element.kind === 'line' || element.kind === 'arrow' || element.kind === 'connector';
}

export function fontSize(element: BoardElement): number {
  return TEXT_BASE_SIZE + element.width * TEXT_SIZE_STEP;
}

/** Unrotated box of an element, in board coordinates. */
export function boundingBox(element: BoardElement): Box {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let index = 0; index + 1 < element.points.length; index += 2) {
    xs.push(element.points[index] as number);
    ys.push(element.points[index + 1] as number);
  }
  if (!xs.length) return { x: 0, y: 0, width: 0, height: 0 };

  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const box = { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  if (element.kind !== 'text') return box;

  // Text grows right and up from its anchor; approximate it from the font size.
  const size = fontSize(element);
  const lines = (element.text ?? '').split('\n');
  const longest = Math.max(...lines.map((line) => line.length), 1);

  return { x, y: y - size, width: Math.max(size * 0.58 * longest, size), height: size * 1.3 * lines.length };
}

export function center(box: Box): Point {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export function rotatePoint(point: Point, pivot: Point, degrees: number): Point {
  if (!degrees) return point;
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;

  return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
}

/** The four corners of an element after its own rotation is applied. */
export function corners(element: BoardElement): Point[] {
  const box = boundingBox(element);
  const pivot = center(box);
  const rotation = element.rotation ?? 0;

  return [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height }
  ].map((corner) => rotatePoint(corner, pivot, rotation));
}

/** Axis-aligned box that contains the rotated element, used for docking and marquees. */
export function outerBox(element: BoardElement): Box {
  if (!element.rotation) return boundingBox(element);
  const points = corners(element);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);

  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function unionBox(boxes: Box[]): Box {
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));

  return { x, y, width: right - x, height: bottom - y };
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}

export function boxContains(box: Box, point: Point, padding = 0): boolean {
  return point.x >= box.x - padding
    && point.x <= box.x + box.width + padding
    && point.y >= box.y - padding
    && point.y <= box.y + box.height + padding;
}

/** Ray casting, so a lasso drawn in any direction reads the same. */
export function pointInPolygon(point: Point, polygon: number[]): boolean {
  let inside = false;
  const total = Math.floor(polygon.length / 2);
  for (let index = 0, previous = total - 1; index < total; previous = index++) {
    const x = polygon[index * 2] as number;
    const y = polygon[index * 2 + 1] as number;
    const px = polygon[previous * 2] as number;
    const py = polygon[previous * 2 + 1] as number;
    if ((y > point.y) !== (py > point.y) && point.x < ((px - x) * (point.y - y)) / (py - y) + x) inside = !inside;
  }

  return inside;
}

export function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return Math.hypot(point.x - a.x, point.y - a.y);

  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));

  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

/** Distance from a point to a polyline given as flat coordinates. */
export function distanceToPath(point: Point, points: number[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index + 3 < points.length; index += 2) {
    const a = { x: points[index] as number, y: points[index + 1] as number };
    const b = { x: points[index + 2] as number, y: points[index + 3] as number };
    best = Math.min(best, distanceToSegment(point, a, b));
  }
  if (points.length === 2) best = Math.hypot(point.x - (points[0] as number), point.y - (points[1] as number));

  return best;
}

/** Moves a pointer into the unrotated frame of an element, so hit tests stay simple. */
export function toLocal(element: BoardElement, point: Point): Point {
  if (!element.rotation) return point;

  return rotatePoint(point, center(boundingBox(element)), -element.rotation);
}

/** Point on the border of a box where a line from its center toward a target leaves it. */
export function borderPoint(box: Box, toward: Point, anchor: BoardAnchor = 'auto'): Point {
  const middle = center(box);
  const halfWidth = Math.max(box.width / 2, 0.5);
  const halfHeight = Math.max(box.height / 2, 0.5);

  if (anchor === 'top') return { x: middle.x, y: box.y };
  if (anchor === 'bottom') return { x: middle.x, y: box.y + box.height };
  if (anchor === 'left') return { x: box.x, y: middle.y };
  if (anchor === 'right') return { x: box.x + box.width, y: middle.y };

  const dx = toward.x - middle.x;
  const dy = toward.y - middle.y;
  if (!dx && !dy) return { x: middle.x, y: box.y };

  const scale = 1 / Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight);

  return { x: middle.x + dx * scale, y: middle.y + dy * scale };
}

export function movePoints(points: number[], dx: number, dy: number): number[] {
  return points.map((value, index) => (index % 2 === 0 ? value + dx : value + dy));
}

/** Rescales points from one box into another, which is how resizing works. */
export function scalePoints(points: number[], from: Box, to: Box): number[] {
  const scaleX = from.width ? to.width / from.width : 1;
  const scaleY = from.height ? to.height / from.height : 1;

  return points.map((value, index) =>
    index % 2 === 0 ? to.x + (value - from.x) * scaleX : to.y + (value - from.y) * scaleY);
}

export function cloneElement(element: BoardElement): BoardElement {
  return {
    ...element,
    points: [...element.points],
    ...(element.from ? { from: { ...element.from } } : {}),
    ...(element.to ? { to: { ...element.to } } : {})
  };
}

export function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
