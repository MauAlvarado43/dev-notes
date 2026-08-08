import {
  defaultLocale,
  localeTag,
  pluralize,
  translate,
  type MessageKey,
  type TranslationValues
} from '@/core/i18n/catalog';
import type { AppLocale } from '@/core/types';

export type { MessageKey, TranslationValues } from '@/core/i18n/catalog';

let active: AppLocale = defaultLocale;

/** The host owns the locale and sends it with every payload. */
export function setLocale(locale: AppLocale): void {
  active = locale;
}

export function locale(): AppLocale {
  return active;
}

export function t(key: MessageKey, values?: TranslationValues): string {
  return translate(active, key, values);
}

/** Counted text, such as `sidebar.noteCount` resolving to “3 notes”. */
export function count(key: string, total: number): string {
  return pluralize(active, key, total);
}

/** BCP 47 tag for `Intl` formatting in the active language. */
export function tag(): string {
  return localeTag(active);
}
