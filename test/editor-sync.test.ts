import assert from 'node:assert/strict';
import test from 'node:test';
import { EditorSync } from '../src/presentation/webview/editor/sync';

test('delayed typing echoes cannot replace newer text', () => {
  const sync = new EditorSync();
  assert.equal(sync.accept(0, 1), true);
  const first = sync.edit();
  const second = sync.edit();
  assert.equal(sync.accept(first, 2), false);
  assert.equal(sync.accept(second, 3), true);
  assert.equal(sync.accept(first, 4), false);
});

test('attachment lookups completing out of order cannot roll back a snapshot', () => {
  const sync = new EditorSync();
  assert.equal(sync.accept(0, 2), true);
  assert.equal(sync.accept(0, 1), false);
  assert.equal(sync.accept(0, 3), true);
});

test('initial loading cannot overwrite typing and external updates still arrive', () => {
  const sync = new EditorSync();
  const revision = sync.edit();
  assert.equal(sync.accept(0, 1), false);
  assert.equal(sync.accept(revision, 2), true);
  assert.equal(sync.accept(revision, 3), true);
});
