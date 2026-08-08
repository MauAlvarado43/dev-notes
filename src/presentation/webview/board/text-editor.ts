import { element } from '@/presentation/webview/components/dom';
import { t } from '@/presentation/webview/i18n/messages';
import type { TextRequest } from './canvas';

/**
 * Overlay used to type on the canvas. Focus is taken on the next frame, because
 * the pointer event that opens the editor still moves focus after the handler
 * returns, which used to blur the field before a single character was typed.
 */
export function openTextEditor(request: TextRequest, onCommit: (value: string) => void): void {
  const input = element('textarea', 'board-text-input');
  input.value = request.value;
  input.rows = Math.max(1, request.value.split('\n').length);
  input.placeholder = t(request.multiline ? 'board.textPlaceholder' : 'board.labelPlaceholder');
  input.spellcheck = false;
  input.style.left = `${request.screen.left}px`;
  input.style.top = `${request.screen.top}px`;
  input.style.color = request.color;
  input.style.fontSize = `${Math.max(11, Math.min(request.fontSize, 48))}px`;

  let settled = false;
  const finish = (value?: string): void => {
    if (settled) return;
    settled = true;
    input.remove();
    if (value !== undefined) onCommit(value);
  };

  input.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      finish();

      return;
    }
    if (event.key !== 'Enter' || (request.multiline && event.shiftKey)) return;
    event.preventDefault();
    finish(input.value);
  });
  input.addEventListener('input', () => {
    input.rows = Math.max(1, input.value.split('\n').length);
  });

  document.body.append(input);
  requestAnimationFrame(() => {
    input.focus();
    input.select();
    input.addEventListener('blur', () => finish(input.value));
  });
}
