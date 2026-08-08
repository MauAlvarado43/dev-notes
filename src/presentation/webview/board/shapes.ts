import type { BoardShapeKind } from '@/core/types';
import type { IconName } from '@/presentation/webview/components/icons';
import type { MessageKey } from '@/presentation/webview/i18n/messages';
import type { Box } from './geometry';

/** Where a shape belongs in the palette, so diagram sets stay together. */
export type ShapeGroup = 'basic' | 'flowchart' | 'uml' | 'er';

export interface ShapeDefinition {
  kind: BoardShapeKind;
  group: ShapeGroup;
  icon: IconName;
  label: MessageKey;
}

export const SHAPE_GROUP_LABELS: Record<ShapeGroup, MessageKey> = {
  basic: 'board.shapesBasic',
  flowchart: 'board.shapesFlowchart',
  uml: 'board.shapesUml',
  er: 'board.shapesEr'
};

export const SHAPES: ShapeDefinition[] = [
  { kind: 'rectangle', group: 'basic', icon: 'square', label: 'board.rectangle' },
  { kind: 'roundRect', group: 'basic', icon: 'roundSquare', label: 'board.roundRect' },
  { kind: 'ellipse', group: 'basic', icon: 'circle', label: 'board.ellipse' },
  { kind: 'triangle', group: 'basic', icon: 'triangle', label: 'board.triangle' },
  { kind: 'diamond', group: 'flowchart', icon: 'diamond', label: 'board.diamond' },
  { kind: 'parallelogram', group: 'flowchart', icon: 'parallelogram', label: 'board.parallelogram' },
  { kind: 'hexagon', group: 'flowchart', icon: 'hexagon', label: 'board.hexagon' },
  { kind: 'cylinder', group: 'flowchart', icon: 'cylinder', label: 'board.cylinder' },
  { kind: 'note', group: 'flowchart', icon: 'sticky', label: 'board.noteShape' },
  { kind: 'umlClass', group: 'uml', icon: 'umlClass', label: 'board.umlClass' },
  { kind: 'package', group: 'uml', icon: 'package', label: 'board.package' },
  { kind: 'actor', group: 'uml', icon: 'actor', label: 'board.actor' },
  { kind: 'entity', group: 'er', icon: 'entity', label: 'board.entity' }
];

const SHAPE_KINDS = new Set<string>(SHAPES.map((shape) => shape.kind));

/** Default size used when a shape is dropped with a click instead of a drag. */
export const SHAPE_DEFAULT_SIZE: Partial<Record<BoardShapeKind, { width: number; height: number }>> = {
  umlClass: { width: 180, height: 120 },
  entity: { width: 170, height: 96 },
  package: { width: 160, height: 100 },
  actor: { width: 60, height: 90 },
  note: { width: 150, height: 110 }
};

export function isShapeKind(kind: string): kind is BoardShapeKind {
  return SHAPE_KINDS.has(kind);
}

export interface ShapePlan {
  /** Outline that takes the fill of the element. */
  outline: string;
  /** Extra strokes such as compartment dividers, never filled. */
  details: string[];
  /** Area a label is centered in. */
  label: Box;
  /**
   * Compartment under the header of a class or an entity. When a shape has one,
   * the first line of its label titles it and the rest is listed here.
   */
  body?: Box;
}

/**
 * Geometry of every shape, described as paths inside a box. Keeping it in one
 * place means a new diagram shape only needs an entry here, an icon, and a label.
 */
