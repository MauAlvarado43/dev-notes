import type { AppLocale } from '../types';

export const english = {
  sidebar: {
    brandTitle: 'Dev Notes',
    brandSubtitle: 'Your Markdown library',
    searchPlaceholder: 'Search notes…',
    searchLabel: 'Search notes',
    clearSearch: 'Clear search',
    newNote: 'New note',
    newNoteIn: 'New note in {notebook}',
    newNotebook: 'New notebook',
    moreActions: 'More actions',
    openStorage: 'Open notes folder',
    notebookCountOne: '1 notebook',
    notebookCountOther: '{count} notebooks',
    noteCountOne: '1 note',
    noteCountOther: '{count} notes',
    resultCountOne: '1 result',
    resultCountOther: '{count} results',
    groupCountOne: '1 group',
    groupCountOther: '{count} groups',
    newBoard: 'New board',
    boardCountOne: '1 board',
    boardCountOther: '{count} boards',
    elementCountOne: '1 element',
    elementCountOther: '{count} elements',
    emptyBoard: 'Empty board',
    emptyNotebook: 'Empty notebook',
    noMatches: 'No matches',
    emptyTitle: 'Your library starts here',
    emptyText: 'Create a notebook and store commands, snippets, and ideas.',
    emptyAction: 'Create your first notebook',
    searchEmptyTitle: 'Nothing found',
    searchEmptyText: 'Try another title or a different content.',
    renameEntry: 'Rename',
    deleteNotebook: 'Delete notebook',
    deleteNote: 'Delete note',
    deleteBoard: 'Delete board'
  },
  modal: {
    close: 'Close',
    cancel: 'Cancel',
    create: 'Create',
    createNote: 'Create note',
    save: 'Save',
    delete: 'Delete',
    createNotebookTitle: 'New notebook',
    createNotebookDescription: 'Create a space to group related notes.',
    createNoteTitle: 'New note',
    createNoteDescription: 'The note opens ready to read or edit.',
    createBoard: 'Create board',
    createBoardTitle: 'New board',
    createBoardDescription: 'A drawing canvas for sketches, diagrams, and loose ideas.',
    kindLabel: 'Type',
    kindNote: 'Note',
    kindBoard: 'Board',
    renameNotebookTitle: 'Rename notebook',
    renameNoteTitle: 'Rename note',
    renameBoardTitle: 'Rename board',
    renameDescription: 'The content stays untouched.',
    deleteNotebookTitle: 'Delete notebook',
    deleteNotebookDescription: 'It goes to the trash with all of its notes and boards, and can be restored from there.',
    deleteNoteTitle: 'Delete note',
    deleteNoteDescription: '“{name}” will be moved to the trash.',
    deleteBoardTitle: 'Delete board',
    boardTitlePlaceholder: 'Service architecture',
    nameLabel: 'Name',
    namePlaceholder: 'Work, commands, ideas…',
    newNameLabel: 'New name',
    notebookLabel: 'Notebook',
    newNotebookLabel: 'New notebook',
    newNotebookPlaceholder: 'My notebook',
    titleLabel: 'Title',
    titlePlaceholder: 'Docker commands'
  },
  editor: {
    modeLabel: 'Note mode',
    read: 'Reading',
    edit: 'Edit',
    markdown: 'Markdown',
    preview: 'Preview',
    live: 'live',
    editorLabel: 'Markdown content',
    statusSaved: 'Saved',
    statusSaving: 'Saving…',
    statusDirty: 'Unsaved',
    statusError: 'Save failed',
    wordCountOne: '1 word',
    wordCountOther: '{count} words',
    copy: 'Copy',
    copied: 'Copied',
    copyCodeLabel: 'Copy code block',
    emptyTitle: 'This note is empty',
    emptyText: 'Press {action} to start writing.'
  },
  board: {
    tools: 'Tools',
    select: 'Select',
    pen: 'Pen',
    rectangle: 'Rectangle',
    ellipse: 'Ellipse',
    arrow: 'Arrow',
    line: 'Line',
    text: 'Text',
    color: 'Color',
    stroke: 'Stroke',
    strokeThin: 'Thin',
    strokeMedium: 'Medium',
    strokeThick: 'Thick',
    fill: 'Fill shapes',
    undo: 'Undo',
    redo: 'Redo',
    deleteSelected: 'Delete selection',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetView: 'Reset view',
    zoomLevel: '{percent}%',
    canvasLabel: 'Drawing canvas',
    emptyTitle: 'This board is empty',
    emptyText: 'Pick a tool and draw. Hold space or the middle button to pan.',
    textPlaceholder: 'Write and press Enter',
    brokenBoard: 'This board file could not be read, so it is not shown. Fix the file or start over.'
  },
  attachments: {
    heading: 'Attachments',
    countOne: '1 file',
    countOther: '{count} files',
    attach: 'Attach files',
    open: 'Open attachment',
    insert: 'Insert in note',
    remove: 'Remove attachment',
    image: 'Image'
  },
  host: {
    errorPrefix: 'Dev Notes: {message}',
    invalidLink: 'The link in this note is not valid.',
    blockedLink: 'Dev Notes blocked a link using the “{scheme}” protocol.',
    blockedPath: 'Dev Notes only opens files stored inside the notes folder.',
    unknownScheme: 'unknown',
    selectFilesTitle: 'Select the files to copy into the note',
    selectFilesAction: 'Attach',
    confirmRemoveAttachment: 'Remove “{name}” from this note? The copy stored by Dev Notes is deleted.',
    confirmRemoveAction: 'Remove',
    unexpectedError: 'Dev Notes could not complete the action.'
  },
  errors: {
    nameRequired: 'Enter a name to continue.',
    nameInvalid: 'That name is not valid.',
    nameCharacters: 'The name contains characters that are not allowed.',
    nameReserved: 'That name is reserved by Windows.',
    nameTrailing: 'The name cannot end with a period or a space.',
    nameTaken: 'An item with that name already exists.',
    unknownEntry: 'The item could not be identified.',
    notebookMissing: 'That notebook no longer exists.',
    noteMissing: 'That note no longer exists.',
    invalidNoteFile: 'That file is not a valid note.',
    invalidBoardFile: 'That file is not a valid board.',
    invalidBoard: 'That board file could not be read.',
    attachmentMissing: 'That attachment no longer exists.',
    renameFailed: 'VS Code could not rename the item.',
    updateFailed: 'The note could not be updated.'
  }
};

