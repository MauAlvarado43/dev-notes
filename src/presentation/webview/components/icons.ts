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
  | 'square'
  | 'circle'
  | 'arrow'
  | 'line'
  | 'text'
  | 'undo'
  | 'redo'
  | 'zoomIn'
  | 'zoomOut'
  | 'frame';

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
  <symbol id="i-square" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/></symbol>
  <symbol id="i-circle" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="8.5" ry="7"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M4 20 20 4M20 4h-7M20 4v7"/></symbol>
  <symbol id="i-line" viewBox="0 0 24 24"><path d="M4 20 20 4"/></symbol>
  <symbol id="i-text" viewBox="0 0 24 24"><path d="M5 6.5V5h14v1.5M12 5v14M9 19h6"/></symbol>
  <symbol id="i-undo" viewBox="0 0 24 24"><path d="M4 9h11a5 5 0 0 1 0 10H8"/><path d="M4 9l4-4M4 9l4 4"/></symbol>
  <symbol id="i-redo" viewBox="0 0 24 24"><path d="M20 9H9a5 5 0 0 0 0 10h7"/><path d="m20 9-4-4M20 9l-4 4"/></symbol>
  <symbol id="i-zoomIn" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4M8.5 11h5M11 8.5v5"/></symbol>
  <symbol id="i-zoomOut" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4M8.5 11h5"/></symbol>
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
