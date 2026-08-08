import type { BoardElement, BoardExportFormat } from '@/core/types';
import { t } from '@/presentation/webview/i18n/messages';
import type { ElementLookup } from './connectors';
import { outerBox, unionBox } from './geometry';
import { renderElement, SVG_NS, type Assets } from './render';

const PADDING = 32;
const BACKGROUND = '#ffffff';
const PNG_SCALE = 2;

/**
 * Renders the board outside the canvas, into a standalone document. Images are
 * inlined as data URIs by the host beforehand, so the result opens anywhere and
 * a raster export never taints the drawing surface it is read back from.
 */
export function boardSvg(elements: BoardElement[], lookup: ElementLookup, assets: Assets): string {
  const bounds = unionBox(elements.map(outerBox));
  const width = Math.max(1, Math.round(bounds.width + PADDING * 2));
  const height = Math.max(1, Math.round(bounds.height + PADDING * 2));
  const x = Math.round(bounds.x - PADDING);
  const y = Math.round(bounds.y - PADDING);

  const root = document.createElementNS(SVG_NS, 'svg');
  root.setAttribute('xmlns', SVG_NS);
  root.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  root.setAttribute('width', String(width));
  root.setAttribute('height', String(height));
  root.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);

  const background = document.createElementNS(SVG_NS, 'rect');
  background.setAttribute('x', String(x));
  background.setAttribute('y', String(y));
  background.setAttribute('width', String(width));
  background.setAttribute('height', String(height));
  background.setAttribute('fill', BACKGROUND);
  root.append(background);

  // The canvas paints text and connector labels with theme colors from the
  // stylesheet, which the exported file does not carry.
  const style = document.createElementNS(SVG_NS, 'style');
  style.textContent = '.board-text,.board-label{font-family:system-ui,-apple-system,Segoe UI,sans-serif}'
    + `.board-connector-label{fill:${BACKGROUND};stroke:none}.board-cap-hollow{fill:${BACKGROUND}}`;
  root.append(style);

  for (const element of elements) root.append(renderElement(element, lookup, assets));

  return new XMLSerializer().serializeToString(root);
}

/** Rasterizes the exported drawing, which is what most places expect to receive. */
export async function boardPng(source: string, width: number, height: number): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * PNG_SCALE));
  canvas.height = Math.max(1, Math.round(height * PNG_SCALE));
  const context = canvas.getContext('2d');
  if (!context) throw new Error(t('board.exportFailed'));

  const image = await load(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
}

/** Size of a serialized document, read back from its own attributes. */
export function svgSize(source: string): { width: number; height: number } {
  const width = Number(/width="(\d+)"/.exec(source)?.[1] ?? 0);
  const height = Number(/height="(\d+)"/.exec(source)?.[1] ?? 0);

  return { width: width || 1, height: height || 1 };
}

export function exportFileName(title: string, format: BoardExportFormat): string {
  return `${title}.${format}`;
}

function load(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error(t('board.exportFailed'))));
    image.src = source;
  });
}
