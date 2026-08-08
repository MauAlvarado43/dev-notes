import type { NoteAttachment } from '@/core/types';
import { attachmentMarkdown } from '@/domain/attachments';
import { noteFileName } from '@/domain/notes';
import { element, iconButton } from '@/presentation/webview/components/dom';
import { icon } from '@/presentation/webview/components/icons';
import { count, t, tag } from '@/presentation/webview/i18n/messages';

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];
const SIZE_STEP = 1024;

export interface AttachmentHandlers {
  open(name: string): void;
  remove(name: string): void;
  insert(markdown: string): void;
}

/** Files copied into the notes folder, listed under the note header. */
export function renderAttachments(
  panel: HTMLElement,
  noteTitle: string,
  attachments: NoteAttachment[],
  handlers: AttachmentHandlers
): void {
  panel.replaceChildren();
  panel.hidden = attachments.length === 0;
  if (panel.hidden) return;

  const heading = element('div', 'attachments-head');
  const title = element('span', 'attachments-title');
  title.append(icon('paperclip'), element('span', undefined, t('attachments.heading')));
  heading.append(title, element('span', 'attachments-count', count('attachments.count', attachments.length)));

  const list = element('ul', 'attachment-list');
  for (const attachment of attachments) {
    list.append(attachmentRow(noteTitle, attachment, handlers));
  }

  panel.append(heading, list);
}

function attachmentRow(noteTitle: string, attachment: NoteAttachment, handlers: AttachmentHandlers): HTMLElement {
  const row = element('li', 'attachment');

  const badge = element('span', 'attachment-icon');
  badge.append(icon(attachment.image ? 'image' : 'file'));
  if (attachment.image) badge.title = t('attachments.image');

  const copy = element('span', 'attachment-copy');
  copy.append(
    element('span', 'attachment-name', attachment.name),
    element('span', 'attachment-size', formatSize(attachment.size))
  );

  const actions = element('div', 'attachment-actions');
  actions.append(
    iconButton('plus', t('attachments.insert'), () =>
      handlers.insert(attachmentMarkdown(noteFileName(noteTitle), attachment.name))),
    iconButton('external', t('attachments.open'), () => handlers.open(attachment.name)),
    iconButton('trash', t('attachments.remove'), () => handlers.remove(attachment.name))
  );

  row.append(badge, copy, actions);

  return row;
}

/** Sizes read like the operating system reports them, in the active language. */
export function formatSize(bytes: number): string {
  let size = Math.max(0, bytes);
  let unit = 0;
  while (size >= SIZE_STEP && unit < SIZE_UNITS.length - 1) {
    size /= SIZE_STEP;
    unit++;
  }

  const formatter = new Intl.NumberFormat(tag(), { maximumFractionDigits: unit && size < 10 ? 1 : 0 });

  return `${formatter.format(size)} ${SIZE_UNITS[unit]}`;
}
