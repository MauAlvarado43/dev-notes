import { icon, type IconName } from './icons';

/** Creates an element with an optional class and text content. */
export function element<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  className?: string,
  text?: string
): HTMLElementTagNameMap[Tag] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;

  return node;
}

interface ButtonOptions {
  className?: string;
  label?: string;
  icon?: IconName;
  text?: string;
  type?: 'button' | 'submit';
}

export function button(options: ButtonOptions, action?: (event: MouseEvent) => void): HTMLButtonElement {
  const node = element('button', options.className);
  node.type = options.type ?? 'button';
  if (options.icon) node.append(icon(options.icon));
  if (options.text) node.append(element('span', undefined, options.text));
  if (options.label) {
    node.title = options.label;
    node.setAttribute('aria-label', options.label);
  }
  if (action) node.addEventListener('click', action);

  return node;
}

/** Icon-only action shown on hover inside notebook and note rows. */
export function iconButton(name: IconName, label: string, action: (event: MouseEvent) => void): HTMLButtonElement {
  return button({ className: 'icon-button', icon: name, label }, (event) => {
    event.stopPropagation();
    action(event);
  });
}
