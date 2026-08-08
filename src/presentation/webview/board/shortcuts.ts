import type { MessageKey } from '@/presentation/webview/i18n/messages';

export type ShortcutSection = 'tools' | 'edit' | 'style' | 'view' | 'general';

export interface Shortcut {
  id: string;
  section: ShortcutSection;
  label: MessageKey;
  /** Accepted signatures. The first one is the combination shown to the user. */
  keys: string[];
  /** Shown instead of the first signature when that one reads badly. */
  display?: string;
  /** Listed in the cheat sheet but handled elsewhere, such as holding a key. */
  passive?: boolean;
}

export const SHORTCUT_SECTIONS: Array<[ShortcutSection, MessageKey]> = [
  ['tools', 'board.tools'],
  ['edit', 'shortcuts.edit'],
  ['style', 'shortcuts.style'],
  ['view', 'shortcuts.view'],
  ['general', 'shortcuts.general']
];

/**
 * Every keyboard binding of the board, in one table: the canvas dispatches from
 * it and the cheat sheet is rendered from it, so a new shortcut cannot ship
 * without being documented.
 */
export const SHORTCUTS: Shortcut[] = [
  { id: 'tool.select', section: 'tools', label: 'board.select', keys: ['v'] },
  { id: 'tool.lasso', section: 'tools', label: 'board.lasso', keys: ['q'] },
  { id: 'tool.pen', section: 'tools', label: 'board.pen', keys: ['p'] },
  { id: 'tool.line', section: 'tools', label: 'board.line', keys: ['l'] },
  { id: 'tool.arrow', section: 'tools', label: 'board.arrow', keys: ['a'] },
  { id: 'tool.connector', section: 'tools', label: 'board.connector', keys: ['c'] },
  { id: 'tool.text', section: 'tools', label: 'board.text', keys: ['t'] },
  { id: 'tool.rectangle', section: 'tools', label: 'board.rectangle', keys: ['r'] },
  { id: 'tool.ellipse', section: 'tools', label: 'board.ellipse', keys: ['o'] },
  { id: 'tool.diamond', section: 'tools', label: 'board.diamond', keys: ['d'] },
  { id: 'tool.triangle', section: 'tools', label: 'board.triangle', keys: ['g'] },
  { id: 'shapes', section: 'tools', label: 'board.shapes', keys: ['s'] },
  { id: 'insertImage', section: 'tools', label: 'shortcuts.insertImage', keys: ['i'] },

  { id: 'selectAll', section: 'edit', label: 'shortcuts.selectAll', keys: ['ctrl+a'] },
  { id: 'deselect', section: 'edit', label: 'shortcuts.deselect', keys: ['escape'] },
  { id: 'editText', section: 'edit', label: 'shortcuts.editText', keys: ['enter', 'f2'] },
  { id: 'duplicate', section: 'edit', label: 'board.duplicate', keys: ['ctrl+d'] },
  { id: 'copy', section: 'edit', label: 'shortcuts.copy', keys: ['ctrl+c'] },
  { id: 'cut', section: 'edit', label: 'shortcuts.cut', keys: ['ctrl+x'] },
  { id: 'paste', section: 'edit', label: 'shortcuts.paste', keys: ['ctrl+v'] },
  { id: 'delete', section: 'edit', label: 'board.deleteSelected', keys: ['delete', 'backspace'] },
  { id: 'nudge', section: 'edit', label: 'shortcuts.nudge', keys: ['arrows'], passive: true },
  { id: 'nudgeFar', section: 'edit', label: 'shortcuts.nudgeFar', keys: ['shift+arrows'], passive: true },
  {
    id: 'bringToFront',
    section: 'edit',
    label: 'board.bringToFront',
    keys: ['ctrl+arrowup', 'ctrl+shift+arrowup', 'ctrl+]'],
    display: 'Ctrl+↑'
  },
  {
    id: 'sendToBack',
    section: 'edit',
    label: 'board.sendToBack',
    keys: ['ctrl+arrowdown', 'ctrl+shift+arrowdown', 'ctrl+['],
    display: 'Ctrl+↓'
  },
  { id: 'undo', section: 'edit', label: 'board.undo', keys: ['ctrl+z'] },
  { id: 'redo', section: 'edit', label: 'board.redo', keys: ['ctrl+shift+z', 'ctrl+y'] },

  { id: 'fill', section: 'style', label: 'board.fill', keys: ['f'] },
  { id: 'dash', section: 'style', label: 'board.dashed', keys: ['-'], display: '−' },
  { id: 'strokeThin', section: 'style', label: 'board.strokeThin', keys: ['1'] },
  { id: 'strokeMedium', section: 'style', label: 'board.strokeMedium', keys: ['2'] },
  { id: 'strokeThick', section: 'style', label: 'board.strokeThick', keys: ['3'] },
  { id: 'nextColor', section: 'style', label: 'shortcuts.nextColor', keys: ['k'] },

  {
    id: 'zoomIn',
    section: 'view',
    label: 'board.zoomIn',
    keys: ['ctrl++', 'ctrl+=', 'ctrl+shift++', 'ctrl+shift+='],
    display: 'Ctrl +'
  },
  { id: 'zoomOut', section: 'view', label: 'board.zoomOut', keys: ['ctrl+-'], display: 'Ctrl −' },
  { id: 'resetView', section: 'view', label: 'board.resetView', keys: ['0', 'ctrl+0'] },
  { id: 'fitView', section: 'view', label: 'board.fitView', keys: ['z'] },
  { id: 'pan', section: 'view', label: 'shortcuts.pan', keys: ['space'], passive: true },
  { id: 'constrain', section: 'view', label: 'shortcuts.constrain', keys: ['shift'], passive: true },

  { id: 'exportBoard', section: 'general', label: 'shortcuts.exportBoard', keys: ['e'] },
  { id: 'help', section: 'general', label: 'shortcuts.help', keys: ['h', 'shift+?', '?', 'f1'], display: 'H' },
  { id: 'save', section: 'general', label: 'shortcuts.save', keys: ['ctrl+s'] }
];