export const spanish: LocaleMessages<typeof english> = {
  sidebar: {
    brandTitle: 'Dev Notes',
    brandSubtitle: 'Tu biblioteca Markdown',
    searchPlaceholder: 'Buscar notas…',
    searchLabel: 'Buscar notas',
    clearSearch: 'Limpiar búsqueda',
    newNote: 'Nueva nota',
    newNoteIn: 'Nueva nota en {notebook}',
    newNotebook: 'Nuevo notebook',
    moreActions: 'Más acciones',
    openStorage: 'Abrir carpeta de notas',
    notebookCountOne: '1 notebook',
    notebookCountOther: '{count} notebooks',
    noteCountOne: '1 nota',
    noteCountOther: '{count} notas',
    resultCountOne: '1 resultado',
    resultCountOther: '{count} resultados',
    groupCountOne: '1 grupo',
    groupCountOther: '{count} grupos',
    newBoard: 'Nuevo pizarrón',
    boardCountOne: '1 pizarrón',
    boardCountOther: '{count} pizarrones',
    elementCountOne: '1 elemento',
    elementCountOther: '{count} elementos',
    emptyBoard: 'Pizarrón vacío',
    emptyNotebook: 'Notebook vacío',
    noMatches: 'Sin coincidencias',
    emptyTitle: 'Tu biblioteca empieza aquí',
    emptyText: 'Crea un notebook y guarda comandos, snippets e ideas.',
    emptyAction: 'Crear primer notebook',
    searchEmptyTitle: 'No encontramos nada',
    searchEmptyText: 'Prueba con otro título u otro contenido.',
    renameEntry: 'Cambiar nombre',
    deleteNotebook: 'Eliminar notebook',
    deleteNote: 'Eliminar nota',
    deleteBoard: 'Eliminar pizarrón'
  },
  modal: {
    close: 'Cerrar',
    cancel: 'Cancelar',
    create: 'Crear',
    createNote: 'Crear nota',
    save: 'Guardar',
    delete: 'Eliminar',
    createNotebookTitle: 'Nuevo notebook',
    createNotebookDescription: 'Crea un espacio para agrupar notas relacionadas.',
    createNoteTitle: 'Nueva nota',
    createNoteDescription: 'La nota se abrirá lista para leer o editar.',
    createBoard: 'Crear pizarrón',
    createBoardTitle: 'Nuevo pizarrón',
    createBoardDescription: 'Un lienzo de dibujo para bocetos, diagramas e ideas sueltas.',
    kindLabel: 'Tipo',
    kindNote: 'Nota',
    kindBoard: 'Pizarrón',
    renameNotebookTitle: 'Renombrar notebook',
    renameNoteTitle: 'Renombrar nota',
    renameBoardTitle: 'Renombrar pizarrón',
    renameDescription: 'El contenido se conservará intacto.',
    deleteNotebookTitle: 'Eliminar notebook',
    deleteNotebookDescription: 'Se enviará a la papelera junto con todas sus notas y pizarrones, y se puede recuperar desde ahí.',
    deleteNoteTitle: 'Eliminar nota',
    deleteNoteDescription: '“{name}” se enviará a la papelera.',
    deleteBoardTitle: 'Eliminar pizarrón',
    boardTitlePlaceholder: 'Arquitectura del servicio',
    nameLabel: 'Nombre',
    namePlaceholder: 'Trabajo, comandos, ideas…',
    newNameLabel: 'Nuevo nombre',
    notebookLabel: 'Notebook',
    newNotebookLabel: 'Notebook nuevo',
    newNotebookPlaceholder: 'Mi notebook',
    titleLabel: 'Título',
    titlePlaceholder: 'Comandos de Docker'
  },
  editor: {
    modeLabel: 'Modo de la nota',
    read: 'Lectura',
    edit: 'Editar',
    markdown: 'Markdown',
    preview: 'Vista previa',
    live: 'en vivo',
    editorLabel: 'Contenido Markdown',
    statusSaved: 'Guardado',
    statusSaving: 'Guardando…',
    statusDirty: 'Sin guardar',
    statusError: 'Error al guardar',
    wordCountOne: '1 palabra',
    wordCountOther: '{count} palabras',
    copy: 'Copiar',
    copied: 'Copiado',
    copyCodeLabel: 'Copiar bloque de código',
    emptyTitle: 'Esta nota está vacía',
    emptyText: 'Pulsa {action} para empezar a escribir.'
  },
  board: {
    tools: 'Herramientas',
    select: 'Seleccionar',
    pen: 'Lápiz',
    rectangle: 'Rectángulo',
    ellipse: 'Elipse',
    arrow: 'Flecha',
    line: 'Línea',
    text: 'Texto',
    color: 'Color',
    stroke: 'Trazo',
    strokeThin: 'Delgado',
    strokeMedium: 'Medio',
    strokeThick: 'Grueso',
    fill: 'Rellenar figuras',
    undo: 'Deshacer',
    redo: 'Rehacer',
    deleteSelected: 'Eliminar selección',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    resetView: 'Restablecer vista',
    zoomLevel: '{percent}%',
    canvasLabel: 'Lienzo de dibujo',
    emptyTitle: 'Este pizarrón está vacío',
    emptyText: 'Elige una herramienta y dibuja. Mantén espacio o el botón central para desplazarte.',
    textPlaceholder: 'Escribe y pulsa Enter',
    brokenBoard: 'No se pudo leer este archivo de pizarrón, así que no se muestra. Corrige el archivo o empieza de nuevo.'
  },
  attachments: {
    heading: 'Archivos adjuntos',
    countOne: '1 archivo',
    countOther: '{count} archivos',
    attach: 'Adjuntar archivos',
    open: 'Abrir adjunto',
    insert: 'Insertar en la nota',
    remove: 'Quitar adjunto',
    image: 'Imagen'
  },
  host: {
    errorPrefix: 'Dev Notes: {message}',
    invalidLink: 'El enlace de esta nota no es válido.',
    blockedLink: 'Dev Notes bloqueó un enlace con el protocolo “{scheme}”.',
    blockedPath: 'Dev Notes solo abre archivos guardados dentro de la carpeta de notas.',
    unknownScheme: 'desconocido',
    selectFilesTitle: 'Selecciona los archivos que se copiarán a la nota',
    selectFilesAction: 'Adjuntar',
    confirmRemoveAttachment: '¿Quitar “{name}” de esta nota? Se elimina la copia guardada por Dev Notes.',
    confirmRemoveAction: 'Quitar',
    unexpectedError: 'Dev Notes no pudo completar la acción.'
  },
  errors: {
    nameRequired: 'Escribe un nombre para continuar.',
    nameInvalid: 'Ese nombre no es válido.',
    nameCharacters: 'El nombre contiene caracteres no permitidos.',
    nameReserved: 'Ese nombre está reservado por Windows.',
    nameTrailing: 'El nombre no puede terminar con un punto o un espacio.',
    nameTaken: 'Ya existe un elemento con ese nombre.',
    unknownEntry: 'No se pudo identificar el elemento.',
    notebookMissing: 'Ese notebook ya no existe.',
    noteMissing: 'Esa nota ya no existe.',
    invalidNoteFile: 'Ese archivo no es una nota válida.',
    invalidBoardFile: 'Ese archivo no es un pizarrón válido.',
    invalidBoard: 'No se pudo leer ese archivo de pizarrón.',
    attachmentMissing: 'Ese adjunto ya no existe.',
    renameFailed: 'VS Code no pudo renombrar el elemento.',
    updateFailed: 'No se pudo actualizar la nota.'
  }
};

