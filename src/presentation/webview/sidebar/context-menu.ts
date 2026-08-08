import { element } from '@/presentation/webview/components/dom';
import { icon, type IconName } from '@/presentation/webview/components/icons';

export interface MenuItem {
  icon: IconName;
  label: string;
  danger?: boolean;
  action(): void;
}

export type MenuEntry = MenuItem | 'separator';

const EDGE_MARGIN = 6;

/** Floating menu anchored to the three-dot button of a notebook or note row. */
export class ContextMenu {
  constructor(private readonly root: HTMLElement) {
    document.addEventListener('click', (event) => {
      if (!this.root.contains(event.target as Node)) this.close();
    });
    window.addEventListener('resize', () => this.close());
    window.addEventListener('blur', () => this.close());
  }

  open(anchor: HTMLElement, entries: MenuEntry[]): void {
    this.close();
    const menu = element('div', 'context-menu');
    menu.setAttribute('role', 'menu');

    for (const entry of entries) {
      if (entry === 'separator') {
        menu.append(element('div', 'menu-separator'));
        continue;
      }
      const item = element('button', `menu-item${entry.danger ? ' danger' : ''}`);
      item.type = 'button';
      item.append(icon(entry.icon), element('span', undefined, entry.label));
      item.addEventListener('click', () => {
        this.close();
        entry.action();
      });
      menu.append(item);
    }

    this.root.append(menu);
    position(menu, anchor);
    menu.querySelector('button')?.focus();
  }

  close(): void {
    this.root.replaceChildren();
  }
}

/** Keeps the menu inside the sidebar, which is often only a few hundred pixels wide. */
function position(menu: HTMLElement, anchor: HTMLElement): void {
  const anchorRect = anchor.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const left = Math.min(anchorRect.right - menuRect.width, window.innerWidth - menuRect.width - EDGE_MARGIN);
  const top = Math.min(anchorRect.bottom + 3, window.innerHeight - menuRect.height - EDGE_MARGIN);
  menu.style.left = `${Math.max(EDGE_MARGIN, left)}px`;
  menu.style.top = `${Math.max(EDGE_MARGIN, top)}px`;
}
