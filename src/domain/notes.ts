import { LocalizedError } from '../core/i18n/catalog';

const NOTE_EXTENSION = '.md';
const FORBIDDEN_CHARACTERS = /[<>:"/\\|?*]/;
const CONTROL_CHARACTERS = /\p{Cc}/u;
const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const TRAILING_DOT_OR_SPACE = /[. ]$/;

/** Notes are plain `.md` files, so their title is the file name without extension. */
export function noteTitle(fileName: string): string {
  return fileName.toLowerCase().endsWith(NOTE_EXTENSION)
    ? fileName.slice(0, -NOTE_EXTENSION.length)
    : fileName;
}

export function noteFileName(title: string): string {
  return `${title}${NOTE_EXTENSION}`;
}

export function isNoteFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(NOTE_EXTENSION);
}

export function sameName(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Validates a notebook or note name against the rules of the most restrictive
 * supported file system, and rejects names already taken by a sibling.
 */
export function requireValidName(input: string, existing: readonly string[]): string {
  const value = input.trim();
  if (!value) throw new LocalizedError('errors.nameRequired');
  if (value === '.' || value === '..') throw new LocalizedError('errors.nameInvalid');
  if (FORBIDDEN_CHARACTERS.test(value) || CONTROL_CHARACTERS.test(value)) throw new LocalizedError('errors.nameCharacters');
  if (RESERVED_WINDOWS_NAMES.test(value)) throw new LocalizedError('errors.nameReserved');
  if (TRAILING_DOT_OR_SPACE.test(value)) throw new LocalizedError('errors.nameTrailing');
  if (existing.some((name) => sameName(name, value))) throw new LocalizedError('errors.nameTaken');

  return value;
}

/** Validates the file name a webview sent back before it is used to build a URI. */
export function requireNoteFileName(input: string): string {
  const fileName = requireValidName(input, []);
  if (!isNoteFile(fileName)) throw new LocalizedError('errors.invalidNoteFile');

  return fileName;
}

/** Expands the configured note template. `${title}` is the only supported placeholder. */
export function applyNoteTemplate(template: string, title: string): string {
  return template.replace(/\$\{title\}/g, () => title).replaceAll('\\n', '\n');
}
