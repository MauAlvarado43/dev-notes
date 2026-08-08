import type { BoardCap, BoardElement } from '@/core/types';
import type { MessageKey } from '@/presentation/webview/i18n/messages';
import { borderPoint, center, outerBox, type Point } from './geometry';

export type ElementLookup = (id: string) => BoardElement | undefined;

export interface ConnectorGeometry {
  /** Flat polyline, already routed and trimmed for its caps. */
  points: number[];
  start: Point;
  end: Point;
  /** Direction of the line where each cap sits, in radians. */
  startAngle: number;
  endAngle: number;
  middle: Point;
  /** Direction of the segment the label sits on. */
  midAngle: number;
}

/** Ready-made line endings for the notations a diagram usually needs. */
export interface RelationPreset {
  id: string;
  label: MessageKey;
  startCap: BoardCap;
  endCap: BoardCap;
  dash: boolean;
}

export const RELATION_PRESETS: RelationPreset[] = [
  { id: 'plain', label: 'board.relationPlain', startCap: 'none', endCap: 'none', dash: false },
  { id: 'arrow', label: 'board.relationArrow', startCap: 'none', endCap: 'arrow', dash: false },
  { id: 'both', label: 'board.relationBoth', startCap: 'arrow', endCap: 'arrow', dash: false },
  { id: 'dependency', label: 'board.relationDependency', startCap: 'none', endCap: 'arrow', dash: true },
  { id: 'inheritance', label: 'board.relationInheritance', startCap: 'none', endCap: 'triangle', dash: false },
  { id: 'implementation', label: 'board.relationImplementation', startCap: 'none', endCap: 'triangle', dash: true },
  { id: 'aggregation', label: 'board.relationAggregation', startCap: 'diamond', endCap: 'none', dash: false },
  { id: 'composition', label: 'board.relationComposition', startCap: 'filledDiamond', endCap: 'none', dash: false },
  { id: 'oneToOne', label: 'board.relationOneToOne', startCap: 'one', endCap: 'one', dash: false },
  { id: 'oneToMany', label: 'board.relationOneToMany', startCap: 'one', endCap: 'many', dash: false },
  { id: 'manyToMany', label: 'board.relationManyToMany', startCap: 'many', endCap: 'many', dash: false }
];

export function presetOf(element: BoardElement): string {
  const start = element.startCap ?? 'none';
  const end = element.endCap ?? 'arrow';
  const dash = element.dash === true;
  const match = RELATION_PRESETS.find(
    (preset) => preset.startCap === start && preset.endCap === end && preset.dash === dash
  );

  return match?.id ?? 'custom';
}

/**
 * Resolves both ends of a connector. Bound ends read the current box of their
 * element, so a relation follows the shapes it joins without storing stale points.
 */
export function connectorGeometry(element: BoardElement, lookup: ElementLookup): ConnectorGeometry {
  const [rawX0 = 0, rawY0 = 0, rawX1 = 0, rawY1 = 0] = element.points;
  const fromElement = element.from?.element ? lookup(element.from.element) : undefined;
  const toElement = element.to?.element ? lookup(element.to.element) : undefined;
  const fromBox = fromElement ? outerBox(fromElement) : undefined;
  const toBox = toElement ? outerBox(toElement) : undefined;

  const fromReference = fromBox ? center(fromBox) : { x: rawX0, y: rawY0 };
  const toReference = toBox ? center(toBox) : { x: rawX1, y: rawY1 };
  const start = fromBox ? borderPoint(fromBox, toReference, element.from?.anchor ?? 'auto') : fromReference;
  const end = toBox ? borderPoint(toBox, fromReference, element.to?.anchor ?? 'auto') : toReference;

  const points = element.route === 'elbow'
    ? elbow(start, end, prefersVertical(fromBox, start))
    : [start.x, start.y, end.x, end.y];

  const startAngle = angleAt(points, 'start');
  const endAngle = angleAt(points, 'end');
  const trimmed = trim(points, capTrim(element.startCap, element.width), capTrim(element.endCap, element.width));

  return { points: trimmed, start, end, startAngle, endAngle, ...midpoint(points) };
}

/** Keeps a label beside the line instead of on top of it. */
export function labelOffset(angle: number, distance: number): Point {
  const x = -Math.sin(angle) * distance;
  const y = Math.cos(angle) * distance;

  return y > 0 ? { x: -x, y: -y } : { x, y };
}

/** Cap geometry at one end, described so the caller only sets stroke and fill. */
export interface CapShape {
  d: string;
  fill: 'none' | 'color' | 'background';
}

