import assert from 'node:assert/strict';
import test from 'node:test';
import { LocalizedError } from '../src/core/i18n/catalog';
import {
  applyNoteTemplate,
  isNoteFile,
  noteFileName,
  noteTitle,
  requireNoteFileName,
  requireValidName
} from '../src/domain/notes';

test('a note title is its file name without the Markdown extension', () => {
  assert.equal(noteTitle('Docker.md'), 'Docker');
  assert.equal(noteTitle('Release notes.MD'), 'Release notes');
  assert.equal(noteFileName('Docker'), 'Docker.md');
  assert.ok(isNoteFile('notes.md'));
  assert.ok(!isNoteFile('notes.txt'));
});

test('valid names are trimmed and returned unchanged', () => {
  assert.equal(requireValidName('  Commands  ', []), 'Commands');
});

test('names rejected by the file system are reported with a catalog key', () => {
  const cases: Array<[string, string]> = [
    ['', 'errors.nameRequired'],
    ['   ', 'errors.nameRequired'],
    ['..', 'errors.nameInvalid'],
    ['re/ports', 'errors.nameCharacters'],
    ['CON', 'errors.nameReserved'],
    ['notes.', 'errors.nameTrailing']
  ];

  for (const [input, key] of cases) {
    assert.throws(() => requireValidName(input, []), (error: unknown) => {
      assert.ok(error instanceof LocalizedError);
      assert.equal(error.key, key);

      return true;
    }, `expected ${key} for "${input}"`);
  }
});

test('duplicate names are rejected regardless of casing', () => {
  assert.throws(() => requireValidName('Docker', ['docker']), (error: unknown) => {
    assert.ok(error instanceof LocalizedError);
    assert.equal(error.key, 'errors.nameTaken');

    return true;
  });
});

test('only Markdown files are accepted as note references', () => {
  assert.equal(requireNoteFileName('Docker.md'), 'Docker.md');
  assert.throws(() => requireNoteFileName('Docker.txt'), (error: unknown) => {
    assert.ok(error instanceof LocalizedError);
    assert.equal(error.key, 'errors.invalidNoteFile');

    return true;
  });
});

test('the note template expands the title and escaped line breaks', () => {
  assert.equal(applyNoteTemplate('# ${title}\\n\\n', 'Docker'), '# Docker\n\n');
  assert.equal(applyNoteTemplate('${title} / ${title}', 'A'), 'A / A');
});
