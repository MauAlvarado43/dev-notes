import assert from 'node:assert/strict';
import test from 'node:test';
import { LocalizedError } from '../src/core/i18n/catalog';
import type { BoardElement } from '../src/core/types';
import {
  boardFileName,
  boardSearchText,
  boardTitle,
  emptyBoard,
  isBoardFile,
  parseBoard,
  serializeBoard
} from '../src/domain/boards';

const stroke: BoardElement = { id: 'a', kind: 'pen', color: '#7c6df2', width: 2, points: [0, 0, 10, 12] };

test('board files are recognized and titled by their name', () => {
  assert.ok(isBoardFile('Arquitectura.board.json'));
  assert.ok(!isBoardFile('Arquitectura.json'));
  assert.ok(!isBoardFile('Nota.md'));
  assert.equal(boardTitle('Arquitectura.board.json'), 'Arquitectura');
  assert.equal(boardFileName('Arquitectura'), 'Arquitectura.board.json');
});

test('an empty file reads as an empty board', () => {
  assert.deepEqual(parseBoard(''), emptyBoard());
  assert.deepEqual(parseBoard('   '), emptyBoard());
});

test('a board survives a serialize and parse round trip', () => {
  const board = { version: 1, elements: [stroke, { ...stroke, id: 'b', kind: 'text' as const, text: 'API' }] };
  assert.deepEqual(parseBoard(serializeBoard(board)), board);
});

test('serialized boards are indented and end with a newline, for readable diffs', () => {
  const text = serializeBoard({ version: 1, elements: [stroke] });
  assert.ok(text.startsWith('{\n  "version": 1'));
  assert.ok(text.endsWith('\n'));
});

test('a file that is not a board is reported instead of silently emptied', () => {
  for (const text of ['{ not json', '[]', '"board"']) {
    assert.throws(() => parseBoard(text), (error: unknown) => {
      assert.ok(error instanceof LocalizedError);
      assert.equal(error.key, 'errors.invalidBoard');

      return true;
    }, `expected ${text} to be rejected`);
  }
});

test('malformed elements are dropped without losing the rest of the board', () => {
  const board = parseBoard(JSON.stringify({
    version: 1,
    elements: [
      stroke,
      { kind: 'pen', color: '#fff', width: 2, points: [0, 0] },
      { id: 'c', kind: 'spiral', color: '#fff', width: 2, points: [0, 0] },
      { id: 'd', kind: 'pen', color: '#fff', width: 2, points: [0] },
      { id: 'e', kind: 'text', color: '#fff', width: 2, points: [1, 2] }
    ]
  }));

  assert.deepEqual(board.elements.map((element) => element.id), ['a']);
});

test('unusable values fall back instead of reaching the canvas', () => {
  const board = parseBoard(JSON.stringify({
    elements: [{ id: 'a', kind: 'rectangle', points: [0, 0, 5, 5], width: 500, color: 12 }]
  }));

  assert.deepEqual(board.elements[0], { id: 'a', kind: 'rectangle', color: '#7c6df2', width: 24, points: [0, 0, 5, 5] });
});

test('text drawn on a board is searchable from the sidebar', () => {
  const board = {
    version: 1,
    elements: [stroke, { ...stroke, id: 'b', kind: 'text' as const, text: 'Cache' }, { ...stroke, id: 'c', kind: 'text' as const, text: 'Queue' }]
  };

  assert.equal(boardSearchText(board), 'Cache Queue');
});