export function capShape(cap: BoardCap | undefined, at: Point, angle: number, width: number): CapShape | undefined {
  if (!cap || cap === 'none') return undefined;
  const size = 9 + width * 1.5;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const px = -uy;
  const py = ux;
  const back = (distance: number, offset = 0): string =>
    `${at.x - ux * distance + px * offset} ${at.y - uy * distance + py * offset}`;

  switch (cap) {
    case 'arrow':
      return { d: `M ${back(size, size * 0.55)} L ${at.x} ${at.y} L ${back(size, -size * 0.55)}`, fill: 'none' };
    case 'triangle':
      return { d: `M ${at.x} ${at.y} L ${back(size, size * 0.5)} L ${back(size, -size * 0.5)} Z`, fill: 'background' };
    case 'diamond':
    case 'filledDiamond':
      return {
        d: `M ${at.x} ${at.y} L ${back(size * 0.7, size * 0.45)} L ${back(size * 1.4)} L ${back(size * 0.7, -size * 0.45)} Z`,
        fill: cap === 'diamond' ? 'background' : 'color'
      };
    case 'circle': {
      const radius = size * 0.36;
      const cx = at.x - ux * radius;
      const cy = at.y - uy * radius;

      return {
        d: `M ${cx - radius} ${cy} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`,
        fill: 'background'
      };
    }
    case 'one':
      return { d: `M ${back(size * 0.9, size * 0.5)} L ${back(size * 0.9, -size * 0.5)}`, fill: 'none' };
    case 'many':
      return {
        d: `M ${back(size)} L ${back(0, size * 0.5)} M ${back(size)} L ${at.x} ${at.y} M ${back(size)} L ${back(0, -size * 0.5)}`,
        fill: 'none'
      };
    default:
      return undefined;
  }
}

/** How far the line is pulled back so a solid cap is not crossed by it. */
function capTrim(cap: BoardCap | undefined, width: number): number {
  const size = 9 + width * 1.5;
  if (cap === 'triangle') return size;
  if (cap === 'diamond' || cap === 'filledDiamond') return size * 1.4;
  if (cap === 'circle') return size * 0.72;

  return 0;
}

/** Orthogonal route with a single jog, which reads well in flowcharts. */
function elbow(start: Point, end: Point, verticalFirst: boolean): number[] {
  if (verticalFirst) {
    const midY = (start.y + end.y) / 2;

    return [start.x, start.y, start.x, midY, end.x, midY, end.x, end.y];
  }
  const midX = (start.x + end.x) / 2;

  return [start.x, start.y, midX, start.y, midX, end.y, end.x, end.y];
}

/** A connector leaving the top or bottom of a shape should start vertically. */
function prefersVertical(box: { x: number; y: number; width: number; height: number } | undefined, start: Point): boolean {
  if (!box) return false;
  const middle = center(box);

  return Math.abs(start.y - middle.y) >= Math.abs(start.x - middle.x);
}

function angleAt(points: number[], end: 'start' | 'end'): number {
  const last = points.length - 2;
  const [ax, ay, bx, by] = end === 'end'
    ? [points[last - 2] as number, points[last - 1] as number, points[last] as number, points[last + 1] as number]
    : [points[2] as number, points[3] as number, points[0] as number, points[1] as number];

  return Math.atan2(by - ay, bx - ax);
}

function midpoint(points: number[]): { middle: Point; midAngle: number } {
  const middle = Math.floor(points.length / 4) * 2;
  const ax = points[middle - 2] as number;
  const ay = points[middle - 1] as number;
  const bx = points[middle] as number;
  const by = points[middle + 1] as number;

  return { middle: { x: (ax + bx) / 2, y: (ay + by) / 2 }, midAngle: Math.atan2(by - ay, bx - ax) };
}

/** Shortens the first and last segment, leaving the rest of the route intact. */
function trim(points: number[], startBy: number, endBy: number): number[] {
  const result = [...points];
  if (startBy > 0) applyTrim(result, 0, 2, startBy);
  if (endBy > 0) applyTrim(result, result.length - 2, result.length - 4, endBy);

  return result;
}

function applyTrim(points: number[], target: number, toward: number, distance: number): void {
  const x = points[target] as number;
  const y = points[target + 1] as number;
  const dx = (points[toward] as number) - x;
  const dy = (points[toward + 1] as number) - y;
  const length = Math.hypot(dx, dy);
  if (!length) return;

  const ratio = Math.min(distance / length, 0.9);
  points[target] = x + dx * ratio;
  points[target + 1] = y + dy * ratio;
}
