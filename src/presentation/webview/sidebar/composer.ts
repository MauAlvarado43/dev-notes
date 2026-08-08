import type { NotebookSummary } from '@/core/types';
import { button, element } from '@/presentation/webview/components/dom';
import { t } from '@/presentation/webview/i18n/messages';

export type ComposerKind =
  | 'createNotebook'
  | 'createNote'
  | 'createBoard'
  | 'renameNotebook'
  | 'renameNote'
  | 'renameBoard'
  | 'deleteNotebook'
  | 'deleteNote'
  | 'deleteBoard';

export interface ComposerTarget {
  notebook?: string;
  fileName?: string;
  name?: string;
}

export type ComposerSubmit = (kind: ComposerKind, target: ComposerTarget, values: Record<string, string>) => void;

/**
 * Centered form used for every create, rename, and delete flow, so the extension
 * never falls back to the input box at the top of the VS Code window.
 */
export class Composer {
  private readonly backdrop = element('div', 'modal-backdrop');
  private readonly form = element('form', 'modal');
  private readonly title = element('h2', 'modal-title');
  private readonly description = element('p', 'modal-description');
  private readonly fields = element('div');
  private readonly error = element('div', 'form-error');
  private readonly submit = element('button', 'submit');
  private kind?: ComposerKind;
  private target: ComposerTarget = {};
  private notebooks: NotebookSummary[] = [];

  constructor(root: HTMLElement, private readonly onSubmit: ComposerSubmit) {
    this.backdrop.hidden = true;
    this.error.setAttribute('role', 'alert');
    this.submit.type = 'submit';

    const close = button({ className: 'modal-close', icon: 'close', label: t('modal.close') }, () => this.close());
    const heading = element('div');
    heading.append(this.title, this.description);
    const head = element('div', 'modal-head');
    head.append(heading, close);

    const body = element('div', 'modal-body');
    body.append(this.fields, this.error);

    const actions = element('div', 'modal-actions');
    actions.append(button({ className: 'cancel', text: t('modal.cancel') }, () => this.close()), this.submit);

    this.form.append(head, body, actions);
    this.backdrop.append(this.form);
    root.append(this.backdrop);

    this.form.addEventListener('submit', (event) => this.handleSubmit(event));
    this.backdrop.addEventListener('click', (event) => {
      if (event.target === this.backdrop) this.close();
    });
  }

  get isOpen(): boolean {
    return !this.backdrop.hidden;
  }

  open(kind: ComposerKind, target: ComposerTarget, notebooks: NotebookSummary[]): void {
    this.kind = kind;
    this.target = target;
    this.notebooks = notebooks;
    this.fields.replaceChildren();
    this.error.textContent = '';
    this.submit.className = 'submit';
    this.submit.disabled = false;

    if (kind === 'createNotebook') this.renderCreateNotebook();
    else if (kind === 'createNote' || kind === 'createBoard') this.renderCreateEntry(kind, target, notebooks);
    else if (kind === 'renameNotebook' || kind === 'renameNote' || kind === 'renameBoard') this.renderRename(kind, target);
    else this.renderDelete(kind, target);

    this.backdrop.hidden = false;
    requestAnimationFrame(() => this.fields.querySelector<HTMLElement>('input, select')?.focus());
  }

  close(): void {
    this.backdrop.hidden = true;
    this.kind = undefined;
    this.target = {};
    this.submit.disabled = false;
    this.error.textContent = '';
  }

  showError(message: string): void {
    this.error.textContent = message;
    this.submit.disabled = false;
  }

  private renderCreateNotebook(): void {
    this.title.textContent = t('modal.createNotebookTitle');
    this.description.textContent = t('modal.createNotebookDescription');
    this.submit.textContent = t('modal.create');
    this.field(t('modal.nameLabel'), textInput('name', '', t('modal.namePlaceholder')));
  }