const DISPLAY_NAMES: Record<string, string> = {
  ctrl: 'Ctrl',
  shift: 'Shift',
  alt: 'Alt',
  escape: 'Esc',
  enter: 'Enter',
  delete: 'Del',
  backspace: '⌫',
  space: 'Space',
  arrows: '← ↑ → ↓',
  f1: 'F1',
  f2: 'F2'
};

/**
 * Signature of a key press. Letters and digits come from `code`, so a binding
 * keeps working on keyboard layouts that move them, while punctuation comes from
 * `key`, which is where the layout is the point.
 */
export function signature(event: KeyboardEvent): string {
  const modifiers = [
    event.ctrlKey || event.metaKey ? 'ctrl' : '',
    event.shiftKey ? 'shift' : '',
    event.altKey ? 'alt' : ''
  ].filter(Boolean);

  return [...modifiers, keyName(event)].join('+');
}

function keyName(event: KeyboardEvent): string {
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3).toLowerCase();
  if (/^Digit\d$/.test(event.code)) return event.code.slice(5);
  if (event.key === ' ') return 'space';

  return event.key.toLowerCase();
}

export function shortcutFor(id: string): Shortcut | undefined {
  return SHORTCUTS.find((shortcut) => shortcut.id === id);
}

export function findShortcut(event: KeyboardEvent): Shortcut | undefined {
  const pressed = signature(event);

  return SHORTCUTS.find((shortcut) => !shortcut.passive && shortcut.keys.includes(pressed));
}

/** Combination shown in the cheat sheet, such as `Ctrl+D`. */
export function displayKeys(shortcut: Shortcut): string {
  if (shortcut.display) return shortcut.display;
  const [combination = ''] = shortcut.keys;

  return combination
    .split('+')
    .map((part) => DISPLAY_NAMES[part] ?? (part.length === 1 ? part.toUpperCase() : part))
    .join('+');
}
