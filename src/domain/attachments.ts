import { noteTitle } from './notes';

/** Hidden folder holding the attachments of every note in a notebook. */
export const ATTACHMENTS_DIRECTORY = '.attachments';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.avif'];
const UNSAFE_CHARACTERS = /[<>:"|?*]/g;
const CONTROL_CHARACTERS = /\p{Cc}/gu;
const FALLBACK_NAME = 'file';

/** Attachments of a note live in `<notebook>/.attachments/<note title>/`. */
export function attachmentFolder(noteFileName: string): string {
  return noteTitle(noteFileName);
}

/**
 * File names come from the operating system, so any path prefix is dropped and
 * the reserved characters, control characters, leading dots, and trailing dots
 * or spaces are removed before the name is used inside the notes folder.
 */
export function sanitizeAttachmentName(name: string): string {
  const segment = name.split(/[\\/]/).pop() ?? '';
  const cleaned = segment
    .replace(CONTROL_CHARACTERS, '')
    .replace(UNSAFE_CHARACTERS, '-')
    .replace(/^\.+/, '')
    .replace(/[. ]+$/, '')
    .trim();

  return cleaned || FALLBACK_NAME;
}

/** Keeps both files when a name is already taken, as `report (2).pdf`. */
export function uniqueAttachmentName(name: string, existing: readonly string[]): string {
  const taken = new Set(existing.map((entry) => entry.toLowerCase()));
  const safe = sanitizeAttachmentName(name);
  if (!taken.has(safe.toLowerCase())) return safe;

  const dot = safe.lastIndexOf('.');
  const base = dot > 0 ? safe.slice(0, dot) : safe;
  const extension = dot > 0 ? safe.slice(dot) : '';

  for (let index = 2; ; index++) {
    const candidate = `${base} (${index})${extension}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

export function isImageAttachment(name: string): boolean {
  return IMAGE_EXTENSIONS.some((extension) => name.toLowerCase().endsWith(extension));
}

/**
 * Markdown reference to an attachment, relative to the note that owns it, so the
 * link keeps working when the notebook folder moves.
 */
export function attachmentMarkdown(noteFileName: string, attachmentName: string): string {
  const target = encodeURI(`${ATTACHMENTS_DIRECTORY}/${attachmentFolder(noteFileName)}/${attachmentName}`);
  const label = attachmentName.replace(/([[\]])/g, '\\$1');

  return `${isImageAttachment(attachmentName) ? '!' : ''}[${label}](${target})`;
}
