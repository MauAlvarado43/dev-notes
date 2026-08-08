import { button, element } from '@/presentation/webview/components/dom';
import { t } from '@/presentation/webview/i18n/messages';
import { displayKeys, SHORTCUT_SECTIONS, SHORTCUTS } from './shortcuts';

/**
 * Cheat sheet built from the shortcut table, so what it lists is exactly what
 * the board answers to. It is rendered when it opens, which keeps it in the
 * language of the last document the host sent.
 */
export class ShortcutHelp {
  readonly node = element('div', 'board-help-backdrop');

  private readonly panel = element('section', 'board-help');

  constructor() {
    this.node.hidden = true;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    this.node.append(this.panel);
    this.node.addEventListener('pointerdown', (event) => {
      if (event.target === this.node) this.close();
    });
  }

  get isOpen(): boolean {
    return !this.node.hidden;
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    this.render();
    this.node.hidden = false;
    this.panel.querySelector<HTMLElement>('.board-help-close')?.focus();
  }

  close(): void {
    this.node.hidden = true;
  }

  private render(): void {
    this.panel.setAttribute('aria-label', t('shortcuts.title'));

    const close = button({ className: 'board-help-close', icon: 'close', label: t('modal.close') }, () => this.close());
    const head = element('header', 'board-help-head');
    head.append(element('h2', 'board-help-title', t('shortcuts.title')), close);

    const columns = element('div', 'board-help-columns');
    for (const [section, title] of SHORTCUT_SECTIONS) {
      const shortcuts = SHORTCUTS.filter((shortcut) => shortcut.section === section);
      if (!shortcuts.length) continue;

      const block = element('div', 'board-help-section');
      block.append(element('div', 'board-help-section-title', t(title)));
      const list = element('dl', 'board-help-list');
      for (const shortcut of shortcuts) {
        list.append(
          element('dt', 'board-help-label', t(shortcut.label)),
          element('dd', 'board-help-keys', displayKeys(shortcut))
        );
      }
      block.append(list);
      columns.append(block);
    }

    this.panel.replaceChildren(head, columns, element('p', 'board-help-footer', t('shortcuts.footer')));
  }
}
