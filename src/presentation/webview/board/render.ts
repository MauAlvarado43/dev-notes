import type { BoardElement } from '@/core/types';
import { capShape, connectorGeometry, labelOffset, type ElementLookup } from './connectors';
import { boundingBox, center, fontSize, isLinear, type Box } from './geometry';
import { isShapeKind, shapePlan } from './shapes';

export const SVG_NS = 'http://www.w3.org/2000/svg';

/** Source of every image on the board, keyed by file name. */
export type Assets = Record<string, string>;

const FILL_OPACITY = 0.18;
const LINE_HEIGHT = 1.25;

export function svg<Tag extends keyof SVGElementTagNameMap>(tag: Tag, className?: string): SVGElementTagNameMap[Tag] {
  const node = document.createElementNS(SVG_NS, tag);
  if (className) node.setAttribute('class', className);

  return node;
}

/**
 * Draws one element as a group of SVG nodes. Rotation is applied to the group, so
 * every kind rotates without its geometry having to know about angles.
 */
export function renderElement(element: BoardElement, lookup: ElementLookup, assets: Assets = {}): SVGGElement {
  const group = svg('g', 'board-element');
  group.dataset.id = element.id;
  const rotation = element.rotation ?? 0;
  if (rotation) {
    const pivot = center(boundingBox(element));
    group.setAttribute('transform', `rotate(${rotation} ${pivot.x} ${pivot.y})`);
  }

  if (element.kind === 'connector') renderConnector(group, element, lookup);
  else if (element.kind === 'image') renderImage(group, element, assets);
  else if (element.kind === 'text') group.append(textNode(element));
  else if (isLinear(element) || element.kind === 'pen') renderStroke(group, element);
  else renderShape(group, element);

  return group;
}

function renderStroke(group: SVGGElement, element: BoardElement): void {
  const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = element.points;
  const path = stroked(element);
  path.setAttribute('d', element.kind === 'pen' ? penPath(element.points) : `M ${x0} ${y0} L ${x1} ${y1}`);
  path.setAttribute('fill', 'none');
  group.append(path);

  if (element.kind !== 'arrow') return;
  const head = capShape('arrow', { x: x1, y: y1 }, Math.atan2(y1 - y0, x1 - x0), element.width);
  if (head) group.append(capNode(element, head));
}

/**
 * Images are drawn from the source the host resolved: a webview URI on the
 * canvas, and a data URI when the board is being exported. A missing source
 * still draws its frame, so the element can be found and removed.
 */
function renderImage(group: SVGGElement, element: BoardElement, assets: Assets): void {
  const box = boundingBox(element);
  const source = element.src ? assets[element.src] : undefined;

  if (source) {
    const image = svg('image', 'board-image');
    image.setAttribute('href', source);
    image.setAttribute('x', String(box.x));
    image.setAttribute('y', String(box.y));
    image.setAttribute('width', String(box.width));
    image.setAttribute('height', String(box.height));
    image.setAttribute('preserveAspectRatio', 'none');
    group.append(image);

    return;
  }

  const frame = svg('rect', 'board-image-missing');
  frame.setAttribute('x', String(box.x));
  frame.setAttribute('y', String(box.y));
  frame.setAttribute('width', String(box.width));
  frame.setAttribute('height', String(box.height));
  group.append(frame);
}

function renderShape(group: SVGGElement, element: BoardElement): void {
  if (!isShapeKind(element.kind)) return;
  const box = boundingBox(element);
  const plan = shapePlan(element.kind, box);

  const outline = stroked(element);
  outline.setAttribute('d', plan.outline);
  if (element.filled) {
    outline.setAttribute('fill', element.color);
    outline.setAttribute('fill-opacity', String(FILL_OPACITY));
  } else {
    outline.setAttribute('fill', 'none');
  }
  group.append(outline);

  for (const detail of plan.details) {
    const node = stroked(element);
    node.setAttribute('d', detail);
    node.setAttribute('fill', 'none');
    node.removeAttribute('stroke-dasharray');
    group.append(node);
  }

  if (!element.text) return;
  const [title = '', ...rest] = element.text.split('\n');
  if (!plan.body || !rest.length) {
    group.append(labelNode(element, plan.label));

    return;
  }

  // A class or an entity is titled in its header and listed in its compartment.
  group.append(labelNode({ ...element, text: title }, plan.label), compartmentNode(element, rest, plan.body));
}

