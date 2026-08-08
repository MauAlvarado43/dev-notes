import assert from 'node:assert/strict';
import test from 'node:test';
import {
  english,
  interpolate,
  isAppLocale,
  localeTag,
  LocalizedError,
  localizeError,
  messages,
  pluralize,
  spanish,
  translate
} from '../src/core/i18n/catalog';

type Entries = Record<string, string>;

/** Flattens a catalog into `scope.key` entries so both locales can be compared. */
function flatten(value: unknown, prefix = ''): Entries {
  if (typeof value === 'string') return { [prefix]: value };

  return Object.entries(value as Record<string, unknown>).reduce<Entries>((entries, [key, child]) => {
    return { ...entries, ...flatten(child, prefix ? `${prefix}.${key}` : key) };
  }, {});
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1] as string).sort();
}

test('both locales define the same keys', () => {
  assert.deepEqual(Object.keys(flatten(spanish)).sort(), Object.keys(flatten(english)).sort());
});

test('both locales use the same placeholders in every message', () => {
  const source = flatten(english);
  const target = flatten(spanish);

  for (const [key, message] of Object.entries(source)) {
    assert.deepEqual(placeholders(target[key] as string), placeholders(message), `placeholders differ in ${key}`);
  }
});

test('no message is left untranslated when the languages should differ', () => {
  assert.notEqual(messages.es.sidebar.brandSubtitle, messages.en.sidebar.brandSubtitle);
});

test('translation interpolates values and falls back instead of throwing', () => {
  assert.equal(translate('es', 'sidebar.newNoteIn', { notebook: 'Docker' }), 'Nueva nota en Docker');
  assert.equal(translate('en', 'sidebar.unknownKey' as 'sidebar.newNote'), 'sidebar.unknownKey');
  assert.equal(interpolate('{a} and {b}', { a: 1 }), '1 and {b}');
});

test('counted messages pick the singular or plural variant', () => {
  assert.equal(pluralize('en', 'sidebar.noteCount', 1), '1 note');
  assert.equal(pluralize('en', 'sidebar.noteCount', 4), '4 notes');
  assert.equal(pluralize('es', 'sidebar.noteCount', 4), '4 notas');
});

test('a localized error renders in the requested language', () => {
  const error = new LocalizedError('errors.nameTaken');
  assert.equal(localizeError(error, 'es'), 'Ya existe un elemento con ese nombre.');
  assert.equal(localizeError(error, 'en'), 'An item with that name already exists.');
  assert.equal(localizeError(new Error('raw'), 'es'), 'raw');
  assert.equal(localizeError('boom', 'en'), messages.en.host.unexpectedError);
});

test('locale helpers recognize supported languages', () => {
  assert.ok(isAppLocale('es'));
  assert.ok(!isAppLocale('fr'));
  assert.equal(localeTag('es'), 'es-MX');
  assert.equal(localeTag('en'), 'en-US');
});
