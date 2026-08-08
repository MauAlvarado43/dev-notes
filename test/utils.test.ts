import assert from 'node:assert/strict';
import test from 'node:test';
import { compareNames, nonce, wordCount } from '../src/core/utils';

test('names are ordered without regard to casing or accents', () => {
  const names = ['zeta', 'Álvaro', 'beta'].sort(compareNames);
  assert.deepEqual(names, ['Álvaro', 'beta', 'zeta']);
});

test('a nonce is unique and long enough for a Content Security Policy', () => {
  const first = nonce();
  assert.equal(first.length, 32);
  assert.match(first, /^[A-Za-z0-9]+$/);
  assert.notEqual(first, nonce());
});

test('word count ignores surrounding and repeated whitespace', () => {
  assert.equal(wordCount('   '), 0);
  assert.equal(wordCount(' one  two\nthree '), 3);
});
