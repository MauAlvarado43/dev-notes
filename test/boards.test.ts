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

test('diagram shapes keep their label, rotation, and fill across a round trip', () => {
  const board = {
    version: 1,
    elements: [
      { id: 'a', kind: 'umlClass' as const, color: '#4bbca2', width: 2, points: [0, 0, 180, 120], filled: true, text: 'Order', rotation: 45 },
      { id: 'b', kind: 'triangle' as const, color: '#4bbca2', width: 2, points: [0, 0, 40, 40], dash: true }
    ]
  };

  assert.deepEqual(parseBoard(serializeBoard(board)), board);
});

test('a connector keeps the elements it joins and its notation', () => {
  const connector = {
    id: 'c',
    kind: 'connector' as const,
    color: '#7c6df2',
    width: 2,
    points: [0, 0, 50, 50],
    from: { element: 'a', anchor: 'auto' as const },
    to: { element: 'b', anchor: 'left' as const },
    startCap: 'filledDiamond' as const,
    endCap: 'many' as const,
    route: 'elbow' as const
  };

  assert.deepEqual(parseBoard(serializeBoard({ version: 1, elements: [connector] })).elements[0], connector);
});

test('a connector falls back to a plain arrow when its notation is unusable', () => {
  const board = parseBoard(JSON.stringify({
    elements: [{
      id: 'c',
      kind: 'connector',
      color: '#7c6df2',
      width: 2,
      points: [0, 0, 10, 10],
      from: { element: 42 },
      to: { element: 'b', anchor: 'diagonal' },
      startCap: 'spike',
      endCap: 'triangle',
      route: 'curved'
    }]
  }));

  assert.deepEqual(board.elements[0], {
    id: 'c',
    kind: 'connector',
    color: '#7c6df2',
    width: 2,
    points: [0, 0, 10, 10],
    to: { element: 'b', anchor: 'auto' },
    startCap: 'none',
    endCap: 'triangle',
    route: 'straight'
  });
});

test('rotation is normalized into a single turn', () => {
  const rotated = (rotation: unknown): number | undefined => parseBoard(JSON.stringify({
    elements: [{ id: 'a', kind: 'rectangle', color: '#fff', width: 2, points: [0, 0, 4, 4], rotation }]
  })).elements[0]?.rotation;

  assert.equal(rotated(450), 90);
  assert.equal(rotated(-90), 270);
  assert.equal(rotated(0), undefined);
  assert.equal(rotated('45deg'), undefined);
});

test('an image keeps the file it draws, and is dropped when it has none', () => {
  const image = { id: 'i', kind: 'image' as const, color: '#7c6df2', width: 1, points: [0, 0, 120, 80], src: 'shot.png' };
  assert.deepEqual(parseBoard(serializeBoard({ version: 1, elements: [image] })).elements[0], image);

  const orphan = parseBoard(JSON.stringify({
    elements: [{ id: 'i', kind: 'image', color: '#fff', width: 1, points: [0, 0, 10, 10] }]
  }));
  assert.deepEqual(orphan.elements, []);
});

test('text drawn on a board is searchable from the sidebar', () => {
  const board = {
    version: 1,
    elements: [stroke, { ...stroke, id: 'b', kind: 'text' as const, text: 'Cache' }, { ...stroke, id: 'c', kind: 'text' as const, text: 'Queue' }]
  };

  assert.equal(boardSearchText(board), 'Cache Queue');
});