function compartmentNode(element: BoardElement, lines: string[], box: Box): SVGTextElement {
  const size = labelSize(element);
  const x = box.x + size * 0.55;
  const node = svg('text', 'board-label');
  node.setAttribute('fill', element.color);
  node.setAttribute('font-size', String(size));
  node.setAttribute('x', String(x));
  node.setAttribute('y', String(box.y + size * 1.25));
  appendLines(node, lines.join('\n'), x, box.y + size * 1.25, size);

  return node;
}

function renderConnector(group: SVGGElement, element: BoardElement, lookup: ElementLookup): void {
  const geometry = connectorGeometry(element, lookup);
  const line = stroked(element);
  line.setAttribute('d', penPath(geometry.points));
  line.setAttribute('fill', 'none');
  group.append(line);

  const caps = [
    capShape(element.startCap, geometry.start, geometry.startAngle, element.width),
    capShape(element.endCap, geometry.end, geometry.endAngle, element.width)
  ];
  for (const cap of caps) {
    if (cap) group.append(capNode(element, cap));
  }

  if (!element.text) return;
  const size = labelSize(element);
  const offset = labelOffset(geometry.midAngle, size);
  const at = { x: geometry.middle.x + offset.x, y: geometry.middle.y + offset.y };
  const box: Box = { x: at.x - 60, y: at.y - size, width: 120, height: size * 2 };
  const backdrop = svg('rect', 'board-connector-label');
  const width = Math.max(element.text.length * size * 0.56 + 8, size);
  backdrop.setAttribute('x', String(at.x - width / 2));
  backdrop.setAttribute('y', String(at.y - size * 0.7));
  backdrop.setAttribute('width', String(width));
  backdrop.setAttribute('height', String(size * 1.4));
  backdrop.setAttribute('rx', '4');
  group.append(backdrop, labelNode(element, box));
}

function capNode(element: BoardElement, cap: { d: string; fill: 'none' | 'color' | 'background' }): SVGPathElement {
  const node = svg('path', cap.fill === 'background' ? 'board-cap-hollow' : undefined);
  node.setAttribute('d', cap.d);
  node.setAttribute('stroke', element.color);
  node.setAttribute('stroke-width', String(element.width));
  node.setAttribute('stroke-linecap', 'round');
  node.setAttribute('stroke-linejoin', 'round');
  if (cap.fill === 'color') node.setAttribute('fill', element.color);
  else if (cap.fill === 'none') node.setAttribute('fill', 'none');

  return node;
}

function stroked(element: BoardElement): SVGPathElement {
  const path = svg('path');
  path.setAttribute('stroke', element.color);
  path.setAttribute('stroke-width', String(element.width));
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  if (element.dash) path.setAttribute('stroke-dasharray', `${element.width * 3} ${element.width * 2.6}`);

  return path;
}

/** Free text sits on its anchor and grows downward from the first line. */
function textNode(element: BoardElement): SVGTextElement {
  const size = fontSize(element);
  const [x = 0, y = 0] = element.points;
  const node = svg('text', 'board-text');
  node.setAttribute('fill', element.color);
  node.setAttribute('font-size', String(size));
  node.setAttribute('x', String(x));
  node.setAttribute('y', String(y));
  appendLines(node, element.text ?? '', x, y, size);

  return node;
}

/** Label of a shape or a connector, centered inside the area the shape reserves. */
function labelNode(element: BoardElement, box: Box): SVGTextElement {
  const size = labelSize(element);
  const lines = (element.text ?? '').split('\n');
  const x = box.x + box.width / 2;
  const first = box.y + box.height / 2 - ((lines.length - 1) * size * LINE_HEIGHT) / 2 + size * 0.34;
  const node = svg('text', 'board-label');
  node.setAttribute('fill', element.color);
  node.setAttribute('font-size', String(size));
  node.setAttribute('text-anchor', 'middle');
  node.setAttribute('x', String(x));
  node.setAttribute('y', String(first));
  appendLines(node, element.text ?? '', x, first, size);

  return node;
}

function appendLines(node: SVGTextElement, text: string, x: number, y: number, size: number): void {
  const lines = text.split('\n');
  if (lines.length === 1) {
    node.textContent = text;

    return;
  }

  for (const [index, line] of lines.entries()) {
    const span = svg('tspan');
    span.setAttribute('x', String(x));
    span.setAttribute('y', String(y + index * size * LINE_HEIGHT));
    span.textContent = line;
    node.append(span);
  }
}

export function labelSize(element: BoardElement): number {
  return 11 + element.width;
}

export function penPath(points: number[]): string {
  const commands: string[] = [];
  for (let index = 0; index + 1 < points.length; index += 2) {
    commands.push(`${index === 0 ? 'M' : 'L'} ${points[index]} ${points[index + 1]}`);
  }

  return commands.join(' ');
}
