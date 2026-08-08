import { LocalizedError } from '../core/i18n/catalog';
import type {
  BoardAnchor,
  BoardCap,
  BoardDocument,
  BoardElement,
  BoardElementKind,
  BoardEndpoint,
  BoardRoute
} from '../core/types';

export const BOARD_EXTENSION = '.board.json';
export const BOARD_VERSION = 1;

const ELEMENT_KINDS: BoardElementKind[] = [
  'pen',
  'line',
  'arrow',
  'connector',
  'text',
  'image',
  'rectangle',
  'roundRect',
  'ellipse',
  'triangle',
  'diamond',
  'parallelogram',
  'hexagon',
  'cylinder',
  'note',
  'umlClass',
  'entity',
  'package',
  'actor'
];
const CAPS: BoardCap[] = ['none', 'arrow', 'triangle', 'diamond', 'filledDiamond', 'circle', 'one', 'many'];
const ANCHORS: BoardAnchor[] = ['auto', 'top', 'right', 'bottom', 'left'];
const ROUTES: BoardRoute[] = ['straight', 'elbow'];
const MIN_STROKE = 1;
const MAX_STROKE = 24;

export function isBoardFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(BOARD_EXTENSION);
}

/** A board title is its file name without the `.board.json` suffix. */
export function boardTitle(fileName: string): string {
  return isBoardFile(fileName) ? fileName.slice(0, -BOARD_EXTENSION.length) : fileName;
}

export function boardFileName(title: string): string {
  return `${title}${BOARD_EXTENSION}`;
}

export function emptyBoard(): BoardDocument {
  return { version: BOARD_VERSION, elements: [] };
}

/**
 * Reads a board file. The document is plain JSON that a person may edit by hand,
 * so a broken file is reported, while a single malformed element is dropped
 * instead of taking the whole board down with it.
 */
export function parseBoard(text: string): BoardDocument {
  if (!text.trim()) return emptyBoard();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new LocalizedError('errors.invalidBoard');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new LocalizedError('errors.invalidBoard');
  const elements = (parsed as { elements?: unknown }).elements;
  if (elements !== undefined && !Array.isArray(elements)) throw new LocalizedError('errors.invalidBoard');

  return {
    version: BOARD_VERSION,
    elements: (elements ?? []).map(readElement).filter((element): element is BoardElement => element !== undefined)
  };
}

/** Written with stable formatting so a board produces readable diffs. */
export function serializeBoard(board: BoardDocument): string {
  return `${JSON.stringify({ version: BOARD_VERSION, elements: board.elements }, undefined, 2)}\n`;
}

/** Text drawn on a board, so the sidebar can search inside it. */
export function boardSearchText(board: BoardDocument): string {
  return board.elements
    .map((element) => element.text ?? '')
    .filter(Boolean)
    .join(' ');
}

function readElement(value: unknown): BoardElement | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<BoardElement>;
  const kind = candidate.kind;
  if (!kind || !ELEMENT_KINDS.includes(kind)) return undefined;
  if (typeof candidate.id !== 'string' || !candidate.id) return undefined;

  const points = Array.isArray(candidate.points)
    ? candidate.points.filter((point): point is number => Number.isFinite(point))
    : [];
  if (points.length < 2 || points.length % 2 !== 0) return undefined;

  const element: BoardElement = {
    id: candidate.id,
    kind,
    color: typeof candidate.color === 'string' ? candidate.color : '#7c6df2',
    width: clampStroke(candidate.width),
    points
  };
  if (candidate.filled) element.filled = true;
  if (candidate.dash) element.dash = true;
  if (kind === 'text') {
    if (typeof candidate.text !== 'string' || !candidate.text) return undefined;
    element.text = candidate.text;
  } else if (typeof candidate.text === 'string' && candidate.text) {
    element.text = candidate.text;
  }

  const rotation = normalizeRotation(candidate.rotation);
  if (rotation !== 0) element.rotation = rotation;

  // An image without a file is nothing to draw, so it does not survive the read.
  if (kind === 'image') {
    if (typeof candidate.src !== 'string' || !candidate.src) return undefined;
    element.src = candidate.src;
  }

  if (kind === 'connector') {
    const from = readEndpoint(candidate.from);
    const to = readEndpoint(candidate.to);
    if (from) element.from = from;
    if (to) element.to = to;
    element.startCap = readCap(candidate.startCap, 'none');
    element.endCap = readCap(candidate.endCap, 'arrow');
    element.route = ROUTES.includes(candidate.route as BoardRoute) ? (candidate.route as BoardRoute) : 'straight';
  }

  return element;
}

/** An endpoint without an element is a free end, which `points` already covers. */
function readEndpoint(value: unknown): BoardEndpoint | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as BoardEndpoint;
  if (typeof candidate.element !== 'string' || !candidate.element) return undefined;

  return {
    element: candidate.element,
    anchor: ANCHORS.includes(candidate.anchor as BoardAnchor) ? candidate.anchor : 'auto'
  };
}

function readCap(value: unknown, fallback: BoardCap): BoardCap {
  return CAPS.includes(value as BoardCap) ? (value as BoardCap) : fallback;
}

/** Rotation is stored as a positive angle below a full turn, so files stay tidy. */
function normalizeRotation(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  const turns = ((value % 360) + 360) % 360;

  return Math.round(turns * 100) / 100;
}

function clampStroke(width: unknown): number {
  if (typeof width !== 'number' || !Number.isFinite(width)) return 2;

  return Math.min(MAX_STROKE, Math.max(MIN_STROKE, width));
}
