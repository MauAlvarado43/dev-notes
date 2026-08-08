export type IconName =
  | 'logo'
  | 'note'
  | 'folder'
  | 'search'
  | 'plus'
  | 'more'
  | 'chevron'
  | 'edit'
  | 'trash'
  | 'close'
  | 'external'
  | 'paperclip'
  | 'file'
  | 'image'
  | 'board'
  | 'cursor'
  | 'lasso'
  | 'square'
  | 'roundSquare'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'parallelogram'
  | 'hexagon'
  | 'cylinder'
  | 'sticky'
  | 'umlClass'
  | 'package'
  | 'actor'
  | 'entity'
  | 'arrow'
  | 'line'
  | 'elbow'
  | 'connector'
  | 'text'
  | 'fill'
  | 'dash'
  | 'copy'
  | 'front'
  | 'back'
  | 'undo'
  | 'redo'
  | 'zoomIn'
  | 'zoomOut'
  | 'fit'
  | 'frame'
  | 'keyboard'
  | 'export';

/**
 * Single SVG sprite injected once per webview. Icons are referenced by `<use>`,
 * which keeps the rendered markup small and the stroke style consistent.
 */
const SPRITE = `<svg class="icon-sprite" aria-hidden="true">
  <symbol id="i-logo" viewBox="0 0 24 24"><path d="M5 3.5h9.5l4 4v13H5z"/><path d="M14.5 3.5v4h4M8.5 12h6M8.5 15.5h6M8.5 19h3.5"/></symbol>
  <symbol id="i-note" viewBox="0 0 24 24"><path d="M6 3.5h8.5l3.5 3.5v13.5H6z"/><path d="M14.5 3.5V7H18M9 11h6M9 14h6M9 17h3.5"/></symbol>
  <symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="i-more" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2" class="fill"/><circle cx="12" cy="12" r="1.2" class="fill"/><circle cx="19" cy="12" r="1.2" class="fill"/></symbol>
  <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></symbol>
  <symbol id="i-edit" viewBox="0 0 24 24"><path d="m4 20 4.2-1 10.4-10.4a2.1 2.1 0 0 0-3-3L5.2 16zM14.5 6.5l3 3"/></symbol>
  <symbol id="i-trash" viewBox="0 0 24 24"><path d="M5 7h14M9 7V4.5h6V7M7 7l1 13h8l1-13M10 10.5v6M14 10.5v6"/></symbol>
  <symbol id="i-close" viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17"/></symbol>
  <symbol id="i-external" viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8"/><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"/></symbol>
  <symbol id="i-paperclip" viewBox="0 0 24 24"><path d="M18.5 11.5 12 18a4 4 0 0 1-5.7-5.7l7.1-7.1a2.7 2.7 0 0 1 3.8 3.8l-7.1 7.1a1.4 1.4 0 0 1-1.9-1.9l6.4-6.4"/></symbol>
  <symbol id="i-file" viewBox="0 0 24 24"><path d="M6.5 3.5h7l4 4v13h-11z"/><path d="M13.5 3.5V7.5h4"/></symbol>
  <symbol id="i-image" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m4.5 17 4.5-4.5 3.5 3.5 3-2.5 4 4"/></symbol>
  <symbol id="i-board" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 17v3M9 20h6"/><path d="M6.5 13.5c1.5-3.5 3-3.5 4 0 .8 2.5 2 1.5 2.5-1"/></symbol>
  <symbol id="i-cursor" viewBox="0 0 24 24"><path d="M5.5 3.5 19 11l-6 1.6L10.6 19z"/></symbol>
  <symbol id="i-lasso" viewBox="0 0 24 24"><ellipse cx="12" cy="9.5" rx="8" ry="5.5"/><path d="M8.6 14.4c-.7 1.5-.3 2.9 1 3.4"/><circle cx="8.7" cy="19.4" r="1.6"/></symbol>
  <symbol id="i-square" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/></symbol>
  <symbol id="i-roundSquare" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="5.5"/></symbol>
  <symbol id="i-circle" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="8.5" ry="7"/></symbol>
  <symbol id="i-triangle" viewBox="0 0 24 24"><path d="M12 5 20.5 19h-17z"/></symbol>
  <symbol id="i-diamond" viewBox="0 0 24 24"><path d="M12 4 20 12l-8 8-8-8z"/></symbol>
  <symbol id="i-parallelogram" viewBox="0 0 24 24"><path d="M8.5 6H21l-5.5 12H3z"/></symbol>
  <symbol id="i-hexagon" viewBox="0 0 24 24"><path d="M8 5h8l4 7-4 7H8l-4-7z"/></symbol>
  <symbol id="i-cylinder" viewBox="0 0 24 24"><path d="M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7"/><ellipse cx="12" cy="7" rx="8" ry="3"/></symbol>
  <symbol id="i-sticky" viewBox="0 0 24 24"><path d="M5 4h14v10l-5 6H5z"/><path d="M19 14h-5v6"/></symbol>
  <symbol id="i-umlClass" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.5h16M4 14.5h16"/></symbol>
  <symbol id="i-package" viewBox="0 0 24 24"><path d="M4 19V5h7v3h9v11z"/><path d="M4 8h7"/></symbol>
  <symbol id="i-actor" viewBox="0 0 24 24"><circle cx="12" cy="5.5" r="2.5"/><path d="M12 8v7M7.5 11h9M12 15l-3.5 5M12 15l3.5 5"/></symbol>
  <symbol id="i-entity" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10.5h18"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M4 20 20 4M20 4h-7M20 4v7"/></symbol>
  <symbol id="i-line" viewBox="0 0 24 24"><path d="M4 20 20 4"/></symbol>
  <symbol id="i-elbow" viewBox="0 0 24 24"><path d="M4 6h6v12h10"/></symbol>
  <symbol id="i-connector" viewBox="0 0 24 24"><rect x="3" y="3.5" width="7.5" height="5.5" rx="1.5"/><rect x="13.5" y="15" width="7.5" height="5.5" rx="1.5"/><path d="M6.8 9v5.2a2 2 0 0 0 2 2h4.7"/></symbol>
  <symbol id="i-text" viewBox="0 0 24 24"><path d="M5 6.5V5h14v1.5M12 5v14M9 19h6"/></symbol>
  <symbol id="i-fill" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M5 14.5 14.5 5M9 18.5 18.5 9M15 19l4-4"/></symbol>
  <symbol id="i-dash" viewBox="0 0 24 24"><path d="M3 12h4M10 12h4M17 12h4"/></symbol>
  <symbol id="i-copy" viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/></symbol>
  <symbol id="i-front" viewBox="0 0 24 24"><rect x="3" y="10" width="11" height="10" rx="2"/><path d="M18.5 14.5V5M18.5 5 16 7.5M18.5 5 21 7.5"/></symbol>
  <symbol id="i-back" viewBox="0 0 24 24"><rect x="3" y="4" width="11" height="10" rx="2"/><path d="M18.5 9.5V19M18.5 19 16 16.5M18.5 19l2.5-2.5"/></symbol>
  <symbol id="i-undo" viewBox="0 0 24 24"><path d="M4 9h11a5 5 0 0 1 0 10H8"/><path d="M4 9l4-4M4 9l4 4"/></symbol>
  <symbol id="i-redo" viewBox="0 0 24 24"><path d="M20 9H9a5 5 0 0 0 0 10h7"/><path d="m20 9-4-4M20 9l-4 4"/></symbol>
  <symbol id="i-zoomIn" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4M8.5 11h5M11 8.5v5"/></symbol>
  <symbol id="i-zoomOut" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4M8.5 11h5"/></symbol>
  <symbol id="i-fit" viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.5"/></symbol>
  <symbol id="i-export" viewBox="0 0 24 24"><path d="M12 15V4M12 4 8.5 7.5M12 4l3.5 3.5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></symbol>
  <symbol id="i-keyboard" viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 9.5h.01M9.5 9.5h.01M13 9.5h.01M16.5 9.5h.01M6 12.5h.01M9.5 12.5h.01M13 12.5h.01M16.5 12.5h.01M8 15.5h8"/></symbol>
  <symbol id="i-frame" viewBox="0 0 24 24"><path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4"/></symbol>
</svg>`;

export function mountIconSprite(root: HTMLElement): void {
  const holder = document.createElement('div');
  holder.innerHTML = SPRITE;
  root.prepend(holder.firstElementChild as SVGElement);
}

/** Markup for an icon; only used with static, non-user content. */
export function iconMarkup(name: IconName): string {
  return `<svg class="icon"><use href="#i-${name}"></use></svg>`;
}

export function icon(name: IconName): SVGElement {
  const holder = document.createElement('div');
  holder.innerHTML = iconMarkup(name);

  return holder.firstElementChild as SVGElement;
}