export function shapePlan(kind: BoardShapeKind, box: Box): ShapePlan {
  const { x, y } = box;
  const width = Math.max(box.width, 1);
  const height = Math.max(box.height, 1);
  const right = x + width;
  const bottom = y + height;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const inset = (fraction: number, max: number): number => Math.min(width * fraction, height * fraction, max);

  switch (kind) {
    case 'roundRect': {
      const radius = Math.min(width, height) * 0.25;

      return plain(roundedPath(x, y, width, height, radius), box);
    }
    case 'ellipse': {
      const rx = width / 2;
      const ry = height / 2;

      return plain(
        `M ${x} ${centerY} A ${rx} ${ry} 0 1 0 ${right} ${centerY} A ${rx} ${ry} 0 1 0 ${x} ${centerY} Z`,
        box
      );
    }
    case 'triangle':
      return {
        outline: `M ${centerX} ${y} L ${right} ${bottom} L ${x} ${bottom} Z`,
        details: [],
        label: { x, y: y + height * 0.42, width, height: height * 0.5 }
      };
    case 'diamond':
      return {
        outline: `M ${centerX} ${y} L ${right} ${centerY} L ${centerX} ${bottom} L ${x} ${centerY} Z`,
        details: [],
        label: { x: x + width * 0.18, y: y + height * 0.25, width: width * 0.64, height: height * 0.5 }
      };
    case 'parallelogram': {
      const skew = Math.min(width * 0.22, 40);

      return plain(`M ${x + skew} ${y} L ${right} ${y} L ${right - skew} ${bottom} L ${x} ${bottom} Z`, {
        x: x + skew,
        y,
        width: width - skew * 2,
        height
      });
    }
    case 'hexagon': {
      const cut = Math.min(width * 0.2, 40);

      return plain(
        `M ${x + cut} ${y} L ${right - cut} ${y} L ${right} ${centerY} L ${right - cut} ${bottom} `
          + `L ${x + cut} ${bottom} L ${x} ${centerY} Z`,
        { x: x + cut, y, width: width - cut * 2, height }
      );
    }
    case 'cylinder': {
      const rx = width / 2;
      const ry = Math.min(height * 0.16, width * 0.3);

      return {
        outline: `M ${x} ${y + ry} A ${rx} ${ry} 0 0 1 ${right} ${y + ry} L ${right} ${bottom - ry} `
          + `A ${rx} ${ry} 0 0 1 ${x} ${bottom - ry} Z`,
        details: [`M ${x} ${y + ry} A ${rx} ${ry} 0 0 0 ${right} ${y + ry}`],
        label: { x, y: y + ry * 2, width, height: height - ry * 3 }
      };
    }
    case 'note': {
      const fold = inset(0.28, 22);

      return {
        outline: `M ${x} ${y} L ${right - fold} ${y} L ${right} ${y + fold} L ${right} ${bottom} L ${x} ${bottom} Z`,
        details: [`M ${right - fold} ${y} L ${right - fold} ${y + fold} L ${right} ${y + fold}`],
        label: { x, y: y + fold, width, height: height - fold }
      };
    }
    case 'umlClass': {
      const header = Math.min(height * 0.34, 30);
      const middle = header + (height - header) / 2;

      return {
        outline: roundedPath(x, y, width, height, 4),
        details: [`M ${x} ${y + header} L ${right} ${y + header}`, `M ${x} ${y + middle} L ${right} ${y + middle}`],
        label: { x, y, width, height: header },
        body: { x, y: y + header, width, height: height - header }
      };
    }
    case 'entity': {
      const header = Math.min(height * 0.4, 32);

      return {
        outline: roundedPath(x, y, width, height, 4),
        details: [`M ${x} ${y + header} L ${right} ${y + header}`],
        label: { x, y, width, height: header },
        body: { x, y: y + header, width, height: height - header }
      };
    }
    case 'package': {
      const tabWidth = Math.min(width * 0.42, 90);
      const tabHeight = Math.min(height * 0.22, 20);

      return {
        outline: `M ${x} ${y} L ${x + tabWidth} ${y} L ${x + tabWidth} ${y + tabHeight} L ${right} ${y + tabHeight} `
          + `L ${right} ${bottom} L ${x} ${bottom} Z`,
        details: [],
        label: { x, y: y + tabHeight, width, height: height - tabHeight }
      };
    }
    case 'actor': {
      const headRadius = Math.min(width / 2, height * 0.16);
      const headY = y + headRadius;
      const shoulders = headY + headRadius * 1.4;
      const hips = y + height * 0.62;

      return {
        outline: `M ${centerX - headRadius} ${headY} a ${headRadius} ${headRadius} 0 1 0 ${headRadius * 2} 0 `
          + `a ${headRadius} ${headRadius} 0 1 0 ${-headRadius * 2} 0 Z`,
        details: [
          `M ${centerX} ${headY + headRadius} L ${centerX} ${hips}`,
          `M ${x + width * 0.12} ${shoulders} L ${right - width * 0.12} ${shoulders}`,
          `M ${centerX} ${hips} L ${x + width * 0.14} ${bottom} M ${centerX} ${hips} L ${right - width * 0.14} ${bottom}`
        ],
        label: { x: x - width * 0.6, y: bottom + 4, width: width * 2.2, height: 18 }
      };
    }
    default:
      return plain(roundedPath(x, y, width, height, 4), box);
  }
}

function plain(outline: string, label: Box): ShapePlan {
  return { outline, details: [], label };
}

function roundedPath(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));

  return `M ${x + r} ${y} H ${x + width - r} A ${r} ${r} 0 0 1 ${x + width} ${y + r} `
    + `V ${y + height - r} A ${r} ${r} 0 0 1 ${x + width - r} ${y + height} `
    + `H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + height - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}