type LocaleMessages<T> = { [Key in keyof T]: T[Key] extends string ? string : LocaleMessages<T[Key]> };
type Join<Key extends string, Suffix extends string> = `${Key}.${Suffix}`;

export type MessageKey<T = typeof english> = {
  [Key in keyof T & string]: T[Key] extends string ? Key : Join<Key, MessageKey<T[Key]>>;
}[keyof T & string];

export type TranslationValues = Record<string, number | string>;

export const messages: Record<AppLocale, LocaleMessages<typeof english>> = {
  en: english,
  es: spanish
};

export const defaultLocale: AppLocale = 'en';

function lookup(locale: AppLocale, key: string): unknown {
  return key.split('.').reduce<unknown>(
    (current, part) => (current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined),
    messages[locale]
  );
}

export function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template;

  return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in values ? String(values[name]) : `{${name}}`));
}

/**
 * Resolves a message for the given locale. Falls back to English when the locale
 * is missing the key, and to the key itself when no catalog defines it, so a typo
 * degrades into a visible placeholder instead of crashing a webview.
 */
export function translate(locale: AppLocale, key: MessageKey, values?: TranslationValues): string {
  const message = lookup(locale, key) ?? lookup(defaultLocale, key);
  if (typeof message !== 'string') return key;

  return interpolate(message, values);
}