  /** Notes and boards share one create flow, switched with the type selector. */
  private renderCreateEntry(
    kind: 'createNote' | 'createBoard',
    target: ComposerTarget,
    notebooks: NotebookSummary[]
  ): void {
    const board = kind === 'createBoard';
    this.title.textContent = board ? t('modal.createBoardTitle') : t('modal.createNoteTitle');
    this.description.textContent = board ? t('modal.createBoardDescription') : t('modal.createNoteDescription');
    this.submit.textContent = board ? t('modal.createBoard') : t('modal.createNote');
    this.renderKindToggle(kind);

    if (notebooks.length) {
      const select = element('select');
      select.name = 'notebook';
      for (const notebook of notebooks) {
        const option = element('option', undefined, notebook.name);
        option.value = notebook.name;
        option.selected = notebook.name === target.notebook;
        select.append(option);
      }
      this.field(t('modal.notebookLabel'), select);
    } else {
      this.field(t('modal.newNotebookLabel'), textInput('notebook', '', t('modal.newNotebookPlaceholder')));
    }
    this.field(
      t('modal.titleLabel'),
      textInput('title', '', board ? t('modal.boardTitlePlaceholder') : t('modal.titlePlaceholder'))
    );
  }

  private renderKindToggle(active: 'createNote' | 'createBoard'): void {
    const group = element('div', 'kind-toggle');
    group.setAttribute('role', 'tablist');
    const options: Array<[ComposerKind, string]> = [
      ['createNote', t('modal.kindNote')],
      ['createBoard', t('modal.kindBoard')]
    ];

    for (const [kind, label] of options) {
      const option = button({ className: `kind-option${kind === active ? ' active' : ''}`, text: label }, () => {
        if (kind !== active) this.open(kind, this.target, this.notebooks);
      });
      option.setAttribute('role', 'tab');
      option.setAttribute('aria-selected', String(kind === active));
      group.append(option);
    }

    const wrapper = element('div', 'field');
    wrapper.append(element('span', 'field-label', t('modal.kindLabel')), group);
    this.fields.append(wrapper);
  }

  private renderRename(kind: 'renameNotebook' | 'renameNote' | 'renameBoard', target: ComposerTarget): void {
    this.title.textContent = renameTitle(kind);
    this.description.textContent = t('modal.renameDescription');
    this.submit.textContent = t('modal.save');
    this.field(t('modal.newNameLabel'), textInput('name', target.name ?? '', ''));
  }

  private renderDelete(kind: 'deleteNotebook' | 'deleteNote' | 'deleteBoard', target: ComposerTarget): void {
    const isNotebook = kind === 'deleteNotebook';
    this.title.textContent = deleteTitle(kind);
    this.description.textContent = isNotebook
      ? t('modal.deleteNotebookDescription')
      : t('modal.deleteNoteDescription', { name: target.name ?? '' });
    this.submit.textContent = t('modal.delete');
    this.submit.className = 'submit danger';
  }

  private field(label: string, control: HTMLElement): void {
    const wrapper = element('label', 'field');
    wrapper.append(element('span', 'field-label', label), control);
    this.fields.append(wrapper);
  }

  private handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    if (!this.kind) return;

    const values = Object.fromEntries(new FormData(this.form)) as Record<string, string>;
    this.error.textContent = '';
    this.submit.disabled = true;
    this.onSubmit(this.kind, this.target, values);
  }
}

function renameTitle(kind: 'renameNotebook' | 'renameNote' | 'renameBoard'): string {
  if (kind === 'renameNotebook') return t('modal.renameNotebookTitle');
  if (kind === 'renameBoard') return t('modal.renameBoardTitle');

  return t('modal.renameNoteTitle');
}

function deleteTitle(kind: 'deleteNotebook' | 'deleteNote' | 'deleteBoard'): string {
  if (kind === 'deleteNotebook') return t('modal.deleteNotebookTitle');
  if (kind === 'deleteBoard') return t('modal.deleteBoardTitle');

  return t('modal.deleteNoteTitle');
}

function textInput(name: string, value: string, placeholder: string): HTMLInputElement {
  const input = element('input');
  input.name = name;
  input.value = value;
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.required = true;

  return input;
}