/**
 * Picks the singular or plural variant of a counted message. `key` is the shared
 * prefix of a `…One` / `…Other` pair, such as `sidebar.noteCount`.
 */
export function pluralize(locale: AppLocale, key: string, count: number): string {
  const variant = `${key}${count === 1 ? 'One' : 'Other'}` as MessageKey;

  return translate(locale, variant, { count });
}

/** BCP 47 tag used for Intl formatting. */
export function localeTag(locale: AppLocale): string {
  return locale === 'es' ? 'es-MX' : 'en-US';
}

export function isAppLocale(value: unknown): value is AppLocale {
  return value === 'en' || value === 'es';
}

/**
 * Error carrying a catalog key instead of rendered text, so the same failure
 * reads in the user's language wherever it surfaces.
 */
export class LocalizedError extends Error {
  constructor(readonly key: MessageKey, readonly values?: TranslationValues) {
    super(translate(defaultLocale, key, values));
    this.name = 'LocalizedError';
  }

  localize(locale: AppLocale): string {
    return translate(locale, this.key, this.values);
  }
}

export function localizeError(error: unknown, locale: AppLocale): string {
  if (error instanceof LocalizedError) return error.localize(locale);
  if (error instanceof Error) return error.message;

  return translate(locale, 'host.unexpectedError');
}
